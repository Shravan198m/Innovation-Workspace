export function normalizeRole(role) {
  const value = String(role || "student").trim().toLowerCase().replace(/\s+/g, "_");

  if (value === "manager") {
    return "admin";
  }

  if (value === "teamlead") {
    return "team_lead";
  }

  if (["student", "mentor", "admin", "team_lead"].includes(value)) {
    return value;
  }

  return "student";
}

function normalizeIdentity(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesIdentity(left, right) {
  const normalizedLeft = normalizeIdentity(left);
  const normalizedRight = normalizeIdentity(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft === normalizedRight;
}

export function resolveProjectRole(project, user = {}) {
  const normalizedUserRole = normalizeRole(user.role);

  if (normalizedUserRole === "admin") {
    return "admin";
  }

  const currentEmail = String(user.email || "").trim().toLowerCase();
  const currentName = normalizeIdentity(user.name);
  const currentUsn = normalizeIdentity(user.usn);
  const teamMembers = Array.isArray(project?.teamMembers) ? project.teamMembers : [];

  const mentorCandidates = [project?.mentorEmail, project?.mentorName, project?.mentor];
  if (
    mentorCandidates.some((candidate) =>
      matchesIdentity(currentEmail, candidate) || matchesIdentity(currentName, candidate) || matchesIdentity(currentUsn, candidate)
    )
  ) {
    return "mentor";
  }

  const teamLeadCandidates = [project?.teamLeadEmail, project?.teamLeadName];
  if (
    teamLeadCandidates.some((candidate) =>
      matchesIdentity(currentEmail, candidate) || matchesIdentity(currentName, candidate) || matchesIdentity(currentUsn, candidate)
    )
  ) {
    return "team_lead";
  }

  const matchedTeamMember = teamMembers.find((member) => {
    const memberEmail = String(member?.email || "").trim().toLowerCase();
    const memberName = normalizeIdentity(member?.name);
    const memberUsn = normalizeIdentity(member?.usn);

    return (
      matchesIdentity(currentEmail, memberEmail) ||
      matchesIdentity(currentName, memberName) ||
      matchesIdentity(currentUsn, memberUsn)
    );
  });

  if (matchedTeamMember) {
    const memberRole = normalizeRole(matchedTeamMember.role);

    if (memberRole === "mentor" || memberRole === "team_lead" || memberRole === "admin") {
      return memberRole;
    }

    return "student";
  }

  return normalizedUserRole;
}

export function isPrivilegedRole(role) {
  const normalized = normalizeRole(role);
  return normalized === "mentor" || normalized === "admin" || normalized === "team_lead";
}

export function isManagerRole(role) {
  return normalizeRole(role) === "admin";
}

export function isMemberRole(role) {
  return normalizeRole(role) === "student";
}

export function canReviewWork(role) {
  const normalized = normalizeRole(role);
  return normalized === "mentor" || normalized === "admin";
}

export function canManageTasks(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "team_lead";
}

export function canCreateDailyTask(role) {
  return normalizeRole(role) === "team_lead";
}

export function canCreateWeeklyTask(role) {
  return normalizeRole(role) === "admin";
}

export function canSubmitReports(role) {
  return isMemberRole(role);
}

export function canApproveDailyReports(role) {
  return normalizeRole(role) === "team_lead";
}

export function canApproveWeeklyReports(role) {
  const normalized = normalizeRole(role);
  return normalized === "mentor" || normalized === "admin";
}

export function canEditBudget(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "team_lead";
}

export function canViewBudget(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "team_lead" || normalized === "mentor";
}

export function isStudentRole(role) {
  return normalizeRole(role) === "student";
}

export function getRoleLabel(role) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") {
    return "MANAGER";
  }

  if (normalized === "team_lead") {
    return "TEAM LEAD";
  }

  if (normalized === "student") {
    return "MEMBER";
  }

  if (normalized === "mentor") {
    return "MENTOR";
  }

  return normalized.toUpperCase();
}