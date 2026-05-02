const router = require("express").Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../db");
const { normalizeRole } = require("../middleware/role");
const { validateBody } = require("../middleware/validate");
const { authRegisterSchema, authLoginSchema, authGoogleSchema } = require("../validation/schemas");

const googleAudienceList = Array.from(
  new Set(
    String(process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  )
);
const googleClient = new OAuth2Client(googleAudienceList[0] || "");
const primaryManagerEmail = String(process.env.PRIMARY_MANAGER_EMAIL || "inovationhub2026@gmail.com").trim().toLowerCase();
const primaryManagerPassword = String(process.env.PRIMARY_MANAGER_PASSWORD || "1234567890");
const primaryManagerName = String(process.env.PRIMARY_MANAGER_NAME || "Innovation").trim() || "Innovation";
const allowGoogleForManager = String(process.env.ALLOW_GOOGLE_FOR_MANAGER || "").trim().toLowerCase() === "true";
const allowedEmailDomains = String(process.env.ALLOWED_EMAIL_DOMAINS || "")
  .split(",")
  .map((domain) => domain.trim().toLowerCase())
  .filter(Boolean);

async function enforceSingleManagerPolicy() {
  if (!primaryManagerEmail || !primaryManagerPassword) {
    return;
  }

  const existingManagerResult = await pool.query(
    `SELECT id, password_hash, role
     FROM users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [primaryManagerEmail]
  );

  if (existingManagerResult.rowCount === 0) {
    const managerHash = await bcrypt.hash(primaryManagerPassword, 10);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'ADMIN')`,
      [primaryManagerName, primaryManagerEmail, managerHash]
    );
  } else {
    const manager = existingManagerResult.rows[0];
    const hasExpectedPassword = await bcrypt.compare(primaryManagerPassword, manager.password_hash);

    if (!hasExpectedPassword || normalizeRole(manager.role) !== "admin") {
      const updatedHash = hasExpectedPassword ? manager.password_hash : await bcrypt.hash(primaryManagerPassword, 10);
      await pool.query(
        `UPDATE users
         SET name = $1,
             password_hash = $2,
             role = 'ADMIN'
         WHERE id = $3`,
        [primaryManagerName, updatedHash, manager.id]
      );
    }
  }

  await pool.query(
    `UPDATE users
     SET role = 'STUDENT'
     WHERE LOWER(email) <> $1
       AND UPPER(role) = 'ADMIN'`,
    [primaryManagerEmail]
  );
}

function getEmailDomain(email) {
  return String(email || "")
    .trim()
    .toLowerCase()
    .split("@")[1] || "";
}

function isAllowedEmailDomain(email) {
  if (allowedEmailDomains.length === 0) {
    return true;
  }

  const domain = getEmailDomain(email);
  return Boolean(domain) && allowedEmailDomains.includes(domain);
}

function getDomainRestrictionMessage() {
  if (allowedEmailDomains.length === 0) {
    return "Email domain is not allowed.";
  }

  return `Use an approved email domain: ${allowedEmailDomains.join(", ")}.`;
}

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: normalizeRole(user.role),
    },
    process.env.JWT_SECRET || "innovation-hub-dev-secret",
    { expiresIn: "8h" }
  );
}

async function ensureGoogleUser(payload) {
  await enforceSingleManagerPolicy();

  const email = String(payload?.email || "").trim().toLowerCase();
  const name = String(payload?.name || "").trim() || email.split("@")[0] || "Google User";

  if (!email) {
    throw new Error("Google account email is required.");
  }

  if (email === primaryManagerEmail) {
    if (!allowGoogleForManager) {
      const error = new Error("Use password login for the manager account.");
      error.statusCode = 403;
      throw error;
    }
  }

  if (!isAllowedEmailDomain(email)) {
    const error = new Error(getDomainRestrictionMessage());
    error.statusCode = 403;
    throw error;
  }

  const existing = await pool.query(
    `SELECT id, name, email, role
     FROM users
     WHERE LOWER(email) = $1
     LIMIT 1`,
    [email]
  );

  if (existing.rowCount > 0) {
    return {
      ...existing.rows[0],
      role: normalizeRole(existing.rows[0].role),
    };
  }

  const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, created_at AS "createdAt"`,
    [name, email, passwordHash, "STUDENT"]
  );

  return {
    ...result.rows[0],
    role: normalizeRole(result.rows[0].role),
  };
}

router.post("/register", validateBody(authRegisterSchema), async (req, res) => {
  const { name, email, password } = req.body;

  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedName || !normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ message: "name, email, and password are required." });
  }

  await enforceSingleManagerPolicy();

  if (normalizedEmail === primaryManagerEmail) {
    return res.status(403).json({ message: "Manager account is reserved and cannot be registered." });
  }

  if (!isAllowedEmailDomain(normalizedEmail)) {
    return res.status(403).json({ message: getDomainRestrictionMessage() });
  }

  if (normalizedPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

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
      [normalizedName, normalizedEmail, passwordHash, "STUDENT"]
    );

    const user = {
      ...result.rows[0],
      role: normalizeRole(result.rows[0].role),
    };
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

router.post("/login", validateBody(authLoginSchema), async (req, res) => {
  const { email, password } = req.body;

  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ message: "email and password are required." });
  }

  await enforceSingleManagerPolicy();

  if (!isAllowedEmailDomain(normalizedEmail)) {
    return res.status(403).json({ message: getDomainRestrictionMessage() });
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
      role: normalizeRole(user.role),
    };

    const token = signToken(safeUser);
    return res.json({ token, user: safeUser });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Login failed:", error);
    return res.status(500).json({ message: "Failed to login." });
  }
});

router.post("/google", validateBody(authGoogleSchema), async (req, res) => {
  const credential = String(req.body?.token || req.body?.credential || "").trim();

  if (!credential) {
    return res.status(400).json({ message: "Google credential token is required." });
  }

  if (googleAudienceList.length === 0) {
    return res.status(500).json({ message: "Google login is not configured on the server." });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleAudienceList.length === 1 ? googleAudienceList[0] : googleAudienceList,
    });

    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.email_verified) {
      return res.status(401).json({ message: "Google account is not verified." });
    }

    const user = await ensureGoogleUser(payload);
    const token = signToken(user);

    return res.json({ token, user });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    const errorMessage = String(error?.message || "");
    if (/Wrong recipient|audience/i.test(errorMessage)) {
      return res.status(401).json({
        message: "Google token audience mismatch. Verify GOOGLE_CLIENT_ID(S) matches the frontend client ID.",
      });
    }

    // eslint-disable-next-line no-console
    console.error("Google login failed:", error);
    return res.status(401).json({ message: "Invalid Google login token." });
  }
});

module.exports = router;
