const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const pool = require("./db");

const authRoutes = require("./routes/authRoutes");
const activityRoutes = require("./routes/activityRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const documentRoutes = require("./routes/documentRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const projectRoutes = require("./routes/projectRoutes");
const reportRoutes = require("./routes/reportRoutes");
const taskRoutes = require("./routes/taskRoutes");

const app = express();
const server = http.createServer(app);
const allowedOrigins = (
  process.env.CLIENT_ORIGIN
  || "http://localhost:3000,http://localhost:3001,http://localhost:5000,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:5000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const isOriginAllowed = (origin) => {
  if (!origin) {
    return true;
  }

  return allowedOrigins.includes(origin);
};

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  },
});

app.set("io", io);

app.use(
  cors({
    origin: (origin, callback) => {
      if (isOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

function getSocketToken(socket) {
  const fromAuth = socket.handshake?.auth?.token;
  if (fromAuth) {
    return fromAuth;
  }

  const authHeader = socket.handshake?.headers?.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return "";
}

async function canAccessProject(user, projectId) {
  if (!projectId || Number.isNaN(Number(projectId))) {
    return false;
  }

  if (user.role === "MENTOR" || user.role === "ADMIN") {
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
    [Number(projectId), user.name || "", user.email || ""]
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
    [Number(projectId), Number(user.id), user.name || "", user.email || ""]
  );

  return teamMemberMatch.rowCount > 0;
}

io.use((socket, next) => {
  const token = getSocketToken(socket);
  if (!token) {
    return next(new Error("Authentication required"));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "innovation-hub-dev-secret");
    socket.user = payload;
    return next();
  } catch {
    return next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  if (socket.user?.id) {
    socket.join(`user:${socket.user.id}`);
  }

  socket.on("joinProject", async (projectId, ack) => {
    const normalizedProjectId = Number(projectId);
    if (!normalizedProjectId) {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Invalid project ID." });
      }
      return;
    }

    try {
      const allowed = await canAccessProject(socket.user, normalizedProjectId);
      if (!allowed) {
        if (typeof ack === "function") {
          ack({ ok: false, message: "Not authorized for this project." });
        }
        return;
      }

      socket.join(`project:${normalizedProjectId}`);
      if (typeof ack === "function") {
        ack({ ok: true });
      }
    } catch {
      if (typeof ack === "function") {
        ack({ ok: false, message: "Could not join project room." });
      }
    }
  });

  socket.on("leaveProject", (projectId) => {
    const normalizedProjectId = Number(projectId);
    if (!normalizedProjectId) {
      return;
    }

    socket.leave(`project:${normalizedProjectId}`);
  });

  socket.on("joinUser", (userId) => {
    const normalizedUserId = Number(userId);
    if (!normalizedUserId || normalizedUserId !== Number(socket.user?.id)) {
      return;
    }

    socket.join(`user:${normalizedUserId}`);
  });
});

app.get("/api/health", (_, res) => {
  res.json({ ok: true, service: "innovation-hub-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/team-members", require("./routes/teamMemberRoutes"));
app.use("/api/notifications", notificationRoutes);
app.use("/api/activity", activityRoutes);

const clientBuildPath = path.join(__dirname, "..", "client", "build");
const uploadsPath = path.join(__dirname, "uploads");

app.use("/uploads", express.static(uploadsPath));

app.get("/", (_, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"), (err) => {
    if (!err) {
      return;
    }

    res.status(200).json({
      ok: true,
      service: "innovation-hub-api",
      message: "API is running. Open http://localhost:3000 for the frontend in development.",
    });
  });
});

// Serve frontend assets when a production build exists.
app.use(express.static(clientBuildPath));

app.get(/^\/(?!api).*/, (_, res) => {
  res.sendFile(path.join(clientBuildPath, "index.html"), (err) => {
    if (!err) {
      return;
    }

    res.status(404).json({
      ok: false,
      message: "Route not found.",
    });
  });
});

app.use((error, _req, res, _next) => {
  if (error?.message === "Not allowed by CORS") {
    return res.status(403).json({
      ok: false,
      message: "Request origin is not allowed.",
    });
  }

  // eslint-disable-next-line no-console
  console.error("Unhandled server error:", error);
  return res.status(500).json({
    ok: false,
    message: "Unexpected server error.",
  });
});

const port = Number(process.env.PORT || 5000);
server.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${port}`);
});
