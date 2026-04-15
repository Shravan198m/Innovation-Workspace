const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLog");
const { notifyUsersByIds } = require("../utils/notifications");
const multer = require("multer");

router.use(authenticateToken);

const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({ dest: uploadsDir });

function hasMentorOnlyUpdate(payload) {
  return (
    payload.status === "COMPLETED" ||
    payload.approvalStatus === "approved" ||
    payload.approvalStatus === "APPROVED"
  );
}

async function fetchTaskById(taskId) {
  return pool.query(
    `SELECT id,
            title,
            status,
            description,
            due_date AS "dueDate",
            assignee,
            comments,
            approval_status AS "approvalStatus",
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
              assignee,
              comments,
              approval_status AS "approvalStatus",
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

    return res.json(result.rows);
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
              assignee,
              comments,
              approval_status AS "approvalStatus",
              mentor_note AS "mentorNote",
              order_index AS "order",
              updated_at AS "updatedAt",
              project_id AS "projectId"
       FROM tasks
       WHERE project_id = $1
       ORDER BY status, order_index, id`,
      [Number(req.params.projectId)]
    );

    res.json(result.rows);
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
    assignee,
    comments,
    approvalStatus,
    mentorNote,
    order,
    projectId,
  } = req.body;

  if (!title || !status || !projectId) {
    return res.status(400).json({ message: "title, status, and projectId are required." });
  }

  if (status === "COMPLETED" && req.user.role !== "MENTOR" && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only mentor can create completed tasks." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO tasks
        (title, status, description, due_date, assignee, comments, approval_status, mentor_note, order_index, project_id)
       VALUES
        ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10)
       RETURNING id,
                 title,
                 status,
                 description,
                 due_date AS "dueDate",
                 assignee,
                 comments,
                 approval_status AS "approvalStatus",
                 mentor_note AS "mentorNote",
                 order_index AS "order",
                 updated_at AS "updatedAt",
                 project_id AS "projectId"`,
      [
        title,
        status,
        description || "",
        dueDate || null,
        assignee || "",
        JSON.stringify(Array.isArray(comments) ? comments : []),
        approvalStatus || "not-requested",
        mentorNote || "",
        Number(order) || 0,
        Number(projectId),
      ]
    );

    const createdTask = result.rows[0];
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

  const containsMentorOnlyTransition = tasks.some(
    (task) => task.status === "COMPLETED" || task.approvalStatus === "approved"
  );

  if (containsMentorOnlyTransition && req.user.role !== "MENTOR" && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only mentor can move tasks to completed." });
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

    for (const task of tasks) {
      await client.query(
        `UPDATE tasks
         SET status = $1,
             order_index = $2,
             approval_status = COALESCE($3, approval_status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [task.status, Number(task.order) || 0, task.approvalStatus || null, Number(task.id)]
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
    assignee,
    comments,
    approvalStatus,
    mentorNote,
    order,
  } = req.body;

  if (hasMentorOnlyUpdate({ status, approvalStatus }) && req.user.role !== "MENTOR" && req.user.role !== "ADMIN") {
    return res.status(403).json({ message: "Only mentor can approve or complete tasks." });
  }

  try {
    const existingTask = await pool.query(
      `SELECT assignee FROM tasks WHERE id = $1`,
      [Number(req.params.taskId)]
    );

    if (existingTask.rowCount === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           status = COALESCE($2, status),
           description = COALESCE($3, description),
           due_date = $4,
           assignee = COALESCE($5, assignee),
           comments = COALESCE($6::jsonb, comments),
           approval_status = COALESCE($7, approval_status),
           mentor_note = COALESCE($8, mentor_note),
           order_index = COALESCE($9, order_index),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING id,
                 title,
                 status,
                 description,
                 due_date AS "dueDate",
                 assignee,
                 comments,
                 approval_status AS "approvalStatus",
                 mentor_note AS "mentorNote",
                 order_index AS "order",
                 updated_at AS "updatedAt",
                 project_id AS "projectId"`,
      [
        title || null,
        status || null,
        description || null,
        dueDate || null,
        assignee || null,
        Array.isArray(comments) ? JSON.stringify(comments) : null,
        approvalStatus || null,
        mentorNote || null,
        Number.isInteger(order) ? order : null,
        Number(req.params.taskId),
      ]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Task not found." });
    }

    const updatedTask = result.rows[0];
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
      [Number(req.params.taskId), req.user.name || "Unknown", req.user.role || "STUDENT", String(comment).trim()]
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
