function normalizeRole(role) {
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

function isPrivilegedRole(role) {
  const normalized = normalizeRole(role);
  return normalized === "mentor" || normalized === "admin" || normalized === "team_lead";
}

function isManagerRole(role) {
  return normalizeRole(role) === "admin";
}

function canReviewWork(role) {
  const normalized = normalizeRole(role);
  return normalized === "mentor" || normalized === "admin";
}

function canManageTasks(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "team_lead";
}

function canEditBudget(role) {
  const normalized = normalizeRole(role);
  return normalized === "admin" || normalized === "team_lead";
}

function requireRole(...roles) {
  const allowedRoles = roles.map(normalizeRole);

  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(normalizeRole(req.user.role))) {
      return res.status(403).json({ message: "Access denied" });
    }

    return next();
  };
}

module.exports = {
  requireRole,
  normalizeRole,
  isPrivilegedRole,
  isManagerRole,
  canReviewWork,
  canManageTasks,
  canEditBudget,
};
