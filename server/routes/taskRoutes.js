const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLog");
const { notifyUsersByIds } = require("../utils/notifications");
const { isManagerRole, canManageTasks, normalizeRole } = require("../middleware/role");
const multer = require("multer");

router.use(authenticateToken);

let taskColumnsReady;

function ensureTaskColumns() {
  if (!taskColumnsReady) {
    taskColumnsReady = (async () => {
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'weekly'`);
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by TEXT DEFAULT ''`);
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT ''`);
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS start_time TIMESTAMP`);
      await pool.query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS end_time TIMESTAMP`);
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

function hasMentorOnlyUpdate(payload) {
  return (
    ["completed", "rejected"].includes(normalizeTaskStatus(payload.status)) ||
    ["approved", "rejected", "mentor-approved"].includes(normalizeApprovalStatus(payload.approvalStatus))
  );
}

function normalizeApprovalStatus(status) {
  const normalized = String(status || "not-requested").trim().toLowerCase().replace(/[\s_]+/g, "-");

  if (["approved", "rejected", "requested", "not-requested", "mentor-approved"].includes(normalized)) {
    return normalized;
  }

  return "not-requested";
}

function normalizeTaskStatus(status) {
  const normalized = String(status || "todo").trim().toLowerCase().replace(/[\s-]+/g, "_");

  if (["task", "todo"].includes(normalized)) {
    return "todo";
  }

  if (normalized === "in_progress") {
    return "submitted";
  }

  if (["review", "submitted"].includes(normalized)) {
    return "submitted";
  }

  if (normalized === "approved") {
    return "submitted";
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

  if (normalized === "todo") {
    return "TASK";
  }

  if (normalized === "submitted") {
    return "REVIEW";
  }

  if (normalized === "completed") {
    return "COMPLETED";
  }

  if (normalized === "rejected") {
    return "REVIEW";
  }

  return "TASK";
}

function normalizeApprovalForStatus(status, approvalStatus) {
  const normalizedStatus = normalizeTaskStatus(status);
  const normalizedApprovalStatus = normalizeApprovalStatus(approvalStatus);

  if (normalizedStatus === "completed") {
    return "approved";
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
  };
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

  if (from === "rejected" && ["todo", "submitted"].includes(to)) {
    return true;
  }

  return false;
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

  const params = [`%${q}%`];
  let whereProject = "";

  if (projectId && Number.isInteger(projectId)) {
    params.push(projectId);
    whereProject = ` AND project_id = $${params.length}`;
  }

  try {
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
      [Number(req.params.projectId)]
    );

    res.json(result.rows.map(normalizeTaskRow));
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tasks." });
  }
});

router.post("/", async (req, res) => {
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
  const actorRole = normalizeRole(req.user.role);
  const normalizedTaskType = normalizeTaskType(taskType);
  const resolvedDueDate = resolveDueDateInput(dueDate, normalizedTaskType);

  if (!title || !projectId) {
    return res.status(400).json({ message: "title and projectId are required." });
  }

  if (actorRole === "mentor") {
    return res.status(403).json({ message: "Mentor cannot create tasks." });
  }

  if (!canManageTasks(actorRole) && !isManagerRole(actorRole)) {
    return res.status(403).json({ message: "Only manager or team lead can create tasks." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks
        (title, status, description, due_date, start_time, end_time, task_type, created_by, assignee, comments, approval_status, rejection_reason, mentor_note, order_index, project_id)
       VALUES
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15)
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
        title,
        dbStatus,
        description || "",
        resolvedDueDate,
        startTime || null,
        endTime || null,
        normalizedTaskType,
        req.user.name || "Unknown",
        assignee || "",
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

    if (createdTask.assignee) {
      const assigneeUsers = await pool.query(
        `SELECT id FROM users WHERE LOWER(name) = LOWER($1)`,
        [createdTask.assignee]
      );

      await notifyUsersByIds({
        userIds: assigneeUsers.rows
          .map((row) => row.id)
          .filter((userId) => Number(userId) !== Number(req.user.id)),
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

  const containsApprovalTransition = tasks.some((task) => {
    const normalizedStatus = normalizeTaskStatus(task.status);
    const normalizedApprovalStatus = normalizeApprovalStatus(task.approvalStatus);
    return ["completed", "rejected"].includes(normalizedStatus) || ["approved", "rejected", "mentor-approved"].includes(normalizedApprovalStatus);
  });

  if (containsApprovalTransition && !isManagerRole(req.user.role)) {
    return res.status(403).json({ message: "Only manager can finalize task outcomes." });
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
      `SELECT id, status, assignee, approval_status AS "approvalStatus"
       FROM tasks
       WHERE id = ANY($1::int[])`,
      [taskIds]
    );
    const existingById = new Map(existingResult.rows.map((row) => [Number(row.id), row]));
    const actorRole = normalizeRole(req.user.role);

    if (actorRole === "student" || actorRole === "mentor") {
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

      if (actorRole === "team_lead" && ["completed", "rejected"].includes(nextStatus)) {
        throw new Error("TEAM_LEAD_FINALIZE_FORBIDDEN");
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
    if (error?.message === "TEAM_LEAD_FINALIZE_FORBIDDEN") {
      return res.status(403).json({ message: "Team lead cannot move tasks to completed or rejected." });
    }
    return res.status(500).json({ message: "Failed to reorder tasks." });
  } finally {
    client.release();
  }
});

router.put("/:taskId", async (req, res) => {
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
  const actorRole = normalizeRole(req.user.role);
  const normalizedTaskType = taskType === undefined ? null : normalizeTaskType(taskType);

  if (hasMentorOnlyUpdate({ status: normalizedStatus, approvalStatus: normalizedApprovalStatus }) && !isManagerRole(req.user.role)) {
    return res.status(403).json({ message: "Only manager can finalize task status." });
  }

  try {
    const existingTask = await pool.query(
      `SELECT id, title, status, approval_status AS "approvalStatus", assignee, project_id AS "projectId" FROM tasks WHERE id = $1`,
      [Number(req.params.taskId)]
    );

    if (existingTask.rowCount === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    const previousTask = existingTask.rows[0];
    const previousStatus = deriveAppStatus(previousTask.status, previousTask.approvalStatus);

    if (actorRole === "mentor") {
      return res.status(403).json({ message: "Mentor cannot edit tasks." });
    }

    if (actorRole === "student") {
      return res.status(403).json({ message: "Students cannot edit tasks." });
    }

    if (actorRole === "team_lead") {
      if (["completed", "rejected"].includes(normalizedStatus)) {
        return res.status(403).json({ message: "Team lead cannot finalize tasks." });
      }

      if (["approved", "rejected", "mentor-approved"].includes(normalizedApprovalStatus)) {
        return res.status(403).json({ message: "Team lead cannot change review outcomes." });
      }
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           status = COALESCE($2, status),
           description = COALESCE($3, description),
           due_date = $4,
           start_time = COALESCE($5, start_time),
           end_time = COALESCE($6, end_time),
           task_type = COALESCE($11, task_type),
           assignee = COALESCE($7, assignee),
           comments = COALESCE($8::jsonb, comments),
           approval_status = COALESCE($9, approval_status),
           mentor_note = COALESCE($10, mentor_note),
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
      const assigneeUsers = await pool.query(
        `SELECT id FROM users WHERE LOWER(name) = LOWER($1)`,
        [nextAssignee]
      );

      await notifyUsersByIds({
        userIds: assigneeUsers.rows
          .map((row) => row.id)
          .filter((userId) => Number(userId) !== Number(req.user.id)),
        message: `Task "${updatedTask.title}" was assigned to you in project ${updatedTask.projectId}.`,
        projectId: updatedTask.projectId,
        io,
      });
    }

    return res.json(updatedTask);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update task." });
  }
});

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
