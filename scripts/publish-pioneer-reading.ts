/**
 * Queue a published Voice of the Week row.
 *
 *   npx tsx --env-file=.env scripts/publish-pioneer-reading.ts <chapterId> <editorNoteFile> <weekStart>
 *
 * weekStart is YYYY-MM-DD and must be a Saturday. The editor note is read
 * from the file; this script does not write note text.
 * The Devotions card shows the published row whose week_start is the most
 * recent Saturday on or before today. Later Saturdays stay queued.
 */
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
    // DATABASE_URL may already be in the environment
  }
}

export function isSaturdayDate(weekStart: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return false;
  const [year, month, day] = weekStart.split("-").map(Number);
  if (!year || !month || !day) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && date.getUTCDay() === 6;
}

async function main() {
  const [chapterId, noteFile, weekStart] = process.argv.slice(2);
  if (!chapterId || !noteFile || !weekStart) {
    throw new Error(
      "Usage: npx tsx --env-file=.env scripts/publish-pioneer-reading.ts <chapterId> <editorNoteFile> <weekStart>",
    );
  }
  if (!isSaturdayDate(weekStart)) {
    throw new Error(`week_start must be a Saturday in YYYY-MM-DD form. Received ${weekStart}.`);
  }

  const editorNote = readFileSync(path.resolve(process.cwd(), noteFile), "utf8").trim();
  loadEnvFile();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const chapter = await client.query<{ id: string; paragraph_count: number }>(
      `SELECT id, COALESCE(jsonb_array_length(paragraphs::jsonb), 0) AS paragraph_count
         FROM public.pioneer_chapters
        WHERE id = $1`,
      [chapterId],
    );
    const row = chapter.rows[0];
    if (!row) throw new Error(`No pioneer chapter ${chapterId}.`);
    const paragraphEnd = Math.max(1, Number(row.paragraph_count) || 1);
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO public.pioneer_readings
         (chapter_id, paragraph_start, paragraph_end, editor_note, week_start, sort_order, published)
       VALUES ($1, 1, $2, $3, $4, 0, true)
       RETURNING id`,
      [row.id, paragraphEnd, editorNote, weekStart],
    );
    const id = inserted.rows[0]?.id;
    console.log(`[pioneer-publish] Published ${id} for chapter ${row.id} starting ${weekStart}.`);
  } finally {
    await client.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch((error) => {
    console.error("[pioneer-publish] Failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
