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

export function isPrivilegedRole(role) {
  const normalized = normalizeRole(role);
  return normalized === "mentor" || normalized === "admin" || normalized === "team_lead";
}

export function isManagerRole(role) {
  return normalizeRole(role) === "admin";
}

export function canReviewWork(role) {
  const normalized = normalizeRole(role);
  return normalized === "mentor" || normalized === "admin";
}

export function canManageTasks(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "team_lead";
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

  return normalized.toUpperCase();
}