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
    const projectId = 65;
    const res = await pool.query(
      `SELECT id, name, mentor, mentor_name, team_lead_name, team_members
       FROM projects
       WHERE id = $1`,
      [projectId]
    );

    if (res.rowCount === 0) {
      console.log('Project not found:', projectId);
      return;
    }

    console.log('PROJECT:', res.rows[0]);

    const teamMembers = Array.isArray(res.rows[0].team_members) ? res.rows[0].team_members : [];
    console.log('Team members count:', teamMembers.length);
    console.log(teamMembers.slice(0, 20));

    // Check a few users mentioned earlier
    const emails = ['svmoodlu198@gmail.com', 'sumukhaudupa1@gmail.com', 'shreeramvr4@gmail.com'];
    for (const email of emails) {
      const u = await pool.query('SELECT id, name, email, role FROM users WHERE LOWER(email) = $1', [email.toLowerCase()]);
      console.log('USER', email, u.rowCount ? u.rows[0] : '(not found)');
    }
  } catch (e) {
    console.error('ERROR', e.message);
    console.error(e.stack);
  } finally {
    await pool.end();
  }
})();
