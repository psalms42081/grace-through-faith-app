import * as fs from "fs";
import * as path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { bibleVerses, bibleBooks, bibleTranslations } from "../shared/schema";
import { sql, eq } from "drizzle-orm";

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

const TRANSLATIONS = [
  { id: "KJV", name: "King James Version", abbreviation: "KJV", language: "en", file: "kjv.json" },
  { id: "ASV", name: "American Standard Version", abbreviation: "ASV", language: "en", file: "asv.json" },
  { id: "WEB", name: "World English Bible", abbreviation: "WEB", language: "en", file: "web.json" },
];

async function seedTranslation(translationId: string, dataFile: string, bookMap: Map<string, number>) {
  const countResult = await db.execute(
    sql`SELECT COUNT(*)::int as cnt FROM bible_verse WHERE translation_id = ${translationId}`
  );
  const count = (countResult as any).rows?.[0]?.cnt ?? (countResult as any)[0]?.cnt ?? 0;

  if (Number(count) > 0) {
    console.log(`${translationId}: already seeded (${count} verses). Skipping.`);
    return;
  }

  const dataPath = path.resolve(process.cwd(), "data", dataFile);
  if (!fs.existsSync(dataPath)) {
    console.log(`${translationId}: data/${dataFile} not found. Skipping.`);
    return;
  }

  console.log(`${translationId}: Seeding verses from ${dataFile}...`);
  const raw = fs.readFileSync(dataPath, "utf-8");
  const data: BookEntry[] = JSON.parse(raw);

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
    if (!bookId) continue;

    for (const chapterEntry of bookEntry.chapters) {
      const chapterNum = parseInt(chapterEntry.chapter, 10);
      for (const verseEntry of chapterEntry.verses) {
        batch.push({
          translationId,
          bookId,
          chapter: chapterNum,
          verse: parseInt(verseEntry.verse, 10),
          text: verseEntry.text,
        });
        if (batch.length >= BATCH_SIZE) await flushBatch();
      }
    }
  }

  await flushBatch();
  console.log(`${translationId}: ${totalVerses} verses inserted.`);
}

async function seedVerses() {
  const allBooks = await db.select().from(bibleBooks);
  const bookMap = new Map<string, number>();
  for (const b of allBooks) {
    bookMap.set(b.name.toLowerCase(), b.id);
    bookMap.set(b.abbreviation.toLowerCase(), b.id);
  }

  for (const tx of TRANSLATIONS) {
    await db.insert(bibleTranslations).values({
      id: tx.id,
      name: tx.name,
      abbreviation: tx.abbreviation,
      language: tx.language,
    }).onConflictDoNothing();

    await seedTranslation(tx.id, tx.file, bookMap);
  }

  console.log("All translations seeded.");
  await pool.end();
}

seedVerses().catch((err) => {
  console.error("Verse seed failed:", err);
  pool.end();
  process.exit(1);
});
