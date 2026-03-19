import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function normalize() {
  console.log("Normalizing verse_start/verse_end columns...");

  await db.execute(sql`UPDATE layer_completions SET verse_start = 0 WHERE verse_start IS NULL`);
  await db.execute(sql`UPDATE layer_completions SET verse_end = 0 WHERE verse_end IS NULL`);
  await db.execute(sql`UPDATE study_journal_entries SET verse_start = 0 WHERE verse_start IS NULL`);
  await db.execute(sql`UPDATE study_journal_entries SET verse_end = 0 WHERE verse_end IS NULL`);
  console.log("NULL values normalized to 0");

  const lcDups = await db.execute(sql`
    DELETE FROM layer_completions
    WHERE id NOT IN (
      SELECT DISTINCT ON (user_id, book_id, chapter, layer, verse_start, verse_end) id
      FROM layer_completions
      ORDER BY user_id, book_id, chapter, layer, verse_start, verse_end, completed_at DESC
    )
  `);
  console.log("Deduplicated layer_completions");

  const sjDups = await db.execute(sql`
    DELETE FROM study_journal_entries
    WHERE id NOT IN (
      SELECT DISTINCT ON (user_id, book_id, chapter, layer, section_key, verse_start, verse_end) id
      FROM study_journal_entries
      ORDER BY user_id, book_id, chapter, layer, section_key, verse_start, verse_end, updated_at DESC
    )
  `);
  console.log("Deduplicated study_journal_entries");

  console.log("Verse column normalization complete");
  process.exit(0);
}

normalize().catch((err) => {
  console.error("Normalization failed:", err);
  process.exit(1);
});
