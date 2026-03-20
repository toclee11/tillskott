import { Pool } from "pg";

let pool: Pool | null = null;

export function getDbPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;

  if (!pool) {
    pool = new Pool({
      connectionString,
      // Keep defaults; rely on DATABASE_URL for tuning.
    });
  }

  return pool;
}

