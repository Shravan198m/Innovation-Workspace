const router = require("express").Router();
const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");

router.use(authenticateToken);

router.get("/me", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              user_id AS "userId",
              message,
              read,
              project_id AS "projectId",
              created_at AS "createdAt"
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [req.user.id]
    );

    return res.json(result.rows);
  } catch {
    return res.status(500).json({ message: "Failed to fetch notifications." });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET read = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING id,
                 user_id AS "userId",
                 message,
                 read,
                 project_id AS "projectId",
                 created_at AS "createdAt"`,
      [Number(req.params.id), req.user.id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Notification not found." });
    }

    return res.json(result.rows[0]);
  } catch {
    return res.status(500).json({ message: "Failed to update notification." });
  }
});

module.exports = router;
