import * as fs from "fs";
import * as path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { bibleVerses, bibleBooks, bibleTranslations } from "../shared/schema";
import { eq } from "drizzle-orm";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

interface NormalizedVerse {
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

async function importTranslation(translationId: string, translationName: string, dataPath: string) {
  if (!fs.existsSync(dataPath)) {
    console.error(`ERROR: ${dataPath} not found. Run: npx tsx scripts/download-translations.ts`);
    return 0;
  }

  console.log(`\nImporting ${translationName} (${translationId})...`);

  await db.insert(bibleTranslations).values({
    id: translationId,
    name: translationName,
    abbreviation: translationId,
    language: "en",
  }).onConflictDoNothing();

  const raw = fs.readFileSync(dataPath, "utf-8");
  const verses: NormalizedVerse[] = JSON.parse(raw);

  const allBooks = await db.select().from(bibleBooks);
  const bookMap = new Map<string, number>();
  for (const b of allBooks) {
    bookMap.set(b.name.toLowerCase(), b.id);
    bookMap.set(b.abbreviation.toLowerCase(), b.id);
  }

  let totalVerses = 0;
  const BATCH_SIZE = 500;
  let batch: { translationId: string; bookId: number; chapter: number; verse: number; text: string }[] = [];

  async function flushBatch() {
    if (batch.length === 0) return;
    await db.insert(bibleVerses).values(batch).onConflictDoNothing();
    totalVerses += batch.length;
    batch = [];
  }

  let lastBook = "";
  for (const v of verses) {
    const bookId = bookMap.get(v.book.toLowerCase());
    if (!bookId) {
      continue;
    }

    if (v.book !== lastBook) {
      process.stdout.write(`  ${v.book}\n`);
      lastBook = v.book;
    }

    batch.push({
      translationId,
      bookId,
      chapter: v.chapter,
      verse: v.verse,
      text: v.text,
    });
    if (batch.length >= BATCH_SIZE) await flushBatch();
  }

  await flushBatch();
  console.log(`  ${translationId} import complete: ${totalVerses} verses inserted`);
  return totalVerses;
}

async function main() {
  const dataDir = path.resolve(process.cwd(), "data");

  const asvCount = await importTranslation(
    "ASV",
    "American Standard Version",
    path.join(dataDir, "asv.json")
  );

  const webCount = await importTranslation(
    "WEB",
    "World English Bible",
    path.join(dataDir, "web.json")
  );

  console.log(`\nAll imports complete! ASV: ${asvCount}, WEB: ${webCount}`);
  await pool.end();
}

main().catch((err) => {
  console.error("Import failed:", err);
  pool.end();
  process.exit(1);
});
