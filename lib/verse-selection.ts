/** En-dash used in contiguous verse ranges, e.g. `1–3`. */
export const VERSE_RANGE_DASH = "\u2013";

export type SheetActionScope = "all" | "first";

/**
 * Highlight-sheet actions: colour / clear / copy / share apply to every
 * selected verse. Explain, Note, Compare, and Save have no range API, so they
 * use the first selected verse (lowest verse number).
 */
export const SHEET_ACTION_SCOPE = {
  color: "all",
  clear: "all",
  copy: "all",
  share: "all",
  explain: "first",
  note: "first",
  compare: "first",
  save: "first",
} as const satisfies Record<string, SheetActionScope>;

export function toggleVerseSelection(
  selected: readonly number[],
  verse: number,
): number[] {
  const set = new Set(selected);
  if (set.has(verse)) set.delete(verse);
  else set.add(verse);
  return [...set].sort((a, b) => a - b);
}

export function collapseVerseRanges(verses: readonly number[]): string {
  if (verses.length === 0) return "";
  const sorted = [...new Set(verses)].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0]!;
  let prev = start;
  for (let i = 1; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (n === prev + 1) {
      prev = n;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}${VERSE_RANGE_DASH}${prev}`);
    start = n;
    prev = n;
  }
  parts.push(start === prev ? `${start}` : `${start}${VERSE_RANGE_DASH}${prev}`);
  return parts.join(", ");
}

export function formatVerseRangeLabel(
  bookName: string,
  chapter: string | number,
  verses: readonly number[],
): string {
  const ranges = collapseVerseRanges(verses);
  if (!ranges) return `${bookName} ${chapter}`;
  return `${bookName} ${chapter}:${ranges}`;
}

export function formatSelectionPreview(texts: readonly string[]): string {
  if (texts.length === 0) return "";
  const first = texts[0] ?? "";
  return texts.length > 1 ? `${first}\u2026` : first;
}

export function buildSelectionCopyText(opts: {
  bookName: string;
  chapter: string | number;
  translation: string;
  verses: readonly { verse: number; text: string }[];
}): string {
  const sorted = [...opts.verses].sort((a, b) => a.verse - b.verse);
  const reference = formatVerseRangeLabel(
    opts.bookName,
    opts.chapter,
    sorted.map((v) => v.verse),
  );
  const body = sorted.map((v) => v.text).join(" ");
  return `${body}\n\u2014 ${reference} (${opts.translation})`;
}

export function buildHighlightSheetPayload(opts: {
  bookName: string;
  chapter: string | number;
  translation: string;
  verses: readonly { verse: number; text: string }[];
}): {
  reference: string;
  preview: string;
  copyText: string;
  firstVerse: { verse: number; text: string } | null;
  verseNumbers: number[];
  actionScope: typeof SHEET_ACTION_SCOPE;
} {
  const sorted = [...opts.verses].sort((a, b) => a.verse - b.verse);
  const verseNumbers = sorted.map((v) => v.verse);
  return {
    reference: formatVerseRangeLabel(opts.bookName, opts.chapter, verseNumbers),
    preview: formatSelectionPreview(sorted.map((v) => v.text)),
    copyText: buildSelectionCopyText({ ...opts, verses: sorted }),
    firstVerse: sorted[0] ?? null,
    verseNumbers,
    actionScope: SHEET_ACTION_SCOPE,
  };
}

export function highlightIdsForVerses(
  highlights: readonly {
    id: string;
    verseId: string;
    bookId?: number;
    chapter?: number;
    verse?: number;
  }[],
  verses: readonly { id: string; verse: number }[],
  bookId: number,
  chapter: number,
): string[] {
  const ids = new Set(verses.map((v) => v.id));
  const nums = new Set(verses.map((v) => v.verse));
  const matched = new Set<string>();
  for (const h of highlights) {
    if (ids.has(h.verseId)) {
      matched.add(h.id);
      continue;
    }
    if (
      h.bookId === bookId &&
      h.chapter === chapter &&
      h.verse != null &&
      nums.has(h.verse)
    ) {
      matched.add(h.id);
    }
  }
  return [...matched];
}
