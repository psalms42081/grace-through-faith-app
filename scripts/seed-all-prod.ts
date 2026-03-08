import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function getCount(table: string): Promise<number> {
  const result = await db.execute(sql.raw(`SELECT COUNT(*)::int as cnt FROM "${table}"`));
  const rows = (result as any).rows ?? result;
  return Number(rows[0]?.cnt ?? 0);
}

async function main() {
  console.log("=== Checking production data gaps ===\n");

  const checks = [
    { table: "bible_verse", script: "seed-verses-prod.ts", label: "Bible verses (KJV/ASV/WEB)", minCount: 90000 },
    { table: "context_card", script: "seed-context.ts", label: "Context cards + Commentators", minCount: 1 },
    { table: "devotional_plan", script: "seed-devotionals.ts", label: "Devotional plans (base)", minCount: 1 },
    { table: "devotional_plan", script: "seed-sda-devotionals.ts", label: "SDA devotional plans", minCount: 10 },
    { table: "devotional_plan", script: "seed-more-devotionals.ts", label: "More devotional plans", minCount: 20 },
    { table: "timeline_event", script: "seed-timeline.ts", label: "Timeline events", minCount: 1 },
    { table: "location", script: "seed-locations.ts", label: "Bible locations", minCount: 1 },
    { table: "application_template", script: "seed-application.ts", label: "Application templates", minCount: 1 },
    { table: "kids_story", script: "seed-kids-content.ts", label: "Kids content", minCount: 1 },
    { table: "strong_entry", script: "seed-strongs-full.ts", label: "Strong's concordance", minCount: 100 },
  ];

  const needed: string[] = [];

  for (const check of checks) {
    const count = await getCount(check.table);
    if (count >= check.minCount) {
      console.log(`[OK] ${check.label} — ${count} rows`);
    } else {
      console.log(`[NEED] ${check.label} — ${count} rows (need >= ${check.minCount})`);
      needed.push(check.script);
    }
  }

  if (needed.length === 0) {
    console.log("\nAll data present. No seeding needed.");
  } else {
    const unique = [...new Set(needed)];
    console.log(`\nScripts to run: ${unique.join(", ")}`);
    console.log("Run them with: npx tsx scripts/<name>");
  }

  await pool.end();
}

main().catch((err) => {
  console.error("Check failed:", err);
  pool.end();
  process.exit(1);
});
