import { bibleBookName } from "./scripture-reference";

/** A long version code (e.g. SRP1865) ellipsizes instead of crowding the title. */
export const READER_VERSION_CHIP_MAX_WIDTH = 72;

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
