import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function dedup() {
  console.log("[dedup] Removing duplicate devotional days...");

  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT id, plan_id, day_number,
             ROW_NUMBER() OVER (PARTITION BY plan_id, day_number ORDER BY id ASC) as rn
      FROM devotional_day
    ),
    dupes AS (
      SELECT id FROM ranked WHERE rn > 1
    )
    SELECT COUNT(*) as dupe_count FROM dupes
  `);

  const dupeCount = Number((result as any).rows?.[0]?.dupe_count ?? (result as any)[0]?.dupe_count ?? 0);
  console.log(`[dedup] Found ${dupeCount} duplicate day records to remove`);

  if (dupeCount === 0) {
    console.log("[dedup] No duplicates found. Done.");
    return;
  }

  await db.execute(sql`
    WITH ranked AS (
      SELECT id, plan_id, day_number,
             ROW_NUMBER() OVER (PARTITION BY plan_id, day_number ORDER BY id ASC) as rn
      FROM devotional_day
    ),
    keepers AS (
      SELECT id, plan_id, day_number FROM ranked WHERE rn = 1
    ),
    dupes AS (
      SELECT id, plan_id, day_number FROM ranked WHERE rn > 1
    ),
    conflicts AS (
      SELECT upp_dupe.id as dupe_progress_id
      FROM user_plan_progress upp_dupe
      JOIN dupes d ON upp_dupe.day_id = d.id
      JOIN keepers k ON k.plan_id = d.plan_id AND k.day_number = d.day_number
      WHERE EXISTS (
        SELECT 1 FROM user_plan_progress upp_keep
        WHERE upp_keep.enrollment_id = upp_dupe.enrollment_id
          AND upp_keep.day_id = k.id
      )
    )
    DELETE FROM user_plan_progress WHERE id IN (SELECT dupe_progress_id FROM conflicts)
  `);
  console.log("[dedup] Removed conflicting user_plan_progress rows");

  await db.execute(sql`
    WITH ranked AS (
      SELECT id, plan_id, day_number,
             ROW_NUMBER() OVER (PARTITION BY plan_id, day_number ORDER BY id ASC) as rn
      FROM devotional_day
    ),
    keepers AS (
      SELECT id, plan_id, day_number FROM ranked WHERE rn = 1
    ),
    dupes AS (
      SELECT id, plan_id, day_number FROM ranked WHERE rn > 1
    )
    UPDATE user_plan_progress upp
    SET day_id = k.id
    FROM dupes d
    JOIN keepers k ON k.plan_id = d.plan_id AND k.day_number = d.day_number
    WHERE upp.day_id = d.id
  `);
  console.log("[dedup] Updated user_plan_progress to point to surviving day records");

  const deleted = await db.execute(sql`
    WITH ranked AS (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY plan_id, day_number ORDER BY id ASC) as rn
      FROM devotional_day
    )
    DELETE FROM devotional_day
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
  `);

  console.log(`[dedup] Deleted duplicate day records`);

  const verify = await db.execute(sql`
    SELECT dp.title, COUNT(dd.id) as day_count
    FROM devotional_plan dp
    LEFT JOIN devotional_day dd ON dd.plan_id = dp.id
    GROUP BY dp.id, dp.title
    ORDER BY dp.title
  `);

  const rows = (verify as any).rows ?? verify;
  console.log("\n[dedup] Plan day counts after dedup:");
  for (const r of rows) {
    console.log(`  ${r.title}: ${r.day_count} days`);
  }

  console.log("\n[dedup] Done.");
}

dedup()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[dedup] FATAL:", err);
    process.exit(1);
  });
