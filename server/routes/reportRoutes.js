const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { normalizeRole } = require("../middleware/role");
const { logActivity } = require("../utils/activityLog");
const { notifyRoles } = require("../utils/notifications");
const { notifyUsersByIds } = require("../utils/notifications");

router.use(authenticateToken);

let reportColumnsReady;
const REPORT_STATUS = {
  SUBMITTED: "SUBMITTED",
  MENTOR_APPROVED: "MENTOR_APPROVED",
  COMPLETED: "COMPLETED",
  REJECTED: "REJECTED",
};

function toAppReportStatus(status) {
  const value = String(status || REPORT_STATUS.SUBMITTED).trim().toUpperCase();
  if (value === REPORT_STATUS.MENTOR_APPROVED) {
    return "mentor_approved";
  }

  if (value === REPORT_STATUS.COMPLETED) {
    return "completed";
  }

  if (value === REPORT_STATUS.REJECTED) {
    return "rejected";
  }

  return "submitted";
}

function normalizeReportRow(row) {
  return {
    ...row,
    status: toAppReportStatus(row.status),
  };
}

function toDbReportStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "mentor_approved") {
    return REPORT_STATUS.MENTOR_APPROVED;
  }

  if (value === "completed") {
    return REPORT_STATUS.COMPLETED;
  }

  if (value === "rejected") {
    return REPORT_STATUS.REJECTED;
  }

  return REPORT_STATUS.SUBMITTED;
}

function ensureReportColumns() {
  if (!reportColumnsReady) {
    reportColumnsReady = (async () => {
      await pool.query("ALTER TABLE reports ADD COLUMN IF NOT EXISTS file_path TEXT DEFAULT ''");
      await pool.query("ALTER TABLE reports ADD COLUMN IF NOT EXISTS task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL");
      await pool.query("ALTER TABLE reports ADD COLUMN IF NOT EXISTS mentor_approved_at TIMESTAMP");
      await pool.query("ALTER TABLE reports ADD COLUMN IF NOT EXISTS manager_approved_at TIMESTAMP");
      await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT ''");
      await pool.query("ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_status");
      await pool.query(
        "ALTER TABLE reports ADD CONSTRAINT chk_reports_status CHECK (status IN ('SUBMITTED', 'MENTOR_APPROVED', 'COMPLETED', 'REJECTED')) NOT VALID"
      );
    })();
  }

  return reportColumnsReady;
}

router.use(async (_req, res, next) => {
  try {
    await ensureReportColumns();
    return next();
  } catch {
    return res.status(500).json({ message: "Failed to initialize report schema." });
  }
});

const reportsUploadDir = path.join(__dirname, "..", "uploads", "reports");
if (!fs.existsSync(reportsUploadDir)) {
  fs.mkdirSync(reportsUploadDir, { recursive: true });
}

const reportUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, reportsUploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "");
      const baseName = path
        .basename(file.originalname || "report", ext)
        .replace(/[^a-zA-Z0-9-_]/g, "_")
        .slice(0, 80);
      cb(null, `${Date.now()}-${baseName || "report"}${ext}`);
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 },
});

router.get("/:projectId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              project_id AS "projectId",
              task_id AS "taskId",
              user_name AS "userName",
              type,
              content,
              file_path AS "filePath",
              status,
              mentor_comment AS "mentorComment",
              mentor_approved_at AS "mentorApprovedAt",
              manager_approved_at AS "managerApprovedAt",
              created_at AS "createdAt",
              (SELECT title FROM tasks WHERE tasks.id = reports.task_id) AS "taskTitle"
       FROM reports
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [Number(req.params.projectId)]
    );

    return res.json(result.rows.map(normalizeReportRow));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch reports." });
  }
});

router.post("/", reportUpload.single("file"), async (req, res) => {
  const { projectId, type, content, taskId } = req.body;
  const normalizedType = typeof type === "string" ? type.trim().toUpperCase() : "";
  const normalizedContent = typeof content === "string" ? content.trim() : "";
  const filePath = req.file ? `/uploads/reports/${req.file.filename}` : "";
  const reportContent = normalizedContent || (req.file ? `Uploaded file: ${req.file.originalname}` : "");
  const normalizedTaskId = Number(taskId);

  if (!projectId || !normalizedType || !reportContent || !normalizedTaskId) {
    return res.status(400).json({ message: "projectId, taskId, type, and either report content or file are required." });
  }

  if (normalizeRole(req.user?.role) !== "student") {
    return res.status(403).json({ message: "Only students can submit reports." });
  }

  if (!["DAILY", "WEEKLY"].includes(normalizedType)) {
    return res.status(400).json({ message: "type must be DAILY or WEEKLY." });
  }

  try {
    const taskCheck = await pool.query(
      `SELECT id,
              title,
              project_id AS "projectId",
              status,
              approval_status AS "approvalStatus"
       FROM tasks
       WHERE id = $1 AND project_id = $2`,
      [normalizedTaskId, Number(projectId)]
    );

    if (taskCheck.rowCount === 0) {
      return res.status(404).json({ message: "Linked task not found in this project." });
    }

    const linkedTask = taskCheck.rows[0];
    const statusValue = String(linkedTask.status || "").toUpperCase();
    const approvalValue = String(linkedTask.approvalStatus || "").toLowerCase();
    const isRejectedTask = statusValue === "REVIEW" && approvalValue === "rejected";
    const isTodoTask = statusValue === "TASK";

    if (!isTodoTask && !isRejectedTask) {
      return res.status(400).json({ message: "Reports can be linked only to To Do or Rejected tasks." });
    }

    const result = await pool.query(
      `INSERT INTO reports (project_id, task_id, user_name, type, content, status)
       VALUES ($1, $2, $3, $4, $5, 'SUBMITTED')
       RETURNING id,
                 project_id AS "projectId",
                 task_id AS "taskId",
                 user_name AS "userName",
                 type,
                 content,
                 file_path AS "filePath",
                 status,
                 mentor_comment AS "mentorComment",
                 mentor_approved_at AS "mentorApprovedAt",
                 manager_approved_at AS "managerApprovedAt",
                 created_at AS "createdAt",
                 (SELECT title FROM tasks WHERE tasks.id = reports.task_id) AS "taskTitle"`,
      [Number(projectId), normalizedTaskId, req.user.name || "Student", normalizedType, reportContent]
    );

    await pool.query(
      `UPDATE tasks
       SET status = 'REVIEW',
           approval_status = 'requested',
           rejection_reason = '',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [normalizedTaskId]
    );

    if (filePath) {
      await pool.query("UPDATE reports SET file_path = $1 WHERE id = $2", [filePath, result.rows[0].id]);
      result.rows[0].filePath = filePath;
    }

    const report = result.rows[0];
    const io = req.app.get("io");

    io.to(`project:${report.projectId}`).emit("reportAdded", {
      projectId: report.projectId,
      reportId: report.id,
    });

    await notifyRoles({
      roles: ["MENTOR"],
      message: `New ${report.type.toLowerCase()} report submitted in project ${report.projectId}`,
      projectId: report.projectId,
      io,
    });

    await logActivity({
      userName: req.user.name,
      action: `Submitted ${report.type.toLowerCase()} report${filePath ? " with file" : ""}`,
      projectId: report.projectId,
    });

    return res.status(201).json(normalizeReportRow(report));
  } catch (error) {
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // Ignore cleanup failures.
      }
    }

    return res.status(500).json({ message: "Failed to submit report." });
  }
});

router.patch("/:id/mentor-approve", requireRole("MENTOR"), async (req, res) => {
  const { mentorComment } = req.body || {};

  try {
    const existing = await pool.query(
      `SELECT id, status, project_id AS "projectId", task_id AS "taskId", type, user_name AS "userName"
       FROM reports
       WHERE id = $1`,
      [Number(req.params.id)]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Report not found." });
    }

    const current = existing.rows[0];
    if (String(current.status).toUpperCase() !== REPORT_STATUS.SUBMITTED) {
      return res.status(400).json({ message: "Only submitted reports can be mentor-approved." });
    }

    const result = await pool.query(
      `UPDATE reports
       SET status = $1,
           mentor_comment = COALESCE($2, mentor_comment),
           mentor_approved_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING id,
                 project_id AS "projectId",
                 task_id AS "taskId",
                 user_name AS "userName",
                 type,
                 content,
                 file_path AS "filePath",
                 status,
                 mentor_comment AS "mentorComment",
                 mentor_approved_at AS "mentorApprovedAt",
                 manager_approved_at AS "managerApprovedAt",
                 created_at AS "createdAt",
                 (SELECT title FROM tasks WHERE tasks.id = reports.task_id) AS "taskTitle"`,
      [REPORT_STATUS.MENTOR_APPROVED, mentorComment || null, Number(req.params.id)]
    );

    const updated = result.rows[0];
    const io = req.app.get("io");

    if (updated.taskId) {
      await pool.query(
        `UPDATE tasks
         SET status = 'REVIEW',
             approval_status = 'mentor-approved',
             rejection_reason = '',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [Number(updated.taskId)]
      );

      io.to(`project:${updated.projectId}`).emit("taskUpdated", {
        projectId: updated.projectId,
        taskId: updated.taskId,
        action: "updated",
      });
    }

    io.to(`project:${updated.projectId}`).emit("reportUpdated", {
      projectId: updated.projectId,
      reportId: updated.id,
      status: toAppReportStatus(updated.status),
    });

    await notifyRoles({
      roles: ["ADMIN"],
      message: `Mentor approved a ${updated.type.toLowerCase()} report in project ${updated.projectId}.`,
      projectId: updated.projectId,
      io,
    });

    await logActivity({
      userName: req.user.name,
      action: "Mentor approved report",
      projectId: updated.projectId,
    });

    return res.json(normalizeReportRow(updated));
  } catch (error) {
    return res.status(500).json({ message: "Failed to mentor-approve report." });
  }
});

router.patch("/:id/manager-approve", requireRole("ADMIN"), async (req, res) => {
  try {
    const existing = await pool.query(
      `SELECT id, status, project_id AS "projectId", task_id AS "taskId", type, user_name AS "userName"
       FROM reports
       WHERE id = $1`,
      [Number(req.params.id)]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Report not found." });
    }

    const current = existing.rows[0];
    if (String(current.status).toUpperCase() !== REPORT_STATUS.MENTOR_APPROVED) {
      return res.status(400).json({ message: "Manager can approve only mentor-approved reports." });
    }

    const result = await pool.query(
      `UPDATE reports
       SET status = $1,
           manager_approved_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id,
                 project_id AS "projectId",
                 task_id AS "taskId",
                 user_name AS "userName",
                 type,
                 content,
                 file_path AS "filePath",
                 status,
                 mentor_comment AS "mentorComment",
                 mentor_approved_at AS "mentorApprovedAt",
                 manager_approved_at AS "managerApprovedAt",
                 created_at AS "createdAt",
                 (SELECT title FROM tasks WHERE tasks.id = reports.task_id) AS "taskTitle"`,
      [REPORT_STATUS.COMPLETED, Number(req.params.id)]
    );

    const updated = result.rows[0];
    const io = req.app.get("io");

    if (updated.taskId) {
      await pool.query(
        `UPDATE tasks
         SET status = 'COMPLETED',
             approval_status = 'approved',
             rejection_reason = '',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [Number(updated.taskId)]
      );

      io.to(`project:${updated.projectId}`).emit("taskUpdated", {
        projectId: updated.projectId,
        taskId: updated.taskId,
        action: "updated",
      });
    }

    io.to(`project:${updated.projectId}`).emit("reportUpdated", {
      projectId: updated.projectId,
      reportId: updated.id,
      status: toAppReportStatus(updated.status),
    });

    await logActivity({
      userName: req.user.name,
      action: "Manager finalized report",
      projectId: updated.projectId,
    });

    const recipients = await pool.query(
      `SELECT id FROM users WHERE LOWER(name) = LOWER($1)`,
      [updated.userName]
    );

    await notifyUsersByIds({
      userIds: recipients.rows
        .map((row) => row.id)
        .filter((userId) => Number(userId) !== Number(req.user.id)),
      message: `Your ${updated.type.toLowerCase()} report in project ${updated.projectId} is completed.`,
      projectId: updated.projectId,
      io,
    });

    return res.json(normalizeReportRow(updated));
  } catch (error) {
    return res.status(500).json({ message: "Failed to manager-approve report." });
  }
});

router.patch("/:id/reject", requireRole("MENTOR"), async (req, res) => {
  const { mentorComment } = req.body || {};
  if (!String(mentorComment || "").trim()) {
    return res.status(400).json({ message: "Rejection reason is required." });
  }

  try {
    const existing = await pool.query(
      `SELECT id, status, project_id AS "projectId", task_id AS "taskId", type, user_name AS "userName"
       FROM reports
       WHERE id = $1`,
      [Number(req.params.id)]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Report not found." });
    }

    const current = existing.rows[0];
    if (String(current.status).toUpperCase() !== REPORT_STATUS.SUBMITTED) {
      return res.status(400).json({ message: "Only submitted reports can be rejected." });
    }

    const result = await pool.query(
      `UPDATE reports
       SET status = $1,
           mentor_comment = $2
       WHERE id = $3
       RETURNING id,
                 project_id AS "projectId",
                 task_id AS "taskId",
                 user_name AS "userName",
                 type,
                 content,
                 file_path AS "filePath",
                 status,
                 mentor_comment AS "mentorComment",
                 mentor_approved_at AS "mentorApprovedAt",
                 manager_approved_at AS "managerApprovedAt",
                 created_at AS "createdAt",
                 (SELECT title FROM tasks WHERE tasks.id = reports.task_id) AS "taskTitle"`,
      [REPORT_STATUS.REJECTED, String(mentorComment || "").trim(), Number(req.params.id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Report not found." });
    }

    const updated = result.rows[0];
    const io = req.app.get("io");

    if (updated.taskId) {
      await pool.query(
        `UPDATE tasks
         SET status = 'REVIEW',
             approval_status = 'rejected',
             rejection_reason = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [Number(updated.taskId), String(mentorComment || "").trim()]
      );

      io.to(`project:${updated.projectId}`).emit("taskUpdated", {
        projectId: updated.projectId,
        taskId: updated.taskId,
        action: "updated",
      });
    }

    io.to(`project:${updated.projectId}`).emit("reportUpdated", {
      projectId: updated.projectId,
      reportId: updated.id,
      status: toAppReportStatus(updated.status),
    });

    await logActivity({
      userName: req.user.name,
      action: "Mentor rejected report",
      projectId: updated.projectId,
    });

    const recipients = await pool.query(
      `SELECT id FROM users WHERE LOWER(name) = LOWER($1)`,
      [updated.userName]
    );

    await notifyUsersByIds({
      userIds: recipients.rows
        .map((row) => row.id)
        .filter((userId) => Number(userId) !== Number(req.user.id)),
      message: `Your ${updated.type.toLowerCase()} report in project ${updated.projectId} was rejected.`,
      projectId: updated.projectId,
      io,
    });

    return res.json(normalizeReportRow(updated));
  } catch (error) {
    return res.status(500).json({ message: "Failed to reject report." });
  }
});

router.put("/:id", requireRole("MENTOR", "ADMIN"), async (req, res) => {
  return res.status(400).json({
    message:
      "Use PATCH /reports/:id/mentor-approve, PATCH /reports/:id/manager-approve, or PATCH /reports/:id/reject.",
  });
});

module.exports = router;
