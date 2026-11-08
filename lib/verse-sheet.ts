/** Collapsed verse-sheet chrome height (handle + ref + actions + Original words), excluding tab-bar inset. */
export const VERSE_SHEET_COLLAPSED_HEIGHT = 168;

/** Highlight washes shown on the collapsed verse sheet. */
export const VERSE_SHEET_HIGHLIGHTS = [
  { key: "yellow" as const, bg: "#FFF176", label: "Yellow" },
  { key: "green" as const, bg: "#A5D6A7", label: "Green" },
  { key: "blue" as const, bg: "#90CAF9", label: "Blue" },
  { key: "rose" as const, bg: "#F8BBD0", label: "Rose" },
];

export type VerseSheetHighlightKey = (typeof VERSE_SHEET_HIGHLIGHTS)[number]["key"];

export const VERSE_SHEET_ATTRIBUTION =
  "Tagging: STEP Bible (CC BY 4.0) · Lexicon: Strong's (public domain) · Classic commentaries: public domain";

/** Sheet header uses an ASCII hyphen for ranges, e.g. Psalms 23:1-3. */
export function formatSheetReference(
  bookName: string,
  chapter: number | string,
  verses: number[],
): string {
  const sorted = [...new Set(verses.filter((n) => Number.isFinite(n)))].sort((a, b) => a - b);
  const title = bookName.trim() || "Scripture";
  if (sorted.length === 0) return `${title} ${chapter}`;
  const parts: string[] = [];
  let start = sorted[0]!;
  let prev = start;
  for (let i = 1; i <= sorted.length; i += 1) {
    const next = sorted[i];
    if (next === prev + 1) {
      prev = next;
      continue;
    }
    parts.push(start === prev ? String(start) : `${start}-${prev}`);
    if (next != null) {
      start = prev = next;
    }
  }
  return `${title} ${chapter}:${parts.join(", ")}`;
}

export function firstThreeLines(text: string): { preview: string; hasMore: boolean } {
  const trimmed = text.replace(/\r\n/g, "\n").trim();
  if (!trimmed) return { preview: "", hasMore: false };
  const byNl = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (byNl.length > 1) {
    const preview = byNl.slice(0, 3).join("\n");
    return { preview, hasMore: byNl.length > 3 || preview.length < trimmed.length };
  }
  const sentences = trimmed.match(/[^.!?]+(?:[.!?]+|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [trimmed];
  const preview = sentences.slice(0, 3).join(" ").trim();
  return { preview, hasMore: preview.length < trimmed.length };
}

export const ORIGINAL_WORDS_UNAVAILABLE =
  "Original words aren't available for this verse in this translation";

/**
 * KJV chapter counts from bible metadata (`bible_book.chapter_count` / the
 * canonical table). Hebrew Joel has 4 chapters and Hebrew Malachi has 3.
 * A different count on the open translation means that numbering, not a
 * verse-by-verse crosswalk.
 */
export const KJV_JOEL_CHAPTERS = 3;
export const KJV_MALACHI_CHAPTERS = 4;

export type OriginalWordsLookupPlan = {
  /** When false, do not request the KJV verse with the same book, chapter, and verse. */
  requestKjvVerse: boolean;
  message: string | null;
};

function joelOrMalachi(bookName: string, bookId?: string | number | null): "joel" | "malachi" | null {
  const name = bookName.trim().toLowerCase();
  const id = Number(bookId);
  if (name === "joel" || id === 29) return "joel";
  if (name === "malachi" || id === 39) return "malachi";
  return null;
}

/**
 * Original-words lookup for a verse that has no STEP rows of its own.
 * Joel and Malachi are refused when the open translation's chapter count
 * differs from the KJV's. A KJV verse that does not exist is refused for
 * every book. Psalm titles stay on the same chapter and verse number.
 */
export function planOriginalWordsLookup(input: {
  translation: string;
  bookName: string;
  bookId?: string | number | null;
  /** Chapter count of the translation the reader has open. */
  translationChapterCount?: number | null;
  /**
   * False once the same-numbered KJV verse is known to be absent.
   * Null while that is still unknown.
   */
  kjvVerseExists?: boolean | null;
  hasStepRows?: boolean;
}): OriginalWordsLookupPlan {
  if (input.hasStepRows) return { requestKjvVerse: false, message: null };
  const book = joelOrMalachi(input.bookName, input.bookId);
  const kjv = input.translation.trim().toUpperCase() === "KJV";
  if (!kjv && book) {
    const count = input.translationChapterCount;
    const kjvCount = book === "joel" ? KJV_JOEL_CHAPTERS : KJV_MALACHI_CHAPTERS;
    if (typeof count === "number" && Number.isFinite(count) && count >= 1 && count !== kjvCount) {
      return { requestKjvVerse: false, message: ORIGINAL_WORDS_UNAVAILABLE };
    }
  }
  if (input.kjvVerseExists === false) {
    return { requestKjvVerse: false, message: ORIGINAL_WORDS_UNAVAILABLE };
  }
  return { requestKjvVerse: true, message: null };
}

export function isAiGeneratedSource(source: string | null | undefined): boolean {
  if (!source) return true;
  const value = source.trim().toLowerCase();
  if (!value) return true;
  return value === "ai" || value === "generated" || value.includes("ai-generated") || value.includes("openai");
}
