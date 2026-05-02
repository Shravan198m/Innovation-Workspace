const test = require("node:test");
const assert = require("node:assert/strict");

const projectRoutes = require("../routes/projectRoutes");

const { canAccessProject } = projectRoutes.__test__;

function makeUser({ id = 1, name = "", email = "", role = "student" } = {}) {
  return { id, name, email, role };
}

function makeProject(overrides = {}) {
  return {
    mentor: "mentor@example.com",
    mentorEmail: "mentor@example.com",
    mentorName: "Mentor User",
    teamMembers: [
      { name: "Lead User", email: "lead@example.com", role: "TEAM_LEAD" },
      { name: "Student User", email: "student@example.com", role: "STUDENT" },
    ],
    ...overrides,
  };
}

test("manager can access any project", () => {
  const user = makeUser({ role: "admin", email: "manager@example.com", name: "Manager" });
  const project = makeProject({ mentor: "different@example.com" });

  assert.equal(canAccessProject(project, user), true);
});

test("team lead can access project via teamMembers", () => {
  const user = makeUser({ role: "team_lead", email: "lead@example.com", name: "Lead User" });
  const project = makeProject();

  assert.equal(canAccessProject(project, user), true);
});

test("mentor can access project via mentor email", () => {
  const user = makeUser({ role: "mentor", email: "mentor@example.com", name: "Mentor User" });
  const project = makeProject();

  assert.equal(canAccessProject(project, user), true);
});

test("mentor can access legacy project via mentor_name", () => {
  const user = makeUser({ role: "mentor", email: "legacy@example.com", name: "Legacy Mentor" });
  const project = makeProject({ mentor: "", mentorEmail: "", mentor_name: "Legacy Mentor" });

  assert.equal(canAccessProject(project, user), true);
});

test("mentor can access legacy project when mentor is listed in teamMembers with role MENTOR", () => {
  const user = makeUser({ role: "mentor", email: "mentor2@example.com", name: "Mentor Two" });
  const project = makeProject({
    mentor: "",
    mentorEmail: "",
    mentorName: "",
    teamMembers: [
      { name: "Mentor Two", email: "mentor2@example.com", role: "MENTOR" },
      { name: "Lead User", email: "lead@example.com", role: "TEAM_LEAD" },
    ],
  });

  assert.equal(canAccessProject(project, user), true);
});

test("mentor without assignment cannot access project", () => {
  const user = makeUser({ role: "mentor", email: "outsider@example.com", name: "Outside Mentor" });
  const project = makeProject();

  assert.equal(canAccessProject(project, user), false);
});
