/**
 * Šarić (SARIC) uses Vulgate chapter numbers where they differ from the KJV.
 * Malachi has 3 chapters, Joel has 4, and Daniel includes the Greek chapters 13–14.
 * Psalm titles keep Šarić's own verse numbers; they are not in this table.
 *
 * The shifts below are the whole chapters (and the Joel 2 verses that became
 * Joel 3). A KJV reference that has no verse at that address is sent to the
 * Šarić verse. Šarić's own Joel 3 stays Joel 3, because those five verses exist.
 */

export const SARIC_ID = "SARIC";

export const SARIC_EDITION_NAME = "Sveta Biblija (Šarić) · includes Greek Esther";

export const SARIC_ESTHER_NOTE = "This edition's Esther is the Greek book.";

/** Inclusive chapter lists where Šarić does not follow the KJV book. */
export const SARIC_CHAPTER_LISTS: Record<string, readonly number[]> = {
  Joel: [1, 2, 3, 4],
  Daniel: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  Malachi: [1, 2, 3],
};

/** KJV chapter counts for the books Šarić numbers differently. */
const KJV_CHAPTER_COUNT: Record<string, number> = {
  Joel: 3,
  Daniel: 12,
  Malachi: 4,
};

/**
 * Last Šarić verse in a chapter whose ending differs from the KJV.
 * Chapters omitted here keep whatever verses the file contains.
 */
const VERSE_MAX: Record<string, Record<number, number>> = {
  Joel: { 2: 27, 3: 5, 4: 21 },
  Malachi: { 3: 24 },
};

interface ChapterShift {
  book: string;
  kjvChapter: number;
  kjvStart: number;
  kjvEnd: number;
  saricChapter: number;
  saricStart: number;
}

/**
 * KJV Malachi 4:1–6 is Šarić Malachi 3:19–24 (4:2 is 3:20).
 * KJV Joel 2:28–32 is Šarić Joel 3:1–5.
 * KJV Joel 3:1–21 is Šarić Joel 4:1–21.
 */
export const SARIC_CHAPTER_SHIFTS: readonly ChapterShift[] = [
  { book: "Malachi", kjvChapter: 4, kjvStart: 1, kjvEnd: 6, saricChapter: 3, saricStart: 19 },
  { book: "Joel", kjvChapter: 2, kjvStart: 28, kjvEnd: 32, saricChapter: 3, saricStart: 1 },
  { book: "Joel", kjvChapter: 3, kjvStart: 1, kjvEnd: 21, saricChapter: 4, saricStart: 1 },
];

export function isSaric(translation: string | null | undefined): boolean {
  return (translation ?? "").trim().toUpperCase() === SARIC_ID;
}

export function saricChapterList(bookName: string): readonly number[] | undefined {
  return SARIC_CHAPTER_LISTS[bookName];
}

export function saricChapterExists(bookName: string, chapter: number): boolean {
  const listed = SARIC_CHAPTER_LISTS[bookName];
  if (listed) return listed.includes(chapter);
  return chapter >= 1;
}

export function saricVerseExists(bookName: string, chapter: number, verse: number): boolean {
  if (!saricChapterExists(bookName, chapter) || verse < 1) return false;
  const max = VERSE_MAX[bookName]?.[chapter];
  return max == null || verse <= max;
}

function shiftSpan(shift: ChapterShift): number {
  return shift.kjvEnd - shift.kjvStart;
}

function shiftCoveringKjv(bookName: string, chapter: number, verse: number): ChapterShift | undefined {
  return SARIC_CHAPTER_SHIFTS.find(
    (shift) =>
      shift.book === bookName &&
      shift.kjvChapter === chapter &&
      verse >= shift.kjvStart &&
      verse <= shift.kjvEnd,
  );
}

function shiftCoveringSaric(bookName: string, chapter: number, verse: number): ChapterShift | undefined {
  return SARIC_CHAPTER_SHIFTS.find((shift) => {
    if (shift.book !== bookName || shift.saricChapter !== chapter) return false;
    const end = shift.saricStart + shiftSpan(shift);
    return verse >= shift.saricStart && verse <= end;
  });
}

export interface SaricVerse {
  chapter: number;
  verse: number;
}

/** Šarić address of a KJV verse. The same address when this table does not move it. */
export function kjvVerseInSaric(bookName: string, chapter: number, verse: number): SaricVerse {
  const shift = shiftCoveringKjv(bookName, chapter, verse);
  if (!shift) return { chapter, verse };
  return { chapter: shift.saricChapter, verse: shift.saricStart + (verse - shift.kjvStart) };
}

/** KJV address of a Šarić verse. The same address when this table does not move it. */
export function saricVerseInKjv(bookName: string, chapter: number, verse: number): SaricVerse {
  const shift = shiftCoveringSaric(bookName, chapter, verse);
  if (!shift) return { chapter, verse };
  return { chapter: shift.kjvChapter, verse: shift.kjvStart + (verse - shift.saricStart) };
}

/**
 * Where to send a reader who is in Šarić and asked for a KJV address that
 * has no verse there. Null when the address is already a Šarić verse,
 * including Šarić's own Joel 3.
 */
export function saricReadingTarget(
  bookName: string,
  chapter: number,
  verse: number | null,
): SaricVerse | null {
  const wholeChapter = verse == null || verse < 1;
  if (!wholeChapter && saricVerseExists(bookName, chapter, verse)) return null;
  if (wholeChapter && saricChapterExists(bookName, chapter)) return null;
  if (!wholeChapter) {
    const mapped = kjvVerseInSaric(bookName, chapter, verse);
    if (mapped.chapter === chapter && mapped.verse === verse) return null;
    if (!saricVerseExists(bookName, mapped.chapter, mapped.verse)) return null;
    return mapped;
  }
  const shift = SARIC_CHAPTER_SHIFTS.find((item) => item.book === bookName && item.kjvChapter === chapter);
  if (!shift) return null;
  return { chapter: shift.saricChapter, verse: shift.saricStart };
}

function kjvHasChapter(bookName: string, chapter: number): boolean {
  const max = KJV_CHAPTER_COUNT[bookName];
  if (max == null) return chapter >= 1;
  return chapter >= 1 && chapter <= max;
}

/** Šarić chapters that hold one KJV chapter. */
export function saricChaptersForKjvChapter(bookName: string, chapter: number): number[] {
  const shifts = SARIC_CHAPTER_SHIFTS.filter((shift) => shift.book === bookName && shift.kjvChapter === chapter);
  if (!shifts.length) return [chapter];
  const chapters = new Set(shifts.map((shift) => shift.saricChapter));
  const firstMoved = Math.min(...shifts.map((shift) => shift.kjvStart));
  if (firstMoved > 1 && saricChapterExists(bookName, chapter)) chapters.add(chapter);
  return [...chapters].sort((a, b) => a - b);
}

/** KJV chapters that hold one Šarić chapter. Empty when the KJV has no such chapter. */
export function kjvChaptersForSaricChapter(bookName: string, chapter: number): number[] {
  const shifts = SARIC_CHAPTER_SHIFTS.filter((shift) => shift.book === bookName && shift.saricChapter === chapter);
  const chapters = new Set(shifts.map((shift) => shift.kjvChapter));
  if (saricHasUnshiftedVerse(bookName, chapter) && kjvHasChapter(bookName, chapter)) chapters.add(chapter);
  return [...chapters].sort((a, b) => a - b);
}

function saricHasUnshiftedVerse(bookName: string, chapter: number): boolean {
  if (!saricChapterExists(bookName, chapter)) return false;
  const shifts = SARIC_CHAPTER_SHIFTS.filter((shift) => shift.book === bookName && shift.saricChapter === chapter);
  if (!shifts.length) return true;
  const max = VERSE_MAX[bookName]?.[chapter] ?? 0;
  for (let verse = 1; verse <= max; verse += 1) {
    const moved = shifts.some((shift) => {
      const end = shift.saricStart + shiftSpan(shift);
      return verse >= shift.saricStart && verse <= end;
    });
    if (!moved) return true;
  }
  return false;
}

/** Chapters to load for the comparison translation. */
export function compareCompanionChapters(
  bookName: string,
  chapter: number,
  readingTranslation: string,
  companionTranslation: string,
): number[] {
  const reading = isSaric(readingTranslation);
  const companion = isSaric(companionTranslation);
  if (reading === companion) return [chapter];
  if (companion) return saricChaptersForKjvChapter(bookName, chapter);
  return kjvChaptersForSaricChapter(bookName, chapter);
}

export interface CompareVerse {
  verse: number;
  sourceChapter: number;
  alignVerse?: number;
}

/**
 * Companion verses that belong beside the open chapter, tagged with the
 * reading translation's verse number so Compare can line them up.
 * Psalm verses are unchanged.
 */
export function projectCompareVerses<T extends CompareVerse>(input: {
  book: string;
  readingTranslation: string;
  companionTranslation: string;
  readingChapter: number;
  verses: readonly T[];
}): T[] {
  const reading = isSaric(input.readingTranslation);
  const companion = isSaric(input.companionTranslation);
  if (reading === companion) {
    return input.verses.map((verse) => ({ ...verse, alignVerse: verse.verse }));
  }
  const projected: T[] = [];
  for (const verse of input.verses) {
    const place = companion
      ? saricVerseInKjv(input.book, verse.sourceChapter, verse.verse)
      : kjvVerseInSaric(input.book, verse.sourceChapter, verse.verse);
    if (place.chapter !== input.readingChapter) continue;
    projected.push({ ...verse, alignVerse: place.verse });
  }
  projected.sort((a, b) => (a.alignVerse ?? a.verse) - (b.alignVerse ?? b.verse) || a.verse - b.verse);
  return projected;
}
