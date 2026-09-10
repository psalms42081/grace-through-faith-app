/** Book-level context cards (chapter unset) first; otherwise chapter 1, which often introduces the book. */
export function pickBookOverviewCards<T extends { chapter: number | null | undefined }>(
  cards: readonly T[],
): T[] {
  const bookLevel = cards.filter((card) => card.chapter == null);
  if (bookLevel.length > 0) return [...bookLevel];
  return cards.filter((card) => Number(card.chapter) === 1);
}

export function hasBookOverviewContent(
  cards: readonly { chapter: number | null | undefined }[],
): boolean {
  return pickBookOverviewCards(cards).length > 0;
}
