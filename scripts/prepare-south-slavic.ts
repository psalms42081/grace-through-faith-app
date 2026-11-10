/**
 * Builds the local South Slavic verse files.
 *
 * Karadžić–Daničić ijekavian (public domain), Crosswire module SrKDIjekav:
 *   https://crosswire.org/ftpmirror/pub/sword/packages/rawzip/SrKDIjekav.zip
 *   Verse text only. OSIS book ids become the English book names in shared/bible-books.ts.
 *   Cyrillic is data/srkd-ijekav.json. data/srkd-ijekav-lat.json is a 1:1 Serbian
 *   Cyrillic→Latin transliteration of that text, not a second source.
 *
 * Šarić (public domain), eBible "hrv":
 *   https://ebible.org/Scriptures/hrv_usfm.zip
 *   https://ebible.org/hrv/copyright.htm
 *   Protestant books only. The archive's deuterocanon is left out because the app's
 *   book list is the 66-book canon. Greek Esther (USFM ESG) is this edition's Esther.
 *
 *   npx tsx scripts/prepare-south-slavic.ts <SrKDIjekav.zip> <hrv_usfm.zip>
 *
 * The Karadžić file is written only when the extract has 66 books and 1,189 chapters
 * and Matthew 5:1 matches the ijekavian sentence. Šarić is written when its 66
 * Protestant books parse. Neither command loads a database.
 */
import * as fs from "fs";
import * as path from "path";
import * as zlib from "zlib";
import { API_BIBLE_BOOK_MAP } from "../shared/bible-books";
import { readZipEntries, type NormalizedVerse } from "./prepare-net-bible";

const OSIS_TO_BOOK: Record<string, string> = {
  Gen: "Genesis", Exod: "Exodus", Lev: "Leviticus", Num: "Numbers", Deut: "Deuteronomy",
  Josh: "Joshua", Judg: "Judges", Ruth: "Ruth", "1Sam": "1 Samuel", "2Sam": "2 Samuel",
  "1Kgs": "1 Kings", "2Kgs": "2 Kings", "1Chr": "1 Chronicles", "2Chr": "2 Chronicles",
  Ezra: "Ezra", Neh: "Nehemiah", Esth: "Esther", Job: "Job", Ps: "Psalms", Prov: "Proverbs",
  Eccl: "Ecclesiastes", Song: "Song of Solomon", Isa: "Isaiah", Jer: "Jeremiah", Lam: "Lamentations",
  Ezek: "Ezekiel", Dan: "Daniel", Hos: "Hosea", Joel: "Joel", Amos: "Amos", Obad: "Obadiah",
  Jonah: "Jonah", Mic: "Micah", Nah: "Nahum", Hab: "Habakkuk", Zeph: "Zephaniah", Hag: "Haggai",
  Zech: "Zechariah", Mal: "Malachi", Matt: "Matthew", Mark: "Mark", Luke: "Luke", John: "John",
  Acts: "Acts", Rom: "Romans", "1Cor": "1 Corinthians", "2Cor": "2 Corinthians", Gal: "Galatians",
  Eph: "Ephesians", Phil: "Philippians", Col: "Colossians", "1Thess": "1 Thessalonians",
  "2Thess": "2 Thessalonians", "1Tim": "1 Timothy", "2Tim": "2 Timothy", Titus: "Titus",
  Phlm: "Philemon", Heb: "Hebrews", Jas: "James", "1Pet": "1 Peter", "2Pet": "2 Peter",
  "1John": "1 John", "2John": "2 John", "3John": "3 John", Jude: "Jude", Rev: "Revelation",
};

const USFM_TO_BOOK: Record<string, string> = {
  ...Object.fromEntries(Object.entries(API_BIBLE_BOOK_MAP).map(([name, code]) => [code, name])),
  ESG: "Esther",
};

const CANON = Object.keys(API_BIBLE_BOOK_MAP);

const MATTHEW_5_1 = "А кад он видје народ, попе се на гору, и сједе, и приступише му ученици његови.";
const MATTHEW_5_1_LATIN = "A kad on vidje narod, pope se na goru, i sjede, i pristupiše mu učenici njegovi.";

/** Lowercase Serbian Cyrillic, including the three digraphs. */
const CYRILLIC_LOWER: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "đ", е: "e", ж: "ž", з: "z", и: "i",
  ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n", њ: "nj", о: "o", п: "p", р: "r",
  с: "s", т: "t", ћ: "ć", у: "u", ф: "f", х: "h", ц: "c", ч: "č", џ: "dž", ш: "š",
};

const CYRILLIC_UPPER: Record<string, string> = {
  А: "A", Б: "B", В: "V", Г: "G", Д: "D", Ђ: "Đ", Е: "E", Ж: "Ž", З: "Z", И: "I",
  Ј: "J", К: "K", Л: "L", Љ: "Lj", М: "M", Н: "N", Њ: "Nj", О: "O", П: "P", Р: "R",
  С: "S", Т: "T", Ћ: "Ć", У: "U", Ф: "F", Х: "H", Ц: "C", Ч: "Č", Џ: "Dž", Ш: "Š",
};

const UPPER_CYRILLIC = new Set(Object.keys(CYRILLIC_UPPER));

/** Standard 1:1 Serbian Cyrillic to Latin. A digraph stays title case unless the next letter is also uppercase. */
export function transliterateSerbian(text: string): string {
  const chars = [...text];
  let out = "";
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    const lower = CYRILLIC_LOWER[ch];
    if (lower) {
      out += lower;
      continue;
    }
    const upper = CYRILLIC_UPPER[ch];
    if (upper) {
      const next = chars[i + 1];
      const allCaps = upper === "Lj" ? "LJ" : upper === "Nj" ? "NJ" : upper === "Dž" ? "DŽ" : upper;
      out += upper.length > 1 && UPPER_CYRILLIC.has(next) ? allCaps : upper;
      continue;
    }
    out += ch;
  }
  return out;
}

function cleanOsis(text: string): string {
  return text
    .replace(/<note\b[^>]*>[\s\S]*?<\/note>/gi, "")
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/\u00ad/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

interface EmptySlot {
  book: string;
  chapter: number;
  verse: number;
}

function decodeTestament(entries: Map<string, Buffer>, prefix: string): { verses: NormalizedVerse[]; empty: EmptySlot[] } {
  const bzs = entries.get(`${prefix}.bzs`);
  const bzz = entries.get(`${prefix}.bzz`);
  const bzv = entries.get(`${prefix}.bzv`);
  if (!bzs || !bzz || !bzv) throw new Error(`Missing SWORD index for ${prefix}`);
  if (bzs.length % 12 !== 0 || bzv.length % 10 !== 0) throw new Error(`Unexpected SWORD index size for ${prefix}`);
  const blocks: Buffer[] = [];
  for (let i = 0; i < bzs.length / 12; i += 1) {
    const offset = bzs.readUInt32LE(i * 12);
    const size = bzs.readUInt32LE(i * 12 + 4);
    blocks.push(zlib.inflateSync(bzz.subarray(offset, offset + size)));
  }
  const verses: NormalizedVerse[] = [];
  const empty: EmptySlot[] = [];
  let osisBook = "";
  let chapter = 0;
  let verse = 0;
  for (let i = 0; i < bzv.length / 10; i += 1) {
    const block = bzv.readUInt32LE(i * 10);
    const start = bzv.readUInt32LE(i * 10 + 4);
    const len = bzv.readUInt16LE(i * 10 + 8);
    if (!len) {
      if (!chapter) continue;
      verse += 1;
      empty.push({ book: OSIS_TO_BOOK[osisBook] ?? osisBook, chapter, verse });
      continue;
    }
    const rawBlock = blocks[block];
    if (!rawBlock || start + len > rawBlock.length) {
      throw new Error(`Verse index ${i} points outside block ${block}`);
    }
    const raw = rawBlock.subarray(start, start + len).toString("utf8");
    // Chapter milestones are their own index slots. End tags sit on the last verse and must not start it again.
    const chapterId = /<chapter\b(?![^>]*\beID=)[^>]*osisID="([^"]+)"/.exec(raw)?.[1];
    if (chapterId) {
      const [bookId, chapterNumber] = chapterId.split(".");
      osisBook = bookId;
      chapter = Number(chapterNumber);
      verse = 0;
    } else if (!chapter) {
      continue;
    }
    const text = cleanOsis(raw);
    if (!text) continue;
    verse += 1;
    const book = OSIS_TO_BOOK[osisBook];
    if (!book) continue;
    verses.push({ book, chapter, verse, text });
  }
  return { verses, empty };
}

/** Verse text of the Crosswire SrKDIjekav module, in canon order. */
export function parseSrkdIjekav(archive: Buffer): { verses: NormalizedVerse[]; empty: EmptySlot[] } {
  const entries = readZipEntries(archive);
  const ot = decodeTestament(entries, "modules/texts/ztext/srkdijekav/ot");
  const nt = decodeTestament(entries, "modules/texts/ztext/srkdijekav/nt");
  return { verses: [...ot.verses, ...nt.verses], empty: [...ot.empty, ...nt.empty] };
}

function cleanUsfm(text: string): string {
  return text
    .replace(/\\vp\s[\s\S]*?\\vp\*/g, " ")
    .replace(/\\[a-z0-9]+\*/gi, "")
    .replace(/\\[a-z0-9]+\s*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** One USFM book. Unknown ids, including the deuterocanon, return no verses. */
export function parseUsfmBook(src: string): { id: string; verses: NormalizedVerse[] } {
  const id = (/\\id\s+([A-Z0-9]+)/.exec(src)?.[1] ?? "").toUpperCase();
  const book = USFM_TO_BOOK[id];
  const verses: NormalizedVerse[] = [];
  if (!book) return { id, verses };
  let chapter = 0;
  let verse = 0;
  let chunks: string[] = [];
  const flush = () => {
    if (!verse) return;
    const text = cleanUsfm(chunks.join(" "));
    chunks = [];
    if (text) verses.push({ book, chapter, verse, text });
    verse = 0;
  };
  for (const line of src.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const chapterMarker = /^\\c\s+(\d+)/.exec(trimmed);
    if (chapterMarker) {
      flush();
      chapter = Number(chapterMarker[1]);
      continue;
    }
    const verseMarker = /^\\v\s+(\d+)\s*(.*)$/.exec(trimmed);
    if (verseMarker) {
      flush();
      verse = Number(verseMarker[1]);
      chunks = [verseMarker[2]];
      continue;
    }
    if (verse && (/^\\p\b/.test(trimmed) || !trimmed.startsWith("\\"))) {
      chunks.push(trimmed.replace(/^\\p\s*/, ""));
    }
  }
  flush();
  return { id, verses };
}

export function parseSaricUsfm(archive: Buffer): { verses: NormalizedVerse[]; skipped: string[] } {
  const entries = readZipEntries(archive);
  const verses: NormalizedVerse[] = [];
  const skipped: string[] = [];
  const files = [...entries.keys()].filter((name) => name.endsWith(".usfm")).sort();
  for (const name of files) {
    const parsed = parseUsfmBook(entries.get(name)!.toString("utf8"));
    if (!parsed.verses.length) {
      if (parsed.id) skipped.push(parsed.id);
      continue;
    }
    verses.push(...parsed.verses);
  }
  const order = new Map(CANON.map((book, index) => [book, index]));
  verses.sort((a, b) => order.get(a.book)! - order.get(b.book)! || a.chapter - b.chapter || a.verse - b.verse);
  return { verses, skipped };
}

interface ChapterDiff {
  book: string;
  chapter: number;
  missing: number[];
  extra: number[];
}

/** Verse numbers present here against KJV 1..N, using the max verse of each chapter in the headings file. */
export function versificationDiff(
  verses: NormalizedVerse[],
  kjv: Map<string, Map<number, number>>,
): { missingChapters: string[]; extraChapters: string[]; chapters: ChapterDiff[] } {
  const present = new Map<string, Map<number, Set<number>>>();
  for (const verse of verses) {
    const chapters = present.get(verse.book) ?? new Map<number, Set<number>>();
    const numbers = chapters.get(verse.chapter) ?? new Set<number>();
    numbers.add(verse.verse);
    chapters.set(verse.chapter, numbers);
    present.set(verse.book, chapters);
  }
  const missingChapters: string[] = [];
  const extraChapters: string[] = [];
  const chapters: ChapterDiff[] = [];
  for (const book of CANON) {
    const kjvChapters = kjv.get(book) ?? new Map<number, number>();
    const got = present.get(book) ?? new Map<number, Set<number>>();
    for (const chapter of kjvChapters.keys()) {
      if (!got.has(chapter)) missingChapters.push(`${book} ${chapter}`);
    }
    for (const chapter of got.keys()) {
      if (!kjvChapters.has(chapter)) extraChapters.push(`${book} ${chapter}`);
    }
    for (const [chapter, maxVerse] of kjvChapters) {
      const numbers = got.get(chapter);
      if (!numbers) continue;
      const missing: number[] = [];
      for (let verse = 1; verse <= maxVerse; verse += 1) if (!numbers.has(verse)) missing.push(verse);
      const extra = [...numbers].filter((verse) => verse < 1 || verse > maxVerse).sort((a, b) => a - b);
      if (missing.length || extra.length) chapters.push({ book, chapter, missing, extra });
    }
  }
  return { missingChapters, extraChapters, chapters };
}

function loadKjvCounts(headingsPath: string): Map<string, Map<number, number>> {
  const data = JSON.parse(fs.readFileSync(headingsPath, "utf8")) as {
    chapters: { book: string; chapter: number; sections: { endVerse: number }[] }[];
  };
  const counts = new Map<string, Map<number, number>>();
  for (const chapter of data.chapters) {
    const maxVerse = chapter.sections.reduce((max, section) => Math.max(max, section.endVerse), 0);
    const chapters = counts.get(chapter.book) ?? new Map<number, number>();
    chapters.set(chapter.chapter, maxVerse);
    counts.set(chapter.book, chapters);
  }
  return counts;
}

function coverage(verses: NormalizedVerse[]): { books: number; chapters: number; duplicate: string | null } {
  const seen = new Set<string>();
  let duplicate: string | null = null;
  for (const verse of verses) {
    const key = `${verse.book} ${verse.chapter}:${verse.verse}`;
    if (seen.has(key)) duplicate = key;
    seen.add(key);
  }
  return {
    books: new Set(verses.map((verse) => verse.book)).size,
    chapters: new Set(verses.map((verse) => `${verse.book} ${verse.chapter}`)).size,
    duplicate,
  };
}

function formatSpan(numbers: number[]): string {
  if (!numbers.length) return "";
  const parts: string[] = [];
  let start = numbers[0];
  let previous = numbers[0];
  for (const verse of numbers.slice(1)) {
    if (verse === previous + 1) {
      previous = verse;
      continue;
    }
    parts.push(start === previous ? `${start}` : `${start}–${previous}`);
    start = verse;
    previous = verse;
  }
  parts.push(start === previous ? `${start}` : `${start}–${previous}`);
  return parts.join(", ");
}

function reportDiff(label: string, diff: ReturnType<typeof versificationDiff>): void {
  console.log(
    `${label} against KJV: ${diff.missingChapters.length} missing chapters, ${diff.extraChapters.length} extra chapters, ${diff.chapters.length} chapters with different verse numbers`,
  );
  if (diff.missingChapters.length) console.log(`  missing chapters: ${diff.missingChapters.join("; ")}`);
  if (diff.extraChapters.length) console.log(`  extra chapters: ${diff.extraChapters.join("; ")}`);
  for (const chapter of diff.chapters) {
    const parts = [
      chapter.missing.length ? `missing ${formatSpan(chapter.missing)}` : "",
      chapter.extra.length ? `extra ${formatSpan(chapter.extra)}` : "",
    ].filter(Boolean);
    console.log(`  ${chapter.book} ${chapter.chapter}: ${parts.join("; ")}`);
  }
}

function verseText(verses: NormalizedVerse[], book: string, chapter: number, verse: number): string | undefined {
  return verses.find((item) => item.book === book && item.chapter === chapter && item.verse === verse)?.text;
}

function writeVerses(fileName: string, verses: NormalizedVerse[]): void {
  const outPath = path.resolve(process.cwd(), "data", fileName);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(verses));
  console.log(`Saved ${outPath} (${verses.length} verses)`);
}

function main() {
  const srkdPath = process.argv[2];
  const saricPath = process.argv[3];
  if (!srkdPath || !saricPath) {
    console.error("Usage: npx tsx scripts/prepare-south-slavic.ts <SrKDIjekav.zip> <hrv_usfm.zip>");
    process.exit(1);
  }
  const headingsPath = path.resolve(process.cwd(), "data", "kjv-headings.generated.json");
  const kjv = loadKjvCounts(headingsPath);
  const kjvChapters = [...kjv.values()].reduce((sum, chapters) => sum + chapters.size, 0);
  const kjvVerses = [...kjv.values()].reduce(
    (sum, chapters) => sum + [...chapters.values()].reduce((inner, count) => inner + count, 0),
    0,
  );
  console.log(`KJV baseline from headings: ${kjvChapters} chapters, ${kjvVerses} verses`);

  const srkd = parseSrkdIjekav(fs.readFileSync(srkdPath));
  const srkdCoverage = coverage(srkd.verses);
  const matthew = verseText(srkd.verses, "Matthew", 5, 1);
  const matthewLatin = matthew ? transliterateSerbian(matthew) : "";
  console.log(`SrKDIjekav: ${srkd.verses.length} verses, ${srkdCoverage.chapters} chapters, ${srkdCoverage.books} books, ${srkd.empty.length} empty Calvin slots`);
  console.log(`Matthew 5:1 Cyrillic: ${matthew ?? "(missing)"}`);
  console.log(`Matthew 5:1 Latin: ${matthewLatin || "(missing)"}`);
  reportDiff("SrKDIjekav", versificationDiff(srkd.verses, kjv));
  const leftover = new Set<string>();
  for (const verse of srkd.verses) {
    for (const ch of transliterateSerbian(verse.text)) {
      if (/\p{Script=Cyrillic}/u.test(ch)) leftover.add(ch);
    }
  }
  if (leftover.size) console.log(`Latin transliteration left Cyrillic: ${[...leftover].join(" ")}`);

  const srkdReady =
    srkdCoverage.books === 66 &&
    srkdCoverage.chapters === 1189 &&
    !srkdCoverage.duplicate &&
    matthew === MATTHEW_5_1 &&
    matthewLatin === MATTHEW_5_1_LATIN &&
    leftover.size === 0;
  if (!srkdReady) {
    console.error("SrKDIjekav: expected 66 books, 1,189 chapters, and the Matthew 5:1 sentences. JSON was not written.");
    if (srkdCoverage.duplicate) console.error(`Duplicate verse: ${srkdCoverage.duplicate}`);
    process.exitCode = 1;
  } else {
    writeVerses("srkd-ijekav.json", srkd.verses);
    writeVerses(
      "srkd-ijekav-lat.json",
      srkd.verses.map((verse) => ({ ...verse, text: transliterateSerbian(verse.text) })),
    );
  }

  const saric = parseSaricUsfm(fs.readFileSync(saricPath));
  const saricCoverage = coverage(saric.verses);
  console.log(`Šarić: ${saric.verses.length} verses, ${saricCoverage.chapters} chapters, ${saricCoverage.books} books`);
  console.log(`Šarić USFM books left out (not in the Protestant book list): ${saric.skipped.join(", ") || "(none)"}`);
  console.log(`Šarić Genesis 1:1: ${verseText(saric.verses, "Genesis", 1, 1) ?? "(missing)"}`);
  console.log(`Šarić Matthew 5:1: ${verseText(saric.verses, "Matthew", 5, 1) ?? "(missing)"}`);
  console.log(`Šarić Esther 1:1: ${verseText(saric.verses, "Esther", 1, 1) ?? "(missing)"}`);
  reportDiff("Šarić", versificationDiff(saric.verses, kjv));
  if (saricCoverage.books !== 66 || saricCoverage.duplicate) {
    console.error("Šarić: expected the 66 Protestant books. data/hrv-saric.json was not written.");
    if (saricCoverage.duplicate) console.error(`Duplicate verse: ${saricCoverage.duplicate}`);
    process.exitCode = 1;
    return;
  }
  writeVerses("hrv-saric.json", saric.verses);
}

if (require.main === module) main();
