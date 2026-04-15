const router = require("express").Router();
const pool = require("../db");
const { authenticateToken, requireRole } = require("../middleware/auth");

router.use(authenticateToken);

// GET all team members for a project
router.get("/:projectId", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,
              project_id AS "projectId",
              name,
              usn,
              email,
              photo,
              role,
              joined_at AS "joinedAt"
       FROM team_members
       WHERE project_id = $1
       ORDER BY role DESC, name`,
      [Number(req.params.projectId)]
    );

    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch team members." });
  }
});

// POST add new team member
router.post("/:projectId", requireRole("MENTOR", "ADMIN"), async (req, res) => {
  const { name, usn, email, photo, role } = req.body;
  const projectId = Number(req.params.projectId);

  if (!name || !usn) {
    return res.status(400).json({ message: "name and usn are required." });
  }

  const memberRole = role || "STUDENT";
  if (!["MENTOR", "STUDENT"].includes(memberRole)) {
    return res.status(400).json({ message: "role must be MENTOR or STUDENT." });
  }

  try {
    const result = await pool.query(
      `INSERT INTO team_members (project_id, name, usn, email, photo, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id,
                 project_id AS "projectId",
                 name,
                 usn,
                 email,
                 photo,
                 role,
                 joined_at AS "joinedAt"`,
      [projectId, name, usn, email || "", photo || "", memberRole]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Team member with this USN already exists in project." });
    }
    return res.status(500).json({ message: "Failed to add team member." });
  }
});

// PUT update team member
router.put("/:id", requireRole("MENTOR", "ADMIN"), async (req, res) => {
  const { name, email, photo, role } = req.body;
  const id = Number(req.params.id);

  try {
    const result = await pool.query(
      `UPDATE team_members
       SET name = COALESCE($1, name),
           email = COALESCE($2, email),
           photo = COALESCE($3, photo),
           role = COALESCE($4, role)
       WHERE id = $5
       RETURNING id,
                 project_id AS "projectId",
                 name,
                 usn,
                 email,
                 photo,
                 role,
                 joined_at AS "joinedAt"`,
      [name || null, email || null, photo || null, role || null, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Team member not found." });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: "Failed to update team member." });
  }
});

// DELETE team member
router.delete("/:id", requireRole("MENTOR", "ADMIN"), async (req, res) => {
  try {
    const result = await pool.query(
      `DELETE FROM team_members WHERE id = $1 RETURNING id`,
      [Number(req.params.id)]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Team member not found." });
    }

    return res.json({ message: "Team member removed successfully." });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove team member." });
  }
});

module.exports = router;
