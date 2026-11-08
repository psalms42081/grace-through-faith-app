/**
 * One reading size for every long-form screen. The first five steps are the
 * original Bible reader choices, so a saved size still lands on the same step.
 * 2 is twice the default body.
 */
export const READING_FONT_SCALE_KEY = "@grace-through-faith/reader-font-scale";

export const READING_FONT_SCALE_STEPS = [0.85, 1, 1.15, 1.3, 1.45, 1.7, 2] as const;

export type ReadingFontScale = (typeof READING_FONT_SCALE_STEPS)[number];

/** Bible reader body at the default step. Line height matches the live prose. */
export const READING_BODY_FONT_SIZE = 18;
export const READING_BODY_LINE_HEIGHT = 32;
/** Space under a Bible paragraph at the default step. */
export const READING_PARAGRAPH_GAP = 10;

/**
 * Header chips and the Compare line may grow with the phone's text size,
 * but not without limit, or they collide with the chapter title on a phone.
 * Long-form body text is not capped.
 */
export const READING_CHROME_FONT_CAP = 1.3;

export function parseReadingFontScale(raw: string | null | undefined): ReadingFontScale | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  for (const step of READING_FONT_SCALE_STEPS) {
    if (Math.abs(step - n) < 0.001) return step;
  }
  return null;
}

export function readingType(fontSize: number, lineHeight: number, scale: number) {
  return {
    fontSize: fontSize * scale,
    lineHeight: lineHeight * scale,
  };
}

export function readingSpace(base: number, scale: number) {
  return base * scale;
}

/**
 * Web text uses px, so a browser or phone font-size preference that only
 * changes `rem` would otherwise be ignored. When a fixed 16px and 1rem
 * already compute to the same size, the engine has applied the preference
 * to px too (or there is no preference) and the scale stays 1.
 */
export function systemFontScaleFromProbes(remPx: number, fixedPx: number): number {
  if (!Number.isFinite(remPx) || !Number.isFinite(fixedPx) || fixedPx <= 0 || remPx <= 0) return 1;
  const scale = remPx / fixedPx;
  if (!Number.isFinite(scale) || scale <= 0) return 1;
  if (Math.abs(scale - 1) < 0.02) return 1;
  return scale;
}
