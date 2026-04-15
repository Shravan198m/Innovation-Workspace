const router = require("express").Router();
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLog");
const { notifyRoles } = require("../utils/notifications");

router.use(authenticateToken);

router.get("/:projectId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              project_id AS "projectId",
              filename AS "fileName",
              type AS category,
              file_path AS "fileUrl",
              uploaded_by AS "uploadedBy",
              status,
              created_at AS "createdAt"
       FROM documents
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [Number(req.params.projectId)]
    );

    res.json(result.rows);
  } catch {
    res.status(500).json({ message: "Failed to fetch documents." });
  }
});

router.post("/", async (req, res) => {
  const { projectId, fileName, category, fileUrl } = req.body;

  if (!projectId || !fileName) {
    return res.status(400).json({ message: "projectId and fileName are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO documents (project_id, filename, type, file_path, uploaded_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id,
                 project_id AS "projectId",
                 filename AS "fileName",
                 type AS category,
                 file_path AS "fileUrl",
                 uploaded_by AS "uploadedBy",
                 status,
                 created_at AS "createdAt"`,
      [Number(projectId), fileName, category || "OTHER", fileUrl || "", req.user.name]
    );

    const created = result.rows[0];
    const io = req.app.get("io");

    await notifyRoles({
      roles: ["MENTOR", "ADMIN"],
      message: `New document uploaded in project ${created.projectId}`,
      projectId: created.projectId,
      io,
    });

    await logActivity({
      userName: req.user.name,
      action: `Uploaded document: ${created.fileName}`,
      projectId: created.projectId,
    });

    res.status(201).json(created);
  } catch {
    res.status(500).json({ message: "Failed to upload document metadata." });
  }
});

router.put("/:id/status", requireRole("MENTOR", "ADMIN"), async (req, res) => {
  const { status } = req.body;
  if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ message: "Invalid status." });
  }

  try {
    const result = await pool.query(
      `UPDATE documents
       SET status = $1
       WHERE id = $2
       RETURNING id,
                 project_id AS "projectId",
                 filename AS "fileName",
                 type AS category,
                 file_path AS "fileUrl",
                 uploaded_by AS "uploadedBy",
                 status,
                 created_at AS "createdAt"`,
      [status, Number(req.params.id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Document not found." });
    }

    const updated = result.rows[0];

    await logActivity({
      userName: req.user.name,
      action: `Updated document status to ${updated.status}`,
      projectId: updated.projectId,
    });

    return res.json(updated);
  } catch {
    return res.status(500).json({ message: "Failed to update document status." });
  }
});

module.exports = router;
