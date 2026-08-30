/**
 * Layout-only grouping for the typography preview. Does not reorder or
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

/** Break a paragraph run when a later verse has provider headings (block-level). */
export function splitParagraphGroupAtHeadings<T extends { verse: number }>(
  group: T[],
  headingsByVerse: Map<number, string[]>,
): { headings: string[]; verses: T[] }[] {
  if (!group.length) return [];
  const runs: { headings: string[]; verses: T[] }[] = [];
  let verses: T[] = [];
  let headings: string[] = headingsByVerse.get(group[0].verse) ?? [];
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
