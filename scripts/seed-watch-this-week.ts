/**
 * Apply migrations/0027_featured_video.sql only, then run the Watch this week
 * selection once. Does not run any other migration. Safe to repeat: the table
 * is created IF NOT EXISTS, and the job no-ops when this Sydney week already
 * has a visible row.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

function loadEnvFile() {
  if (process.env.DATABASE_URL) return;
  try {
    const text = readFileSync(path.resolve(process.cwd(), ".env"), "utf8");
    for (const raw of text.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("#")) continue;
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {
    // DATABASE_URL may already be in the environment.
  }
}

function safe(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database]");
}

function withoutOuterTransaction(content: string): string {
  return content
    .trim()
    .replace(/^BEGIN\s*;\s*/i, "")
    .replace(/\s*COMMIT\s*;$/i, "")
    .trim();
}

async function applyFeaturedVideoMigration(databaseUrl: string) {
  const filename = "0027_featured_video.sql";
  const fullPath = path.resolve(process.cwd(), "migrations", filename);
  const content = readFileSync(fullPath, "utf8");
  const checksum = createHash("sha256").update(content).digest("hex");
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(withoutOuterTransaction(content));
    const ledger = await client.query<{ present: boolean }>(
      `SELECT to_regclass('public.app_sql_migration') IS NOT NULL AS present`,
    );
    if (ledger.rows[0]?.present) {
      const existing = await client.query<{ checksum: string }>(
        `SELECT checksum FROM public.app_sql_migration WHERE filename = $1`,
        [filename],
      );
      if (!existing.rows[0]) {
        await client.query(
          `INSERT INTO public.app_sql_migration (filename, checksum, execution_method)
           VALUES ($1, $2, 'applied')`,
          [filename, checksum],
        );
        console.log(`Recorded ${filename} in the migration ledger`);
      } else if (existing.rows[0].checksum !== checksum) {
        throw new Error(`${filename} is already recorded with a different checksum`);
      } else {
        console.log(`${filename} was already recorded`);
      }
    } else {
      console.log("Migration ledger is not present; applied the table SQL only");
    }
    await client.query("COMMIT");
    console.log(`Applied ${filename}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

async function main() {
  loadEnvFile();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  if (databaseUrl.includes("neon.tech")) {
    process.env.NODE_ENV = "production";
  }

  await applyFeaturedVideoMigration(databaseUrl);

  const { runWatchThisWeekJob } = await import("../server/services/watch-this-week-job");
  const { pool } = await import("../server/db");
  try {
    const result = await runWatchThisWeekJob();
    console.log(
      JSON.stringify(
        {
          status: result.status,
          featuredWeek: result.featuredWeek,
          youtubeId: result.youtubeId,
          title: result.title,
          channel: result.channel,
          playlistId: result.playlistId,
          publishedAt: result.publishedAt,
          durationSeconds: result.durationSeconds,
        },
        null,
        2,
      ),
    );
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(safe(error));
  process.exit(1);
});
