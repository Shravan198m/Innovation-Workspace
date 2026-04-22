const router = require("express").Router();
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { isManagerRole, normalizeRole } = require("../middleware/role");
const { sendProjectAssignmentEmail } = require("../lib/email");

router.use(authenticateToken);

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

function normalizeMembers({ teamMembers, members, teamLeadEmail, mentorEmail, mentor }) {
  const sourceMembers = Array.isArray(teamMembers) && teamMembers.length > 0 ? teamMembers : members;
  const normalized = Array.isArray(sourceMembers)
    ? sourceMembers.map(toMemberObject).filter(Boolean)
    : [];
  const normalizedTeamLeadEmail = String(teamLeadEmail || "").trim().toLowerCase();

  const mentorIdentity = String(mentorEmail || mentor || "").trim().toLowerCase();
  const filtered = normalized.filter((member) => {
    if (!mentorIdentity) {
      return true;
    }

    const memberEmail = String(member.email || "").trim().toLowerCase();
    const memberName = String(member.name || "").trim().toLowerCase();
    return memberEmail !== mentorIdentity && memberName !== mentorIdentity;
  });

  if (!normalizedTeamLeadEmail) {
    return filtered.map((member) => ({
      ...member,
      role: String(member.role || "STUDENT").toUpperCase() === "TEAM_LEAD" ? "TEAM_LEAD" : "STUDENT",
    }));
  }

  let matchedTeamLead = false;
  const withTeamLeadRole = filtered.map((member) => {
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
    const localPart = normalizedTeamLeadEmail.split("@")[0] || "Team Lead";
    const teamLeadName = localPart
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");

    withTeamLeadRole.push({
      name: teamLeadName || "Team Lead",
      usn: "",
      email: normalizedTeamLeadEmail,
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
  const mentorName = formatNameFromValue(row.mentor, "Mentor");

  return {
    ...row,
    title: row.name,
    mentorName,
    mentorEmail: row.mentor,
    teamLeadEmail: teamLead?.email || "",
    teamNames: teamMembers.map((member) => member?.name).filter(Boolean),
    members: teamMembers
      .map((member) => member?.email || member?.usn || member?.name)
      .filter(Boolean),
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

function matchesIdentity(candidate, user) {
  const value = String(candidate || "").trim().toLowerCase();
  if (!value) {
    return false;
  }

  const email = String(user?.email || "").trim().toLowerCase();
  const name = String(user?.name || "").trim().toLowerCase();
  return value === email || value === name;
}

function canAccessProject(project, user) {
  if (isManagerRole(user?.role)) {
    return true;
  }

  const normalizedRole = normalizeRole(user?.role);

  if (normalizedRole === "mentor") {
    return matchesIdentity(project.mentor, user) || matchesIdentity(project.mentorEmail, user);
  }

  if (normalizedRole === "student" || normalizedRole === "team_lead") {
    const teamMembers = Array.isArray(project.teamMembers) ? project.teamMembers : [];
    return teamMembers.some((member) =>
      matchesIdentity(member?.email, user) || matchesIdentity(member?.name, user)
    );
  }

  return false;
}

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, mentor, department,
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

    res.json(visibleProjects);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch projects." });
  }
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!id || Number.isNaN(Number(id))) {
    return res.status(400).json({ message: "Invalid project id." });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, mentor, department,
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

router.post("/", requireRole("admin"), async (req, res) => {
  const {
    name,
    title,
    mentor,
    mentorEmail,
    department,
    teamCount,
    teamMembers,
    members,
    teamLeadEmail,
    dueDate,
    deadline,
    accent,
  } = req.body;

  const resolvedName = String(name || title || "").trim();
  const resolvedMentor = String(mentor || mentorEmail || "").trim();
  const resolvedDepartment = String(department || "").trim();
  const resolvedDueDate = dueDate || deadline || null;
  const resolvedTeamMembers = normalizeMembers({ teamMembers, members, teamLeadEmail, mentorEmail, mentor });
  const resolvedTeamCount = Number(teamCount) || resolvedTeamMembers.length || 1;

  if (!resolvedName || !resolvedMentor || !resolvedDepartment) {
    return res.status(400).json({ message: "Project title, mentor email/name, and department are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO projects (name, mentor, department, team_count, team_members, due_date, accent)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       RETURNING id, name, mentor, department,
                 progress,
                 team_count AS "teamCount",
                 team_members AS "teamMembers",
                 due_date AS "dueDate",
                 accent,
                 created_at AS "createdAt"`,
      [
        resolvedName,
        resolvedMentor,
        resolvedDepartment,
        resolvedTeamCount,
        JSON.stringify(resolvedTeamMembers),
        resolvedDueDate,
        accent || null,
      ]
    );

    const createdProject = serializeProject(result.rows[0]);
    const recipients = buildAssignmentRecipients({
      mentorEmail: createdProject.mentorEmail,
      mentorName: createdProject.mentorName,
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

    const emailSendResults = await Promise.allSettled(
      recipients.map((recipient) =>
        sendProjectAssignmentEmail(
          recipient.email,
          recipient.name,
          recipient.projectName,
          recipient.role,
          recipient.link
        )
      )
    );

    const emailSummaryResults = emailSendResults.map((result, index) => {
      const recipient = recipients[index];

      if (result.status === "fulfilled") {
        return {
          recipient: recipient?.email,
          status: "sent",
          messageId: result?.value?.data?.id || null,
        };
      }

      const reason = String(result?.reason?.message || "Unknown email send error");
      console.error(`Failed to send project assignment email to ${recipient?.email}:`, reason);
      return {
        recipient: recipient?.email,
        status: "failed",
        reason,
      };
    });

    const sentCount = emailSummaryResults.filter((item) => item.status === "sent").length;
    const failedCount = emailSummaryResults.length - sentCount;

    console.log("[project:create] assignment email batch finished:", {
      total: emailSummaryResults.length,
      sent: sentCount,
      failed: failedCount,
      results: emailSummaryResults,
    });

    return res.status(201).json({
      ...createdProject,
      emailSummary: {
        total: emailSummaryResults.length,
        sent: sentCount,
        failed: failedCount,
        results: emailSummaryResults,
      },
    });
  } catch (error) {
    console.error("[project:create] failed:", error);
    return res.status(500).json({ message: "Database error while creating project." });
  }
});

router.put("/:id", requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const {
    name,
    title,
    mentor,
    mentorEmail,
    department,
    teamCount,
    teamMembers,
    members,
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
  const resolvedMentor = String(mentor || mentorEmail || "").trim();
  const resolvedDepartment = String(department || "").trim();
  const resolvedDueDate = dueDate || deadline || null;
  const resolvedTeamMembers = normalizeMembers({ teamMembers, members, teamLeadEmail, mentorEmail, mentor });
  const resolvedTeamCount = Number(teamCount) || resolvedTeamMembers.length || 1;
  const hasProgress = progress !== undefined && progress !== null && progress !== "";
  const resolvedProgress = hasProgress ? Math.max(0, Math.min(100, Number(progress) || 0)) : null;

  if (!resolvedName || !resolvedMentor || !resolvedDepartment) {
    return res.status(400).json({ message: "Project title, mentor email/name, and department are required." });
  }

  try {
    const result = await pool.query(
      `UPDATE projects
       SET name = $1,
           mentor = $2,
           department = $3,
           team_count = $4,
           team_members = $5::jsonb,
           due_date = $6,
           accent = COALESCE($7, accent),
           progress = COALESCE($8, progress)
       WHERE id = $9
       RETURNING id, name, mentor, department,
                 progress,
                 team_count AS "teamCount",
                 team_members AS "teamMembers",
                 due_date AS "dueDate",
                 accent,
                 created_at AS "createdAt"`,
      [
        resolvedName,
        resolvedMentor,
        resolvedDepartment,
        resolvedTeamCount,
        JSON.stringify(resolvedTeamMembers),
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
    const result = await pool.query(
      `UPDATE projects
       SET progress = 100
       WHERE id = $1
       RETURNING id, name, mentor, department,
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

module.exports = router;
