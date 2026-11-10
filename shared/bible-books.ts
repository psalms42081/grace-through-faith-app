/** Protestant canon in reading order. USFM codes match API.Bible and YouVersion. */
export const API_BIBLE_BOOK_MAP: Record<string, string> = {
  "Genesis": "GEN", "Exodus": "EXO", "Leviticus": "LEV", "Numbers": "NUM",
  "Deuteronomy": "DEU", "Joshua": "JOS", "Judges": "JDG", "Ruth": "RUT",
  "1 Samuel": "1SA", "2 Samuel": "2SA", "1 Kings": "1KI", "2 Kings": "2KI",
  "1 Chronicles": "1CH", "2 Chronicles": "2CH", "Ezra": "EZR", "Nehemiah": "NEH",
  "Esther": "EST", "Job": "JOB", "Psalms": "PSA", "Proverbs": "PRO",
  "Ecclesiastes": "ECC", "Song of Solomon": "SNG", "Isaiah": "ISA", "Jeremiah": "JER",
  "Lamentations": "LAM", "Ezekiel": "EZK", "Daniel": "DAN", "Hosea": "HOS",
  "Joel": "JOL", "Amos": "AMO", "Obadiah": "OBA", "Jonah": "JON",
  "Micah": "MIC", "Nahum": "NAM", "Habakkuk": "HAB", "Zephaniah": "ZEP",
  "Haggai": "HAG", "Zechariah": "ZEC", "Malachi": "MAL",
  "Matthew": "MAT", "Mark": "MRK", "Luke": "LUK", "John": "JHN",
  "Acts": "ACT", "Romans": "ROM", "1 Corinthians": "1CO", "2 Corinthians": "2CO",
  "Galatians": "GAL", "Ephesians": "EPH", "Philippians": "PHP", "Colossians": "COL",
  "1 Thessalonians": "1TH", "2 Thessalonians": "2TH", "1 Timothy": "1TI",
  "2 Timothy": "2TI", "Titus": "TIT", "Philemon": "PHM", "Hebrews": "HEB",
  "James": "JAS", "1 Peter": "1PE", "2 Peter": "2PE", "1 John": "1JN",
  "2 John": "2JN", "3 John": "3JN", "Jude": "JUD", "Revelation": "REV",
};

/** Reverse map: USFM code (e.g. "GEN") → canonical book name. */
export const API_BIBLE_CODE_TO_BOOK: Record<string, string> = Object.fromEntries(
  Object.entries(API_BIBLE_BOOK_MAP).map(([name, code]) => [code, name]),
);

export const OT_USFM: readonly string[] = Object.values(API_BIBLE_BOOK_MAP).slice(0, 39);
export const NT_USFM: readonly string[] = Object.values(API_BIBLE_BOOK_MAP).slice(39);

const CANON_NAMES = Object.keys(API_BIBLE_BOOK_MAP);

/** Book id used by `/api/books` and the reader routes. Canon order, starting at 1. */
export function bibleBookId(name: string): number | null {
  const index = CANON_NAMES.indexOf(name);
  return index < 0 ? null : index + 1;
}
