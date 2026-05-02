require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

(async () => {
  try {
    const tables = await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'");
    console.log('TABLES:', tables.rows.map(r => r.tablename).join(', '));

    const mgrEmail = String(process.env.PRIMARY_MANAGER_EMAIL || '').toLowerCase();
    console.log('PRIMARY_MANAGER_EMAIL:', mgrEmail || '(not set)');

    if (mgrEmail) {
      const res = await pool.query('SELECT id, email, role FROM users WHERE LOWER(email) = $1', [mgrEmail]);
      if (res.rowCount === 0) {
        console.log('MANAGER: not found in users table');
      } else {
        console.log('MANAGER:', res.rows[0]);
      }
    }
  } catch (e) {
    console.error('QUERY ERROR:', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
})();
