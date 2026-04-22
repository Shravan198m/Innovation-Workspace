const pool = require("../db");
const { normalizeRole } = require("../middleware/role");

async function notifyUsersByIds({ userIds, message, projectId, io }) {
  if (!Array.isArray(userIds) || userIds.length === 0 || !message) {
    return;
  }

  const uniqueUserIds = [...new Set(userIds.map((id) => Number(id)).filter(Boolean))];
  if (!uniqueUserIds.length) {
    return;
  }

  try {
    for (const userId of uniqueUserIds) {
      const insert = await pool.query(
        `INSERT INTO notifications (user_id, message, project_id)
         VALUES ($1, $2, $3)
         RETURNING id, user_id AS "userId", message, read, project_id AS "projectId", created_at AS "createdAt"`,
        [userId, message, Number(projectId) || null]
      );

      if (io) {
        io.to(`user:${userId}`).emit("notificationAdded", insert.rows[0]);
      }
    }
  } catch {
    // Notification failures should not block core flows.
  }
}

async function notifyRoles({ roles, message, projectId, io }) {
  if (!Array.isArray(roles) || roles.length === 0 || !message) {
    return;
  }

  const normalizedRoles = [...new Set(roles.map(normalizeRole))];

  try {
    const recipients = await pool.query(
      `SELECT id FROM users WHERE role = ANY($1::text[])`,
      [normalizedRoles]
    );

    if (recipients.rowCount === 0) {
      return;
    }

    await notifyUsersByIds({
      userIds: recipients.rows.map((row) => row.id),
      message,
      projectId,
      io,
    });
  } catch {
    // Notification failures should not block core flows.
  }
}

module.exports = { notifyRoles, notifyUsersByIds };
