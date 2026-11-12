import { lessonHtmlToText, collectMarkedScriptureRefs } from "@/lib/sabbath-lesson-structure";
import { extractMemoryText } from "@/lib/sabbath-school-memory-text";
import {
  bibleBookName,
  parseScriptureReferenceList,
  type ScriptureCitation,
} from "@/lib/scripture-reference";
import { getTranslationForLanguage } from "@/lib/bibleTranslationMap";

export const SCRIPTURE_QUESTION_COUNT = 30;

export interface LessonDaySource {
  dayNumber: number;
  content: string | null | undefined;
}

/** A passage chosen from the lesson. Verse words are never taken from the lesson. */
export interface ScriptureChoice {
  bookId: number;
  chapter: number;
  /** Verses whose words are shown on the card. */
  displayVerses: number[];
  /** Verses the reader opens. Empty means the whole chapter. */
  linkVerses: number[];
  /** Full reference, including a range the card only quotes in part. */
  reference: string;
  fromLesson: true;
}

export function scriptureQuestionIndex(dayOfYear: number): number {
  const index = Math.max(1, Math.floor(dayOfYear)) - 1;
  return index % SCRIPTURE_QUESTION_COUNT;
}

export function verseTranslationOrder(chosen: string, language: string): string[] {
  const preferred = chosen.trim();
  const languageDefault = getTranslationForLanguage(language || "en");
  return [...new Set([preferred, languageDefault, "KJV"].filter((code) => code.length > 0))];
}

export function joinVerseWords(
  rows: readonly { verse: number; text: string }[],
  wanted: readonly number[],
): string | null {
  if (wanted.length === 0) return null;
  const parts: string[] = [];
  for (const verse of wanted) {
    const row = rows.find((item) => item.verse === verse);
    const text = row?.text?.replace(/\s+/g, " ").trim() ?? "";
    if (!text) return null;
    parts.push(text);
  }
  return parts.join(" ");
}

/**
 * Picks today's passage from a Sabbath School lesson.
 * Sabbath uses the Adult Memory Text, or InVerse "Read This Week's Passage".
 * Other days use the first "Read …" line, skipping "Read for This Week's Study".
 * With no Read line, the first single range of 1–4 verses is used.
 * A day with no usable reference keeps the week's Memory Text or passage.
 * Returns null when the week itself has no usable reference.
 */
export function selectLessonScripture(input: {
  days: readonly LessonDaySource[];
  todayDayNumber: number;
  track: string;
}): ScriptureChoice | null {
  if (input.days.length === 0) return null;
  const sabbath = dayContent(input.days, 1);
  const today = dayContent(input.days, input.todayDayNumber);
  const anchor = weekAnchor(sabbath, input.track);

  if (input.todayDayNumber === 1) {
    if (anchor) return presentCitation(anchor);
    return dailyPassage(today);
  }

  return dailyPassage(today) ?? (anchor ? presentCitation(anchor) : null);
}

function dailyPassage(content: string): ScriptureChoice | null {
  const read = firstReadAssignment(content);
  if (read) return presentCitation(read);
  const short = firstShortRange(content);
  return short ? presentCitation(short) : null;
}

function dayContent(days: readonly LessonDaySource[], dayNumber: number): string {
  return days.find((day) => day.dayNumber === dayNumber)?.content?.trim() ?? "";
}

function weekAnchor(content: string, track: string): ScriptureCitation | null {
  const passage = weekPassage(content);
  const memory = memoryReference(content);
  if (track === "inverse") return passage ?? memory;
  return memory ?? passage;
}

const TRANSLATION_TAIL =
  /,\s*(?:NASB|NIV|NKJV|KJV|ESV|NLT|RSV|NRSV|CSB|AMP|MSG)\b[\s\S]*$/i;

function memoryReference(content: string): ScriptureCitation | null {
  const reference = extractMemoryText(content).memoryText?.reference;
  if (!reference) return null;
  const cleaned = reference.replace(TRANSLATION_TAIL, "").trim();
  return parseScriptureReferenceList(cleaned)[0] ?? null;
}

function weekPassage(content: string): ScriptureCitation | null {
  const flat = lessonHtmlToText(content);
  const match = flat.match(/read this week['’]s passage\s*:\s*([^\n.]+)/i);
  if (!match?.[1]) return null;
  return parseScriptureReferenceList(match[1])[0] ?? null;
}

function blocks(content: string): string[] {
  const marked = content
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:p|div|li|h[1-6]|blockquote)>/gi, "\n");
  return lessonHtmlToText(marked)
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function firstReadAssignment(content: string): ScriptureCitation | null {
  for (const block of blocks(content)) {
    if (!/^read\b/i.test(block)) continue;
    if (/^read for this week/i.test(block)) continue;
    if (/^read this week/i.test(block)) continue;
    const hit = parseScriptureReferenceList(block)[0];
    if (hit) return hit;
  }
  return null;
}

function withoutStudyList(content: string): string {
  return content.replace(
    /<(p|li|h[1-6]|blockquote)\b[^>]*>\s*Read for this week[\s\S]*?<\/\1>/gi,
    "",
  );
}

function firstShortRange(content: string): ScriptureCitation | null {
  for (const ref of collectMarkedScriptureRefs(withoutStudyList(content))) {
    const verses = listedVerses(ref.verseStart, ref.verseEnd, ref.verses);
    if (!isShortSingleRange(verses)) continue;
    return {
      bookId: ref.bookId,
      chapter: ref.chapter,
      verse: verses[0],
      verseEnd: verses.length > 1 ? verses[verses.length - 1] : undefined,
      start: 0,
      end: 0,
      text: ref.text,
    };
  }
  return null;
}

function listedVerses(
  verseStart: number | null | undefined,
  verseEnd: number | null | undefined,
  verses: number[] | null | undefined,
): number[] {
  if (verses && verses.length > 0) return verses;
  if (verseStart == null) return [];
  const end = verseEnd ?? verseStart;
  const list: number[] = [];
  for (let verse = verseStart; verse <= end; verse += 1) list.push(verse);
  return list;
}

function citationVerses(hit: ScriptureCitation): number[] {
  return listedVerses(hit.verse, hit.verseEnd, hit.verses);
}

function isContiguous(verses: readonly number[]): boolean {
  return verses.every((verse, index) => index === 0 || verse === verses[index - 1] + 1);
}

function isShortSingleRange(verses: readonly number[]): boolean {
  return verses.length >= 1 && verses.length <= 4 && isContiguous(verses);
}

function presentCitation(hit: ScriptureCitation): ScriptureChoice {
  const all = citationVerses(hit);
  const displayVerses = all.length === 0 ? [1, 2, 3] : all.length > 4 ? all.slice(0, 3) : all;
  return {
    bookId: hit.bookId,
    chapter: hit.chapter,
    displayVerses,
    linkVerses: all,
    reference: formatReference(hit.bookId, hit.chapter, all),
    fromLesson: true,
  };
}

function formatReference(bookId: number, chapter: number, verses: readonly number[]): string {
  const name = bibleBookName(bookId) || "Scripture";
  if (verses.length === 0) return `${name} ${chapter}`;
  if (verses.length === 1) return `${name} ${chapter}:${verses[0]}`;
  if (isContiguous(verses)) {
    return `${name} ${chapter}:${verses[0]}–${verses[verses.length - 1]}`;
  }
  return `${name} ${chapter}:${verses.join(", ")}`;
}
