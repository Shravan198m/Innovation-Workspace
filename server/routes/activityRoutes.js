const router = require("express").Router();
const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { isManagerRole, normalizeRole } = require("../middleware/role");

router.use(authenticateToken);

router.get("/:projectId", async (req, res) => {
  try {
    const projectId = Number(req.params.projectId);
    const role = normalizeRole(req.user?.role);
    const params = [projectId];
    const conditions = ["project_id = $1"];

    if (!isManagerRole(role)) {
      if (role === "mentor") {
        params.push("%task%");
        conditions.push(`action ILIKE $${params.length}`);
      }

      if (role === "student") {
        params.push(String(req.user?.name || "").trim());
        conditions.push(`LOWER(user_name) = LOWER($${params.length})`);
      }
    }

    const result = await pool.query(
      `SELECT id,
              user_name AS "userName",
              action,
              project_id AS "projectId",
              created_at AS "createdAt"
       FROM activity_log
       WHERE ${conditions.join(" AND ")}
       ORDER BY created_at DESC
       LIMIT 80`,
      params
    );

    return res.json(result.rows);
  } catch {
    return res.status(500).json({ message: "Failed to fetch activity log." });
  }
});

module.exports = router;
