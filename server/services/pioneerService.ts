import { asc, eq, sql } from "drizzle-orm";
import { db } from "../db";
import {
  getPioneerAuthorMeta,
  publicDomainLine,
} from "../../shared/pioneer-authors";
import type {
  PioneerChapterPayload,
  PioneerChapterSummary,
  PioneerReadingListItem,
  PioneerReadingPayload,
  PioneerShelfAuthor,
} from "../../shared/pioneer-api";
import {
  selectPioneerWeekReading,
  slicePioneerParagraphs,
} from "../../shared/pioneer-passage";
import { getSabbathDateKey } from "../../shared/calendar-date";
import { pioneerChapters, pioneerReadings } from "../../shared/schema";

export const PIONEER_WEEK_TIME_ZONE = "Australia/Melbourne";
export {
  PIONEER_EXAMPLE_READING_ID,
  PIONEER_EXAMPLE_WORD_BUDGET,
  paragraphEndForWordBudget,
  selectPioneerWeekReading,
  slicePioneerParagraphs,
} from "../../shared/pioneer-passage";

type ChapterRow = typeof pioneerChapters.$inferSelect;
type ReadingRow = typeof pioneerReadings.$inferSelect;

function asParagraphs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function chapterSummary(row: ChapterRow): PioneerChapterSummary {
  const meta = getPioneerAuthorMeta(row.authorSlug, row.author);
  return {
    id: row.id,
    author: row.author,
    authorSlug: row.authorSlug,
    authorDates: meta.dates,
    book: row.book,
    bookSlug: row.bookSlug,
    year: row.year,
    chapterNumber: row.chapterNumber,
    chapterTitle: row.chapterTitle,
    sourceUrl: row.sourceUrl,
    publicDomain: publicDomainLine(row.author, row.book, row.year),
  };
}

function readingPayload(
  reading: ReadingRow,
  chapter: ChapterRow,
): PioneerReadingPayload {
  const paragraphs = slicePioneerParagraphs(
    asParagraphs(chapter.paragraphs),
    reading.paragraphStart,
    reading.paragraphEnd,
  );
  const summary = chapterSummary(chapter);
  return {
    id: reading.id,
    weekStart: reading.weekStart,
    editorNote: reading.editorNote,
    paragraphStart: reading.paragraphStart,
    paragraphEnd: reading.paragraphEnd,
    published: reading.published,
    sortOrder: reading.sortOrder,
    paragraphs,
    chapter: summary,
    publicDomain: summary.publicDomain,
  };
}

function readingListItem(
  reading: ReadingRow,
  chapter: ChapterRow,
): PioneerReadingListItem {
  const { paragraphs: _paragraphs, ...rest } = readingPayload(reading, chapter);
  return rest;
}

function isMissingRelation(error: unknown): boolean {
  const code = (error as { code?: string }).code;
  const message = error instanceof Error ? error.message : String(error);
  return (
    code === "42P01" ||
    /relation .*pioneer_(chapters|readings).* does not exist/i.test(message)
  );
}

export function pioneerSabbathDate(instant = new Date()): string {
  return getSabbathDateKey(instant, PIONEER_WEEK_TIME_ZONE);
}

export async function getPioneerWeekReading(
  instant = new Date(),
): Promise<{ reading: PioneerReadingPayload | null; sabbathDate: string }> {
  const sabbathDate = pioneerSabbathDate(instant);
  try {
    const rows = await db
      .select({
        reading: pioneerReadings,
        chapter: pioneerChapters,
      })
      .from(pioneerReadings)
      .innerJoin(pioneerChapters, eq(pioneerReadings.chapterId, pioneerChapters.id))
      .where(eq(pioneerReadings.published, true));
    const selected = selectPioneerWeekReading(
      rows.map((row) => ({
        id: row.reading.id,
        weekStart: row.reading.weekStart,
        sortOrder: row.reading.sortOrder,
        reading: row.reading,
        chapter: row.chapter,
      })),
      sabbathDate,
    );
    return {
      sabbathDate,
      reading: selected
        ? readingPayload(selected.reading, selected.chapter)
        : null,
    };
  } catch (error) {
    if (isMissingRelation(error)) {
      return { sabbathDate, reading: null };
    }
    throw error;
  }
}

export async function getPublishedPioneerReadings(): Promise<
  PioneerReadingListItem[]
> {
  try {
    const rows = await db
      .select({
        reading: pioneerReadings,
        chapter: pioneerChapters,
      })
      .from(pioneerReadings)
      .innerJoin(pioneerChapters, eq(pioneerReadings.chapterId, pioneerChapters.id))
      .where(eq(pioneerReadings.published, true))
      .orderBy(
        sql`${pioneerReadings.weekStart} DESC NULLS LAST`,
        asc(pioneerReadings.sortOrder),
        asc(pioneerReadings.id),
      );
    return rows.map((row) => readingListItem(row.reading, row.chapter));
  } catch (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
}

export async function getPioneerReadingById(
  id: string,
): Promise<PioneerReadingPayload | null> {
  try {
    const [row] = await db
      .select({
        reading: pioneerReadings,
        chapter: pioneerChapters,
      })
      .from(pioneerReadings)
      .innerJoin(pioneerChapters, eq(pioneerReadings.chapterId, pioneerChapters.id))
      .where(eq(pioneerReadings.id, id))
      .limit(1);
    if (!row) return null;
    return readingPayload(row.reading, row.chapter);
  } catch (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
}

export async function getPioneerChapterById(
  id: string,
): Promise<PioneerChapterPayload | null> {
  try {
    const [row] = await db
      .select()
      .from(pioneerChapters)
      .where(eq(pioneerChapters.id, id))
      .limit(1);
    if (!row) return null;
    const summary = chapterSummary(row);
    return {
      ...summary,
      paragraphs: asParagraphs(row.paragraphs),
    };
  } catch (error) {
    if (isMissingRelation(error)) return null;
    throw error;
  }
}

export async function getPioneerShelf(): Promise<PioneerShelfAuthor[]> {
  try {
    const rows = await db
      .select({
        id: pioneerChapters.id,
        author: pioneerChapters.author,
        authorSlug: pioneerChapters.authorSlug,
        book: pioneerChapters.book,
        bookSlug: pioneerChapters.bookSlug,
        year: pioneerChapters.year,
        chapterNumber: pioneerChapters.chapterNumber,
        chapterTitle: pioneerChapters.chapterTitle,
        sourceUrl: pioneerChapters.sourceUrl,
      })
      .from(pioneerChapters)
      .orderBy(
        asc(pioneerChapters.author),
        asc(pioneerChapters.year),
        asc(pioneerChapters.book),
        asc(pioneerChapters.chapterNumber),
      );

    const authors = new Map<string, PioneerShelfAuthor>();
    for (const row of rows) {
      const meta = getPioneerAuthorMeta(row.authorSlug, row.author);
      let author = authors.get(row.authorSlug);
      if (!author) {
        author = {
          slug: row.authorSlug,
          name: row.author,
          dates: meta.dates,
          books: [],
        };
        authors.set(row.authorSlug, author);
      }
      let book = author.books.find((item) => item.slug === row.bookSlug);
      if (!book) {
        book = {
          slug: row.bookSlug,
          title: row.book,
          year: row.year,
          chapterCount: 0,
          sourceUrl: row.sourceUrl,
          publicDomain: publicDomainLine(row.author, row.book, row.year),
          chapters: [],
        };
        author.books.push(book);
      }
      book.chapters.push({
        id: row.id,
        number: row.chapterNumber,
        title: row.chapterTitle,
      });
      book.chapterCount = book.chapters.length;
    }
    return [...authors.values()];
  } catch (error) {
    if (isMissingRelation(error)) return [];
    throw error;
  }
}
