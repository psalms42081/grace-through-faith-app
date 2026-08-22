import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

export async function warnIfDevotionalCatalogIsEmpty() {
  try {
    const result = await pool.query<{ count: number }>(
      `SELECT count(*)::int AS count
         FROM devotional_plan
        WHERE provenance = 'human_curated'`,
    );

    if (result.rows[0]?.count === 0) {
      console.error(
        "[CRITICAL][devotional-catalog] No human-curated devotional series are available. " +
          "The catalog is empty. `db:push` only synchronizes schema; apply " +
          "migrations/0005_restore_approved_devotional_catalog.sql after devotional plans are seeded.",
      );
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error(
      `[CRITICAL][devotional-catalog] Could not verify catalog health at startup: ${detail}`,
    );
  }
}

export const db = drizzle(pool, { schema });
