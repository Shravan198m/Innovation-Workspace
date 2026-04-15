const router = require("express").Router();
const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");

router.use(authenticateToken);

router.get("/:projectId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              user_name AS "userName",
              action,
              project_id AS "projectId",
              created_at AS "createdAt"
       FROM activity_log
       WHERE project_id = $1
       ORDER BY created_at DESC
       LIMIT 80`,
      [Number(req.params.projectId)]
    );

    return res.json(result.rows);
  } catch {
    return res.status(500).json({ message: "Failed to fetch activity log." });
  }
});

module.exports = router;
