const pool = require("../db");
const { normalizeRole } = require("../middleware/role");

function normalizeIdentity(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesIdentity(candidate, user) {
  const value = normalizeIdentity(candidate);
  if (!value) {
    return false;
  }

  const email = normalizeIdentity(user?.email);
  const name = normalizeIdentity(user?.name);
  const localPart = normalizeIdentity(String(user?.email || "").split("@")[0]);
  const usn = normalizeIdentity(user?.usn);
  const nameParts = name.split(/\s+/).filter(Boolean);
  const compactName = nameParts.join(" ");
  const dotName = nameParts.join(".");
  const underscoreName = nameParts.join("_");
  const hyphenName = nameParts.join("-");

  return [email, localPart, usn, name, compactName, dotName, underscoreName, hyphenName].filter(Boolean).includes(value);
}

function getTeamMembers(project) {
  return Array.isArray(project?.teamMembers) ? project.teamMembers : [];
}

function canAccessProject(project, user) {
  // Admins always have access
  if (normalizeRole(user?.role) === "admin") {
    return true;
  }

  const teamMembers = getTeamMembers(project);

  // Check explicit project mentor fields first
  const mentorCandidates = [project?.mentor, project?.mentorEmail, project?.mentorName, project?.mentor_name];
  if (mentorCandidates.some((candidate) => matchesIdentity(candidate, user))) {
    return true;
  }

  // Check explicit project team lead fields
  const leadCandidates = [project?.teamLeadEmail, project?.teamLeadName, project?.team_lead_name];
  if (leadCandidates.some((candidate) => matchesIdentity(candidate, user))) {
    return true;
  }

  // Check team_members array for any matching identity regardless of the user's global role
  if (teamMembers.some((member) => matchesIdentity(member?.email, user) || matchesIdentity(member?.name, user))) {
    return true;
  }

  return false;
}

async function resolveProjectScopedRole(projectId, user) {
  const globalRole = normalizeRole(user?.role);
  if (globalRole === "admin") {
    return "admin";
  }

  const result = await pool.query(
    `SELECT mentor,
            mentor_name AS "mentorName",
            team_lead_name AS "teamLeadName",
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
  const teamMembers = getTeamMembers(project);

  if (
    [project.mentor, project.mentorName].some((candidate) => matchesIdentity(candidate, user)) ||
    teamMembers.some((member) => String(member?.role || "").trim().toUpperCase() === "MENTOR" && (matchesIdentity(member?.email, user) || matchesIdentity(member?.name, user)))
  ) {
    return "mentor";
  }

  if (
    [project.teamLeadName].some((candidate) => matchesIdentity(candidate, user)) ||
    teamMembers.some((member) => String(member?.role || "").trim().toUpperCase() === "TEAM_LEAD" && (matchesIdentity(member?.email, user) || matchesIdentity(member?.name, user)))
  ) {
    return "team_lead";
  }

  const matchedMember = teamMembers.find((member) => matchesIdentity(member?.email, user) || matchesIdentity(member?.name, user));
  if (matchedMember) {
    return normalizeRole(matchedMember.role || "student");
  }

  return globalRole;
}

module.exports = {
  canAccessProject,
  matchesIdentity,
  resolveProjectScopedRole,
};