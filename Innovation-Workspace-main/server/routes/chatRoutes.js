const router = require("express").Router();
const pool = require("../db");
const { authenticateToken } = require("../middleware/auth");
const { isPrivilegedRole } = require("../middleware/role");
const { notifyUsersByIds } = require("../utils/notifications");
const { validateBody } = require("../middleware/validate");
const { chatMessageSchema } = require("../validation/schemas");
const { chatMessageLimiter } = require("../middleware/rateLimiters");

router.use(authenticateToken);

let chatTableReady;

function normalizeRole(role) {
  return String(role || "student").trim().toLowerCase();
}

async function ensureChatTable() {
  if (!chatTableReady) {
    chatTableReady = pool.query(
      `CREATE TABLE IF NOT EXISTS project_chat_messages (
         id SERIAL PRIMARY KEY,
         project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
         user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
         user_name TEXT NOT NULL,
         user_role TEXT NOT NULL,
         message TEXT NOT NULL,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
       );
       CREATE INDEX IF NOT EXISTS idx_project_chat_messages_project_created
         ON project_chat_messages(project_id, created_at DESC);`
    );
  }

  return chatTableReady;
}

async function canAccessProject(user, projectId) {
  const normalizedProjectId = Number(projectId);
  if (!normalizedProjectId || Number.isNaN(normalizedProjectId)) {
    return false;
  }

  if (isPrivilegedRole(user.role)) {
    return true;
  }

  const projectMatch = await pool.query(
    `SELECT 1
     FROM projects
     WHERE id = $1
       AND (
         LOWER(COALESCE(mentor, '')) = LOWER($2)
         OR EXISTS (
           SELECT 1
           FROM jsonb_array_elements(COALESCE(team_members, '[]'::jsonb)) AS member
           WHERE LOWER(COALESCE(member->>'name', '')) = LOWER($2)
              OR LOWER(COALESCE(member->>'email', '')) = LOWER($3)
         )
       )
     LIMIT 1`,
    [normalizedProjectId, user.name || "", user.email || ""]
  );

  if (projectMatch.rowCount > 0) {
    return true;
  }

  const teamMemberMatch = await pool.query(
    `SELECT 1
     FROM team_members
     WHERE project_id = $1
       AND (
         user_id = $2
         OR LOWER(COALESCE(name, '')) = LOWER($3)
         OR LOWER(COALESCE(email, '')) = LOWER($4)
       )
     LIMIT 1`,
    [normalizedProjectId, Number(user.id), user.name || "", user.email || ""]
  );

  return teamMemberMatch.rowCount > 0;
}

async function getProjectMemberUserIds(projectId, excludeUserId) {
  const projectResult = await pool.query(
    `SELECT team_members AS "teamMembers"
     FROM projects
     WHERE id = $1
     LIMIT 1`,
    [Number(projectId)]
  );

  if (projectResult.rowCount === 0) {
    return [];
  }

  const teamMembers = Array.isArray(projectResult.rows[0].teamMembers)
    ? projectResult.rows[0].teamMembers
    : [];

  const emailKeys = [];
  const nameKeys = [];
  teamMembers.forEach((member) => {
    const email = String(member?.email || "").trim().toLowerCase();
    const name = String(member?.name || "").trim().toLowerCase();
    if (email) {
      emailKeys.push(email);
    }
    if (name) {
      nameKeys.push(name);
    }
  });

  if (emailKeys.length === 0 && nameKeys.length === 0) {
    return [];
  }

  const usersResult = await pool.query(
    `SELECT id
     FROM users
     WHERE (
       (array_length($1::text[], 1) IS NOT NULL AND LOWER(COALESCE(email, '')) = ANY($1::text[]))
       OR (array_length($2::text[], 1) IS NOT NULL AND LOWER(COALESCE(name, '')) = ANY($2::text[]))
     )`,
    [emailKeys.length ? [...new Set(emailKeys)] : null, nameKeys.length ? [...new Set(nameKeys)] : null]
  );

  return [...new Set(usersResult.rows
    .map((row) => Number(row.id))
    .filter((userId) => userId && userId !== Number(excludeUserId)))];
}

router.use(async (_req, res, next) => {
  try {
    await ensureChatTable();
    return next();
  } catch {
    return res.status(500).json({ message: "Failed to initialize chat schema." });
  }
});

router.get("/:projectId", async (req, res) => {
  const projectId = Number(req.params.projectId);

  if (!projectId) {
    return res.status(400).json({ message: "Invalid project ID." });
  }

  try {
    const allowed = await canAccessProject(req.user, projectId);
    if (!allowed) {
      return res.status(403).json({ message: "Not authorized for this project." });
    }

    const result = await pool.query(
      `SELECT id,
              project_id AS "projectId",
              user_id AS "userId",
              user_name AS "userName",
              user_role AS "userRole",
              message,
              created_at AS "createdAt"
       FROM project_chat_messages
       WHERE project_id = $1
       ORDER BY created_at ASC, id ASC
       LIMIT 300`,
      [projectId]
    );

    return res.json(result.rows);
  } catch {
    return res.status(500).json({ message: "Failed to fetch chat messages." });
  }
});

router.post("/:projectId", chatMessageLimiter, validateBody(chatMessageSchema), async (req, res) => {
  const projectId = Number(req.params.projectId);
  const message = String(req.body?.message || "").trim();

  if (!projectId) {
    return res.status(400).json({ message: "Invalid project ID." });
  }

  if (!message) {
    return res.status(400).json({ message: "Message is required." });
  }

  if (message.length > 2000) {
    return res.status(400).json({ message: "Message is too long." });
  }

  try {
    const allowed = await canAccessProject(req.user, projectId);
    if (!allowed) {
      return res.status(403).json({ message: "Not authorized for this project." });
    }

    const result = await pool.query(
      `INSERT INTO project_chat_messages (project_id, user_id, user_name, user_role, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id,
                 project_id AS "projectId",
                 user_id AS "userId",
                 user_name AS "userName",
                 user_role AS "userRole",
                 message,
                 created_at AS "createdAt"`,
      [projectId, Number(req.user.id) || null, req.user.name || "Unknown", normalizeRole(req.user.role), message]
    );

    const createdMessage = result.rows[0];
    const io = req.app.get("io");
    io.to(`project:${projectId}`).emit("chatMessageAdded", createdMessage);

    const actorRole = normalizeRole(req.user.role);
    if (actorRole === "admin" || actorRole === "team_lead") {
      const targetUserIds = await getProjectMemberUserIds(projectId, req.user.id);
      const preview = message.length > 90 ? `${message.slice(0, 90)}...` : message;

      await notifyUsersByIds({
        userIds: targetUserIds,
        message: `${req.user.name || "Manager"} posted a group message in project ${projectId}: \"${preview}\"`,
        projectId,
        io,
      });
    }

    return res.status(201).json(createdMessage);
  } catch {
    return res.status(500).json({ message: "Failed to send chat message." });
  }
});

module.exports = router;
