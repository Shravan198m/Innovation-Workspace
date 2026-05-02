const pool = require("../db");
const { normalizeRole } = require("../middleware/role");

async function resolveProjectScopedRole(projectId, user) {
  const globalRole = normalizeRole(user?.role);
  if (globalRole === "admin") {
    return "admin";
  }

  const result = await pool.query(
    `SELECT mentor,
            team_members AS "teamMembers"
     FROM projects
     WHERE id = $1
     LIMIT 1`,
    [Number(projectId)]
  );

  if (result.rowCount === 0) {
    return globalRole;
  }

  const project = result.rows[0];
  const userName = String(user?.name || "").trim().toLowerCase();
  const userEmail = String(user?.email || "").trim().toLowerCase();
  const mentorIdentity = String(project?.mentor || "").trim().toLowerCase();

  if (mentorIdentity && (mentorIdentity === userName || mentorIdentity === userEmail)) {
    return "mentor";
  }

  const teamMembers = Array.isArray(project.teamMembers) ? project.teamMembers : [];
  const matched = teamMembers.find((member) => {
    const memberName = String(member?.name || "").trim().toLowerCase();
    const memberEmail = String(member?.email || "").trim().toLowerCase();
    return (memberName && memberName === userName) || (memberEmail && memberEmail === userEmail);
  });

  if (matched) {
    return normalizeRole(matched.role || "student");
  }

  return globalRole;
}

module.exports = {
  resolveProjectScopedRole,
};
