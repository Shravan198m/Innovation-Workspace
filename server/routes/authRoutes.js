const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET || "innovation-hub-dev-secret",
    { expiresIn: "8h" }
  );
}

router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedName || !normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ message: "name, email, and password are required." });
  }

  if (normalizedPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  const normalizedRole = ["STUDENT", "MENTOR", "ADMIN"].includes(role)
    ? role
    : "STUDENT";

  try {
    const existing = await pool.query("SELECT id FROM users WHERE LOWER(email) = $1", [normalizedEmail]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ message: "Email already registered." });
    }

    const passwordHash = await bcrypt.hash(normalizedPassword, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role, created_at AS "createdAt"`,
      [normalizedName, normalizedEmail, passwordHash, normalizedRole]
    );

    const user = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({ token, user });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ message: "Email already registered." });
    }

    // eslint-disable-next-line no-console
    console.error("Register failed:", error);
    return res.status(500).json({ message: "Failed to register user." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ message: "email and password are required." });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, role, password_hash
       FROM users
       WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const user = result.rows[0];
  const validPassword = await bcrypt.compare(normalizedPassword, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token = signToken(safeUser);
    return res.json({ token, user: safeUser });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Login failed:", error);
    return res.status(500).json({ message: "Failed to login." });
  }
});

module.exports = router;
