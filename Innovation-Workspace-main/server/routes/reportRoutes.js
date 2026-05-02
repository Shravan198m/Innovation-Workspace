const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");
const {
  normalizeRole,
  isMemberRole,
  canSubmitReports,
} = require("../middleware/role");
const { logActivity } = require("../utils/activityLog");
const { notifyRoles } = require("../utils/notifications");
const { notifyUsersByIds } = require("../utils/notifications");
const { canAccessProject, matchesIdentity, resolveProjectScopedRole } = require("../utils/projectAccess");

router.use(authenticateToken);

let reportColumnsReady;
const REPORT_STATUS = {
  SUBMITTED: "SUBMITTED",
  TL_APPROVED: "TL_APPROVED",
  FINAL_APPROVED: "FINAL_APPROVED",
  REJECTED: "REJECTED",
  MENTOR_APPROVED: "MENTOR_APPROVED",
  COMPLETED: "COMPLETED",
};

function normalizeReportType(type) {
  return String(type || "DAILY").trim().toUpperCase() === "WEEKLY" ? "WEEKLY" : "DAILY";
}

function toAppReportStatus(status) {
  const value = String(status || REPORT_STATUS.SUBMITTED).trim().toUpperCase();
  if (value === REPORT_STATUS.TL_APPROVED || value === REPORT_STATUS.MENTOR_APPROVED) {
    return "tl_approved";
  }

  if (value === REPORT_STATUS.FINAL_APPROVED || value === REPORT_STATUS.COMPLETED) {
    return "final_approved";
  }

  if (value === REPORT_STATUS.REJECTED) {
    return "rejected";
  }

  return "submitted";
}

function normalizeReportRow(row) {
  return {
    ...row,
    submittedBy: row.userName,
    status: toAppReportStatus(row.status),
  };
}

function toDbReportStatus(status) {
  const value = String(status || "").trim().toLowerCase();
  if (value === "tl_approved" || value === "mentor_approved") {
    return REPORT_STATUS.TL_APPROVED;
  }

  if (value === "final_approved" || value === "completed") {
    return REPORT_STATUS.FINAL_APPROVED;
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
      await pool.query("ALTER TABLE reports ADD COLUMN IF NOT EXISTS team_lead_approved_at TIMESTAMP");
      await pool.query("ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT ''");
      await pool.query("ALTER TABLE reports DROP CONSTRAINT IF EXISTS chk_reports_status");
      await pool.query(
        "ALTER TABLE reports ADD CONSTRAINT chk_reports_status CHECK (status IN ('SUBMITTED', 'TL_APPROVED', 'FINAL_APPROVED', 'REJECTED', 'MENTOR_APPROVED', 'COMPLETED')) NOT VALID"
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
    const projectResult = await pool.query(
      `SELECT id,
              mentor,
              mentor_name AS "mentorName",
              team_lead_name AS "teamLeadName",
              team_members AS "teamMembers"
       FROM projects
       WHERE id = $1
       LIMIT 1`,
      [Number(req.params.projectId)]
    );

    if (projectResult.rowCount === 0) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (!canAccessProject(projectResult.rows[0], req.user)) {
      return res.status(403).json({ message: "Access denied for this project." });
    }

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
  const normalizedType = normalizeReportType(type);
  const normalizedContent = typeof content === "string" ? content.trim() : "";
  const filePath = req.file ? `/uploads/reports/${req.file.filename}` : "";
  const reportContent = normalizedContent || (req.file ? `Uploaded file: ${req.file.originalname}` : "");
  const normalizedTaskId = Number(taskId);

  if (!projectId || !normalizedType || !reportContent || !normalizedTaskId) {
    return res.status(400).json({ message: "projectId, taskId, type, and either report content or file are required." });
  }

  if (!canSubmitReports(req.user?.role)) {
    return res.status(403).json({ message: "Only members can submit reports." });
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
      [Number(projectId)]
    );

    if (projectResult.rowCount === 0) {
      return res.status(404).json({ message: "Project not found." });
    }

    if (!canAccessProject(projectResult.rows[0], req.user)) {
      return res.status(403).json({ message: "Access denied for this project." });
    }

    const taskCheck = await pool.query(
      `SELECT id,
              title,
              project_id AS "projectId",
              status,
              approval_status AS "approvalStatus",
              task_type AS "taskType",
              assignee
       FROM tasks
       WHERE id = $1 AND project_id = $2`,
      [normalizedTaskId, Number(projectId)]
    );

    if (taskCheck.rowCount === 0) {
      return res.status(404).json({ message: "Linked task not found in this project." });
    }

    const linkedTask = taskCheck.rows[0];
    const taskType = normalizeReportType(linkedTask.taskType || linkedTask.task_type);
    const assigneeMatches = !String(linkedTask.assignee || "").trim() || matchesIdentity(linkedTask.assignee, req.user);
    const statusValue = String(linkedTask.status || "").toUpperCase();
    const approvalValue = String(linkedTask.approvalStatus || "").toLowerCase();
    const isRejectedTask = statusValue === "REVIEW" && approvalValue === "rejected";
    const isTodoTask = statusValue === "TASK";

    if (taskType !== normalizedType) {
      return res.status(400).json({ message: "Report type must match the linked task type." });
    }

    if (!assigneeMatches) {
      return res.status(403).json({ message: "You can only submit reports for your assigned task." });
    }

    if (!isTodoTask && !isRejectedTask) {
      return res.status(400).json({ message: "Reports can be linked only to To Do or Rejected tasks." });
    }

    const result = await pool.query(
      `INSERT INTO reports (project_id, task_id, user_name, type, content, status)
       VALUES ($1, $2, $3, $4, $5, $6)
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
                 team_lead_approved_at AS "teamLeadApprovedAt",
                 created_at AS "createdAt",
                 (SELECT title FROM tasks WHERE tasks.id = reports.task_id) AS "taskTitle"`,
      [Number(projectId), normalizedTaskId, req.user.name || "Member", normalizedType, reportContent, REPORT_STATUS.SUBMITTED]
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
      roles: ["TEAM_LEAD"],
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

router.patch("/:id/team-lead-approve", requireRole("TEAM_LEAD"), async (req, res) => {
  const { mentorComment } = req.body || {};

  try {
    const existing = await pool.query(
      `SELECT id,
              status,
              project_id AS "projectId",
              task_id AS "taskId",
              type,
              user_name AS "userName"
       FROM reports
       WHERE id = $1`,
      [Number(req.params.id)]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Report not found." });
    }

    const current = existing.rows[0];
    if (String(current.status).toUpperCase() !== REPORT_STATUS.SUBMITTED) {
      return res.status(400).json({ message: "Only submitted reports can be reviewed." });
    }

    const weeklyFlow = String(current.type || "").trim().toUpperCase() === "WEEKLY";
    const nextStatus = weeklyFlow ? REPORT_STATUS.TL_APPROVED : REPORT_STATUS.FINAL_APPROVED;

    const result = await pool.query(
      `UPDATE reports
       SET status = $1,
           mentor_comment = COALESCE($2, mentor_comment),
           team_lead_approved_at = CURRENT_TIMESTAMP
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
                 team_lead_approved_at AS "teamLeadApprovedAt",
                 created_at AS "createdAt",
                 (SELECT title FROM tasks WHERE tasks.id = reports.task_id) AS "taskTitle"`,
      [nextStatus, mentorComment || null, Number(req.params.id)]
    );

    const updated = result.rows[0];
    const io = req.app.get("io");

    if (updated.taskId) {
      await pool.query(
        `UPDATE tasks
         SET status = $1,
             approval_status = $2,
             rejection_reason = '',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [weeklyFlow ? "REVIEW" : "COMPLETED", weeklyFlow ? "mentor-approved" : "approved", Number(updated.taskId)]
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

    if (weeklyFlow) {
      await notifyRoles({
        roles: ["MENTOR", "ADMIN"],
        message: `Weekly report in project ${updated.projectId} is ready for final approval.`,
        projectId: updated.projectId,
        io,
      });
    } else {
      const recipients = await pool.query(
        `SELECT id FROM users WHERE LOWER(name) = LOWER($1)`,
        [updated.userName]
      );

      await notifyUsersByIds({
        userIds: recipients.rows
          .map((row) => row.id)
          .filter((userId) => Number(userId) !== Number(req.user.id)),
        message: `Your daily report in project ${updated.projectId} was approved.`,
        projectId: updated.projectId,
        io,
      });
    }

    await logActivity({
      userName: req.user.name,
      action: weeklyFlow ? "Team lead forwarded weekly report" : "Team lead approved daily report",
      projectId: updated.projectId,
    });

    return res.json(normalizeReportRow(updated));
  } catch (error) {
    return res.status(500).json({ message: "Failed to review report." });
  }
});

router.patch("/:id/mentor-approve", requireRole("MENTOR"), async (req, res) => {
  const { mentorComment } = req.body || {};

  try {
    const existing = await pool.query(
      `SELECT id,
              status,
              project_id AS "projectId",
              task_id AS "taskId",
              type,
              user_name AS "userName"
       FROM reports
       WHERE id = $1`,
      [Number(req.params.id)]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Report not found." });
    }

    const current = existing.rows[0];
    if (String(current.type || "").trim().toUpperCase() !== "WEEKLY") {
      return res.status(400).json({ message: "Mentor can approve only weekly reports." });
    }

    if (String(current.status).toUpperCase() !== REPORT_STATUS.TL_APPROVED) {
      return res.status(400).json({ message: "Only team-lead-approved weekly reports can be mentor-approved." });
    }

    const result = await pool.query(
      `UPDATE reports
       SET mentor_comment = COALESCE($1, mentor_comment),
           mentor_approved_at = CURRENT_TIMESTAMP
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
                 team_lead_approved_at AS "teamLeadApprovedAt",
                 created_at AS "createdAt",
                 (SELECT title FROM tasks WHERE tasks.id = reports.task_id) AS "taskTitle"`,
      [mentorComment || null, Number(req.params.id)]
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
      message: `Mentor approved a weekly report in project ${updated.projectId}.`,
      projectId: updated.projectId,
      io,
    });

    await logActivity({
      userName: req.user.name,
      action: "Mentor approved weekly report",
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
      `SELECT id,
              status,
              project_id AS "projectId",
              task_id AS "taskId",
              type,
              user_name AS "userName",
              mentor_approved_at AS "mentorApprovedAt"
       FROM reports
       WHERE id = $1`,
      [Number(req.params.id)]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Report not found." });
    }

    const current = existing.rows[0];
    if (String(current.type || "").trim().toUpperCase() !== "WEEKLY") {
      return res.status(400).json({ message: "Manager can approve only weekly reports." });
    }

    if (String(current.status).toUpperCase() !== REPORT_STATUS.TL_APPROVED || !current.mentorApprovedAt) {
      return res.status(400).json({ message: "Manager can approve only mentor-approved weekly reports." });
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
                 team_lead_approved_at AS "teamLeadApprovedAt",
                 created_at AS "createdAt",
                 (SELECT title FROM tasks WHERE tasks.id = reports.task_id) AS "taskTitle"`,
      [REPORT_STATUS.FINAL_APPROVED, Number(req.params.id)]
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
      action: "Manager finalized weekly report",
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
      message: `Your weekly report in project ${updated.projectId} received final approval.`,
      projectId: updated.projectId,
      io,
    });

    return res.json(normalizeReportRow(updated));
  } catch (error) {
    return res.status(500).json({ message: "Failed to manager-approve report." });
  }
});

router.patch("/:id/reject", async (req, res) => {
  const { mentorComment } = req.body || {};
  if (!String(mentorComment || "").trim()) {
    return res.status(400).json({ message: "Rejection reason is required." });
  }

  try {
    const existing = await pool.query(
      `SELECT id,
              status,
              project_id AS "projectId",
              task_id AS "taskId",
              type,
              user_name AS "userName"
       FROM reports
       WHERE id = $1`,
      [Number(req.params.id)]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Report not found." });
    }

    const current = existing.rows[0];
    const reportType = String(current.type || "").trim().toUpperCase();
    const currentStatus = String(current.status || "").trim().toUpperCase();
    const actorRole = normalizeRole(req.user?.role);

    const canRejectDaily = reportType === "DAILY" && actorRole === "team_lead" && currentStatus === REPORT_STATUS.SUBMITTED;
    const canRejectWeekly = reportType === "WEEKLY" && ((actorRole === "team_lead" && currentStatus === REPORT_STATUS.SUBMITTED) || (actorRole === "mentor" && currentStatus === REPORT_STATUS.TL_APPROVED));

    if (!canRejectDaily && !canRejectWeekly) {
      return res.status(403).json({ message: "You cannot reject this report at its current stage." });
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
                 team_lead_approved_at AS "teamLeadApprovedAt",
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
      action: "Report rejected",
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
