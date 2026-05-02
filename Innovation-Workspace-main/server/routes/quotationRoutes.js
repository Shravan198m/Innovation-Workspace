const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { logActivity } = require("../utils/activityLog");

router.use(authenticateToken);
router.use(requireRole("MENTOR", "ADMIN", "TEAM_LEAD"));

let quotationSchemaReady;

function ensureQuotationSchema() {
  if (!quotationSchemaReady) {
    quotationSchemaReady = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS quotations (
          id SERIAL PRIMARY KEY,
          project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
          file_path TEXT NOT NULL,
          file_name TEXT NOT NULL,
          vendor_name TEXT DEFAULT '',
          notes TEXT DEFAULT '',
          uploaded_by TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await pool.query(`CREATE INDEX IF NOT EXISTS idx_quotations_project_created ON quotations(project_id, created_at DESC)`);
    })();
  }

  return quotationSchemaReady;
}

router.use(async (_req, res, next) => {
  try {
    await ensureQuotationSchema();
    return next();
  } catch {
    return res.status(500).json({ message: "Failed to initialize quotation schema." });
  }
});

const quotationsUploadDir = path.join(__dirname, "..", "uploads", "quotations");
if (!fs.existsSync(quotationsUploadDir)) {
  fs.mkdirSync(quotationsUploadDir, { recursive: true });
}

const allowedExtensions = new Set([".pdf", ".xls", ".xlsx", ".jpg", ".jpeg", ".png", ".webp"]);
const allowedMimeTypes = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, quotationsUploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const baseName = path
        .basename(file.originalname || "quotation", ext)
        .replace(/[^a-zA-Z0-9-_]/g, "_")
        .slice(0, 80);
      cb(null, `${Date.now()}-${baseName || "quotation"}${ext}`);
    },
  }),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    if (!allowedExtensions.has(ext) || !allowedMimeTypes.has(file.mimetype)) {
      cb(new Error("Invalid file format."));
      return;
    }

    cb(null, true);
  },
});

function normalizeQuotationRow(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    filePath: row.file_path,
    fileUrl: row.file_path,
    fileName: row.file_name,
    vendorName: row.vendor_name || "",
    notes: row.notes || "",
    uploadedBy: row.uploaded_by,
    createdAt: row.created_at,
  };
}

async function fetchQuotationsByProjectId(req, res) {
  try {
    const result = await pool.query(
      `SELECT id,
              project_id,
              file_path,
              file_name,
              vendor_name,
              notes,
              uploaded_by,
              created_at
       FROM quotations
       WHERE project_id = $1
       ORDER BY created_at DESC`,
      [Number(req.params.projectId)]
    );

    return res.json(result.rows.map(normalizeQuotationRow));
  } catch {
    return res.status(500).json({ message: "Failed to fetch quotations." });
  }
}

router.get("/project/:projectId", fetchQuotationsByProjectId);
router.get("/:projectId", fetchQuotationsByProjectId);

async function uploadQuotation(req, res) {
  const projectId = Number(req.body.projectId);
  const fileName = String(req.file?.originalname || "").trim();
  const vendorName = String(req.body.vendorName || "").trim();
  const notes = String(req.body.notes || "").trim();
  const filePath = req.file ? `/uploads/quotations/${req.file.filename}` : "";

  if (!projectId || !req.file || !fileName) {
    return res.status(400).json({ message: "projectId and file are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO quotations (project_id, file_path, file_name, vendor_name, notes, uploaded_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id,
                 project_id,
                 file_path,
                 file_name,
                 vendor_name,
                 notes,
                 uploaded_by,
                 created_at`,
      [projectId, filePath, fileName, vendorName, notes, req.user?.name || "Unknown"]
    );

    const created = normalizeQuotationRow(result.rows[0]);

    await logActivity({
      userName: req.user?.name || "Unknown",
      action: `Uploaded quotation: ${created.fileName}`,
      projectId: created.projectId,
    });

    return res.status(201).json(created);
  } catch (error) {
    if (req.file?.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch {
        // Ignore cleanup failures.
      }
    }

    return res.status(500).json({ message: "Failed to upload quotation." });
  }
}

router.post("/upload", upload.single("file"), uploadQuotation);
router.post("/", upload.single("file"), uploadQuotation);

async function deleteQuotationById(req, res) {
  try {
    const existing = await pool.query(
      `SELECT id, project_id AS "projectId", file_path AS "filePath", file_name AS "fileName"
       FROM quotations
       WHERE id = $1`,
      [Number(req.params.id)]
    );

    if (existing.rowCount === 0) {
      return res.status(404).json({ message: "Quotation not found." });
    }

    const result = await pool.query(`DELETE FROM quotations WHERE id = $1 RETURNING id`, [Number(req.params.id)]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Quotation not found." });
    }

    const filePath = existing.rows[0].filePath || "";
    const resolvedDiskPath = filePath.startsWith("/uploads/")
      ? path.join(__dirname, "..", filePath.replace(/^\/+/, ""))
      : "";

    if (resolvedDiskPath && fs.existsSync(resolvedDiskPath)) {
      try {
        fs.unlinkSync(resolvedDiskPath);
      } catch {
        // Ignore cleanup failures.
      }
    }

    await logActivity({
      userName: req.user?.name || "Unknown",
      action: `Deleted quotation: ${existing.rows[0].fileName}`,
      projectId: existing.rows[0].projectId,
    });

    return res.json({ message: "Quotation deleted successfully." });
  } catch {
    return res.status(500).json({ message: "Failed to delete quotation." });
  }
}

router.delete("/delete/:id", deleteQuotationById);
router.delete("/:id", deleteQuotationById);

router.use((error, _req, res, next) => {
  if (error?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ message: "File size must be 25 MB or smaller." });
  }

  if (String(error?.message || "").toLowerCase().includes("invalid file format")) {
    return res.status(400).json({ message: "Please upload a PDF, Excel file, or image." });
  }

  return next(error);
});

module.exports = router;