/**
 * Layout-only grouping for reader typography. Does not reorder or
 * filter the source verses[] array — callers map groups back onto the
 * original identity used by audio and highlights.
 */

import { extractAcrosticHeadings } from "../shared/acrostic-markers";

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

/**
 * Reader heading kind. `qa` is the USFM acrostic letter (Psalm 119, Lamentations);
 * `r` is the parallel-passage reference printed under a section heading, e.g. "(Luk 3.23-38)".
 */
export type ReaderHeadingKind = "qa" | "r";
export type ReaderHeading = { text: string; kind?: ReaderHeadingKind };

export type ProviderHeadingLike = { text: string; beforeVerse?: number; kind?: ReaderHeadingKind };

/** A heading that is only a bracketed reference is a parallel-passage line, whatever the server said. */
export function headingKind(heading: { text: string; kind?: ReaderHeadingKind }): ReaderHeadingKind | undefined {
  if (heading.kind) return heading.kind;
  return /^\([^()]*\d[^()]*\)$/.test(heading.text.trim()) ? "r" : undefined;
}

export function headingsByVerse(headings: ProviderHeadingLike[] | undefined): Map<number, ReaderHeading[]> {
  const byVerse = new Map<number, ReaderHeading[]>();
  for (const heading of headings ?? []) {
    if (heading.beforeVerse && heading.text) {
      byVerse.set(heading.beforeVerse, [
        ...(byVerse.get(heading.beforeVerse) ?? []),
        { text: heading.text, kind: headingKind(heading) },
      ]);
    }
  }
  return byVerse;
}

/**
 * Lift leftover BBE-style `&lt;ALEPH&gt;` markers into qa headings when the API
 * response still has them in the verse text (older servers, or Compare).
 */
export function withAcrosticHeadings<T extends { verse: number; text: string }>(
  verses: T[],
  providerHeadings?: ProviderHeadingLike[],
): { verses: T[]; headingsByVerse: Map<number, ReaderHeading[]> } {
  const extracted = extractAcrosticHeadings(verses);
  if (!extracted.headings.length) {
    return { verses, headingsByVerse: headingsByVerse(providerHeadings) };
  }
  return {
    verses: extracted.verses,
    headingsByVerse: headingsByVerse([...(providerHeadings ?? []), ...extracted.headings]),
  };
}

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

/** Flatten a paragraph run the way TypographyPreviewProse joins verses. */
export function joinInlineVerseRun<T extends { text: string }>(verses: T[]): string {
  return verses.map((verse, index) => `${verse.text}${gapAfterVerseInRun(verses, index)}`).join("");
}

/** Keep the verse number glued to the first word so it cannot wrap alone. */
export function splitLeadingWord(text: string): { firstWord: string; remainder: string } {
  const match = text.match(/^(\S+)([\s\S]*)$/);
  if (!match) return { firstWord: "", remainder: "" };
  return { firstWord: match[1] ?? "", remainder: match[2] ?? "" };
}
