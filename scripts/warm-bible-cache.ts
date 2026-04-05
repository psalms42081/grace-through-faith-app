import "dotenv/config";
import { db } from "../server/db";
import { bibleBooks, bibleCache } from "../shared/schema";
import { eq, and, ilike } from "drizzle-orm";

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

const API_BIBLE_BOOK_MAP: Record<string, string> = {
  Genesis: "GEN", Exodus: "EXO", Leviticus: "LEV", Numbers: "NUM",
  Deuteronomy: "DEU", Joshua: "JOS", Judges: "JDG", Ruth: "RUT",
  "1 Samuel": "1SA", "2 Samuel": "2SA", "1 Kings": "1KI", "2 Kings": "2KI",
  "1 Chronicles": "1CH", "2 Chronicles": "2CH", Ezra: "EZR", Nehemiah: "NEH",
  Esther: "EST", Job: "JOB", Psalms: "PSA", Proverbs: "PRO",
  Ecclesiastes: "ECC", "Song of Solomon": "SNG", Isaiah: "ISA", Jeremiah: "JER",
  Lamentations: "LAM", Ezekiel: "EZK", Daniel: "DAN", Hosea: "HOS",
  Joel: "JOL", Amos: "AMO", Obadiah: "OBA", Jonah: "JON",
  Micah: "MIC", Nahum: "NAM", Habakkuk: "HAB", Zephaniah: "ZEP",
  Haggai: "HAG", Zechariah: "ZEC", Malachi: "MAL",
  Matthew: "MAT", Mark: "MRK", Luke: "LUK", John: "JHN",
  Acts: "ACT", Romans: "ROM", "1 Corinthians": "1CO", "2 Corinthians": "2CO",
  Galatians: "GAL", Ephesians: "EPH", Philippians: "PHP", Colossians: "COL",
  "1 Thessalonians": "1TH", "2 Thessalonians": "2TH", "1 Timothy": "1TI",
  "2 Timothy": "2TI", Titus: "TIT", Philemon: "PHM", Hebrews: "HEB",
  James: "JAS", "1 Peter": "1PE", "2 Peter": "2PE", "1 John": "1JN",
  "2 John": "2JN", "3 John": "3JN", Jude: "JUD", Revelation: "REV",
};

const API_BIBLE_TRANSLATIONS: Record<string, { bibleId: string; name: string }> = {
  NIV: { bibleId: "78a9f6124f344018-01", name: "New International Version" },
  AMP: { bibleId: "a81b73293d3080c9-01", name: "Amplified Bible" },
  NASB: { bibleId: "b8ee27bcd1cae43a-01", name: "New American Standard Bible 1995" },
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

function parseApiBibleText(content: string, bookId: number, chapterNum: number, translationAbbr: string): any[] {
  const verses: any[] = [];
  const lines = content.split(/\n/);
  let currentVerse = 0;
  let currentText = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\[(\d+)\]/);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;
      const num = parseInt(part, 10);
      if (!isNaN(num) && num > 0 && num <= 200 && parts[i - 1] !== undefined) {
        if (currentVerse > 0 && currentText.trim()) {
          verses.push({ id: `${translationAbbr.toLowerCase()}-${bookId}-${chapterNum}-${currentVerse}`, translationId: translationAbbr, bookId, chapter: chapterNum, verse: currentVerse, text: currentText.trim(), searchVector: null });
        }
        currentVerse = num;
        currentText = "";
      } else if (currentVerse > 0) {
        currentText += " " + part;
      }
    }
  }
  if (currentVerse > 0 && currentText.trim()) {
    verses.push({ id: `${translationAbbr.toLowerCase()}-${bookId}-${chapterNum}-${currentVerse}`, translationId: translationAbbr, bookId, chapter: chapterNum, verse: currentVerse, text: currentText.trim(), searchVector: null });
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

async function fetchApiBibleChapter(bookName: string, bookId: number, chapterNum: number, translationAbbr: string): Promise<any[]> {
  const apiKey = process.env.API_BIBLE_KEY;
  if (!apiKey) throw new Error("API_BIBLE_KEY not set");
  const config = API_BIBLE_TRANSLATIONS[translationAbbr];
  if (!config) throw new Error(`Unknown translation: ${translationAbbr}`);
  const bookCode = API_BIBLE_BOOK_MAP[bookName];
  if (!bookCode) throw new Error(`No book mapping for: ${bookName}`);
  const chapterId = `${bookCode}.${chapterNum}`;
  const url = `https://rest.api.bible/v1/bibles/${config.bibleId}/chapters/${chapterId}?content-type=text&include-verse-numbers=true&include-titles=false&include-chapter-numbers=false`;
  const response = await fetch(url, { headers: { "api-key": apiKey } });
  if (!response.ok) throw new Error(`API.Bible ${response.status}`);
  const json = (await response.json()) as any;
  const content = json.data?.content || "";
  return parseApiBibleText(content, bookId, chapterNum, translationAbbr);
}

async function isAlreadyCached(translation: string, bookId: number, chapter: number): Promise<boolean> {
  const existing = await db.select({ id: bibleCache.id }).from(bibleCache)
    .where(and(eq(bibleCache.translation, translation), eq(bibleCache.bookId, bookId), eq(bibleCache.chapter, chapter)))
    .limit(1);
  return existing.length > 0;
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
        let verses: any[];
        let sourceApi: string;

        if (translation === "NLT") {
          verses = await fetchNltChapter(bookName, bookId, chapter);
          sourceApi = "nlt_api";
        } else {
          verses = await fetchApiBibleChapter(bookName, bookId, chapter, translation);
          sourceApi = "api_bible";
        }

        if (verses.length === 0) {
          console.log(`  WARN: ${bookName} ${chapter} (${translation}) — 0 verses returned`);
          totalErrors++;
          continue;
        }

        await db.insert(bibleCache).values({
          translation,
          bookId,
          bookName,
          chapter,
          versesJson: verses,
          verseCount: verses.length,
          sourceApi,
        }).onConflictDoNothing();

        console.log(`  OK: ${bookName} ${chapter} (${translation}) — ${verses.length} verses cached`);
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
