const router = require("express").Router();
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");

router.use(authenticateToken);

router.get("/", async (_, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, mentor, department,
              progress,
              team_count AS "teamCount",
              team_members AS "teamMembers",
              due_date AS "dueDate",
              accent,
              created_at AS "createdAt"
       FROM projects
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch projects." });
  }
});

router.post("/", requireRole("MENTOR", "ADMIN"), async (req, res) => {
  const { name, mentor, department, teamCount, teamMembers, dueDate, accent } = req.body;

  if (!name || !mentor || !department) {
    return res.status(400).json({ message: "name, mentor, and department are required." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO projects (name, mentor, department, team_count, team_members, due_date, accent)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       RETURNING id, name, mentor, department,
                 progress,
                 team_count AS "teamCount",
                 team_members AS "teamMembers",
                 due_date AS "dueDate",
                 accent,
                 created_at AS "createdAt"`,
      [
        name,
        mentor,
        department,
        Number(teamCount) || 1,
        JSON.stringify(Array.isArray(teamMembers) ? teamMembers : []),
        dueDate || null,
        accent || null,
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to create project." });
  }
});

module.exports = router;
