import {
  API_BIBLE_BOOK_MAP,
  NT_USFM,
  OT_USFM,
  bibleBookId,
} from "./bible-books";
import { SARIC_ID, saricChapterList } from "./saric-versification";

export type CoverageLabel =
  | "Full Bible"
  | "New Testament"
  | "New Testament + some OT"
  | "Selected books";

export const AUSTRALIAN_GROUP_NAME = "Languages of Australia";

/** Whole-group search phrases. A query matches the group when it is one of these. */
export const AUSTRALIAN_GROUP_ALIASES = ["aboriginal", "torres strait", "indigenous", "australia"] as const;

/**
 * Editions in picker order: full Bible, then New Testament editions, then portions.
 * Language is the name shown on the Australia row.
 */
export const AUSTRALIAN_EDITIONS: readonly { code: string; language: string }[] = [
  { code: "YV1362", language: "Kriol" },
  { code: "YV1291", language: "Burarra" },
  { code: "YV1332", language: "Wik-Mungkan" },
  { code: "YV1400", language: "Torres Strait Creole" },
  { code: "YV1355", language: "Warlpiri" },
  { code: "YV2571", language: "Alyawarr" },
  { code: "YV2572", language: "Anmatyerre" },
  { code: "YV1399", language: "Kala Lagaw Ya" },
  { code: "YV2403", language: "Djinang" },
];

const AUSTRALIAN_LANGUAGE_BY_CODE: Record<string, string> = Object.fromEntries(
  AUSTRALIAN_EDITIONS.map((edition) => [edition.code, edition.language]),
);

/**
 * Short name for the Bible-tab chip, the reader chip, and the compare line.
 * Torres Strait Creole is shown as Yumplatok, the name readers use for that language.
 */
export const AUSTRALIAN_CHIP_LABELS: Record<string, string> = {
  YV1362: "Kriol",
  YV1291: "Burarra",
  YV1332: "Wik-Mungkan",
  YV1400: "Yumplatok",
  YV1355: "Warlpiri",
  YV2571: "Alyawarr",
  YV2572: "Anmatyerre",
  YV1399: "Kala Lagaw Ya",
  YV2403: "Djinang",
};

export function editionChipLabel(code: string): string | undefined {
  return AUSTRALIAN_CHIP_LABELS[code.trim().toUpperCase()];
}

/** Extra names that should find one edition. Matched as a whole phrase or a prefix of it. */
export const AUSTRALIAN_ENTRY_ALIASES: Record<string, readonly string[]> = {
  YV1362: ["kriol", "australian kriol"],
  YV1400: ["yumplatok"],
};

const NT = [...NT_USFM];

/**
 * Book lists used before the catalogue says which books an edition contains.
 * The live catalogue wins once it marks the edition partial or complete.
 */
/**
 * Chapters that are not the whole Protestant book.
 * Ranges are inclusive. A book missing from this map, but present in the edition, is complete.
 */
const PARTIAL_CHAPTERS: Record<string, Record<string, string>> = {
  YV1355: {
    EXO: "1-17,19-20,24,31-34,40",
    NUM: "1-3,6,13-14,17,20-21,27",
    DEU: "1,4,6-8,17-18,30-31,34",
    JOS: "1-6,23-24",
    JDG: "2,4-8,13-16",
    PSA: "23",
  },
  YV2571: {
    GEN: "1-4,6-9,11-19,21-33,35,37,39-46,49-50",
    EXO: "1-20,23-24,31-34,40",
    "1SA": "1-5,7-11,15-22,24-26,28,31",
    "2SA": "1-3,5,7,11-12,15-18",
  },
  YV2403: {
    GEN: "1-31",
  },
};

function expandChapterSpec(spec: string): number[] {
  const chapters: number[] = [];
  for (const part of spec.split(",")) {
    const [startRaw, endRaw] = part.split("-");
    const start = Number(startRaw);
    const end = endRaw == null || endRaw === "" ? start : Number(endRaw);
    for (let chapter = start; chapter <= end; chapter += 1) chapters.push(chapter);
  }
  return chapters;
}

const CHAPTER_LISTS: Record<string, Record<string, readonly number[]>> = Object.fromEntries(
  Object.entries(PARTIAL_CHAPTERS).map(([code, books]) => [
    code,
    Object.fromEntries(Object.entries(books).map(([usfm, spec]) => [usfm, expandChapterSpec(spec)])),
  ]),
);

export const AUSTRALIAN_PARTIAL_BOOKS: Record<string, readonly string[]> = {
  YV1291: NT,
  YV1332: NT,
  YV1400: ["GEN", "RUT", "JON", ...NT],
  YV1355: ["GEN", "EXO", "NUM", "DEU", "JOS", "JDG", "RUT", "PSA", ...NT],
  YV2571: ["GEN", "EXO", "1SA", "2SA", "MAT", "MRK", "LUK", "JHN", "ACT", "ROM", "GAL", "COL", "1TH", "2TH", "TIT", "JAS"],
  YV2572: ["MRK", "LUK", "JHN", "ACT", "1TH", "2TH", "1TI", "2TI", "TIT", "PHM", "JAS"],
  YV1399: ["GEN", "MAT", "MRK", "LUK", "JHN", "ROM", "1TI", "2TI"],
  YV2403: ["GEN", "1JN"],
};

export interface EditionBooks {
  books?: readonly string[];
  /** False when the catalogue knows this edition contains every Protestant book. */
  partial?: boolean;
}

/**
 * Protestant books to publish for a YouVersion edition.
 * Undefined when the edition contains the whole Protestant canon.
 */
export function partialCanonBooks(books: readonly string[] | null | undefined): string[] | undefined {
  if (!books?.length) return undefined;
  const present = new Set(books);
  const canon = [...OT_USFM, ...NT_USFM].filter((code) => present.has(code));
  if (canon.length === OT_USFM.length + NT_USFM.length) return undefined;
  return canon;
}

/** Books this edition does not contain. Undefined when every Protestant book is available. */
export function booksForEdition(code: string, entry?: EditionBooks | null): readonly string[] | undefined {
  if (entry?.partial === false) return undefined;
  if (entry?.books?.length) return entry.books;
  return AUSTRALIAN_PARTIAL_BOOKS[code.trim().toUpperCase()];
}

export function coverageLabel(books: readonly string[] | undefined): CoverageLabel {
  if (!books?.length) return "Full Bible";
  const present = new Set(books);
  const ot = OT_USFM.filter((code) => present.has(code)).length;
  const nt = NT_USFM.filter((code) => present.has(code)).length;
  if (ot === OT_USFM.length && nt === NT_USFM.length) return "Full Bible";
  if (nt === NT_USFM.length && ot === 0) return "New Testament";
  if (nt === NT_USFM.length && ot > 0) return "New Testament + some OT";
  return "Selected books";
}

export function editionLanguageName(code: string, catalogLanguage?: string | null): string {
  return AUSTRALIAN_LANGUAGE_BY_CODE[code.trim().toUpperCase()] || catalogLanguage || code;
}

/**
 * Chapters of this book the edition contains.
 * Undefined when the edition is complete, or the book is included in full.
 * An empty list means the edition does not contain the book.
 */
export function chaptersInEdition(
  code: string,
  bookName: string,
  entry?: EditionBooks | null,
): readonly number[] | undefined {
  if (code.trim().toUpperCase() === SARIC_ID) {
    const listed = saricChapterList(bookName);
    if (listed) return listed;
  }
  const books = booksForEdition(code, entry);
  if (!books) return undefined;
  const usfm = API_BIBLE_BOOK_MAP[bookName];
  if (!usfm || !books.includes(usfm)) return [];
  return CHAPTER_LISTS[code.trim().toUpperCase()]?.[usfm];
}

function nearestChapterNumber(chapters: readonly number[], chapter: number): number {
  let best = chapters[0];
  let bestDist = Math.abs(best - chapter);
  for (const candidate of chapters) {
    const dist = Math.abs(candidate - chapter);
    if (dist < bestDist) {
      best = candidate;
      bestDist = dist;
    }
  }
  return best;
}

/** Chapter to open for this book. Chapter 1 unless the edition starts later. */
export function openingChapter(code: string, bookName: string): number {
  const usfm = API_BIBLE_BOOK_MAP[bookName];
  if (!usfm) return 1;
  const listed = CHAPTER_LISTS[code.trim().toUpperCase()]?.[usfm];
  return listed?.[0] ?? 1;
}

export function bookIsInEdition(bookName: string, books: readonly string[] | undefined): boolean {
  if (!books) return true;
  const usfm = API_BIBLE_BOOK_MAP[bookName];
  if (!usfm) return true;
  return books.includes(usfm);
}

/** Closest Protestant book the edition does contain, by canon distance. Ties prefer the earlier book. */
export function nearestTranslatedBook(currentBook: string, books: readonly string[]): string | null {
  const order = Object.keys(API_BIBLE_BOOK_MAP);
  const current = order.indexOf(currentBook);
  const origin = current < 0 ? 0 : current;
  const available = order.filter((name) => {
    const code = API_BIBLE_BOOK_MAP[name];
    return books.includes(code);
  });
  if (!available.length) return null;
  let best = available[0];
  let bestDist = Math.abs(order.indexOf(best) - origin);
  for (const name of available) {
    const dist = Math.abs(order.indexOf(name) - origin);
    if (dist < bestDist) {
      best = name;
      bestDist = dist;
    }
  }
  return best;
}

export function untranslatedBookMessage(bookName: string, language: string): string {
  return `${bookName} isn't translated in ${language} yet`;
}

export interface UntranslatedBook {
  bookName: string;
  language: string;
  nearestBook: string | null;
  nearestBookId: number | null;
  /** Chapter of nearestBook that this edition actually contains. */
  nearestChapter: number;
}

/** A known gap in this edition. Null when the book is present or the edition's contents are unknown. */
export function untranslatedBook(
  code: string,
  bookName: string,
  entry?: (EditionBooks & { languageName?: string | null }) | null,
): UntranslatedBook | null {
  const books = booksForEdition(code, entry);
  if (!books || bookIsInEdition(bookName, books)) return null;
  const nearestBook = nearestTranslatedBook(bookName, books);
  return {
    bookName,
    language: editionLanguageName(code, entry?.languageName),
    nearestBook,
    nearestBookId: nearestBook ? bibleBookId(nearestBook) : null,
    nearestChapter: nearestBook ? openingChapter(code, nearestBook) : 1,
  };
}

/**
 * A chapter this edition's book does not contain.
 * Null when the chapter is published, or this edition has no chapter list for the book.
 */
export function untranslatedEarlyChapter(
  code: string,
  bookName: string,
  chapter: number,
  entry?: (EditionBooks & { languageName?: string | null }) | null,
): UntranslatedBook | null {
  const listed = chaptersInEdition(code, bookName, entry);
  if (!listed?.length || listed.includes(chapter)) return null;
  return {
    bookName: `${bookName} ${chapter}`,
    language: editionLanguageName(code, entry?.languageName),
    nearestBook: bookName,
    nearestBookId: bibleBookId(bookName),
    nearestChapter: nearestChapterNumber(listed, chapter),
  };
}

/** Calm notice after a passage 404, including a chapter the book list still names. */
export function noticeForMissingPassage(
  code: string,
  bookName: string,
  chapter: number,
  entry?: (EditionBooks & { languageName?: string | null }) | null,
): UntranslatedBook {
  const books = booksForEdition(code, entry);
  const language = editionLanguageName(code, entry?.languageName);
  const usfm = API_BIBLE_BOOK_MAP[bookName];
  const inEdition = !!books && !!usfm && books.includes(usfm);
  if (inEdition) {
    const listed = usfm ? CHAPTER_LISTS[code.trim().toUpperCase()]?.[usfm] : undefined;
    if (listed?.length && !listed.includes(chapter)) {
      return {
        bookName: `${bookName} ${chapter}`,
        language,
        nearestBook: bookName,
        nearestBookId: bibleBookId(bookName),
        nearestChapter: nearestChapterNumber(listed, chapter),
      };
    }
    const open = openingChapter(code, bookName);
    if (!listed && open !== chapter) {
      return {
        bookName: `${bookName} ${chapter}`,
        language,
        nearestBook: bookName,
        nearestBookId: bibleBookId(bookName),
        nearestChapter: open,
      };
    }
    const rest = books.filter((codeInBook) => codeInBook !== usfm);
    const nearestBook = rest.length ? nearestTranslatedBook(bookName, rest) : null;
    return {
      bookName: `${bookName} ${chapter}`,
      language,
      nearestBook,
      nearestBookId: nearestBook ? bibleBookId(nearestBook) : null,
      nearestChapter: nearestBook ? openingChapter(code, nearestBook) : 1,
    };
  }
  const nearestBook = books?.length ? nearestTranslatedBook(bookName, books) : null;
  return {
    bookName,
    language,
    nearestBook,
    nearestBookId: nearestBook ? bibleBookId(nearestBook) : null,
    nearestChapter: nearestBook ? openingChapter(code, nearestBook) : 1,
  };
}

/** The version to offer when this chapter is missing. Never the edition that is already open. */
export function previousReadingTranslation(current: string, previous: string | null | undefined): string {
  const now = current.trim().toUpperCase();
  const prior = (previous ?? "").trim().toUpperCase();
  if (prior && prior !== now) return prior;
  return "KJV";
}

export function passageErrorIsUntranslated(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /doesn.?t include|isn.?t in this version/i.test(message);
}

/** A search alias matches the whole phrase, or the start of it once a few letters are typed. */
export function searchAliasMatches(aliases: readonly string[] | undefined, needle: string): boolean {
  if (!aliases?.length || !needle) return false;
  return aliases.some((alias) => {
    if (alias === needle) return true;
    if (needle.length >= 4 && alias.startsWith(needle)) return true;
    if (needle.startsWith(alias) && (needle.length === alias.length || needle[alias.length] === " ")) return true;
    return false;
  });
}
