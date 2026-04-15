const router = require("express").Router();
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLog");
const { notifyRoles } = require("../utils/notifications");
const { notifyUsersByIds } = require("../utils/notifications");

router.use(authenticateToken);

router.get("/:projectId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              project_id AS "projectId",
              user_name AS "userName",
              type,
              content,
              status,
              mentor_comment AS "mentorComment",
              created_at AS "createdAt"
       FROM reports
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [Number(req.params.projectId)]
    );

    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch reports." });
  }
});

router.post("/", async (req, res) => {
  const { projectId, type, content } = req.body;
  const normalizedType = typeof type === "string" ? type.trim().toUpperCase() : "";

  if (!projectId || !normalizedType || !content) {
    return res.status(400).json({ message: "projectId, type, and content are required." });
  }

  if (!["DAILY", "WEEKLY"].includes(normalizedType)) {
    return res.status(400).json({ message: "type must be DAILY or WEEKLY." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO reports (project_id, user_name, type, content, status)
       VALUES ($1, $2, $3, $4, 'PENDING')
       RETURNING id,
                 project_id AS "projectId",
                 user_name AS "userName",
                 type,
                 content,
                 status,
                 mentor_comment AS "mentorComment",
                 created_at AS "createdAt"`,
      [Number(projectId), req.user.name || "Student", normalizedType, content]
    );

    const report = result.rows[0];
    const io = req.app.get("io");

    io.to(`project:${report.projectId}`).emit("reportAdded", {
      projectId: report.projectId,
      reportId: report.id,
    });

    await notifyRoles({
      roles: ["MENTOR", "ADMIN"],
      message: `New ${report.type.toLowerCase()} report submitted in project ${report.projectId}`,
      projectId: report.projectId,
      io,
    });

    await logActivity({
      userName: req.user.name,
      action: `Submitted ${report.type.toLowerCase()} report`,
      projectId: report.projectId,
    });

    return res.status(201).json(report);
  } catch (error) {
    return res.status(500).json({ message: "Failed to submit report." });
  }
});

router.put("/:id", requireRole("MENTOR", "ADMIN"), async (req, res) => {
  const { status, mentorComment } = req.body;
  const allowedStatuses = ["PENDING", "APPROVED", "REJECTED"];

  if (!status || !allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "status must be PENDING, APPROVED, or REJECTED." });
  }

  try {
    const result = await pool.query(
      `UPDATE reports
       SET status = $1,
           mentor_comment = COALESCE($2, mentor_comment)
       WHERE id = $3
       RETURNING id,
                 project_id AS "projectId",
                 user_name AS "userName",
                 type,
                 content,
                 status,
                 mentor_comment AS "mentorComment",
                 created_at AS "createdAt"`,
      [status, mentorComment || null, Number(req.params.id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Report not found." });
    }

    const updated = result.rows[0];
    const io = req.app.get("io");

    io.to(`project:${updated.projectId}`).emit("reportUpdated", {
      projectId: updated.projectId,
      reportId: updated.id,
      status: updated.status,
    });

    await logActivity({
      userName: req.user.name,
      action: `Updated report status to ${updated.status}`,
      projectId: updated.projectId,
    });

    if (["APPROVED", "REJECTED"].includes(updated.status)) {
      const recipients = await pool.query(
        `SELECT id FROM users WHERE LOWER(name) = LOWER($1)`,
        [updated.userName]
      );

      await notifyUsersByIds({
        userIds: recipients.rows
          .map((row) => row.id)
          .filter((userId) => Number(userId) !== Number(req.user.id)),
        message: `Your ${updated.type.toLowerCase()} report in project ${updated.projectId} was ${updated.status.toLowerCase()}.`,
        projectId: updated.projectId,
        io,
      });
    }

    return res.json(updated);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update report status." });
  }
});

module.exports = router;
