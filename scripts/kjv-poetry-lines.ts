/**
 * One-time KJV poetry lineation from public-domain punctuation.
 * Comparable in shape to API.Bible q / q2 lines; not a copy of NIV breaks.
 *
 * Unwired — not imported by the server or reader.
 */
export const POETRY_SCHEMA_VERSION = "kjv-poetry-lines-v1";

/** Wisdom/poetry books plus the prophets (poetic sections appear as 2+ lines). */
export const POETRY_SOURCE_BOOKS = [
  "Job", "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Lamentations",
  "Isaiah", "Jeremiah", "Ezekiel", "Daniel",
  "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk",
  "Zephaniah", "Haggai", "Zechariah", "Malachi",
] as const;

export type PoetrySourceBook = (typeof POETRY_SOURCE_BOOKS)[number];

export interface PoetryLine {
  text: string;
  /** 0 ≈ API.Bible q; 1 ≈ q2 (indented continuation / second stich). */
  indent: 0 | 1;
}

export interface PoetryVerse {
  verse: number;
  lines: PoetryLine[];
}

export interface PoetryChapter {
  book: string;
  chapter: number;
  verses: PoetryVerse[];
}

export interface PoetryCorpus {
  schemaVersion: string;
  note: string;
  method: string;
  chapters: PoetryChapter[];
}

const SELAH_SPLIT = /(\s*Selah\.?\s*)/i;
const CLAUSE_SPLIT = /(?<=[;:!?])\s+(?=\S)/;

export function isPoetrySourceBook(book: string): boolean {
  return (POETRY_SOURCE_BOOKS as readonly string[]).includes(book);
}

function isSelahToken(part: string): boolean {
  return part.replace(/[\s.]/g, "").toLowerCase() === "selah";
}

function splitClauses(text: string): string[] {
  return text
    .split(CLAUSE_SPLIT)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function splitKjvPoetryLines(text: string): PoetryLine[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const rawParts = trimmed.split(SELAH_SPLIT).map((part) => part.trim()).filter(Boolean);
  const clauseLines: string[] = [];
  for (const part of rawParts) {
    if (isSelahToken(part)) {
      clauseLines.push("Selah.");
      continue;
    }
    clauseLines.push(...splitClauses(part));
  }
  const cleaned = clauseLines.map((line) => line.trim()).filter(Boolean);
  const source = cleaned.length ? cleaned : [trimmed];
  let couplet = 0;
  return source.map((line) => {
    if (/^selah\.?$/i.test(line)) {
      couplet = 0;
      return { text: "Selah.", indent: 0 as const };
    }
    const indent = (couplet % 2 === 0 ? 0 : 1) as 0 | 1;
    couplet += 1;
    return { text: line, indent };
  });
}

export function poetryChapterFromSource(
  book: string,
  chapter: string | number,
  verses: { verse: string | number; text: string }[],
): PoetryChapter {
  return {
    book,
    chapter: Number(chapter),
    verses: verses.map((verse) => ({
      verse: Number(verse.verse),
      lines: splitKjvPoetryLines(verse.text),
    })),
  };
}
