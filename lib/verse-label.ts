/** Verse number as printed in the margin: "7", or "1–2" when a version prints two verses as one. */
export function verseNumberLabel(verse: { verse: number; verseEnd?: number | null }): string {
  const end = verse.verseEnd;
  if (end != null && end > verse.verse) return `${verse.verse}\u2013${end}`;
  return String(verse.verse);
}

/** Every verse number a selection covers, including the tail of merged verses. */
export function coveredVerseNumbers(verses: readonly { verse: number; verseEnd?: number | null }[]): number[] {
  const numbers = new Set<number>();
  for (const item of verses) {
    const end = item.verseEnd != null && item.verseEnd > item.verse ? item.verseEnd : item.verse;
    for (let n = item.verse; n <= end; n += 1) numbers.add(n);
  }
  return [...numbers].sort((a, b) => a - b);
}
