import * as fs from "fs";
import * as path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { bibleVerses, bibleBooks } from "../shared/schema";
import { sql } from "drizzle-orm";

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

async function seedVerses() {
  const countResult = await db.execute(sql`SELECT COUNT(*)::int as cnt FROM bible_verse`);
  const count = (countResult as any).rows?.[0]?.cnt ?? (countResult as any)[0]?.cnt ?? 0;

  if (Number(count) > 0) {
    console.log(`Bible verses already seeded (${count} found). Skipping.`);
    await pool.end();
    return;
  }

  const dataPath = path.resolve(process.cwd(), "data", "kjv.json");
  if (!fs.existsSync(dataPath)) {
    console.log("No data/kjv.json found — skipping verse seed.");
    await pool.end();
    return;
  }

  console.log("Seeding Bible verses from kjv.json...");
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
  console.log(`Verse seed complete! ${totalVerses} verses inserted.`);
  await pool.end();
}

seedVerses().catch((err) => {
  console.error("Verse seed failed:", err);
  pool.end();
  process.exit(1);
});
