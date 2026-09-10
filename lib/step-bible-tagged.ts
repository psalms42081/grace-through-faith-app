/**
 * STEP Bible TAHOT / TAGNT parsers for KJV word-study maps.
 * Data: https://github.com/STEPBible/STEPBible-Data (CC BY 4.0).
 */

export const STEP_AFFIX_MIN = 9000;
export const STEP_AFFIX_MAX = 9099;

/** STEP UBS-style book codes → our `bible_book.name`. */
export const STEP_BOOK_TO_NAME: Record<string, string> = {
  Gen: "Genesis",
  Exo: "Exodus",
  Lev: "Leviticus",
  Num: "Numbers",
  Deu: "Deuteronomy",
  Jos: "Joshua",
  Jdg: "Judges",
  Rut: "Ruth",
  "1Sa": "1 Samuel",
  "2Sa": "2 Samuel",
  "1Ki": "1 Kings",
  "2Ki": "2 Kings",
  "1Ch": "1 Chronicles",
  "2Ch": "2 Chronicles",
  Ezr: "Ezra",
  Neh: "Nehemiah",
  Est: "Esther",
  Job: "Job",
  Psa: "Psalms",
  Pro: "Proverbs",
  Ecc: "Ecclesiastes",
  Sng: "Song of Solomon",
  Isa: "Isaiah",
  Jer: "Jeremiah",
  Lam: "Lamentations",
  Ezk: "Ezekiel",
  Dan: "Daniel",
  Hos: "Hosea",
  Jol: "Joel",
  Amo: "Amos",
  Oba: "Obadiah",
  Jon: "Jonah",
  Mic: "Micah",
  Nam: "Nahum",
  Hab: "Habakkuk",
  Zep: "Zephaniah",
  Hag: "Haggai",
  Zec: "Zechariah",
  Mal: "Malachi",
  Mat: "Matthew",
  Mrk: "Mark",
  Luk: "Luke",
  Jhn: "John",
  Act: "Acts",
  Rom: "Romans",
  "1Co": "1 Corinthians",
  "2Co": "2 Corinthians",
  Gal: "Galatians",
  Eph: "Ephesians",
  Php: "Philippians",
  Col: "Colossians",
  "1Th": "1 Thessalonians",
  "2Th": "2 Thessalonians",
  "1Ti": "1 Timothy",
  "2Ti": "2 Timothy",
  Tit: "Titus",
  Phm: "Philemon",
  Heb: "Hebrews",
  Jas: "James",
  "1Pe": "1 Peter",
  "2Pe": "2 Peter",
  "1Jn": "1 John",
  "2Jn": "2 John",
  "3Jn": "3 John",
  Jud: "Jude",
  Rev: "Revelation",
};

export interface StepRef {
  bookAbbr: string;
  bookName: string;
  chapter: number;
  verse: number;
  tokenIndex: number;
  textType: string;
}

export interface StepTaggedToken {
  bookName: string;
  chapter: number;
  verse: number;
  tokenIndex: number;
  strongId: string;
  originalWord: string;
  translatedWord: string;
  language: "he" | "gr";
}

export interface VerseKey {
  bookName: string;
  chapter: number;
  verse: number;
}

/**
 * Normalise a STEP / OpenScriptures Strong's id to lexicon form: G26, not G00026.
 * Drops disambiguation letters (H430G, H1254A) and instance suffixes (_A).
 */
export function normalizeStrongId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([HG])0*(\d+)/i);
  if (!match) return null;
  const num = match[2].replace(/^0+(?=\d)/, "");
  if (!num) return null;
  return `${match[1].toUpperCase()}${num}`;
}

export function isStepAffixStrongId(normalized: string): boolean {
  const match = normalized.match(/^[HG](\d+)$/);
  if (!match) return false;
  const n = Number(match[1]);
  return n >= STEP_AFFIX_MIN && n <= STEP_AFFIX_MAX;
}

/** Prefer an already-seeded lexicon id (G26 or zero-padded G00026). */
export function resolveLexiconStrongId(
  normalized: string,
  lexiconIds: ReadonlySet<string>,
): string {
  if (lexiconIds.has(normalized)) return normalized;
  const letter = normalized[0];
  const digits = normalized.slice(1);
  for (const width of [4, 5]) {
    const padded = `${letter}${digits.padStart(width, "0")}`;
    if (lexiconIds.has(padded)) return padded;
  }
  return normalized;
}

export function verseKey(bookName: string, chapter: number, verse: number): string {
  return `${bookName}\t${chapter}\t${verse}`;
}

/**
 * TAHOT: translators follow Leningrad, and Qere over Ketiv.
 * Skip Ketiv-only (K), LXX extras (X), and other variant letters.
 */
export function shouldIncludeTahotTextType(textType: string): boolean {
  const primary = textType.trim().charAt(0).toUpperCase();
  return primary === "L" || primary === "Q" || primary === "R";
}

/** TAGNT: keep words present in the KJV/TR tradition (K or k). */
export function shouldIncludeTagntWordType(wordType: string): boolean {
  return /[Kk]/.test(wordType);
}

export function parseStepRef(raw: string): StepRef | null {
  const field = raw.trim();
  const match = field.match(
    /^([1-3]?[A-Za-z]+)\.(\d+)\.(\d+)((?:\([^)]*\)|\{[^}]*\}|\[[^\]]*\])*)#(\d+)=(\S+)/,
  );
  if (!match) return null;
  const bookAbbr = match[1];
  const bookName = STEP_BOOK_TO_NAME[bookAbbr];
  if (!bookName) return null;

  let chapter = Number(match[2]);
  let verse = Number(match[3]);
  const extras = match[4] ?? "";
  const kjvBracket = extras.match(/\[([^\]]*)\]/)?.[1];
  if (kjvBracket) {
    const kjv = kjvBracket.match(/(?:KJV[.\s]*)?(\d+)\.(\d+)/i) ?? kjvBracket.match(/(\d+)\.(\d+)/);
    if (kjv) {
      chapter = Number(kjv[1]);
      verse = Number(kjv[2]);
    }
  }

  if (!Number.isFinite(chapter) || !Number.isFinite(verse) || verse < 1) return null;

  return {
    bookAbbr,
    bookName,
    chapter,
    verse,
    tokenIndex: Number(match[5]),
    textType: match[6],
  };
}

/** Roots in `{H7225G}`; skip affix numbers (H9003). */
export function extractRootStrongIds(dStrongs: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const braced = [...dStrongs.matchAll(/\{([HG][0-9A-Za-z]+)\}/g)];
  const candidates = braced.length > 0
    ? braced.map((m) => m[1])
    : [...dStrongs.matchAll(/[HG]\d+[A-Za-z]?/gi)].map((m) => m[0]);

  for (const raw of candidates) {
    const normalized = normalizeStrongId(raw);
    if (!normalized || isStepAffixStrongId(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    ids.push(normalized);
  }
  return ids;
}

export function extractTagntStrongId(dStrongField: string): string | null {
  const beforeEq = dStrongField.split("=")[0] ?? "";
  const normalized = normalizeStrongId(beforeEq);
  if (!normalized || isStepAffixStrongId(normalized)) return null;
  return normalized;
}

export function cleanEnglishGloss(raw: string): string {
  const withoutAngles = raw.replace(/<[^>]*>/g, " ");
  const withoutBrackets = withoutAngles.replace(/\[|\]/g, "");
  const parts = withoutBrackets
    .split("/")
    .map((p) => p.replace(/[\\׃:.]+$/g, "").trim())
    .filter(Boolean);
  const SUFFIX = new Set([
    "me",
    "my",
    "him",
    "his",
    "her",
    "them",
    "their",
    "you",
    "your",
    "us",
    "our",
    "i",
    "we",
    "it",
    "its",
    "thee",
    "thou",
    "thy",
    "ye",
  ]);
  while (parts.length > 1 && SUFFIX.has(parts[parts.length - 1]!.toLowerCase())) {
    parts.pop();
  }
  const root = (parts[parts.length - 1] ?? "").replace(/^(is|was|are)\s+/i, "");
  return root.replace(/\s+/g, " ").trim();
}

export function surfaceOriginalWord(raw: string, language: "he" | "gr"): string {
  const noPunct = raw.split("\\")[0] ?? raw;
  if (language === "gr") {
    const greek = noPunct.replace(/\[\[|\]\]/g, "").replace(/\s*\([^)]*\)\s*$/, "").trim();
    return greek || noPunct.trim();
  }
  const parts = noPunct.split("/").map((p) => p.trim()).filter(Boolean);
  return (parts[parts.length - 1] ?? noPunct).trim();
}

export function parseTahotLine(line: string): StepTaggedToken[] {
  if (!line || line.startsWith("#") || line.startsWith("\t")) return [];
  const cols = line.split("\t");
  if (cols.length < 5) return [];
  const ref = parseStepRef(cols[0] ?? "");
  if (!ref || !shouldIncludeTahotTextType(ref.textType)) return [];

  const strongIds = extractRootStrongIds(cols[4] ?? "");
  if (strongIds.length === 0) return [];

  const gloss = cleanEnglishGloss(cols[3] ?? "");
  const original = surfaceOriginalWord(cols[1] ?? "", "he");
  if (!gloss && !original) return [];

  return strongIds
    .filter((id) => id !== "H853")
    .map((strongId) => ({
      bookName: ref.bookName,
      chapter: ref.chapter,
      verse: ref.verse,
      tokenIndex: ref.tokenIndex,
      strongId,
      originalWord: original,
      translatedWord: gloss,
      language: "he" as const,
    }));
}

export function parseTagntLine(line: string): StepTaggedToken[] {
  if (!line || line.startsWith("#") || line.startsWith("\t")) return [];
  const cols = line.split("\t");
  if (cols.length < 4) return [];
  const ref = parseStepRef(cols[0] ?? "");
  if (!ref || !shouldIncludeTagntWordType(ref.textType)) return [];

  const strongId = extractTagntStrongId(cols[3] ?? "");
  if (!strongId) return [];

  const gloss = cleanEnglishGloss(cols[2] ?? "");
  const original = surfaceOriginalWord(cols[1] ?? "", "gr");
  if (!gloss && !original) return [];

  return [{
    bookName: ref.bookName,
    chapter: ref.chapter,
    verse: ref.verse,
    tokenIndex: ref.tokenIndex,
    strongId,
    originalWord: original,
    translatedWord: gloss,
    language: "gr",
  }];
}

export function parseStepTaggedFile(content: string, kind: "tahot" | "tagnt"): StepTaggedToken[] {
  const tokens: StepTaggedToken[] = [];
  for (const rawLine of content.split(/\r?\n/)) {
    const parsed = kind === "tahot" ? parseTahotLine(rawLine) : parseTagntLine(rawLine);
    tokens.push(...parsed);
  }
  return tokens;
}

export function collectTaggedVerseKeys(tokens: Iterable<StepTaggedToken>): Set<string> {
  const keys = new Set<string>();
  for (const token of tokens) {
    keys.add(verseKey(token.bookName, token.chapter, token.verse));
  }
  return keys;
}

export function kjvVerseKeysFromNestedJson(data: unknown): Set<string> {
  const keys = new Set<string>();
  if (!Array.isArray(data)) return keys;
  for (const book of data) {
    const bookName = typeof book?.book === "string" ? book.book : "";
    if (!bookName || !Array.isArray(book.chapters)) continue;
    for (const chapterEntry of book.chapters) {
      const chapter = Number(chapterEntry?.chapter);
      if (!Number.isFinite(chapter) || !Array.isArray(chapterEntry.verses)) continue;
      for (const verseEntry of chapterEntry.verses) {
        const verse = Number(verseEntry?.verse);
        if (!Number.isFinite(verse) || verse < 1) continue;
        keys.add(verseKey(bookName, chapter, verse));
      }
    }
  }
  return keys;
}

export interface CoverageReport {
  kjvVerseCount: number;
  taggedVerseCount: number;
  missingVerseCount: number;
  missingByBook: Array<{ bookName: string; missing: number; total: number; ranges: string[] }>;
}

function collapseRanges(verses: Array<{ chapter: number; verse: number }>): string[] {
  const sorted = [...verses].sort((a, b) => a.chapter - b.chapter || a.verse - b.verse);
  const ranges: string[] = [];
  let start = sorted[0];
  let prev = sorted[0];
  if (!start) return ranges;

  const flush = () => {
    if (!start || !prev) return;
    if (start.chapter === prev.chapter && start.verse === prev.verse) {
      ranges.push(`${start.chapter}:${start.verse}`);
    } else if (start.chapter === prev.chapter) {
      ranges.push(`${start.chapter}:${start.verse}–${prev.verse}`);
    } else {
      ranges.push(`${start.chapter}:${start.verse}–${prev.chapter}:${prev.verse}`);
    }
  };

  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const contiguous = cur.chapter === prev.chapter && cur.verse === prev.verse + 1;
    if (contiguous) {
      prev = cur;
      continue;
    }
    flush();
    start = cur;
    prev = cur;
  }
  flush();
  return ranges;
}

export function reportKjvCoverage(
  kjvKeys: Set<string>,
  taggedKeys: Set<string>,
): CoverageReport {
  const missingByBook = new Map<string, { total: number; missing: Array<{ chapter: number; verse: number }> }>();
  let taggedVerseCount = 0;
  let missingVerseCount = 0;

  for (const key of kjvKeys) {
    const [bookName, chapterRaw, verseRaw] = key.split("\t");
    const chapter = Number(chapterRaw);
    const verse = Number(verseRaw);
    const bucket = missingByBook.get(bookName) ?? { total: 0, missing: [] };
    bucket.total += 1;
    if (taggedKeys.has(key)) {
      taggedVerseCount += 1;
    } else {
      missingVerseCount += 1;
      bucket.missing.push({ chapter, verse });
    }
    missingByBook.set(bookName, bucket);
  }

  const missingBooks = [...missingByBook.entries()]
    .filter(([, v]) => v.missing.length > 0)
    .map(([bookName, v]) => ({
      bookName,
      missing: v.missing.length,
      total: v.total,
      ranges: collapseRanges(v.missing),
    }))
    .sort((a, b) => a.bookName.localeCompare(b.bookName));

  return {
    kjvVerseCount: kjvKeys.size,
    taggedVerseCount,
    missingVerseCount,
    missingByBook: missingBooks,
  };
}
