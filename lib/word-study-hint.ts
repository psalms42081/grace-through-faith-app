export const WORD_STUDY_HINT_HIDE_MS = 7 * 24 * 60 * 60 * 1000;
export const WORD_STUDY_HINT_HEBREW = "Tap any word to see the Hebrew";
export const WORD_STUDY_HINT_GREEK = "Tap any word to see the Greek";

/** Old Testament books 1–39 are Hebrew; New Testament books 40–66 are Greek. */
export function wordStudyHintCopy(bookId: number): string | null {
  if (!Number.isInteger(bookId) || bookId < 1 || bookId > 66) return null;
  return bookId <= 39 ? WORD_STUDY_HINT_HEBREW : WORD_STUDY_HINT_GREEK;
}

/**
 * The hint may return after it was hidden only once seven days have passed.
 * Callers apply this on the off→on edge. Leaving Word study on does not
 * re-check the clock by itself.
 */
export function wordStudyHintReturns(hiddenAt: number | null, now: number): boolean {
  if (hiddenAt == null || !Number.isFinite(hiddenAt)) return true;
  return now - hiddenAt >= WORD_STUDY_HINT_HIDE_MS;
}
