/**
 * Sense-unit paragraph grouping for KJV chapters.
 * Sections/headings are left intact; long 1:1 section paragraphs are split.
 */
import type { ParagraphRange, Section, SourceVerse } from "./generate-kjv-headings";

export const PARAGRAPH_SOFT_MAX = 6;
export const PARAGRAPH_HARD_MAX = 8;

function sectionKey(book: string, chapter: number, startVerse: number, endVerse: number) {
  return `${book} ${chapter}:${startVerse}-${endVerse}`;
}

/** Editorial sense-units for the two audit passages named in the wiring task. */
export const EDITORIAL_PARAGRAPHS: Record<string, ParagraphRange[]> = {
  "Daniel 2:24-45": [
    { startVerse: 24, endVerse: 25 },
    { startVerse: 26, endVerse: 30 },
    { startVerse: 31, endVerse: 35 },
    { startVerse: 36, endVerse: 38 },
    { startVerse: 39, endVerse: 43 },
    { startVerse: 44, endVerse: 45 },
  ],
  "Matthew 6:1-18": [
    { startVerse: 1, endVerse: 1 },
    { startVerse: 2, endVerse: 4 },
    { startVerse: 5, endVerse: 8 },
    { startVerse: 9, endVerse: 13 },
    { startVerse: 14, endVerse: 15 },
    { startVerse: 16, endVerse: 18 },
  ],
};

function textOf(texts: Map<number, string>, verse: number): string {
  return (texts.get(verse) ?? "").trim();
}

/** A later verse that typically opens a new narrative or discourse unit. */
export function isStrongParagraphOpener(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    /^(Then |Therefore |Wherefore |Moreover |Nevertheless |Howbeit |After this manner |After this |After these things |And it came to pass|From that time |At that time |In that hour |And from thence |Now when |And when |But when |When thou |When ye |Moreover when )/i.test(t) ||
    /^(This is the dream|This is the interpretation|Hear ye now|Come now)/i.test(t) ||
    /^(And )?(Jesus |he |she |they |the [a-z]+ |[A-Z][\w'-]+ )?(answered( and said)?|saith|said|spake|cried|commanded)\b/i.test(t)
  );
}

export function isSoftParagraphOpener(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (isStrongParagraphOpener(t)) return false;
  return /^(But |For |Now |And after |And in the days |And as |And whereas )/i.test(t);
}

function shouldBreakAfter(
  paraStart: number,
  verse: number,
  endVerse: number,
  texts: Map<number, string>,
): boolean {
  const len = verse - paraStart + 1;
  const remaining = endVerse - verse;
  if (verse >= endVerse) return true;
  if (len >= PARAGRAPH_HARD_MAX) return true;
  const nextText = textOf(texts, verse + 1);
  const strong = isStrongParagraphOpener(nextText);
  const soft = isSoftParagraphOpener(nextText);
  if (remaining === 1 && len < PARAGRAPH_HARD_MAX) {
    return false;
  }
  if (len >= 2 && strong) return true;
  if (len >= 4 && soft) return true;
  if (len >= PARAGRAPH_SOFT_MAX && (strong || soft)) return true;
  return false;
}

export function splitVerseRange(
  startVerse: number,
  endVerse: number,
  texts: Map<number, string>,
): ParagraphRange[] {
  if (startVerse > endVerse) return [];
  if (endVerse - startVerse + 1 <= 1) return [{ startVerse, endVerse }];
  const paragraphs: ParagraphRange[] = [];
  let paraStart = startVerse;
  for (let verse = startVerse; verse <= endVerse; verse++) {
    if (!shouldBreakAfter(paraStart, verse, endVerse, texts)) continue;
    paragraphs.push({ startVerse: paraStart, endVerse: verse });
    paraStart = verse + 1;
  }
  if (paraStart <= endVerse) {
    paragraphs.push({ startVerse: paraStart, endVerse });
  }
  return paragraphs;
}

export function splitSectionParagraphs(
  book: string,
  chapter: number,
  section: Section,
  texts: Map<number, string>,
): ParagraphRange[] {
  const key = sectionKey(book, chapter, section.startVerse, section.endVerse);
  const editorial = EDITORIAL_PARAGRAPHS[key];
  const paragraphs = editorial
    ?? splitVerseRange(section.startVerse, section.endVerse, texts);
  return paragraphs.map((paragraph) => ({
    startVerse: paragraph.startVerse,
    endVerse: paragraph.endVerse,
  }));
}

export function verseTextMap(verses: SourceVerse[]): Map<number, string> {
  return new Map(verses.map((verse) => [Number(verse.verse), verse.text]));
}

export function regenerateSectionParagraphs(
  book: string,
  chapter: number,
  section: Section,
  verses: SourceVerse[],
): Section {
  const texts = verseTextMap(verses);
  return {
    ...section,
    paragraphs: splitSectionParagraphs(book, chapter, section, texts),
  };
}
