import {
  API_BIBLE_BOOK_MAP,
  NT_USFM,
  OT_USFM,
  bibleBookId,
} from "./bible-books";

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
 * First published chapter when a book in an edition does not begin at chapter 1.
 * Warlpiri Judges starts at chapter 2, and its Psalms is Psalm 23 only.
 */
const OPENING_CHAPTERS: Record<string, Record<string, number>> = {
  YV1355: { JDG: 2, PSA: 23 },
};

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

/** Chapter to open for this book. Chapter 1 unless the edition starts later. */
export function openingChapter(code: string, bookName: string): number {
  const usfm = API_BIBLE_BOOK_MAP[bookName];
  if (!usfm) return 1;
  return OPENING_CHAPTERS[code.trim().toUpperCase()]?.[usfm] ?? 1;
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
 * A chapter before the first published chapter of a book this edition does contain.
 * Null when the chapter may exist, so the passage can still be requested.
 */
export function untranslatedEarlyChapter(
  code: string,
  bookName: string,
  chapter: number,
  entry?: (EditionBooks & { languageName?: string | null }) | null,
): UntranslatedBook | null {
  const books = booksForEdition(code, entry);
  if (!books || !bookIsInEdition(bookName, books)) return null;
  const open = openingChapter(code, bookName);
  if (chapter >= open) return null;
  return {
    bookName: `${bookName} ${chapter}`,
    language: editionLanguageName(code, entry?.languageName),
    nearestBook: bookName,
    nearestBookId: bibleBookId(bookName),
    nearestChapter: open,
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
    const open = openingChapter(code, bookName);
    if (open !== chapter) {
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
