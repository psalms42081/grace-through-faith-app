import { READING_CHROME_FONT_CAP } from "./reading-font-scale";
import { bibleBookName } from "./scripture-reference";

/** A long version code (e.g. SRP1865) ellipsizes instead of crowding the title. */
export const READER_VERSION_CHIP_MAX_WIDTH = 72;

/** Lora semibold at 17px. Generous enough that a short label is never given too few pixels. */
export const READER_HEADER_TITLE_FONT_SIZE = 17;
export const READER_HEADER_TITLE_CHAR_WIDTH = 8.2;
/** The chevron-down drawn after the label. */
export const READER_HEADER_CHEVRON_WIDTH = 14;
export const READER_HEADER_TITLE_ICON_GAP = 4;
/** Back chevron (22px) plus its padding. */
export const READER_HEADER_BACK_WIDTH = 36;
/** Gap kept between the title and the right-hand chips. */
export const READER_HEADER_CHIPS_GAP = 8;
/** Paddings, the globe icon and the chip-row gaps. These do not follow the font scale. */
export const READER_HEADER_CHIPS_FIXED = 91;
/** "Word study" + "Compare" + "AA" + a short version code at font scale 1. */
export const READER_HEADER_CHIPS_TEXT = 145;

type RouteParams = Record<string, unknown> | object | undefined | null;

function firstParam(params: RouteParams, key: string): string {
  const value = (params as Record<string, unknown> | null | undefined)?.[key];
  const single = Array.isArray(value) ? value[0] : value;
  return single === undefined || single === null ? "" : String(single).trim();
}

/**
 * "Matthew 5" from the route params alone, so the native stack header has its title on the very
 * first frame, before the passage request returns.
 */
export function readerHeaderLabel(params: RouteParams): string {
  const bookName = bibleBookName(firstParam(params, "bookId"));
  const chapter = firstParam(params, "chapter");
  return `${bookName} ${chapter}`.trim();
}

/** Chapter list title from the route params, with a neutral fallback for an unknown id. */
export function chapterListTitle(params: RouteParams): string {
  return bibleBookName(firstParam(params, "bookId")) || "Chapters";
}

/** Changes whenever the chapter changes, so the native header subview is created again. */
export function readerHeaderTitleKey(params: RouteParams): string {
  return `${firstParam(params, "bookId")}-${firstParam(params, "chapter")}`;
}

function clampedFontScale(fontScale: number): number {
  if (!Number.isFinite(fontScale) || fontScale < 1) return 1;
  return Math.min(fontScale, READING_CHROME_FONT_CAP);
}

/** Room the chips keep for themselves, so a title width never covers them. */
export function readerHeaderChipsWidth(fontScale: number): number {
  return Math.ceil(READER_HEADER_CHIPS_FIXED + READER_HEADER_CHIPS_TEXT * clampedFontScale(fontScale));
}

/** Widest the title button may be before it would run into the chips. */
export function readerHeaderTitleRoom(screenWidth: number, fontScale: number): number {
  const room = Math.floor(
    screenWidth - READER_HEADER_BACK_WIDTH - readerHeaderChipsWidth(fontScale) - READER_HEADER_CHIPS_GAP,
  );
  return Math.max(room, READER_HEADER_CHEVRON_WIDTH + READER_HEADER_TITLE_ICON_GAP + 24);
}

/** Width of the label plus its chevron, before clamping. Same text length gives the same width. */
export function readerHeaderTitleNaturalWidth(label: string, fontScale: number): number {
  const scale = clampedFontScale(fontScale);
  const text = Math.ceil(label.length * READER_HEADER_TITLE_CHAR_WIDTH * scale);
  return text + READER_HEADER_CHEVRON_WIDTH + READER_HEADER_TITLE_ICON_GAP;
}

/**
 * Explicit width for the title button. Derived from the label, then clamped to the room beside
 * the chips. It does not come from the header subview's own measurement, which Android keeps
 * from the first layout.
 */
export function readerHeaderTitleWidth(label: string, screenWidth: number, fontScale = 1): number {
  if (screenWidth <= 0) return readerHeaderTitleNaturalWidth(label, fontScale);
  return Math.min(
    readerHeaderTitleNaturalWidth(label, fontScale),
    readerHeaderTitleRoom(screenWidth, fontScale),
  );
}
