const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLog");
const { notifyRoles } = require("../utils/notifications");

router.use(authenticateToken);

const documentsUploadDir = path.join(__dirname, "..", "uploads", "documents");
if (!fs.existsSync(documentsUploadDir)) {
  fs.mkdirSync(documentsUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, documentsUploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const baseName = path
      .basename(file.originalname || "document", ext)
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 80);
    cb(null, `${Date.now()}-${baseName || "document"}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

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

router.post("/", requireRole("ADMIN", "TEAM_LEAD"), upload.single("file"), async (req, res) => {
  const { projectId, fileName, category, fileUrl } = req.body;

  const uploadedFilePath = req.file
    ? `/uploads/documents/${req.file.filename}`
    : String(fileUrl || "").trim();
  const resolvedFileName = String(fileName || req.file?.originalname || "").trim();
  const resolvedCategory = String(category || "OTHER").trim().toUpperCase();

  if (!projectId || !resolvedFileName) {
    return res.status(400).json({ message: "projectId and fileName are required." });
  }

  if (!uploadedFilePath) {
    return res.status(400).json({ message: "Please upload a file or provide a file URL." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO documents (project_id, filename, type, file_path, size, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id,
                 project_id AS "projectId",
                 filename AS "fileName",
                 type AS category,
                 file_path AS "fileUrl",
                 size,
                 uploaded_by AS "uploadedBy",
                 status,
                 created_at AS "createdAt"`,
      [
        Number(projectId),
        resolvedFileName,
        resolvedCategory || "OTHER",
        uploadedFilePath,
        req.file?.size || null,
        req.user.name,
      ]
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
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // Ignore cleanup failures.
      }
    }

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
