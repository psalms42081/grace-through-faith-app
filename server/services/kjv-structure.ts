/**
 * Local KJV presentation metadata (headings, paragraphs, poetry lines).
 * Verse identity and order come from the database; this layer only attaches
 * providerContent and optional line-breaks on poetic books.
 */
import * as fs from "fs";
import * as path from "path";
import { isKjvReaderPoetryBook } from "../../scripts/kjv-poetry-lines";

/** Must stay aligned with client QUERY_PERSIST_BUSTER and API.Bible structure tokens. */
export const KJV_STRUCTURE_VERSION = "structure-v5";

export interface KjvProviderHeading {
  text: string;
  beforeVerse?: number;
}

export interface KjvProviderParagraph {
  verseStart: number;
  verseEnd: number;
}

export interface KjvProviderChapterStructure {
  headings: KjvProviderHeading[];
  paragraphs: KjvProviderParagraph[];
}

interface HeadingSection {
  heading: string;
  startVerse: number;
  endVerse: number;
  paragraphs: { startVerse: number; endVerse: number }[];
}

interface HeadingChapter {
  book: string;
  chapter: number;
  sections: HeadingSection[];
}

interface PoetryVerse {
  verse: number;
  lines: { text: string; indent: 0 | 1 }[];
}

interface PoetryChapter {
  book: string;
  chapter: number;
  verses: PoetryVerse[];
}

const ROOT = process.cwd();
const HEADINGS_PATH = path.join(ROOT, "data", "kjv-headings.generated.json");
const POETRY_PATH = path.join(ROOT, "data", "kjv-poetry-lines.generated.json");

let headingIndex: Map<string, HeadingChapter> | null = null;
let poetryIndex: Map<string, PoetryChapter> | null = null;

function chapterKey(book: string, chapter: number) {
  return `${book}\u0000${chapter}`;
}

function loadHeadingIndex(): Map<string, HeadingChapter> {
  if (headingIndex) return headingIndex;
  const corpus = JSON.parse(fs.readFileSync(HEADINGS_PATH, "utf8")) as { chapters: HeadingChapter[] };
  headingIndex = new Map(corpus.chapters.map((entry) => [chapterKey(entry.book, entry.chapter), entry]));
  return headingIndex;
}

function loadPoetryIndex(): Map<string, PoetryChapter> {
  if (poetryIndex) return poetryIndex;
  const corpus = JSON.parse(fs.readFileSync(POETRY_PATH, "utf8")) as { chapters: PoetryChapter[] };
  poetryIndex = new Map(
    corpus.chapters
      .filter((entry) => isKjvReaderPoetryBook(entry.book))
      .map((entry) => [chapterKey(entry.book, entry.chapter), entry]),
  );
  return poetryIndex;
}

export function chapterToProviderContent(chapter: HeadingChapter): KjvProviderChapterStructure {
  const headings: KjvProviderHeading[] = chapter.sections.map((section) => ({
    text: section.heading,
    beforeVerse: section.startVerse,
  }));
  const paragraphs: KjvProviderParagraph[] = chapter.sections.flatMap((section) =>
    section.paragraphs.map((paragraph) => ({
      verseStart: paragraph.startVerse,
      verseEnd: paragraph.endVerse,
    })),
  );
  return { headings, paragraphs };
}

export function getKjvProviderContent(bookName: string, chapter: number): KjvProviderChapterStructure | undefined {
  const entry = loadHeadingIndex().get(chapterKey(bookName, chapter));
  if (!entry) return undefined;
  return chapterToProviderContent(entry);
}

/** Join stored poetry lines with newlines. Prophets are never in the reader index. */
export function applyKjvPoetryLines<T extends { verse: number; text: string }>(
  bookName: string,
  chapter: number,
  verses: T[],
): T[] {
  if (!isKjvReaderPoetryBook(bookName) || !verses.length) return verses;
  const poetry = loadPoetryIndex().get(chapterKey(bookName, chapter));
  if (!poetry) return verses;
  const linesByVerse = new Map(poetry.verses.map((verse) => [verse.verse, verse.lines]));
  return verses.map((verse) => {
    const lines = linesByVerse.get(verse.verse);
    if (!lines?.length) return verse;
    return { ...verse, text: lines.map((line) => line.text).join("\n") };
  });
}

export function withKjvProviderContent<T extends { verse: number; text: string }>(
  bookName: string,
  chapter: number,
  verses: T[],
): { verses: T[]; providerContent: KjvProviderChapterStructure } {
  const providerContent = getKjvProviderContent(bookName, chapter) ?? { headings: [], paragraphs: [] };
  return {
    verses: applyKjvPoetryLines(bookName, chapter, verses),
    providerContent,
  };
}
