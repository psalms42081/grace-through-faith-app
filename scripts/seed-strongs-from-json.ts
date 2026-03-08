import * as fs from "fs";
import * as path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { strongEntries } from "../shared/schema";
import { sql } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function main() {
  const countResult = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM strong_entry`);
  const rows = (countResult as any).rows ?? countResult;
  const count = Number(rows[0]?.cnt ?? 0);

  if (count > 100) {
    console.log(`Strong's already seeded (${count} entries). Skipping.`);
    await pool.end();
    return;
  }

  const dataPath = path.resolve(process.cwd(), "data", "strongs.json");
  if (!fs.existsSync(dataPath)) {
    console.log("No data/strongs.json found. Skipping.");
    await pool.end();
    return;
  }

  console.log("Seeding Strong's concordance from strongs.json...");
  const raw = fs.readFileSync(dataPath, "utf-8");
  const entries = JSON.parse(raw);

  const BATCH_SIZE = 500;
  let total = 0;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    await db.insert(strongEntries).values(batch).onConflictDoNothing();
    total += batch.length;
  }

  console.log(`Strong's seed complete! ${total} entries inserted.`);
  await pool.end();
}

main().catch((err) => {
  console.error("Strong's seed failed:", err);
  pool.end();
  process.exit(1);
});
