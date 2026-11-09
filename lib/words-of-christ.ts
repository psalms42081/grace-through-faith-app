import ranges from "@/data/kjv-words-of-christ.json";
import type { WordRange } from "@/lib/verse-word-range";
import { isKjvTranslation } from "@/lib/strong-map-policy";

/**
 * Word indexes for the words of Christ in the KJV.
 * Source: red-letter `{ }` spans in https://github.com/nolanbaxter/kjv-bible
 * (public-domain King James text; the repository has no separate licence file).
 * Only indexes are stored, keyed by book.chapter.verse. Canon coral ink.
 */
const table = ranges as unknown as Record<string, [number, number][]>;

export const WORDS_OF_CHRIST_INK = "#C24431";

/** Settings → Bible Reading → Red Letters. Absent means on, matching that switch. */
export const RED_LETTERS_STORAGE_KEY = "@gtf/setting-red-letters";

export function redLettersFromStorage(stored: string | null): boolean {
  return stored == null ? true : stored === "true";
}

export const WORDS_OF_CHRIST_SOURCE =
  "nolanbaxter/kjv-bible red-letter spans on the public-domain King James Version";

export function wordsOfChristRanges(bookId: number, chapter: number, verse: number): WordRange[] {
  const rows = table[`${bookId}.${chapter}.${verse}`];
  if (!rows?.length) return [];
  return rows.map(([start, end]) => ({ start, end }));
}

/**
 * Colour words of Christ only when the reading version has that markup.
 * A comparison line stays black while the reading version stays black.
 */
export function spokenRangesForLine(opts: {
  redLettersEnabled: boolean;
  readingTranslation: string;
  lineTranslation: string;
  bookId: number;
  chapter: number;
  verse: number;
}): WordRange[] {
  if (!opts.redLettersEnabled) return [];
  if (!isKjvTranslation(opts.readingTranslation) || !isKjvTranslation(opts.lineTranslation)) return [];
  return wordsOfChristRanges(opts.bookId, opts.chapter, opts.verse);
}
