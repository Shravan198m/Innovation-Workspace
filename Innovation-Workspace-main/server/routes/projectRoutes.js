const router = require("express").Router();
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { isManagerRole, normalizeRole } = require("../middleware/role");
const { canAccessProject, matchesIdentity } = require("../utils/projectAccess");
const { queueProjectAssignmentEmails } = require("../lib/email");
const { validateBody } = require("../middleware/validate");
const { projectUpsertSchema } = require("../validation/schemas");
const { projectWriteLimiter } = require("../middleware/rateLimiters");
const debugProjectAccess = String(process.env.DEBUG_PROJECT_ACCESS || "").trim().toLowerCase() === "true";

router.use(authenticateToken);

let projectSchemaReady = null;

async function ensureProjectSchema() {
  if (!projectSchemaReady) {
    projectSchemaReady = (async () => {
      await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''`);
      await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS mentor_name TEXT DEFAULT ''`);
      await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_lead_name TEXT DEFAULT ''`);
      await pool.query(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS team_members JSONB DEFAULT '[]'::jsonb`);
    })();
  }

  return projectSchemaReady;
}

function toMemberObject(entry, index) {
  const formatNameFromValue = (value, fallback = "") => {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return fallback;
    }

    const source = normalized.includes("@") ? normalized.split("@")[0] : normalized;
    return source
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  };

  if (typeof entry === "string") {
    const value = entry.trim();
    if (!value) {
      return null;
    }

    return {
      name: formatNameFromValue(value, `Member ${index + 1}`),
      usn: "",
      email: value.includes("@") ? value : "",
      role: "STUDENT",
    };
  }

  if (!entry || typeof entry !== "object") {
    return null;
  }

  const normalized = {
    name: formatNameFromValue(entry.name || entry.email || entry.usn, `Member ${index + 1}`),
    usn: String(entry.usn || "").trim(),
    email: String(entry.email || "").trim(),
    role: String(entry.role || "STUDENT").trim().toUpperCase(),
  };

  if (!normalized.name && !normalized.usn && !normalized.email) {
    return null;
  }

  return normalized;
}

async function resolveCanonicalUser(entry) {
  const rawEmail = String(entry?.email || "").trim().toLowerCase();
  const rawName = String(entry?.name || "").trim().toLowerCase();
  const rawLocalPart = rawEmail.includes("@") ? rawEmail.split("@")[0] : rawEmail;

  const candidates = [rawEmail, rawName, rawLocalPart].filter(Boolean);

  for (const candidate of candidates) {
    const result = await pool.query(
      `SELECT id, name, email, role
       FROM users
       WHERE LOWER(email) = $1
          OR LOWER(name) = $1
          OR LOWER(SPLIT_PART(email, '@', 1)) = $1
       LIMIT 1`,
      [candidate]
    );

    if (result.rowCount > 0) {
      return result.rows[0];
    }
  }

  return null;
}

async function normalizeMembersAsync({ teamMembers, members, teamLeadEmail, teamLeadName, mentorEmail, mentor }) {
  const sourceMembers = Array.isArray(teamMembers) && teamMembers.length > 0 ? teamMembers : members;
  const normalized = Array.isArray(sourceMembers)
    ? sourceMembers.map(toMemberObject).filter(Boolean)
    : [];
  const normalizedTeamLeadEmail = String(teamLeadEmail || "").trim().toLowerCase();
  const mentorIdentity = String(mentorEmail || mentor || "").trim().toLowerCase();
  const resolvedMembers = [];

  for (const member of normalized) {
    const memberEmail = String(member.email || "").trim().toLowerCase();
    const memberName = String(member.name || "").trim().toLowerCase();

    if (mentorIdentity && (memberEmail === mentorIdentity || memberName === mentorIdentity)) {
      continue;
    }

    const canonicalUser = await resolveCanonicalUser(member);
    const nextMember = canonicalUser
      ? {
          name: String(canonicalUser.name || member.name || "").trim(),
          usn: String(member.usn || "").trim(),
          email: String(canonicalUser.email || member.email || "").trim().toLowerCase(),
          role: String(canonicalUser.role || member.role || "STUDENT").trim().toUpperCase(),
        }
      : {
          ...member,
          email: String(member.email || "").trim().toLowerCase(),
          role: String(member.role || "STUDENT").trim().toUpperCase(),
        };

    resolvedMembers.push(nextMember);
  }

  if (!normalizedTeamLeadEmail) {
    return resolvedMembers.map((member) => ({
      ...member,
      role: String(member.role || "STUDENT").toUpperCase() === "TEAM_LEAD" ? "TEAM_LEAD" : "STUDENT",
    }));
  }

  let matchedTeamLead = false;
  const withTeamLeadRole = resolvedMembers.map((member) => {
    const email = String(member.email || "").trim().toLowerCase();
    const isTeamLead = email && email === normalizedTeamLeadEmail;

    if (isTeamLead) {
      matchedTeamLead = true;
    }

    return {
      ...member,
      role: isTeamLead ? "TEAM_LEAD" : "STUDENT",
    };
  });

  if (!matchedTeamLead) {
    const canonicalTeamLead = await resolveCanonicalUser({ email: normalizedTeamLeadEmail, name: teamLeadName });
    const localPart = normalizedTeamLeadEmail.split("@")[0] || "Team Lead";
    const fallbackTeamLeadName = localPart
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");

    withTeamLeadRole.push({
      name: String(canonicalTeamLead?.name || teamLeadName || "").trim() || fallbackTeamLeadName || "Team Lead",
      usn: "",
      email: String(canonicalTeamLead?.email || normalizedTeamLeadEmail).trim().toLowerCase(),
      role: "TEAM_LEAD",
    });
  }

  return withTeamLeadRole;
}

function serializeProject(row) {
  const formatNameFromValue = (value, fallback = "") => {
    const normalized = String(value || "").trim();
    if (!normalized) {
      return fallback;
    }

    const source = normalized.includes("@") ? normalized.split("@")[0] : normalized;
    return source
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  };

  const teamMembers = Array.isArray(row.teamMembers) ? row.teamMembers : [];
  const teamLead = teamMembers.find((member) => String(member?.role || "").toUpperCase() === "TEAM_LEAD");
  const mentorName = formatNameFromValue(row.mentor_name || row.mentor || row.mentorName, "Mentor");
  const teamLeadName = formatNameFromValue(row.team_lead_name || teamLead?.name || "", "Team Lead");

  return {
    ...row,
    title: row.name,
    description: row.description || "",
    mentorName,
    mentorEmail: row.mentor,
    teamLeadName,
    teamLeadEmail: teamLead?.email || "",
    teamNames: teamMembers.map((member) => member?.name).filter(Boolean),
    members: teamMembers
      .map((member) => member?.email || member?.usn || member?.name)
      .filter(Boolean),
    teamMembers,
  };
}

function buildProjectWorkspaceLink(projectId) {
  const baseUrl = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${baseUrl}/projects/${projectId}/board`;
}

function buildAssignmentRecipients({ mentorEmail, mentorName, teamMembers, projectId, projectName, creatorEmail, creatorName }) {
  const recipients = [];

  const pushRecipient = (email, name, role) => {
    const normalizedEmail = String(email || "").trim();
    if (!normalizedEmail) {
      return;
    }

    recipients.push({
      email: normalizedEmail,
      name: String(name || normalizedEmail.split("@")[0] || "Member").trim(),
      role: String(role || "MEMBER").trim(),
      link: buildProjectWorkspaceLink(projectId),
      projectName,
    });
  };

  pushRecipient(mentorEmail, mentorName, "Mentor");

  (Array.isArray(teamMembers) ? teamMembers : []).forEach((member) => {
    pushRecipient(
      member?.email,
      member?.name,
      String(member?.role || "STUDENT").replace(/_/g, " ")
    );
  });

  const seen = new Set();
  return recipients.filter((recipient) => {
    const key = recipient.email.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// using canAccessProject and matchesIdentity from utils/projectAccess for consistent behavior

function normalizeBoardStatus(status, approvalStatus) {
  const normalizedStatus = String(status || "").trim().toLowerCase();
  const normalizedApproval = String(approvalStatus || "").trim().toLowerCase();

  if (["todo", "submitted", "completed", "rejected"].includes(normalizedStatus)) {
    return normalizedStatus;
  }

  if (normalizedStatus === "completed" || normalizedStatus === "completed_task") {
    return "completed";
  }

  if (normalizedStatus === "review") {
    return normalizedApproval === "rejected" ? "rejected" : "submitted";
  }

  if (normalizedStatus === "task" || normalizedStatus === "pending") {
    return "todo";
  }

  if (normalizedApproval === "rejected") {
    return "rejected";
  }

  if (normalizedApproval === "approved" || normalizedApproval === "mentor-approved" || normalizedApproval === "manager-approved") {
    return "completed";
  }

  return "todo";
}

function normalizeBoardType(taskType) {
  const normalized = String(taskType || "weekly").trim().toLowerCase();
  if (normalized === "task") {
    return "task";
  }
  if (normalized === "daily") {
    return "daily";
  }
  return "weekly";
}

function toBoardItem(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    type: normalizeBoardType(row.taskType || row.task_type),
    status: normalizeBoardStatus(row.status, row.approvalStatus || row.approval_status),
    assignedTo: row.assignedTo || row.assignee || "",
    assignedToUserId: row.assignedToUserId || row.assigned_to_user_id || null,
    createdAt: row.createdAt || row.created_at || null,
    dueDate: row.dueDate || row.due_date || null,
    order: Number(row.order || row.order_index || 0),
  };
}

router.get("/", async (req, res) => {
  try {
    await ensureProjectSchema();
    const result = await pool.query(
      `SELECT id, name, description, mentor, mentor_name, team_lead_name, department,
              progress,
              team_count AS "teamCount",
              team_members AS "teamMembers",
              due_date AS "dueDate",
              accent,
              created_at AS "createdAt"
       FROM projects
       ORDER BY created_at DESC`
    );

    const serialized = result.rows.map(serializeProject);
    const visibleProjects = serialized.filter((project) => canAccessProject(project, req.user));

    if (debugProjectAccess) {
      // eslint-disable-next-line no-console
      console.log("[projects] fetching for user", {
        id: req.user?.id,
        email: req.user?.email,
        role: normalizeRole(req.user?.role),
        totalProjects: serialized.length,
        visibleProjects: visibleProjects.length,
      });
    }

    res.json(visibleProjects);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch projects." });
  }
});

router.get("/:id/board", async (req, res) => {
  const { id } = req.params;

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ message: "Invalid project id." });
  }

  try {
    await ensureProjectSchema();
    const projectResult = await pool.query(
      `SELECT id, name, description, mentor, mentor_name, team_lead_name, department,
              progress,
              team_count AS "teamCount",
              team_members AS "teamMembers",
              due_date AS "dueDate",
              accent,
              created_at AS "createdAt"
       FROM projects
       WHERE id = $1`,
      [Number(id)]
    );

    if (projectResult.rowCount === 0) {
      return res.status(404).json({ message: "Project not found." });
    }

    const project = serializeProject(projectResult.rows[0]);
    if (!canAccessProject(project, req.user)) {
      return res.status(403).json({ message: "Access denied for this project." });
    }

    const tasksResult = await pool.query(
      `SELECT id,
              title,
              description,
              status,
              task_type AS "taskType",
              assignee AS "assignedTo",
              assigned_to_user_id AS "assignedToUserId",
              approval_status AS "approvalStatus",
              updated_at AS "createdAt",
              due_date AS "dueDate",
              order_index AS "order"
       FROM tasks
       WHERE project_id = $1
       ORDER BY
         CASE
           WHEN LOWER(status) IN ('todo', 'task', 'pending') THEN 1
           WHEN LOWER(status) IN ('submitted', 'review', 'in_progress') THEN 2
           WHEN LOWER(status) = 'completed' THEN 3
           WHEN LOWER(status) = 'rejected' THEN 4
           ELSE 5
         END,
         order_index ASC,
         updated_at ASC`,
      [Number(id)]
    );

    const items = tasksResult.rows.map(toBoardItem);
    const grouped = {
      todo: items.filter((item) => item.status === "todo"),
      submitted: items.filter((item) => item.status === "submitted"),
      completed: items.filter((item) => item.status === "completed"),
      rejected: items.filter((item) => item.status === "rejected"),
    };

    return res.json({
      projectId: Number(id),
      grouped,
      all: items,
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch project board." });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ message: "Invalid project id." });
  }

  try {
    await ensureProjectSchema();
    const result = await pool.query(
      `SELECT id, name, description, mentor, mentor_name, team_lead_name, department,
              progress,
              team_count AS "teamCount",
              team_members AS "teamMembers",
              due_date AS "dueDate",
              accent,
              created_at AS "createdAt"
       FROM projects
       WHERE id = $1`,
      [Number(id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Project not found." });
    }

    const project = serializeProject(result.rows[0]);
    if (!canAccessProject(project, req.user)) {
      return res.status(403).json({ message: "Access denied for this project." });
    }

    return res.json(project);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch project." });
  }
});

router.post("/", projectWriteLimiter, validateBody(projectUpsertSchema), requireRole("admin"), async (req, res) => {
  const {
    name,
    title,
    description,
    mentor,
    mentorName,
    mentorEmail,
    department,
    teamCount,
    teamMembers,
    members,
    teamLeadName,
    teamLeadEmail,
    dueDate,
    deadline,
    accent,
  } = req.body;

  const resolvedName = String(name || title || "").trim();
  const resolvedDescription = String(description || "").trim();
  const resolvedMentor = String(mentor || mentorEmail || "").trim();
  const resolvedMentorName = String(mentorName || mentor || mentorEmail || "").trim();
  const resolvedDepartment = String(department || "").trim();
  const resolvedDueDate = dueDate || deadline || null;
  const resolvedTeamLeadName = String(teamLeadName || "").trim();
  const resolvedTeamMembers = await normalizeMembersAsync({
    teamMembers,
    members,
    teamLeadEmail,
    teamLeadName: resolvedTeamLeadName,
    mentorEmail,
    mentor,
  });
  const hasLead = resolvedTeamMembers.some((member) => String(member?.role || "").toUpperCase() === "TEAM_LEAD");
  const resolvedTeamCount = Number(teamCount) || resolvedTeamMembers.length || (hasLead ? 1 : 0) || 1;

  if (!resolvedName || !resolvedMentor || !resolvedDepartment) {
    return res.status(400).json({ message: "Project title, mentor email/name, and department are required." });
  }

  try {
    await ensureProjectSchema();
    const result = await pool.query(
      `INSERT INTO projects (name, description, mentor, mentor_name, department, team_count, team_members, team_lead_name, due_date, accent)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
       RETURNING id, name, description, mentor, mentor_name, team_lead_name, department,
                 progress,
                 team_count AS "teamCount",
                 team_members AS "teamMembers",
                 due_date AS "dueDate",
                 accent,
                 created_at AS "createdAt"`,
      [
        resolvedName,
        resolvedDescription,
        resolvedMentor,
        resolvedMentorName,
        resolvedDepartment,
        resolvedTeamCount,
        JSON.stringify(resolvedTeamMembers),
        resolvedTeamLeadName,
        resolvedDueDate,
        accent || null,
      ]
    );

    const createdProject = serializeProject(result.rows[0]);
    const recipients = buildAssignmentRecipients({
      mentorEmail: createdProject.mentorEmail,
      mentorName: resolvedMentorName || createdProject.mentorName,
      teamMembers: createdProject.teamMembers,
      projectId: createdProject.id,
      projectName: createdProject.name,
      creatorEmail: req.user?.email,
      creatorName: req.user?.name,
    });

    console.log("[project:create] queued assignment emails:", recipients.map((recipient) => ({
      to: recipient.email,
      role: recipient.role,
      projectName: recipient.projectName,
    })));

    queueProjectAssignmentEmails(recipients, {
      projectId: createdProject.id,
      projectName: createdProject.name,
      source: "project:create",
    });

    return res.status(201).json({
      ...createdProject,
      emailQueued: recipients.length > 0,
      emailRecipientCount: recipients.length,
    });
  } catch (error) {
    console.error("[project:create] failed:", error);
    return res.status(500).json({ message: "Database error while creating project." });
  }
});

router.put("/:id", projectWriteLimiter, validateBody(projectUpsertSchema), requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const {
    name,
    title,
    description,
    mentor,
    mentorName,
    mentorEmail,
    department,
    teamCount,
    teamMembers,
    members,
    teamLeadName,
    teamLeadEmail,
    dueDate,
    deadline,
    progress,
    accent,
  } = req.body;

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ message: "Invalid project id." });
  }

  const resolvedName = String(name || title || "").trim();
  const resolvedDescription = String(description || "").trim();
  const resolvedMentor = String(mentor || mentorEmail || "").trim();
  const resolvedMentorName = String(mentorName || "").trim();
  const resolvedDepartment = String(department || "").trim();
  const resolvedDueDate = dueDate || deadline || null;
  const resolvedTeamLeadName = String(teamLeadName || "").trim();
  const resolvedTeamMembers = await normalizeMembersAsync({
    teamMembers,
    members,
    teamLeadEmail,
    teamLeadName: resolvedTeamLeadName,
    mentorEmail,
    mentor,
  });
  const hasLead = resolvedTeamMembers.some((member) => String(member?.role || "").toUpperCase() === "TEAM_LEAD");
  const resolvedTeamCount = Number(teamCount) || resolvedTeamMembers.length || (hasLead ? 1 : 0) || 1;
  const hasProgress = progress !== undefined && progress !== null && progress !== "";
  const resolvedProgress = hasProgress ? Math.max(0, Math.min(100, Number(progress) || 0)) : null;

  if (!resolvedName || !resolvedMentor || !resolvedDepartment) {
    return res.status(400).json({ message: "Project title, mentor email/name, and department are required." });
  }

  try {
    await ensureProjectSchema();
    const result = await pool.query(
      `UPDATE projects
       SET name = $1,
           description = $2,
           mentor = $3,
           mentor_name = $4,
           department = $5,
           team_count = $6,
           team_members = $7::jsonb,
           team_lead_name = $8,
           due_date = $9,
           accent = COALESCE($10, accent),
           progress = COALESCE($11, progress)
       WHERE id = $12
       RETURNING id, name, description, mentor, mentor_name, team_lead_name, department,
                 progress,
                 team_count AS "teamCount",
                 team_members AS "teamMembers",
                 due_date AS "dueDate",
                 accent,
                 created_at AS "createdAt"`,
      [
        resolvedName,
        resolvedDescription,
        resolvedMentor,
        resolvedMentorName,
        resolvedDepartment,
        resolvedTeamCount,
        JSON.stringify(resolvedTeamMembers),
        resolvedTeamLeadName,
        resolvedDueDate,
        accent || null,
        resolvedProgress,
        Number(id),
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Project not found." });
    }

    return res.json(serializeProject(result.rows[0]));
  } catch {
    return res.status(500).json({ message: "Database error while updating project." });
  }
});

router.patch("/:id/complete", requireRole("admin"), async (req, res) => {
  const { id } = req.params;

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ message: "Invalid project id." });
  }

  try {
    await ensureProjectSchema();
    const result = await pool.query(
      `UPDATE projects
       SET progress = 100
       WHERE id = $1
       RETURNING id, name, description, mentor, department,
                 progress,
                 team_count AS "teamCount",
                 team_members AS "teamMembers",
                 due_date AS "dueDate",
                 accent,
                 created_at AS "createdAt"`,
      [Number(id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Project not found." });
    }

    return res.json(serializeProject(result.rows[0]));
  } catch {
    return res.status(500).json({ message: "Failed to mark project as completed." });
  }
});

router.delete("/:id", requireRole("admin"), async (req, res) => {
  const { id } = req.params;

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ message: "Invalid project id." });
  }

  try {
    const result = await pool.query(
      `DELETE FROM projects WHERE id = $1 RETURNING id`,
      [Number(id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Project not found." });
    }

    return res.status(204).send();
  } catch {
    return res.status(500).json({ message: "Failed to delete project." });
  }
});

router.__test__ = {
  canAccessProject,
  matchesIdentity,
};

module.exports = router;
