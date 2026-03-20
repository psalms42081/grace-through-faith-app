import * as fs from "fs";
import * as path from "path";
import { db } from "../server/db";
import { bibleTranslations, bibleVerses, bibleBooks } from "../shared/schema";
import { eq, sql } from "drizzle-orm";

interface NormalizedVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

interface TranslationConfig {
  id: string;
  abbreviation: string;
  name: string;
  language: string;
  dataFile: string;
}

const TRANSLATIONS: TranslationConfig[] = [
  { id: "BBE", abbreviation: "BBE", name: "Bible in Basic English", language: "en", dataFile: "bbe.json" },
  { id: "YLT", abbreviation: "YLT", name: "Young's Literal Translation", language: "en", dataFile: "ylt.json" },
];

async function importTranslation(config: TranslationConfig): Promise<void> {
  const dataPath = path.resolve(process.cwd(), "data", config.dataFile);

  if (!fs.existsSync(dataPath)) {
    console.log(`  Skipping ${config.id}: ${dataPath} not found. Run download-english-translations.ts first.`);
    return;
  }

  console.log(`\nImporting ${config.id} (${config.name})...`);

  const existing = await db
    .select()
    .from(bibleTranslations)
    .where(eq(bibleTranslations.id, config.id))
    .limit(1);

  if (existing.length > 0) {
    console.log(`  Translation row already exists, clearing old verses...`);
    await db.delete(bibleVerses).where(eq(bibleVerses.translationId, config.id));
  } else {
    await db.insert(bibleTranslations).values({
      id: config.id,
      abbreviation: config.abbreviation,
      name: config.name,
      language: config.language,
    });
    console.log(`  Created translation row: ${config.id}`);
  }

  const allBooks = await db.select().from(bibleBooks);
  const bookNameToId: Record<string, number> = {};
  for (const b of allBooks) {
    bookNameToId[b.name.toLowerCase()] = b.id;
  }

  const raw = fs.readFileSync(dataPath, "utf-8");
  const verses: NormalizedVerse[] = JSON.parse(raw);

  let imported = 0;
  let skipped = 0;
  const BATCH_SIZE = 500;

  for (let i = 0; i < verses.length; i += BATCH_SIZE) {
    const batch = verses.slice(i, i + BATCH_SIZE);
    const rows: {
      translationId: string;
      bookId: number;
      chapter: number;
      verse: number;
      text: string;
    }[] = [];

    for (const v of batch) {
      const bookId = bookNameToId[v.book.toLowerCase()];
      if (!bookId) {
        skipped++;
        continue;
      }
      rows.push({
        translationId: config.id,
        bookId,
        chapter: v.chapter,
        verse: v.verse,
        text: v.text,
      });
    }

    if (rows.length > 0) {
      await db.insert(bibleVerses).values(rows);
      imported += rows.length;
    }

    if ((i / BATCH_SIZE) % 20 === 0) {
      process.stdout.write(`  Progress: ${imported} imported, ${skipped} skipped\r`);
    }
  }

  console.log(`  ${config.id}: ${imported} verses imported, ${skipped} skipped (unmatched book names)`);
}

async function main() {
  console.log("=== Additional English Bible Import ===\n");

  for (const config of TRANSLATIONS) {
    try {
      await importTranslation(config);
    } catch (err) {
      console.error(`  FAILED to import ${config.id}: ${err}`);
    }
  }

  console.log("\n=== Full Translation Verification ===");
  const counts = await db.execute(
    sql`SELECT t.abbreviation, t.language, t.name, COUNT(v.id) as verse_count 
        FROM bible_translation t 
        LEFT JOIN bible_verse v ON v.translation_id = t.id 
        GROUP BY t.id, t.abbreviation, t.language, t.name 
        ORDER BY t.language, t.abbreviation`
  );
  for (const row of counts.rows) {
    console.log(`  ${row.abbreviation} (${row.language}): ${row.verse_count} verses — ${row.name}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
