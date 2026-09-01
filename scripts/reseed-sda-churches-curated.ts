/**
 * Curated sda_church re-seed. Never imported by the server or deploy build.
 *
 *   npx tsx scripts/reseed-sda-churches-curated.ts
 *
 * Requires DATABASE_URL (env or .env), same style as EGW ingest.
 * Run AFTER migrations/0008_rebuild_sda_church.sql.
 * Inserts only seed-global-churches + seed-worldwide-churches.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

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
    // .env is optional when DATABASE_URL is already set
  }
}

async function reseed() {
  loadEnvFile();
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to reseed sda_church");
  }

  const { seedGlobalChurches } = await import("./seed-global-churches");
  const { seedWorldwideChurches } = await import("./seed-worldwide-churches");
  const { pool } = await import("../server/db");

  console.log("[reseed-sda] Seeding curated-global churches...");
  await seedGlobalChurches();
  console.log("[reseed-sda] Seeding curated-worldwide churches...");
  await seedWorldwideChurches();

  const counts = await pool.query<{
    source: string;
    verified: boolean;
    count: number;
  }>(
    `SELECT source, verified, count(*)::int AS count
       FROM sda_church
      GROUP BY source, verified
      ORDER BY source, verified`,
  );

  console.log("[reseed-sda] Counts by source and verified:");
  if (counts.rows.length === 0) {
    console.log("  (empty)");
  }
  let total = 0;
  for (const row of counts.rows) {
    total += row.count;
    console.log(`  source=${row.source} verified=${row.verified} count=${row.count}`);
  }
  console.log(`[reseed-sda] Total sda_church rows: ${total}`);

  await pool.end();
}

const scriptPath = (process.argv[1] ?? "").replace(/\\/g, "/");
const isMain =
  scriptPath.endsWith("reseed-sda-churches-curated.ts") ||
  scriptPath.endsWith("reseed-sda-churches-curated.js");

if (isMain) {
  reseed().catch((err) => {
    console.error("[reseed-sda]", err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
