const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLog");
const { notifyUsersByIds } = require("../utils/notifications");
const {
  isManagerRole,
  canManageTasks,
  canCreateDailyTask,
  canCreateWeeklyTask,
  normalizeRole,
} = require("../middleware/role");
const { canAccessProject, resolveProjectScopedRole } = require("../utils/projectAccess");
const multer = require("multer");
const { validateBody } = require("../middleware/validate");
const { taskCreateSchema, taskUpdateSchema } = require("../validation/schemas");
const { taskWriteLimiter } = require("../middleware/rateLimiters");

router.use(authenticateToken);

let taskColumnsReady;

function ensureTaskColumns() {
  if (!taskColumnsReady) {
    taskColumnsReady = (async () => {
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'todo'`);
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'weekly'`);
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT ''`);
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT ''`);
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_time TIMESTAMP`);
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_time TIMESTAMP`);
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`);
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_link TEXT DEFAULT ''`);
    })();
  }

  return taskColumnsReady;
}

router.use(async (_req, res, next) => {
  try {
    await ensureTaskColumns();
    return next();
  } catch {
    return res.status(500).json({ message: "Failed to initialize task schema." });
  }
});

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

async function getProjectMemberUserIds(projectId, excludeUserId) {
  const projectResult = await pool.query(
    `SELECT team_members AS "teamMembers"
     FROM projects
     WHERE id = $1
     LIMIT 1`,
    [Number(projectId)]
  );

  if (projectResult.rowCount === 0) {
    return [];
  }

  const teamMembers = Array.isArray(projectResult.rows[0].teamMembers)
    ? projectResult.rows[0].teamMembers
    : [];

  const emailKeys = [];
  const nameKeys = [];
  teamMembers.forEach((member) => {
    const email = String(member?.email || "").trim().toLowerCase();
    const name = String(member?.name || "").trim().toLowerCase();
    if (email) {
      emailKeys.push(email);
    }
    if (name) {
      nameKeys.push(name);
    }
  });

  if (emailKeys.length === 0 && nameKeys.length === 0) {
    return [];
  }

  const usersResult = await pool.query(
    `SELECT id
     FROM users
     WHERE (
       (array_length($1::text[], 1) IS NOT NULL AND LOWER(COALESCE(email, '')) = ANY($1::text[]))
       OR (array_length($2::text[], 1) IS NOT NULL AND LOWER(COALESCE(name, '')) = ANY($2::text[]))
     )`,
    [emailKeys.length ? [...new Set(emailKeys)] : null, nameKeys.length ? [...new Set(nameKeys)] : null]
  );

  return [...new Set(usersResult.rows
    .map((row) => Number(row.id))
    .filter((userId) => userId && userId !== Number(excludeUserId)))];
}

async function getUserIdsByAssigneeValue(assigneeValue) {
  const assignee = String(assigneeValue || "").trim();
  if (!assignee) {
    return [];
  }

  const assigneeResult = await pool.query(
    `SELECT id
     FROM users
     WHERE LOWER(COALESCE(name, '')) = LOWER($1)
        OR LOWER(COALESCE(email, '')) = LOWER($1)`,
    [assignee]
  );

  return [...new Set(assigneeResult.rows.map((row) => Number(row.id)).filter(Boolean))];
}

function hasMentorOnlyUpdate(payload) {
  return (
    ["completed", "rejected"].includes(normalizeTaskStatus(payload.status)) ||
    ["approved", "manager-approved", "rejected", "mentor-approved"].includes(normalizeApprovalStatus(payload.approvalStatus))
  );
}

function normalizeApprovalStatus(status) {
  const normalized = String(status || "not-requested").trim().toLowerCase().replace(/[\s_]+/g, "-");

  if (["approved", "manager-approved", "rejected", "requested", "not-requested", "mentor-approved"].includes(normalized)) {
    return normalized;
  }

  return "not-requested";
}

function normalizeTaskStatus(status) {
  const normalized = String(status || "todo").trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (["task", "todo", "pending"].includes(normalized)) {
    return "todo";
  }

  if (normalized === "in_progress") {
    return "submitted";
  }

  if (["review", "submitted"].includes(normalized)) {
    return "submitted";
  }

  if (normalized === "approved") {
    return "completed";
  }

  if (normalized === "completed") {
    return "completed";
  }

  if (normalized === "rejected") {
    return "rejected";
  }

  return "todo";
}

function normalizeTaskType(taskType) {
  const normalized = String(taskType || "weekly").trim().toLowerCase();
  return normalized === "daily" ? "daily" : "weekly";
}

function dateStringFromOffset(daysOffset) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().slice(0, 10);
}

function resolveDueDateInput(dueDate, taskType) {
  if (dueDate) {
    return dueDate;
  }

  const normalizedTaskType = normalizeTaskType(taskType);
  return normalizedTaskType === "daily" ? dateStringFromOffset(0) : dateStringFromOffset(7);
}

function deriveAppStatus(status, approvalStatus) {
  const normalizedStatus = normalizeTaskStatus(status);
  const normalizedApprovalStatus = normalizeApprovalStatus(approvalStatus);

  if (normalizedStatus === "completed") {
    return "completed";
  }

  if (normalizedStatus === "submitted" && normalizedApprovalStatus === "rejected") {
    return "rejected";
  }

  return normalizedStatus;
}

function toDbTaskStatus(status) {
  const normalized = normalizeTaskStatus(status);

  if (normalized === "submitted") {
    return "REVIEW";
  }

  if (normalized === "completed") {
    return "COMPLETED";
  }

  return "TASK";
}

function normalizeApprovalForStatus(status, approvalStatus) {
  const normalizedStatus = normalizeTaskStatus(status);
  const normalizedApprovalStatus = normalizeApprovalStatus(approvalStatus);

  if (normalizedStatus === "completed") {
    return "manager-approved";
  }

  if (normalizedStatus === "rejected") {
    return "rejected";
  }

  if (normalizedStatus === "submitted" && normalizedApprovalStatus === "approved") {
    return "mentor-approved";
  }

  if (normalizedStatus === "submitted" && normalizedApprovalStatus === "not-requested") {
    return "requested";
  }

  return normalizedApprovalStatus;
}

function normalizeTaskRow(row) {
  if (!row) {
    return row;
  }

  const approvalStatus = normalizeApprovalStatus(row.approvalStatus || row.approval_status);

  return {
    ...row,
    status: deriveAppStatus(row.status, approvalStatus),
    approvalStatus,
    taskType: normalizeTaskType(row.taskType || row.task_type),
    startTime: row.startTime || row.start_time || null,
    endTime: row.endTime || row.end_time || null,
    assignedToUserId: row.assignedToUserId || row.assigned_to_user_id || null,
    assignedByUserId: row.assignedByUserId || row.assigned_by_user_id || null,
    submissionLink: row.submissionLink || row.submission_link || "",
  };
}

function canManageTaskTransition(actorRole, taskType, fromStatus, toStatus, isOwnTask) {
  const normalizedActorRole = normalizeRole(actorRole);
  const normalizedTaskType = normalizeTaskType(taskType);
  const previousStatus = normalizeTaskStatus(fromStatus);
  const nextStatus = normalizeTaskStatus(toStatus);

  if (previousStatus === nextStatus) {
    return true;
  }

  if (isOwnTask && previousStatus === "todo" && nextStatus === "submitted") {
    return true;
  }

  if (normalizedTaskType === "daily") {
    return normalizedActorRole === "team_lead" && previousStatus === "submitted" && ["completed", "rejected"].includes(nextStatus);
  }

  if (normalizedTaskType === "weekly") {
    return (normalizedActorRole === "mentor" || normalizedActorRole === "admin") && previousStatus === "submitted" && ["completed", "rejected"].includes(nextStatus);
  }

  return false;
}

function canUpdateTaskDetails(actorRole, taskType) {
  const normalizedActorRole = normalizeRole(actorRole);
  const normalizedTaskType = normalizeTaskType(taskType);

  if (normalizedActorRole === "admin") {
    return true;
  }

  if (normalizedActorRole === "team_lead") {
    return normalizedTaskType === "daily";
  }

  return false;
}

function canStudentChangeStatus(status) {
  return ["todo", "submitted"].includes(normalizeTaskStatus(status));
}

function isTaskOwnedByStudent(task, user) {
  const assignee = String(task?.assignee || "").trim().toLowerCase();
  const studentName = String(user?.name || "").trim().toLowerCase();
  const studentEmail = String(user?.email || "").trim().toLowerCase();

  if (!assignee) {
    return false;
  }

  return assignee === studentName || assignee === studentEmail;
}

function canStudentTransition(fromStatus, toStatus) {
  const from = normalizeTaskStatus(fromStatus);
  const to = normalizeTaskStatus(toStatus);

  if (from === to) {
    return true;
  }

  if (from === "todo" && to === "submitted") {
    return true;
  }

  return false;
}

function canMentorOrLeadTransition(fromStatus, toStatus) {
  const from = normalizeTaskStatus(fromStatus);
  const to = normalizeTaskStatus(toStatus);

  if (from === to) {
    return true;
  }

  return from === "submitted" && ["completed", "rejected"].includes(to);
}

async function fetchTaskById(taskId) {
  return pool.query(
    `SELECT id,
            title,
            status,
            description,
            due_date AS "dueDate",
          start_time AS "startTime",
          end_time AS "endTime",
           task_type AS "taskType",
           created_by AS "createdBy",
            assignee,
            comments,
            approval_status AS "approvalStatus",
            rejection_reason AS "rejectionReason",
            mentor_note AS "mentorNote",
            order_index AS "order",
            updated_at AS "updatedAt",
            project_id AS "projectId"
     FROM tasks
     WHERE id = $1`,
    [Number(taskId)]
  );
}

router.get("/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const projectId = req.query.projectId ? Number(req.query.projectId) : null;

  if (!q) {
    return res.json([]);
  }

  if (!projectId || Number.isNaN(projectId)) {
    return res.status(400).json({ message: "projectId is required." });
  }

  try {
    const projectResult = await pool.query(
      `SELECT id,
              mentor,
              mentor_name AS "mentorName",
              team_lead_name AS "teamLeadName",
              team_members AS "teamMembers"
       FROM projects
       WHERE id = $1
       LIMIT 1`,
      [projectId]
    );

    if (projectResult.rowCount === 0) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (!canAccessProject(projectResult.rows[0], req.user)) {
      return res.status(403).json({ message: "Access denied for this project." });
    }

  const params = [`%${q}%`];
  let whereProject = "";

  if (Number.isInteger(projectId)) {
    params.push(projectId);
    whereProject = ` AND project_id = $${params.length}`;
  }

    const result = await pool.query(
      `SELECT id,
              title,
              status,
              description,
              due_date AS "dueDate",
              start_time AS "startTime",
              end_time AS "endTime",
              task_type AS "taskType",
              created_by AS "createdBy",
              assigned_to_user_id AS "assignedToUserId",
              assigned_by_user_id AS "assignedByUserId",
              submission_link AS "submissionLink",
              assignee,
              comments,
              approval_status AS "approvalStatus",
              rejection_reason AS "rejectionReason",
              mentor_note AS "mentorNote",
              order_index AS "order",
              updated_at AS "updatedAt",
              project_id AS "projectId"
       FROM tasks
       WHERE (
         title ILIKE $1
         OR COALESCE(description, '') ILIKE $1
         OR COALESCE(assignee, '') ILIKE $1
       )${whereProject}
       ORDER BY updated_at DESC, id DESC
       LIMIT 200`,
      params
    );

    return res.json(result.rows.map(normalizeTaskRow));
  } catch {
    return res.status(500).json({ message: "Failed to search tasks." });
  }
});

router.get("/:projectId", async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const projectResult = await pool.query(
      `SELECT id,
              mentor,
              mentor_name AS "mentorName",
              team_lead_name AS "teamLeadName",
              team_members AS "teamMembers"
       FROM projects
       WHERE id = $1
       LIMIT 1`,
      [projectId]
    );

    if (projectResult.rowCount === 0) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (!canAccessProject(projectResult.rows[0], req.user)) {
      return res.status(403).json({ message: "Access denied for this project." });
    }

    const result = await pool.query(
      `SELECT id,
              title,
              status,
              description,
              due_date AS "dueDate",
              start_time AS "startTime",
              end_time AS "endTime",
              task_type AS "taskType",
              created_by AS "createdBy",
              assigned_to_user_id AS "assignedToUserId",
              assigned_by_user_id AS "assignedByUserId",
              submission_link AS "submissionLink",
              assignee,
              comments,
              approval_status AS "approvalStatus",
              rejection_reason AS "rejectionReason",
              mentor_note AS "mentorNote",
              order_index AS "order",
              updated_at AS "updatedAt",
              project_id AS "projectId"
       FROM tasks
       WHERE project_id = $1
       ORDER BY status, order_index, id`,
      [projectId]
    );

    res.json(result.rows.map(normalizeTaskRow));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tasks." });
  }
});

router.post("/", taskWriteLimiter, validateBody(taskCreateSchema), async (req, res) => {
  const {
    title,
    status,
    description,
    dueDate,
    startTime,
    endTime,
    taskType,
    assignee,
    comments,
    approvalStatus,
    mentorNote,
    rejectionReason,
    order,
    projectId,
  } = req.body;

  const normalizedStatus = normalizeTaskStatus(status);
  const normalizedApprovalStatus = normalizeApprovalForStatus(
    normalizedStatus,
    normalizeApprovalStatus(approvalStatus || "not-requested")
  );
  const dbStatus = toDbTaskStatus(normalizedStatus);
  const actorRole = await resolveProjectScopedRole(projectId, req.user);
  const normalizedTaskType = normalizeTaskType(taskType);
  const resolvedDueDate = resolveDueDateInput(dueDate, normalizedTaskType);

  if (!title || !projectId) {
    return res.status(400).json({ message: "title and projectId are required." });
  }

  const projectResult = await pool.query(
    `SELECT id,
            mentor,
            mentor_name AS "mentorName",
            team_lead_name AS "teamLeadName",
            team_members AS "teamMembers"
     FROM projects
     WHERE id = $1
     LIMIT 1`,
    [Number(projectId)]
  );

  if (projectResult.rowCount === 0) {
    return res.status(404).json({ message: "Project not found." });
  }

  if (!canAccessProject(projectResult.rows[0], req.user)) {
    return res.status(403).json({ message: "Access denied for this project." });
  }

  if (normalizedTaskType === "daily" && !canCreateDailyTask(actorRole)) {
    return res.status(403).json({ message: "Only team lead can create daily tasks." });
  }

  if (normalizedTaskType === "weekly" && !canCreateWeeklyTask(actorRole)) {
    return res.status(403).json({ message: "Only manager can create weekly tasks." });
  }

  const assignedUserIds = await getUserIdsByAssigneeValue(assignee);
  const assignedToUserId = assignedUserIds[0] || null;

  try {
    const result = await pool.query(
      `INSERT INTO tasks
        (title, status, description, due_date, start_time, end_time, task_type, created_by, assignee, assigned_to_user_id, assigned_by_user_id, comments, approval_status, rejection_reason, mentor_note, order_index, project_id)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16, $17)
       RETURNING id,
                 title,
                 status,
                 description,
                 due_date AS "dueDate",
                 start_time AS "startTime",
                 end_time AS "endTime",
                 task_type AS "taskType",
                 created_by AS "createdBy",
                assigned_to_user_id AS "assignedToUserId",
                assigned_by_user_id AS "assignedByUserId",
                submission_link AS "submissionLink",
                 assignee,
                 comments,
                 approval_status AS "approvalStatus",
                 rejection_reason AS "rejectionReason",
                 mentor_note AS "mentorNote",
                 order_index AS "order",
                 updated_at AS "updatedAt",
                 project_id AS "projectId"`,
      [
        title,
        dbStatus,
        description || "",
        resolvedDueDate,
        startTime || null,
        endTime || null,
        normalizedTaskType,
        req.user.name || "Unknown",
        assignee || "",
        assignedToUserId,
        Number(req.user.id) || null,
        JSON.stringify(Array.isArray(comments) ? comments : []),
        normalizedApprovalStatus,
        rejectionReason || "",
        mentorNote || "",
        Number(order) || 0,
        Number(projectId),
      ]
    );

    const createdTask = normalizeTaskRow(result.rows[0]);
    const io = req.app.get("io");

    io.to(`project:${createdTask.projectId}`).emit("taskUpdated", {
      projectId: createdTask.projectId,
      taskId: createdTask.id,
      action: "created",
    });

    await logActivity({
      userName: req.user.name,
      action: `Added task: ${createdTask.title}`,
      projectId: createdTask.projectId,
    });

    if (actorRole === "admin" || actorRole === "team_lead") {
      const memberUserIds = await getProjectMemberUserIds(createdTask.projectId, req.user.id);
      await notifyUsersByIds({
        userIds: memberUserIds,
        message: `${req.user.name || "Manager"} assigned new ${createdTask.taskType} task \"${createdTask.title}\" in project ${createdTask.projectId}.`,
        projectId: createdTask.projectId,
        io,
      });
    }

    if (createdTask.assignee) {
      const assigneeUserIds = await getUserIdsByAssigneeValue(createdTask.assignee);

      await notifyUsersByIds({
        userIds: assigneeUserIds.filter((userId) => Number(userId) !== Number(req.user.id)),
        message: `You were assigned task "${createdTask.title}" in project ${createdTask.projectId}.`,
        projectId: createdTask.projectId,
        io,
      });
    }

    return res.status(201).json(createdTask);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create task." });
  }
});

router.put("/reorder", async (req, res) => {
  const { tasks } = req.body;

  if (!Array.isArray(tasks)) {
    return res.status(400).json({ message: "tasks array is required." });
  }

  const client = await pool.connect();
  let affectedProjectIds = [];

  try {
    await client.query("BEGIN");

    const taskIds = tasks.map((task) => Number(task.id)).filter(Boolean);
    if (taskIds.length) {
      const projectLookup = await client.query(
        `SELECT DISTINCT project_id FROM tasks WHERE id = ANY($1::int[])`,
        [taskIds]
      );
      affectedProjectIds = projectLookup.rows.map((row) => row.project_id);
    }

    const existingResult = await client.query(
      `SELECT id,
              status,
              task_type AS "taskType",
              assignee,
              approval_status AS "approvalStatus",
              project_id AS "projectId"
       FROM tasks
       WHERE id = ANY($1::int[])`,
      [taskIds]
    );
    const existingById = new Map(existingResult.rows.map((row) => [Number(row.id), row]));
    const scopedRoles = [];
    for (const affectedProjectId of affectedProjectIds) {
      // eslint-disable-next-line no-await-in-loop
      const scopedRole = await resolveProjectScopedRole(affectedProjectId, req.user);
      scopedRoles.push(scopedRole);
    }

    const canManageEveryProject = scopedRoles.every((role) => canManageTasks(role) || isManagerRole(role));
    if (!canManageEveryProject) {
      throw new Error("ROLE_REORDER_FORBIDDEN");
    }

    for (const task of tasks) {
      const incomingTaskId = Number(task.id);
      const existingTask = existingById.get(incomingTaskId);
      if (!existingTask) {
        continue;
      }

      const nextStatus = normalizeTaskStatus(task.status);
      const dbNextStatus = toDbTaskStatus(nextStatus);
      const nextApprovalStatus = task.approvalStatus === undefined
        ? null
        : normalizeApprovalForStatus(nextStatus, normalizeApprovalStatus(task.approvalStatus));
      const previousStatus = deriveAppStatus(existingTask.status, existingTask.approvalStatus);
      const taskType = normalizeTaskType(existingTask.taskType || existingTask.task_type);

      const scopedRole = await resolveProjectScopedRole(existingTask.projectId, req.user);
      if (scopedRole === "student") {
        const isOwnTask = isTaskOwnedByStudent(existingTask, req.user);
        if (!isOwnTask || !canStudentTransition(existingTask.status, nextStatus)) {
          throw new Error("STUDENT_TRANSITION_FORBIDDEN");
        }
      }

      if (taskType === "daily") {
        if (scopedRole === "team_lead" && !canMentorOrLeadTransition(existingTask.status, nextStatus)) {
          throw new Error("LEAD_TRANSITION_FORBIDDEN");
        }

        if ((scopedRole === "mentor" || scopedRole === "admin") && nextStatus !== previousStatus) {
          throw new Error("DAILY_TRANSITION_FORBIDDEN");
        }
      }

      if (taskType === "weekly") {
        if ((scopedRole === "mentor" || scopedRole === "admin") && !canMentorOrLeadTransition(existingTask.status, nextStatus)) {
          throw new Error("WEEKLY_REVIEW_FORBIDDEN");
        }

        if (scopedRole === "team_lead" && nextStatus !== previousStatus) {
          throw new Error("TEAM_LEAD_WEEKLY_FORBIDDEN");
        }
      }

      await client.query(
        `UPDATE tasks
         SET status = $1,
             order_index = $2,
             approval_status = COALESCE($3, approval_status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [dbNextStatus, Number(task.order) || 0, nextApprovalStatus, incomingTaskId]
      );
    }

    await client.query("COMMIT");

    const io = req.app.get("io");
    affectedProjectIds.forEach((projectId) => {
      io.to(`project:${projectId}`).emit("taskUpdated", {
        projectId,
        action: "reordered",
      });
    });

    if (affectedProjectIds[0]) {
      await logActivity({
        userName: req.user.name,
        action: "Reordered task board",
        projectId: affectedProjectIds[0],
      });
    }

    return res.json({ success: true });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error?.message === "ROLE_REORDER_FORBIDDEN") {
      return res.status(403).json({ message: "Only manager or team lead can reorder tasks." });
    }
    if (error?.message === "STUDENT_TRANSITION_FORBIDDEN") {
      return res.status(403).json({ message: "Students can only move their own tasks from To Do to Submitted." });
    }
    if (error?.message === "LEAD_TRANSITION_FORBIDDEN") {
      return res.status(403).json({ message: "Team lead can only move daily tasks from Submitted to Completed or Rejected." });
    }
    if (error?.message === "DAILY_TRANSITION_FORBIDDEN") {
      return res.status(403).json({ message: "Daily tasks can only be approved by the team lead." });
    }
    if (error?.message === "WEEKLY_REVIEW_FORBIDDEN") {
      return res.status(403).json({ message: "Weekly tasks can only be approved by mentor or manager." });
    }
    if (error?.message === "TEAM_LEAD_WEEKLY_FORBIDDEN") {
      return res.status(403).json({ message: "Team lead cannot finalize weekly tasks." });
    }
    return res.status(500).json({ message: "Failed to reorder tasks." });
  } finally {
    client.release();
  }
});

async function updateTaskHandler(req, res) {
  const {
    title,
    status,
    description,
    dueDate,
    startTime,
    endTime,
    taskType,
    assignee,
    comments,
    approvalStatus,
    mentorNote,
    rejectionReason,
    order,
  } = req.body;

  const normalizedStatus = status === undefined ? null : normalizeTaskStatus(status);
  const normalizedApprovalStatus = approvalStatus === undefined
    ? null
    : normalizeApprovalForStatus(normalizedStatus, normalizeApprovalStatus(approvalStatus));
  const dbStatus = normalizedStatus === null ? null : toDbTaskStatus(normalizedStatus);
  const normalizedTaskType = taskType === undefined ? null : normalizeTaskType(taskType);

  try {
    const existingTask = await pool.query(
      `SELECT id,
              title,
              status,
              task_type AS "taskType",
              approval_status AS "approvalStatus",
              assignee,
              project_id AS "projectId"
       FROM tasks
       WHERE id = $1`,
      [Number(req.params.taskId)]
    );

    if (existingTask.rowCount === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    const previousTask = existingTask.rows[0];
    const actorRole = await resolveProjectScopedRole(previousTask.projectId, req.user);
    const taskType = normalizeTaskType(previousTask.taskType || previousTask.task_type);
    const isOwnTask = isTaskOwnedByStudent(previousTask, req.user);
    const previousStatus = deriveAppStatus(previousTask.status, previousTask.approvalStatus);

    if (actorRole === "admin" && taskType === "daily") {
      return res.status(403).json({ message: "Manager cannot handle daily tasks." });
    }

    if (actorRole === "mentor" && taskType === "daily") {
      return res.status(403).json({ message: "Mentor cannot edit daily tasks." });
    }

    if (actorRole === "team_lead" && taskType !== "daily") {
      return res.status(403).json({ message: "Team lead can only manage daily tasks." });
    }

    if (actorRole === "student") {
      if (!isOwnTask) {
        return res.status(403).json({ message: "Students can only edit their own tasks." });
      }

      if (!normalizedStatus || !canStudentTransition(previousTask.status, normalizedStatus)) {
        return res.status(403).json({ message: "Students can only move their own tasks from To Do to Submitted." });
      }
    }

    if (normalizedStatus !== null && !canManageTaskTransition(actorRole, taskType, previousTask.status, normalizedStatus, isOwnTask)) {
      if (taskType === "daily") {
        return res.status(403).json({ message: "Daily tasks can only be approved by the team lead." });
      }

      return res.status(403).json({ message: "Weekly tasks can only be approved by mentor or manager." });
    }

    if (normalizedStatus === null && !canUpdateTaskDetails(actorRole, taskType)) {
      return res.status(403).json({ message: "You do not have permission to edit this task." });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           status = COALESCE($2, status),
           description = COALESCE($3, description),
           due_date = COALESCE($4, due_date),
           start_time = COALESCE($5, start_time),
           end_time = COALESCE($6, end_time),
           assignee = COALESCE($7, assignee),
           comments = COALESCE($8::jsonb, comments),
           approval_status = COALESCE($9, approval_status),
           mentor_note = COALESCE($10, mentor_note),
           task_type = COALESCE($11, task_type),
           order_index = COALESCE($12, order_index),
           rejection_reason = COALESCE($13, rejection_reason),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $14
       RETURNING id,
                 title,
                 status,
                 description,
                 due_date AS "dueDate",
                 start_time AS "startTime",
                 end_time AS "endTime",
                 task_type AS "taskType",
                 created_by AS "createdBy",
                 assignee,
                 comments,
                 approval_status AS "approvalStatus",
                 rejection_reason AS "rejectionReason",
                 mentor_note AS "mentorNote",
                 order_index AS "order",
                 updated_at AS "updatedAt",
                 project_id AS "projectId"`,
      [
        title || null,
        dbStatus,
        description || null,
        dueDate || null,
        startTime || null,
        endTime || null,
        assignee || null,
        Array.isArray(comments) ? JSON.stringify(comments) : null,
        normalizedApprovalStatus,
        mentorNote || null,
        normalizedTaskType,
        Number.isInteger(order) ? order : null,
        rejectionReason === undefined ? null : String(rejectionReason || ""),
        Number(req.params.taskId),
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    const updatedTask = normalizeTaskRow(result.rows[0]);
    const io = req.app.get("io");

    io.to(`project:${updatedTask.projectId}`).emit("taskUpdated", {
      projectId: updatedTask.projectId,
      taskId: updatedTask.id,
      action: "updated",
    });

    await logActivity({
      userName: req.user.name,
      action: `Updated task: ${updatedTask.title}`,
      projectId: updatedTask.projectId,
    });

    const previousAssignee = (existingTask.rows[0].assignee || "").trim().toLowerCase();
    const nextAssignee = (updatedTask.assignee || "").trim();
    const isNewAssignee = Boolean(nextAssignee) && previousAssignee !== nextAssignee.toLowerCase();

    if (isNewAssignee) {
      const assigneeUserIds = await getUserIdsByAssigneeValue(nextAssignee);

      await notifyUsersByIds({
        userIds: assigneeUserIds.filter((userId) => Number(userId) !== Number(req.user.id)),
        message: `Task "${updatedTask.title}" was assigned to you in project ${updatedTask.projectId}.`,
        projectId: updatedTask.projectId,
        io,
      });
    }

    if ((actorRole === "admin" || actorRole === "team_lead") && previousStatus !== updatedTask.status) {
      const memberUserIds = await getProjectMemberUserIds(updatedTask.projectId, req.user.id);
      await notifyUsersByIds({
        userIds: memberUserIds,
        message: `${req.user.name || "Manager"} updated task \"${updatedTask.title}\" to ${updatedTask.status} in project ${updatedTask.projectId}.`,
        projectId: updatedTask.projectId,
        io,
      });
    }

    return res.json(updatedTask);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update task." });
  }
}

router.put("/:taskId", taskWriteLimiter, validateBody(taskUpdateSchema), updateTaskHandler);
router.patch("/:taskId", taskWriteLimiter, validateBody(taskUpdateSchema), updateTaskHandler);

router.delete("/:taskId", async (req, res) => {
  if (!isManagerRole(req.user.role)) {
    return res.status(403).json({ message: "Only manager can delete tasks." });
  }

  try {
    const existing = await pool.query(
      `SELECT id, title, project_id AS "projectId" FROM tasks WHERE id = $1`,
      [Number(req.params.taskId)]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    const result = await pool.query("DELETE FROM tasks WHERE id = $1", [Number(req.params.taskId)]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    const deletedTask = existing.rows[0];
    const io = req.app.get("io");

    io.to(`project:${deletedTask.projectId}`).emit("taskUpdated", {
      projectId: deletedTask.projectId,
      taskId: deletedTask.id,
      action: "deleted",
    });

    await logActivity({
      userName: req.user.name,
      action: `Deleted task: ${deletedTask.title}`,
      projectId: deletedTask.projectId,
    });

    return res.status(204).send();
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete task." });
  }
});

router.get("/:taskId/comments", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              task_id AS "taskId",
              author,
              author_role AS "authorRole",
              text,
              created_at AS "createdAt"
       FROM task_comments
       WHERE task_id = $1
       ORDER BY created_at ASC, id ASC`,
      [Number(req.params.taskId)]
    );

    return res.json(result.rows);
  } catch {
    return res.status(500).json({ message: "Failed to fetch task comments." });
  }
});

router.post("/:taskId/comments", async (req, res) => {
  const { comment } = req.body || {};
  if (!comment || !String(comment).trim()) {
    return res.status(400).json({ message: "comment is required." });
  }

  try {
    const taskResult = await fetchTaskById(req.params.taskId);
    if (taskResult.rowCount === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    const result = await pool.query(
      `INSERT INTO task_comments (task_id, author, author_role, text)
       VALUES ($1, $2, $3, $4)
       RETURNING id,
                 task_id AS "taskId",
                 author,
                 author_role AS "authorRole",
                 text,
                 created_at AS "createdAt"`,
      [Number(req.params.taskId), req.user.name || "Unknown", normalizeRole(req.user.role), String(comment).trim()]
    );

    const task = taskResult.rows[0];
    await logActivity({
      userName: req.user.name,
      action: `Commented on task: ${task.title}`,
      projectId: task.projectId,
    });

    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(500).json({ message: "Failed to add task comment." });
  }
});

router.get("/:taskId/attachments", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              task_id AS "taskId",
              filename,
              file_path AS "filePath",
              size,
              uploaded_by AS "uploadedBy",
              created_at AS "createdAt"
       FROM task_attachments
       WHERE task_id = $1
       ORDER BY created_at DESC, id DESC`,
      [Number(req.params.taskId)]
    );

    return res.json(result.rows);
  } catch {
    return res.status(500).json({ message: "Failed to fetch task attachments." });
  }
});

router.post("/:taskId/attachments", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "file is required." });
  }

  try {
    const taskResult = await fetchTaskById(req.params.taskId);
    if (taskResult.rowCount === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    const publicPath = `/uploads/${req.file.filename}`;
    const result = await pool.query(
      `INSERT INTO task_attachments (task_id, filename, file_path, size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id,
                 task_id AS "taskId",
                 filename,
                 file_path AS "filePath",
                 size,
                 uploaded_by AS "uploadedBy",
                 created_at AS "createdAt"`,
      [
        Number(req.params.taskId),
        req.file.originalname,
        publicPath,
        req.file.size,
        req.user.name || "Unknown",
      ]
    );

    const task = taskResult.rows[0];
    await logActivity({
      userName: req.user.name,
      action: `Added attachment to task: ${task.title}`,
      projectId: task.projectId,
    });

    return res.status(201).json(result.rows[0]);
  } catch {
    return res.status(500).json({ message: "Failed to upload task attachment." });
  }
});

module.exports = router;
