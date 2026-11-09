import { bibleBookName } from "./scripture-reference";

/** Back button (22px icon, 4px padding each side) plus the title's 4px start margin. */
export const READER_HEADER_LEFT_ALLOWANCE = 34;
/** Space kept between the title and the chips. */
export const READER_HEADER_TITLE_GAP = 8;
/** A long version code (e.g. SRP1865) ellipsizes instead of crowding the title. */
export const READER_VERSION_CHIP_MAX_WIDTH = 72;
/** The title always keeps at least this much room, so it can never collapse to nothing. */
export const READER_HEADER_TITLE_MIN_WIDTH = 96;
/** Width assumed for the chips until they have been measured (Word study, Compare, AA, version). */
export const READER_HEADER_CHIPS_ESTIMATE = 176;

/**
 * The navigation header gives the right-hand chips whatever width the title leaves and lets
 * them overflow leftwards over it, so the title is capped to the space the measured chips leave.
 * Until the chips are measured an estimate is used, and the cap never drops below
 * READER_HEADER_TITLE_MIN_WIDTH, so a bad or missing measurement can only crowd the chips,
 * never hide the book name. Returns undefined only when the header width is unknown.
 */
export function readerHeaderTitleMaxWidth(headerWidth: number, chipsWidth: number): number | undefined {
  if (headerWidth <= 0) return undefined;
  const chips = chipsWidth > 0 ? chipsWidth : READER_HEADER_CHIPS_ESTIMATE;
  return Math.max(
    READER_HEADER_TITLE_MIN_WIDTH,
    Math.floor(headerWidth - READER_HEADER_LEFT_ALLOWANCE - chips - READER_HEADER_TITLE_GAP),
  );
}

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
