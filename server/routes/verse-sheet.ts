import { Router } from "express";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "../db";
import {
  bibleBooks,
  commentaryEntries,
  commentators,
  contextCards,
  egwChapters,
  pioneerChapters,
  sabbathSchoolDays,
} from "../../shared/schema";
import { hasBookOverviewContent } from "../../lib/book-overview";
import { fetchWithTimeout } from "../services/api-client";
import { getErrorStatusCode } from "../services/ai-semaphore";
import { loadCurrentSabbathSchoolLesson } from "../services/sabbath-school-current";
import { scriptureCiteNeedles, textCitesNeedles } from "../../lib/scripture-cite";

const router = Router();

const BOOK_ID_TO_API: Record<number, string> = {
  1: "GEN", 2: "EXO", 3: "LEV", 4: "NUM", 5: "DEU", 6: "JOS", 7: "JDG", 8: "RUT",
  9: "1SA", 10: "2SA", 11: "1KI", 12: "2KI", 13: "1CH", 14: "2CH", 15: "EZR", 16: "NEH",
  17: "EST", 18: "JOB", 19: "PSA", 20: "PRO", 21: "ECC", 22: "SNG", 23: "ISA", 24: "JER",
  25: "LAM", 26: "EZK", 27: "DAN", 28: "HOS", 29: "JOL", 30: "AMO", 31: "OBA", 32: "JON",
  33: "MIC", 34: "NAM", 35: "HAB", 36: "ZEP", 37: "HAG", 38: "ZEC", 39: "MAL",
  40: "MAT", 41: "MRK", 42: "LUK", 43: "JHN", 44: "ACT", 45: "ROM", 46: "1CO", 47: "2CO",
  48: "GAL", 49: "EPH", 50: "PHP", 51: "COL", 52: "1TH", 53: "2TH", 54: "1TI", 55: "2TI",
  56: "TIT", 57: "PHM", 58: "HEB", 59: "JAS", 60: "1PE", 61: "2PE", 62: "1JN", 63: "2JN",
  64: "3JN", 65: "JUD", 66: "REV",
};

const COMMENTARY_SOURCES = [
  { apiId: "matthew-henry", dbId: "matthew-henry", name: "Matthew Henry" },
  { apiId: "jamieson-fausset-brown", dbId: "jfb", name: "Jamieson, Fausset & Brown" },
  { apiId: "adam-clarke", dbId: "adam-clarke", name: "Adam Clarke" },
  { apiId: "john-gill", dbId: "john-gill", name: "John Gill" },
] as const;

async function commentaryForVerse(
  bookId: number,
  chapter: number,
  verse: number,
): Promise<{ id: string; name: string; content: string }[]> {
  const bookCode = BOOK_ID_TO_API[bookId];
  const fetched = await Promise.all(
    COMMENTARY_SOURCES.map(async (src) => {
      let content = "";
      if (bookCode) {
        try {
          const resp = await fetchWithTimeout(
            `https://bible.helloao.org/api/c/${src.apiId}/${bookCode}/${chapter}.json`,
            { service: "external", serviceLabel: "bible-commentary" },
          );
          if (resp.ok) {
            const data = (await resp.json()) as {
              chapter?: { content?: { number?: number; content?: unknown }[] };
            };
            const items = data?.chapter?.content;
            const match = Array.isArray(items)
              ? items.find((item) => Number(item.number) === verse)
              : null;
            const raw = match?.content;
            content = Array.isArray(raw)
              ? raw.filter((part): part is string => typeof part === "string").join("\n")
              : typeof raw === "string"
                ? raw
                : "";
          }
        } catch {
          content = "";
        }
      }
      if (!content.trim()) {
        const rows = await db
          .select({ entry: commentaryEntries, commentator: commentators })
          .from(commentaryEntries)
          .leftJoin(commentators, eq(commentaryEntries.commentatorId, commentators.id))
          .where(
            and(
              eq(commentaryEntries.commentatorId, src.dbId),
              eq(commentaryEntries.bookId, bookId),
              eq(commentaryEntries.chapter, chapter),
            ),
          )
          .limit(1);
        const row = rows[0];
        const start = row?.entry?.verseStart;
        const end = row?.entry?.verseEnd ?? start;
        if (
          row?.entry?.content &&
          (start == null || (verse >= (start ?? verse) && verse <= (end ?? verse)))
        ) {
          content = row.entry.content;
        }
      }
      const trimmed = content.trim();
      return trimmed ? { id: src.dbId, name: src.name, content: trimmed } : null;
    }),
  );

  return fetched.filter((row): row is { id: string; name: string; content: string } => row != null);
}

function ilikeAny(column: ReturnType<typeof sql>, needles: string[]) {
  return or(
    ...needles.map((needle) => sql`${column} ILIKE ${"%" + needle + "%"}`),
  );
}

router.get("/api/verse-sheet", async (req, res) => {
  try {
    const bookId = Number(req.query.bookId);
    const chapter = Number(req.query.chapter);
    const verse = Number(req.query.verse);
    if (!bookId || !chapter || !verse) {
      return res.status(400).json({ error: "bookId, chapter, and verse are required" });
    }

    const [book] = await db.select().from(bibleBooks).where(eq(bibleBooks.id, bookId)).limit(1);
    const bookName = (typeof req.query.bookName === "string" && req.query.bookName.trim())
      ? req.query.bookName.trim()
      : book?.name ?? "";
    const needles = scriptureCiteNeedles({
      bookName,
      abbreviation: book?.abbreviation,
      chapter,
      verse,
    });

    const paragraphsCol = sql`(${egwChapters.paragraphs})::text`;
    const pioneerCol = sql`(${pioneerChapters.paragraphs})::text`;

    const [commentatorsForVerse, egwRows, pioneerRows, ssCurrent, overviewRows] = await Promise.all([
      commentaryForVerse(bookId, chapter, verse),
      needles.length
        ? db
            .select({
              id: egwChapters.id,
              book: egwChapters.book,
              chapterNumber: egwChapters.chapterNumber,
              chapterTitle: egwChapters.chapterTitle,
            })
            .from(egwChapters)
            .where(ilikeAny(paragraphsCol, needles))
            .limit(5)
        : Promise.resolve([]),
      needles.length
        ? db
            .select({
              id: pioneerChapters.id,
              author: pioneerChapters.author,
              book: pioneerChapters.book,
              chapterNumber: pioneerChapters.chapterNumber,
              chapterTitle: pioneerChapters.chapterTitle,
            })
            .from(pioneerChapters)
            .where(ilikeAny(pioneerCol, needles))
            .limit(5)
        : Promise.resolve([]),
      loadCurrentSabbathSchoolLesson("adult").catch(() => null),
      db
        .select({ chapter: contextCards.chapter })
        .from(contextCards)
        .where(eq(contextCards.bookId, bookId)),
    ]);

    const ellenWhite = [
      ...egwRows.map((row) => ({
        id: row.id,
        kind: "egw" as const,
        title: row.chapterTitle,
        subtitle: row.book,
        hrefKind: "egw" as const,
      })),
      ...pioneerRows.map((row) => ({
        id: row.id,
        kind: "pioneer" as const,
        title: row.chapterTitle,
        subtitle: `${row.author} · ${row.book}`,
        hrefKind: "pioneer" as const,
      })),
    ].slice(0, 5);

    let sabbathSchool: {
      dayNumber: number;
      title: string;
      lessonNumber: number;
      quarterCode: string;
    } | null = null;

    if (ssCurrent) {
      const days = await db
        .select()
        .from(sabbathSchoolDays)
        .where(eq(sabbathSchoolDays.lessonId, ssCurrent.currentLesson.id));
      const hit = days.find((day) => textCitesNeedles(day.contentMarkdown ?? "", needles));
      if (hit) {
        sabbathSchool = {
          dayNumber: hit.dayNumber,
          title: hit.title?.trim() || `Day ${hit.dayNumber}`,
          lessonNumber: ssCurrent.currentLesson.lessonNumber,
          quarterCode: ssCurrent.quarterly.quarterCode,
        };
      }
    }

    return res.json({
      commentators: commentatorsForVerse,
      ellenWhite,
      sabbathSchool,
      hasBookOverview: hasBookOverviewContent(overviewRows),
    });
  } catch (err) {
    console.error("[verse-sheet]", err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

export default router;
