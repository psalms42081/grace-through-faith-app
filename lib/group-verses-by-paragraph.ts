/**
 * Layout-only grouping for reader typography. Does not reorder or
 * filter the source verses[] array — callers map groups back onto the
 * original identity used by audio and highlights.
 */

export function groupVersesByParagraphStarts<T extends { verse: number }>(
  verses: T[],
  paragraphStarts: Set<number>,
): T[][] {
  if (!verses.length) return [];
  if (!paragraphStarts.size) return [verses];
  const groups: T[][] = [];
  let current: T[] = [];
  for (const verse of verses) {
    if (current.length > 0 && paragraphStarts.has(verse.verse)) {
      groups.push(current);
      current = [];
    }
    current.push(verse);
  }
  if (current.length) groups.push(current);
  return groups;
}

/** Reader heading; `qa` is the USFM acrostic letter (Psalm 119, Lamentations). */
export type ReaderHeading = { text: string; kind?: "qa" };

/** Break a paragraph run when a later verse has provider headings (block-level). */
export function splitParagraphGroupAtHeadings<T extends { verse: number }, H = string>(
  group: T[],
  headingsByVerse: Map<number, H[]>,
): { headings: H[]; verses: T[] }[] {
  if (!group.length) return [];
  const runs: { headings: H[]; verses: T[] }[] = [];
  let verses: T[] = [];
  let headings: H[] = headingsByVerse.get(group[0].verse) ?? [];
  for (const verse of group) {
    const nextHeadings = headingsByVerse.get(verse.verse) ?? [];
    if (verses.length > 0 && nextHeadings.length > 0) {
      runs.push({ headings, verses });
      verses = [];
      headings = nextHeadings;
    }
    verses.push(verse);
  }
  if (verses.length) runs.push({ headings, verses });
  return runs;
}

export function isPoetryRun<T extends { text: string }>(verses: T[]): boolean {
  return verses.some((v) => v.text.includes("\n"));
}

/**
 * Between verses in a run: if any verse is line-broken (poetry), every
 * numbered verse starts on a new line. Prose stays inline. Nothing after the last verse.
 */
export function gapAfterVerseInRun<T extends { text: string }>(
  verses: T[],
  index: number,
): "\n" | " " | "" {
  if (index < 0 || index >= verses.length - 1) return "";
  return isPoetryRun(verses) ? "\n" : " ";
}

/** Keep the verse number glued to the first word so it cannot wrap alone. */
export function splitLeadingWord(text: string): { firstWord: string; remainder: string } {
  const match = text.match(/^(\S+)([\s\S]*)$/);
  if (!match) return { firstWord: "", remainder: "" };
  return { firstWord: match[1] ?? "", remainder: match[2] ?? "" };
}
