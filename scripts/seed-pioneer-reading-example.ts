/**
 * Seeds one unpublished Voice of the Week example.
 *
 *   npx tsx scripts/seed-pioneer-reading-example.ts
 *
 * Requires pioneer_chapters (0012 + ingest) and pioneer_readings (0013).
 * Does not overwrite an existing row with the same id.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import {
  PIONEER_EXAMPLE_READING_ID,
  PIONEER_EXAMPLE_WORD_BUDGET,
  paragraphEndForWordBudget,
} from "../shared/pioneer-passage";

const BOOK_SLUG = "christ-and-his-righteousness";
const CHAPTER_NUMBER = 1;

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

function wordCount(paragraphs: string[]): number {
  return paragraphs
    .join(" ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

async function main() {
  loadEnvFile();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Run 0012, ingest pioneer chapters, then 0013 before seeding.",
    );
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const chapter = await client.query<{
      id: string;
      author: string;
      book: string;
      year: number;
      chapter_title: string;
      paragraphs: string[];
    }>(
      `SELECT id, author, book, year, chapter_title, paragraphs
         FROM public.pioneer_chapters
        WHERE book_slug = $1 AND chapter_number = $2`,
      [BOOK_SLUG, CHAPTER_NUMBER],
    );
    const row = chapter.rows[0];
    if (!row) {
      throw new Error(
        `No ${BOOK_SLUG} chapter ${CHAPTER_NUMBER}. Run npx tsx scripts/ingest-pioneer-books.ts first.`,
      );
    }

    const paragraphs = Array.isArray(row.paragraphs) ? row.paragraphs : [];
    const paragraphEnd = paragraphEndForWordBudget(
      paragraphs,
      PIONEER_EXAMPLE_WORD_BUDGET,
    );
    const excerpt = paragraphs.slice(0, paragraphEnd);

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO public.pioneer_readings
         (id, chapter_id, paragraph_start, paragraph_end, editor_note, week_start, sort_order, published)
       VALUES ($1, $2, 1, $3, '', NULL, 0, false)
       ON CONFLICT (id) DO NOTHING
       RETURNING id`,
      [PIONEER_EXAMPLE_READING_ID, row.id, paragraphEnd],
    );

    console.log(
      inserted.rows[0]
        ? `[pioneer-seed] Inserted unpublished ${PIONEER_EXAMPLE_READING_ID}`
        : `[pioneer-seed] ${PIONEER_EXAMPLE_READING_ID} already exists; left untouched`,
    );
    console.log(
      `[pioneer-seed] ${row.author}, ${row.book} (${row.year}), "${row.chapter_title}"`,
    );
    console.log(
      `[pioneer-seed] paragraphs 1–${paragraphEnd} (${wordCount(excerpt)} words of ${wordCount(paragraphs)} in the chapter)`,
    );
    console.log(
      `[pioneer-seed] Preview: /pioneer-reading-preview?id=${PIONEER_EXAMPLE_READING_ID}`,
    );
    console.log(
      "[pioneer-seed] Publish after writing editor_note, e.g.\n" +
        `UPDATE public.pioneer_readings\n` +
        `   SET published = true, week_start = 'YYYY-MM-DD', editor_note = '…'\n` +
        ` WHERE id = '${PIONEER_EXAMPLE_READING_ID}';`,
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("[pioneer-seed] Failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
