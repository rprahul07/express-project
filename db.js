const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and paste your Supabase connection string into it."
  );
}

// Direct connection to the Supabase Postgres database (Supabase requires SSL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// Creates the students table on first run. Row Level Security is switched on so the table is not readable
// or writable through Supabase's public API; this server connects as the table owner, which bypasses it.
async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS students (
      id    integer PRIMARY KEY,
      name  text NOT NULL,
      class text NOT NULL
    )
  `);
  await pool.query("ALTER TABLE students ENABLE ROW LEVEL SECURITY");
}

module.exports = { pool, initDb };
