require("dotenv").config();
const bcrypt = require("bcrypt");
const { Pool } = require("pg");

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT || 5432),
});

async function main() {
  const managerEmail = String(process.env.PRIMARY_MANAGER_EMAIL || "inovationhub2026@gmail.com").trim().toLowerCase();
  const managerPassword = String(process.env.PRIMARY_MANAGER_PASSWORD || "1234567890");
  const managerName = String(process.env.PRIMARY_MANAGER_NAME || "Innovation").trim() || "Innovation";

  const existing = await pool.query(
    "SELECT id, password_hash, role FROM users WHERE LOWER(email) = $1 LIMIT 1",
    [managerEmail]
  );

  if (existing.rowCount === 0) {
    const hash = await bcrypt.hash(managerPassword, 10);
    await pool.query(
      "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'ADMIN')",
      [managerName, managerEmail, hash]
    );
  } else {
    const row = existing.rows[0];
    const hasExpectedPassword = await bcrypt.compare(managerPassword, row.password_hash);
    const nextHash = hasExpectedPassword ? row.password_hash : await bcrypt.hash(managerPassword, 10);

    await pool.query(
      "UPDATE users SET name = $1, password_hash = $2, role = 'ADMIN' WHERE id = $3",
      [managerName, nextHash, row.id]
    );
  }

  const demoted = await pool.query(
    "UPDATE users SET role = 'STUDENT' WHERE LOWER(email) <> $1 AND UPPER(role) = 'ADMIN'",
    [managerEmail]
  );

  const manager = await pool.query(
    "SELECT id, name, email, role FROM users WHERE LOWER(email) = $1 LIMIT 1",
    [managerEmail]
  );

  console.log("[manager-cleanup] demoted_admin_users:", demoted.rowCount);
  console.log("[manager-cleanup] manager_record:", manager.rows[0] || null);
}

main()
  .catch((error) => {
    console.error("[manager-cleanup] failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
