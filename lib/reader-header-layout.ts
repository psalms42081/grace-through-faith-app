import { bibleBookName } from "./scripture-reference";

/**
 * A long version code (e.g. SRP1865) ellipsizes instead of crowding the title. Four-letter codes
 * (NKJV, NASB) fit; the full code is in the chip's accessibility label and the picker.
 */
export const READER_VERSION_CHIP_MAX_WIDTH = 38;

/**
 * The header title is the book's short name with a chevron, in one fixed-width box. Nothing in
 * it flexes, so the native header subview's first measurement cannot cut it, and nothing can
 * overlap the chips. The width fits "2 Thess" (the widest short form, 56.8px at 16px Lora 600)
 * at the title's largest text size. tests/android-reader-header.test.ts measures these
 * against the shipped fonts on a 390px screen with the Android toolbar's 16dp side insets.
 */
export const READER_HEADER_TITLE_WIDTH = 82;
export const READER_HEADER_TITLE_FONT_SIZE = 16;
export const READER_HEADER_TITLE_FONT_CAP = 1.1;
export const READER_HEADER_CHEVRON_SIZE = 14;
export const READER_HEADER_CHEVRON_GAP = 3;
/** Text box inside the title: the fixed width less the chevron and its gap. */
export const READER_HEADER_TITLE_TEXT_WIDTH =
  READER_HEADER_TITLE_WIDTH - READER_HEADER_CHEVRON_SIZE - READER_HEADER_CHEVRON_GAP;
/** Back chevron icon size and padding. */
export const READER_HEADER_BACK_ICON = 22;
export const READER_HEADER_BACK_PADDING = 3;
/** Header chips (Word study, Compare, AA, version) keep their size so they fit beside the title. */
export const READER_HEADER_CHIP_FONT_CAP = 1;
export const READER_HEADER_CHIP_GAP = 4;
export const READER_HEADER_TOGGLE_PADDING = 6;
export const READER_HEADER_AA_PADDING = 3;
export const READER_HEADER_PILL_PADDING = 8;
/** Android Toolbar contentInsetStart/End defaults (16dp each side). */
export const ANDROID_TOOLBAR_SIDE_INSETS = 32;

/** Standard short forms, by book id. */
export const BIBLE_BOOK_SHORT_NAMES: Readonly<Record<number, string>> = {
  1: "Gen", 2: "Ex", 3: "Lev", 4: "Num", 5: "Deut", 6: "Josh", 7: "Judg", 8: "Ruth",
  9: "1 Sam", 10: "2 Sam", 11: "1 Kgs", 12: "2 Kgs", 13: "1 Chr", 14: "2 Chr", 15: "Ezra",
  16: "Neh", 17: "Esth", 18: "Job", 19: "Ps", 20: "Prov", 21: "Eccl", 22: "Song", 23: "Isa",
  24: "Jer", 25: "Lam", 26: "Ezek", 27: "Dan", 28: "Hos", 29: "Joel", 30: "Amos", 31: "Obad",
  32: "Jonah", 33: "Mic", 34: "Nah", 35: "Hab", 36: "Zeph", 37: "Hag", 38: "Zech", 39: "Mal",
  40: "Matt", 41: "Mark", 42: "Luke", 43: "John", 44: "Acts", 45: "Rom", 46: "1 Cor", 47: "2 Cor",
  48: "Gal", 49: "Eph", 50: "Phil", 51: "Col", 52: "1 Thess", 53: "2 Thess", 54: "1 Tim",
  55: "2 Tim", 56: "Titus", 57: "Phlm", 58: "Heb", 59: "Jas", 60: "1 Pet", 61: "2 Pet",
  62: "1 John", 63: "2 John", 64: "3 John", 65: "Jude", 66: "Rev",
};

export function bibleBookShortName(bookId: string | number | null | undefined): string {
  const id = typeof bookId === "number" ? bookId : Number(String(bookId ?? "").trim());
  return (Number.isInteger(id) && BIBLE_BOOK_SHORT_NAMES[id]) || "";
}

type RouteParams = Record<string, unknown> | object | undefined | null;

function firstParam(params: RouteParams, key: string): string {
  const value = (params as Record<string, unknown> | null | undefined)?.[key];
  const single = Array.isArray(value) ? value[0] : value;
  return single === undefined || single === null ? "" : String(single).trim();
}

/** "Luke" — the header title, from the route params alone, so it is present on the first frame. */
export function readerHeaderTitle(params: RouteParams): string {
  return bibleBookShortName(firstParam(params, "bookId"));
}

/** "Luke chapter 2, change book or chapter" — the full name for screen readers. */
export function readerHeaderAccessibilityLabel(params: RouteParams): string {
  const name = bibleBookName(firstParam(params, "bookId"));
  const chapter = firstParam(params, "chapter");
  const where = [name, chapter ? `chapter ${chapter}` : ""].filter(Boolean).join(" ");
  return where ? `${where}, change book or chapter` : "Change book or chapter";
}

/** "Matthew 5" — the full label for places that have room for it. */
export function readerHeaderLabel(params: RouteParams): string {
  const bookName = bibleBookName(firstParam(params, "bookId"));
  const chapter = firstParam(params, "chapter");
  return `${bookName} ${chapter}`.trim();
}

/** Chapter list title from the route params, with a neutral fallback for an unknown id. */
export function chapterListTitle(params: RouteParams): string {
  return bibleBookName(firstParam(params, "bookId")) || "Chapters";
}
