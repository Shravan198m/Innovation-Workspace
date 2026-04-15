const pool = require("../db");

async function logActivity({ userName, action, projectId }) {
  if (!userName || !action || !projectId) {
    return;
  }

  try {
    await pool.query(
      `INSERT INTO activity_log (user_name, action, project_id)
       VALUES ($1, $2, $3)`,
      [userName, action, Number(projectId)]
    );
  } catch {
    // Activity logging should not block user actions.
  }
}

module.exports = { logActivity };
