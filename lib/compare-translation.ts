/** Comparison shown when the device has no saved choice, or that choice matches the chapter. */
export function defaultComparisonTranslation(reading: string): "KJV" | "NIV" {
  return reading === "KJV" ? "NIV" : "KJV";
}

/**
 * Version to display beside the chapter. A saved choice is kept as-is, including
 * when it matches the reading version — callers must not write the fallback back.
 */
export function comparisonTranslation(reading: string, saved: string | null | undefined): string {
  if (saved && saved !== reading) return saved;
  return defaultComparisonTranslation(reading);
}
