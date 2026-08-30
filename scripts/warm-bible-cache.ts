import "dotenv/config";
import { db } from "../server/db";
import { bibleBooks, bibleCache } from "../shared/schema";
import { eq, and, ilike } from "drizzle-orm";
import {
  API_BIBLE_TRANSLATIONS,
  buildEditionCacheKey,
  fetchApiBibleChapter,
  isStructuredApiBibleCache,
} from "../server/services/scripture-service";

const NLT_BOOK_MAP: Record<string, string> = {
  Genesis: "Gen", Exodus: "Exod", Leviticus: "Lev", Numbers: "Num",
  Deuteronomy: "Deut", Joshua: "Josh", Judges: "Judg", Ruth: "Ruth",
  "1 Samuel": "1Sam", "2 Samuel": "2Sam", "1 Kings": "1Kgs", "2 Kings": "2Kgs",
  "1 Chronicles": "1Chr", "2 Chronicles": "2Chr", Ezra: "Ezra", Nehemiah: "Neh",
  Esther: "Esth", Job: "Job", Psalms: "Ps", Proverbs: "Prov",
  Ecclesiastes: "Eccl", "Song of Solomon": "Song", Isaiah: "Isa", Jeremiah: "Jer",
  Lamentations: "Lam", Ezekiel: "Ezek", Daniel: "Dan", Hosea: "Hos",
  Joel: "Joel", Amos: "Amos", Obadiah: "Obad", Jonah: "Jonah",
  Micah: "Mic", Nahum: "Nah", Habakkuk: "Hab", Zephaniah: "Zeph",
  Haggai: "Hag", Zechariah: "Zech", Malachi: "Mal",
  Matthew: "Matt", Mark: "Mark", Luke: "Luke", John: "John",
  Acts: "Acts", Romans: "Rom", "1 Corinthians": "1Cor", "2 Corinthians": "2Cor",
  Galatians: "Gal", Ephesians: "Eph", Philippians: "Phil", Colossians: "Col",
  "1 Thessalonians": "1Thess", "2 Thessalonians": "2Thess", "1 Timothy": "1Tim",
  "2 Timothy": "2Tim", Titus: "Titus", Philemon: "Phlm", Hebrews: "Heb",
  James: "Jas", "1 Peter": "1Pet", "2 Peter": "2Pet", "1 John": "1John",
  "2 John": "2John", "3 John": "3John", Jude: "Jude", Revelation: "Rev",
};

const CHAPTERS_TO_WARM: { book: string; chapters: number[] }[] = [
  { book: "Genesis", chapters: [1] },
  { book: "Psalms", chapters: [23, 91, 119] },
  { book: "Isaiah", chapters: [53] },
  { book: "Matthew", chapters: [5, 6, 7, 28] },
  { book: "John", chapters: Array.from({ length: 21 }, (_, i) => i + 1) },
  { book: "Romans", chapters: [8] },
  { book: "1 Corinthians", chapters: [13] },
  { book: "Revelation", chapters: [12, 14] },
];

function stripNestedSpan(html: string, className: string): string {
  let result = "";
  let i = 0;
  const openTag = `<span class="${className}"`;
  while (i < html.length) {
    const idx = html.toLowerCase().indexOf(openTag.toLowerCase(), i);
    if (idx === -1) { result += html.slice(i); break; }
    result += html.slice(i, idx);
    let depth = 1;
    let j = html.indexOf(">", idx) + 1;
    while (j < html.length && depth > 0) {
      if (html.slice(j, j + 5).toLowerCase() === "<span") { depth++; j = html.indexOf(">", j) + 1; }
      else if (html.slice(j, j + 7).toLowerCase() === "</span>") { depth--; j += 7; }
      else { j++; }
    }
    i = j;
  }
  return result;
}

function parseNltHtml(html: string, bookId: number, chapterNum: number): any[] {
  const verses: any[] = [];
  const verseRegex = /<verse_export[^>]*bk="[^"]*"[^>]*ch="(\d+)"[^>]*vn="(\d+)"[^>]*>([\s\S]*?)<\/verse_export>/gi;
  let match;
  while ((match = verseRegex.exec(html)) !== null) {
    const vn = parseInt(match[2], 10);
    let text = match[3];
    text = text.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, "");
    text = text.replace(/<p class="psa-title"[^>]*>[\s\S]*?<\/p>/gi, "");
    text = text.replace(/<p class="subhead"[^>]*>[\s\S]*?<\/p>/gi, "");
    text = stripNestedSpan(text, "tn");
    text = text.replace(/<a class="a-tn"[^>]*>\*?<\/a>/gi, "").replace(/<span class="vn">\d+<\/span>/gi, "").replace(/<span class="s-heb">[^<]*<\/span>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) {
      verses.push({ id: `nlt-${bookId}-${chapterNum}-${vn}`, translationId: "NLT", bookId, chapter: chapterNum, verse: vn, text, searchVector: null });
    }
  }
  return verses;
}

async function fetchNltChapter(bookName: string, bookId: number, chapterNum: number): Promise<any[]> {
  const apiKey = process.env.NLT_API_KEY;
  if (!apiKey) throw new Error("NLT_API_KEY not set");
  const nltBook = NLT_BOOK_MAP[bookName] || bookName;
  const url = `https://api.nlt.to/api/passages?ref=${encodeURIComponent(nltBook)}.${chapterNum}&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`NLT API ${response.status}`);
  const html = await response.text();
  return parseNltHtml(html, bookId, chapterNum);
}

function cacheKeyFor(translation: string): string {
  if (translation === "NLT") return "NLT";
  const config = API_BIBLE_TRANSLATIONS[translation];
  if (!config) throw new Error(`Unknown translation: ${translation}`);
  return buildEditionCacheKey(translation, config.bibleId);
}

async function isAlreadyCached(translation: string, bookId: number, chapter: number): Promise<boolean> {
  const key = cacheKeyFor(translation);
  const existing = await db.select({ versesJson: bibleCache.versesJson }).from(bibleCache)
    .where(and(eq(bibleCache.translation, key), eq(bibleCache.bookId, bookId), eq(bibleCache.chapter, chapter)))
    .limit(1);
  if (!existing.length) return false;
  if (translation === "NLT") return true;
  return isStructuredApiBibleCache(existing[0].versesJson);
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function main() {
  const translations = ["NLT", "NIV", "AMP", "NASB"];
  let totalFetched = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  console.log("=== Bible Cache Warming Script ===");
  console.log(`Translations: ${translations.join(", ")}`);

  const uniqueChapters: { book: string; chapter: number }[] = [];
  for (const entry of CHAPTERS_TO_WARM) {
    for (const ch of entry.chapters) {
      uniqueChapters.push({ book: entry.book, chapter: ch });
    }
  }
  console.log(`Chapters to warm per translation: ${uniqueChapters.length}`);
  console.log(`Total requests (max): ${uniqueChapters.length * translations.length}`);
  console.log("");

  for (const translation of translations) {
    console.log(`\n--- ${translation} ---`);

    for (const { book, chapter } of uniqueChapters) {
      const bookRecord = await db.select().from(bibleBooks).where(ilike(bibleBooks.name, book)).limit(1);
      if (!bookRecord.length) {
        console.log(`  SKIP: Book "${book}" not found in database`);
        totalSkipped++;
        continue;
      }
      const bookId = bookRecord[0].id;
      const bookName = bookRecord[0].name;

      if (await isAlreadyCached(translation, bookId, chapter)) {
        console.log(`  CACHED: ${bookName} ${chapter} (${translation}) — already in cache`);
        totalSkipped++;
        continue;
      }

      try {
        let payload: any;
        let verseCount = 0;
        let sourceApi: string;
        const cacheKey = cacheKeyFor(translation);

        if (translation === "NLT") {
          payload = await fetchNltChapter(bookName, bookId, chapter);
          verseCount = payload.length;
          sourceApi = "nlt_api";
        } else {
          const config = API_BIBLE_TRANSLATIONS[translation];
          if (!config) throw new Error(`Unknown translation: ${translation}`);
          payload = await fetchApiBibleChapter(bookName, bookId, chapter, translation, config);
          verseCount = payload.verses.length;
          sourceApi = "api_bible";
        }

        if (verseCount === 0) {
          console.log(`  WARN: ${bookName} ${chapter} (${translation}) — 0 verses returned`);
          totalErrors++;
          continue;
        }

        await db.insert(bibleCache).values({
          translation: cacheKey,
          bookId,
          bookName,
          chapter,
          versesJson: payload,
          verseCount,
          sourceApi,
        }).onConflictDoUpdate({
          target: [bibleCache.translation, bibleCache.bookId, bibleCache.chapter],
          set: {
            versesJson: payload,
            verseCount,
            bookName,
            sourceApi,
            fetchedAt: new Date(),
          },
        });

        console.log(`  OK: ${bookName} ${chapter} (${translation}) — ${verseCount} verses cached`);
        totalFetched++;

        await sleep(1500);
      } catch (err: any) {
        console.log(`  ERROR: ${bookName} ${chapter} (${translation}) — ${err?.message}`);
        totalErrors++;
        await sleep(2000);
      }
    }
  }

  console.log("\n=== Cache Warming Complete ===");
  console.log(`Fetched & cached: ${totalFetched}`);
  console.log(`Already cached (skipped): ${totalSkipped}`);
  console.log(`Errors: ${totalErrors}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
