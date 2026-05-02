const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const jwt = require("jsonwebtoken");

const pool = require("../db");
const projectRoutes = require("../routes/projectRoutes");

const JWT_SECRET = process.env.JWT_SECRET || "innovation-hub-dev-secret";

const baseProjectRows = [
  {
    id: 101,
    name: "Mentor Owned",
    description: "",
    mentor: "mentor@example.com",
    mentor_name: "Mentor User",
    team_lead_name: "Lead User",
    department: "CSE",
    progress: 40,
    teamCount: 2,
    teamMembers: [
      { name: "Lead User", email: "lead@example.com", role: "TEAM_LEAD" },
      { name: "Student User", email: "student@example.com", role: "STUDENT" },
    ],
    dueDate: null,
    accent: null,
    createdAt: "2026-05-01T10:00:00.000Z",
  },
  {
    id: 102,
    name: "Legacy Mentor Name",
    description: "",
    mentor: "",
    mentor_name: "Legacy Mentor",
    team_lead_name: "Another Lead",
    department: "ISE",
    progress: 10,
    teamCount: 1,
    teamMembers: [{ name: "Another Lead", email: "lead2@example.com", role: "TEAM_LEAD" }],
    dueDate: null,
    accent: null,
    createdAt: "2026-05-01T09:00:00.000Z",
  },
  {
    id: 103,
    name: "Unrelated Project",
    description: "",
    mentor: "othermentor@example.com",
    mentor_name: "Other Mentor",
    team_lead_name: "Other Lead",
    department: "ME",
    progress: 80,
    teamCount: 1,
    teamMembers: [{ name: "Other Lead", email: "otherlead@example.com", role: "TEAM_LEAD" }],
    dueDate: null,
    accent: null,
    createdAt: "2026-05-01T08:00:00.000Z",
  },
];

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/projects", projectRoutes);
  return app;
}

async function requestProjects(app, user) {
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "15m" });
  return requestProjectsWithToken(app, token);
}

async function requestProjectsWithToken(app, token) {
  const server = app.listen(0);
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const headers = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${baseUrl}/api/projects`, {
      headers,
    });

    const body = await response.json();
    return { status: response.status, body };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test.beforeEach(() => {
  pool.query = async (sql) => {
    const text = String(sql || "");

    if (text.includes("ALTER TABLE projects ADD COLUMN IF NOT EXISTS")) {
      return { rowCount: 0, rows: [] };
    }

    if (text.includes("FROM projects") && text.includes("ORDER BY created_at DESC")) {
      return { rowCount: baseProjectRows.length, rows: baseProjectRows };
    }

    throw new Error(`Unexpected query in integration test: ${text}`);
  };
});

test("GET /api/projects returns mentor-visible projects for mentor login", async () => {
  const app = createApp();

  const { status, body } = await requestProjects(app, {
    id: 21,
    name: "Mentor User",
    email: "mentor@example.com",
    role: "mentor",
  });

  assert.equal(status, 200);
  assert.equal(Array.isArray(body), true);
  assert.deepEqual(body.map((project) => project.id), [101]);
});

test("GET /api/projects supports legacy mentor_name matching for mentor login", async () => {
  const app = createApp();

  const { status, body } = await requestProjects(app, {
    id: 22,
    name: "Legacy Mentor",
    email: "legacy@example.com",
    role: "mentor",
  });

  assert.equal(status, 200);
  assert.equal(Array.isArray(body), true);
  assert.deepEqual(body.map((project) => project.id), [102]);
});

test("GET /api/projects returns team lead projects for team lead login", async () => {
  const app = createApp();

  const { status, body } = await requestProjects(app, {
    id: 31,
    name: "Lead User",
    email: "lead@example.com",
    role: "team_lead",
  });

  assert.equal(status, 200);
  assert.equal(Array.isArray(body), true);
  assert.deepEqual(body.map((project) => project.id), [101]);
});

test("GET /api/projects returns all projects for manager login", async () => {
  const app = createApp();

  const { status, body } = await requestProjects(app, {
    id: 1,
    name: "Manager",
    email: "manager@example.com",
    role: "admin",
  });

  assert.equal(status, 200);
  assert.equal(Array.isArray(body), true);
  assert.deepEqual(body.map((project) => project.id), [101, 102, 103]);
});

test("GET /api/projects rejects requests without token", async () => {
  const app = createApp();
  const { status, body } = await requestProjectsWithToken(app, "");

  assert.equal(status, 401);
  assert.equal(body.message, "Missing authentication token.");
});

test("GET /api/projects rejects requests with invalid token", async () => {
  const app = createApp();
  const { status, body } = await requestProjectsWithToken(app, "not-a-valid-jwt");

  assert.equal(status, 401);
  assert.equal(body.message, "Invalid or expired token.");
});
