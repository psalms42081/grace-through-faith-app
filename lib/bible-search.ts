/**
 * Whole-word Bible search. "grace" matches "grace" and "Grace," and does not
 * match "disgrace". Ranking prefers a verse that is the query, then a
 * well-known passage, then a verse where the word is a larger share of the text.
 */

export type RankableVerse = {
  bookId: number;
  chapter: number;
  verse: number;
  text: string;
};

const FAMOUS_BOOKS = new Set([
  1, 19, 20, 23, 40, 41, 42, 43, 45, 49, 50, 62,
]);

/** bookId:chapter:verse for passages people look up by a familiar phrase. */
const WELL_KNOWN = new Set([
  "1:1:1",
  "19:23:1",
  "19:119:105",
  "24:29:11",
  "40:5:16",
  "40:6:33",
  "40:11:28",
  "42:2:11",
  "43:1:1",
  "43:3:16",
  "43:14:6",
  "45:3:23",
  "45:6:23",
  "45:8:28",
  "49:2:8",
  "50:4:13",
  "62:4:8",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function queryWords(query: string): string[] {
  return query.trim().split(/\s+/).filter(Boolean).slice(0, 8);
}

export function wholeWordRegExp(word: string): RegExp {
  return new RegExp(`(?:^|[^A-Za-z0-9])${escapeRegExp(word)}(?=$|[^A-Za-z0-9])`, "i");
}

/** PostgreSQL `~*` pattern: a word boundary on both sides of one token. */
export function postgresWholeWord(word: string): string {
  const escaped = word.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  return `\\m${escaped}\\M`;
}

export function textHasWholeWords(text: string, query: string): boolean {
  const words = queryWords(query);
  if (!words.length) return false;
  return words.every((word) => wholeWordRegExp(word).test(text));
}

function normalizeVerse(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

export function bibleSearchScore(row: RankableVerse, query: string): number {
  const words = queryWords(query);
  let hits = 0;
  for (const word of words) {
    const flags = new RegExp(wholeWordRegExp(word).source, "gi");
    hits += row.text.match(flags)?.length ?? 0;
  }
  const tokenCount = normalizeVerse(row.text).split(" ").filter(Boolean).length || 1;
  const exact = normalizeVerse(row.text) === normalizeVerse(query) ? 500 : 0;
  const density = (hits / tokenCount) * 80;
  const known = WELL_KNOWN.has(`${row.bookId}:${row.chapter}:${row.verse}`) ? 40 : 0;
  const famous = FAMOUS_BOOKS.has(row.bookId) ? 15 : 0;
  return exact + density + hits * 8 + known + famous;
}

export function rankBibleSearchResults<T extends RankableVerse>(rows: T[], query: string): T[] {
  return rows
    .filter((row) => textHasWholeWords(row.text, query))
    .sort((a, b) => {
      const delta = bibleSearchScore(b, query) - bibleSearchScore(a, query);
      if (delta !== 0) return delta;
      if (a.bookId !== b.bookId) return a.bookId - b.bookId;
      if (a.chapter !== b.chapter) return a.chapter - b.chapter;
      return a.verse - b.verse;
    });
}
