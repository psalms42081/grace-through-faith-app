type Ranged = {
  verse: number;
  verseEnd?: number | null;
  /** Reading-translation verse this companion line belongs under, when the numbers differ. */
  alignVerse?: number | null;
  alignVerseEnd?: number | null;
};

function rangeOf(item: Ranged): [number, number] {
  const end = item.verseEnd != null && item.verseEnd > item.verse ? item.verseEnd : item.verse;
  return [item.verse, end];
}

function alignmentRange(item: Ranged): [number, number] {
  if (item.alignVerse == null) return rangeOf(item);
  const end = item.alignVerseEnd != null && item.alignVerseEnd > item.alignVerse ? item.alignVerseEnd : item.alignVerse;
  return [item.alignVerse, end];
}

/**
 * Companion verses to show under each reading verse in Compare.
 *
 * A reading verse that prints several verses as one ("1–2") takes every
 * companion verse in that range. A companion verse that prints several as one
 * sits under the last reading verse it covers, so it follows all of them.
 * Companion verses the reading version does not have are left out.
 */
export function alignCompanionVerses<P extends Ranged, C extends Ranged>(
  reading: readonly P[],
  companion: readonly C[],
): Map<number, C[]> {
  const under = new Map<number, C[]>();
  for (const item of companion) {
    const [start, end] = alignmentRange(item);
    let host: P | undefined;
    for (const candidate of reading) {
      const [candidateStart, candidateEnd] = alignmentRange(candidate);
      if (candidateStart <= end && candidateEnd >= start) host = candidate;
    }
    if (!host) continue;
    under.set(host.verse, [...(under.get(host.verse) ?? []), item]);
  }
  return under;
}

/** Whether the companion lines under a reading verse need their own verse numbers. */
export function companionNeedsNumbers(reading: Ranged, companions: readonly Ranged[]): boolean {
  if (companions.length !== 1) return companions.length > 1;
  const [readingStart, readingEnd] = rangeOf(reading);
  const [start, end] = rangeOf(companions[0]);
  return start !== readingStart || end !== readingEnd;
}
