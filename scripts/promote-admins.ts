import { Pool } from "pg";

const ADMIN_EMAILS = [
  "joehuber0881@gmail.com",
];

async function promoteAdmins() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const email of ADMIN_EMAILS) {
      const result = await pool.query(
        "UPDATE users SET role = 'admin' WHERE email = $1 AND role != 'admin' RETURNING id, username, email",
        [email]
      );
      if (result.rowCount && result.rowCount > 0) {
        const row = result.rows[0];
        console.log(`[promote-admins] PROMOTED ${row.username} (${row.email}) to admin`);
      } else {
        const check = await pool.query(
          "SELECT id, username, role FROM users WHERE email = $1",
          [email]
        );
        if (check.rows.length === 0) {
          console.log(`[promote-admins] SKIP: No user found with email ${email}`);
        } else {
          console.log(`[promote-admins] OK: ${check.rows[0].username} already has role=${check.rows[0].role}`);
        }
      }
    }
  } finally {
    await pool.end();
  }
}

promoteAdmins().catch((err) => {
  console.error("[promote-admins] FATAL:", err.message);
  process.exit(1);
});
