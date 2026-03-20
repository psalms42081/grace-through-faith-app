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
  { id: "RV1909", abbreviation: "RV1909", name: "Reina Valera 1909", language: "es", dataFile: "rv1909.json" },
  { id: "LSG", abbreviation: "LSG", name: "Louis Segond 1910", language: "fr", dataFile: "lsg.json" },
  { id: "ARC", abbreviation: "ARC", name: "Almeida Revista e Corrigida", language: "pt", dataFile: "arc.json" },
  { id: "TAGV", abbreviation: "TAGV", name: "Ang Biblia (Tagalog)", language: "fil", dataFile: "tagv.json" },
];

async function importTranslation(config: TranslationConfig): Promise<void> {
  const dataPath = path.resolve(process.cwd(), "data", config.dataFile);

  if (!fs.existsSync(dataPath)) {
    console.log(`  Skipping ${config.id}: ${dataPath} not found. Run download-multilingual-translations.ts first.`);
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
  console.log("=== Multilingual Bible Import ===\n");

  for (const config of TRANSLATIONS) {
    try {
      await importTranslation(config);
    } catch (err) {
      console.error(`  FAILED to import ${config.id}: ${err}`);
    }
  }

  console.log("\n=== Verification ===");
  const counts = await db.execute(
    sql`SELECT t.abbreviation, t.language, COUNT(v.id) as verse_count 
        FROM bible_translation t 
        LEFT JOIN bible_verse v ON v.translation_id = t.id 
        GROUP BY t.id, t.abbreviation, t.language 
        ORDER BY t.abbreviation`
  );
  for (const row of counts.rows) {
    console.log(`  ${row.abbreviation} (${row.language}): ${row.verse_count} verses`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
