import * as fs from "fs";
import * as path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { bibleVerses, bibleBooks } from "../shared/schema";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

interface VerseEntry {
  verse: string;
  text: string;
}

interface ChapterEntry {
  chapter: string;
  verses: VerseEntry[];
}

interface BookEntry {
  book: string;
  chapters: ChapterEntry[];
}

async function importKjv() {
  const dataPath = path.resolve(process.cwd(), "data", "kjv.json");

  if (!fs.existsSync(dataPath)) {
    console.error("ERROR: data/kjv.json not found. Run: npx tsx scripts/download-kjv.ts");
    process.exit(1);
  }

  console.log("Reading data/kjv.json...");
  const raw = fs.readFileSync(dataPath, "utf-8");
  const data: BookEntry[] = JSON.parse(raw);

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

  for (const bookEntry of data) {
    const bookName = bookEntry.book;
    const bookId = bookMap.get(bookName.toLowerCase());

    if (!bookId) {
      console.warn(`  Skipping unknown book: ${bookName}`);
      continue;
    }

    for (const chapterEntry of bookEntry.chapters) {
      const chapterNum = parseInt(chapterEntry.chapter, 10);

      for (const verseEntry of chapterEntry.verses) {
        batch.push({
          translationId: "KJV",
          bookId,
          chapter: chapterNum,
          verse: parseInt(verseEntry.verse, 10),
          text: verseEntry.text,
        });
        if (batch.length >= BATCH_SIZE) await flushBatch();
      }
    }
    process.stdout.write(`  Imported ${bookName}\n`);
  }

  await flushBatch();
  console.log(`\nImport complete! ${totalVerses} verses inserted.`);
  await pool.end();
}

importKjv().catch((err) => {
  console.error("Import failed:", err);
  pool.end();
  process.exit(1);
});
