import { and, eq, inArray, sql } from "drizzle-orm";
import {
  completedDayRows,
  partMatchesReading,
  passageLabel,
  planCardState,
  planPartKey,
  type PlanPart,
} from "../../lib/plan-reading";
import { addCalendarDays, getCalendarDate } from "../../shared/calendar-date";
import {
  bibleBooks,
  bibleTranslations,
  bibleVerses,
  devotionalDays,
  devotionalPlans,
  planDays,
  readingPlans,
  readingStreaks,
  userPlanEnrollments,
  userPlanProgress,
  userPlans,
  userReadingPlanDays,
} from "../../shared/schema";
import { db } from "../db";

export class PlanProgressUnavailable extends Error {
  constructor() {
    super("Reading progress storage is not ready");
  }
}

function finishedProgressRow(
  row: { dayNumber: number; completedLocalDate: string | null; completedAt: Date | null; completedParts: string[] | null },
  currentDay: number,
): boolean {
  if (row.completedLocalDate || row.completedAt) return true;
  return (row.completedParts ?? []).length === 0 && row.dayNumber < currentDay;
}

function missingTable(err: unknown): boolean {
  return Boolean(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "42P01");
}

async function chapterLastVerse(bookId: number, chapter: number, translation: string): Promise<number> {
  const [matched] = await db
    .select({ max: sql<number>`max(${bibleVerses.verse})` })
    .from(bibleVerses)
    .innerJoin(bibleTranslations, eq(bibleTranslations.id, bibleVerses.translationId))
    .where(and(
      eq(bibleVerses.bookId, bookId),
      eq(bibleVerses.chapter, chapter),
      eq(bibleTranslations.abbreviation, translation),
    ));
  if (matched?.max) return Number(matched.max);
  const [any] = await db
    .select({ max: sql<number>`max(${bibleVerses.verse})` })
    .from(bibleVerses)
    .where(and(eq(bibleVerses.bookId, bookId), eq(bibleVerses.chapter, chapter)));
  return Number(any?.max ?? 0);
}

async function bumpStreak(userId: string, today: string): Promise<number> {
  const existing = await db.select().from(readingStreaks).where(eq(readingStreaks.userId, userId));
  if (existing.length === 0) {
    await db.insert(readingStreaks).values({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastReadDate: today,
    });
    return 1;
  }
  const streak = existing[0];
  if (streak.lastReadDate === today) return streak.currentStreak ?? 1;
  const continued = streak.lastReadDate === addCalendarDays(today, -1);
  const current = continued ? (streak.currentStreak ?? 0) + 1 : 1;
  const longest = Math.max(current, streak.longestStreak ?? 0);
  await db
    .update(readingStreaks)
    .set({ currentStreak: current, longestStreak: longest, lastReadDate: today })
    .where(eq(readingStreaks.userId, userId));
  return current;
}

export type PlanReadingUpdate = {
  kind: "reading-plan" | "devotional";
  id: string;
  title: string;
  dayNumber: number;
  partsDone: number;
  partsTotal: number;
  dayComplete: boolean;
  planComplete: boolean;
  percent: number;
};

export async function recordPlanReading(input: {
  userId: string;
  bookId: number;
  chapter: number;
  verse: number;
  translation: string;
  source: "scroll" | "listen";
  timeZone: string;
  journalEntry?: string | null;
}): Promise<{ updates: PlanReadingUpdate[]; streak: number | null }> {
  const today = getCalendarDate(new Date(), input.timeZone).dateKey;
  let lastVerse = 0;
  try {
    lastVerse = await chapterLastVerse(input.bookId, input.chapter, input.translation);
  } catch (err) {
    if (!missingTable(err)) throw err;
  }
  if (!lastVerse && input.source === "scroll") lastVerse = input.verse;

  const updates: PlanReadingUpdate[] = [];
  try {
    updates.push(...await recordReadingPlans(input, today, lastVerse));
    updates.push(...await recordDevotionalDays(input, today, lastVerse));
  } catch (err) {
    if (missingTable(err)) throw new PlanProgressUnavailable();
    throw err;
  }

  let streak: number | null = null;
  if (updates.some((row) => row.dayComplete)) {
    streak = await bumpStreak(input.userId, today);
  }
  return { updates, streak };
}

async function recordReadingPlans(
  input: {
    userId: string;
    bookId: number;
    chapter: number;
    verse: number;
    source: "scroll" | "listen";
  },
  today: string,
  chapterLastVerseNumber: number,
): Promise<PlanReadingUpdate[]> {
  const enrolled = await db
    .select({
      id: userPlans.id,
      planId: userPlans.planId,
      currentDay: userPlans.currentDay,
      completedAt: userPlans.completedAt,
      title: readingPlans.title,
      durationDays: readingPlans.durationDays,
    })
    .from(userPlans)
    .innerJoin(readingPlans, eq(readingPlans.id, userPlans.planId))
    .where(and(eq(userPlans.userId, input.userId), sql`${userPlans.completedAt} IS NULL`));
  if (!enrolled.length) return [];

  const planIds = enrolled.map((row) => row.planId);
  const enrollmentIds = enrolled.map((row) => row.id);
  const [days, stored] = await Promise.all([
    db.select().from(planDays).where(inArray(planDays.planId, planIds)),
    db.select().from(userReadingPlanDays).where(inArray(userReadingPlanDays.userPlanId, enrollmentIds)),
  ]);

  const updates: PlanReadingUpdate[] = [];
  for (const enrollment of enrolled) {
    const parts = days
      .filter((day) => day.planId === enrollment.planId && day.bookId && day.chapter)
      .map((day) => ({
        dayNumber: day.dayNumber,
        bookId: day.bookId!,
        chapter: day.chapter!,
        verseStart: day.verseStart,
        verseEnd: day.verseEnd,
      }));
    const dayNumbers = [...new Set(parts.map((part) => part.dayNumber))].sort((a, b) => a - b);
    let rows = stored
      .filter((row) => row.userPlanId === enrollment.id)
      .map((row) => ({
        dayNumber: row.dayNumber,
        localDate: row.completedLocalDate,
        parts: row.completedParts ?? [],
      }));
    if (rows.length === 0 && enrollment.currentDay > 1) {
      const earlier = dayNumbers.filter((dayNumber) => dayNumber < enrollment.currentDay);
      if (earlier.length) {
        await db.insert(userReadingPlanDays).values(earlier.map((dayNumber) => ({
          userPlanId: enrollment.id,
          dayNumber,
          completedParts: [],
          completedLocalDate: null,
        }))).onConflictDoNothing();
        rows = earlier.map((dayNumber) => ({ dayNumber, localDate: null, parts: [] as string[] }));
      }
    }
    const knownComplete = rows
      .filter((row) => row.localDate != null || (row.parts.length === 0 && row.dayNumber < enrollment.currentDay))
      .map((row) => ({ dayNumber: row.dayNumber, localDate: row.localDate }));
    const state = planCardState({
      dayNumbers,
      completed: knownComplete,
      today,
      focusPartsDone: 0,
      focusPartsTotal: 0,
    });
    const open = state.pace.find((day) => day.status === "open" && day.canComplete);
    if (!open) continue;
    const dayParts = parts.filter((part) => part.dayNumber === open.dayNumber);
    const hit = dayParts.filter((part) => partMatchesReading(part, {
      bookId: input.bookId,
      chapter: input.chapter,
      verse: input.verse,
      source: input.source,
      chapterLastVerse: chapterLastVerseNumber,
    }));
    if (!hit.length) continue;
    const existing = rows.find((row) => row.dayNumber === open.dayNumber);
    const partKeys = new Set(existing?.parts ?? []);
    for (const part of hit) partKeys.add(planPartKey(part));
    const required = new Set(dayParts.map((part) => planPartKey(part)));
    const done = [...required].filter((key) => partKeys.has(key));
    const dayComplete = required.size > 0 && done.length === required.size;
    await db
      .insert(userReadingPlanDays)
      .values({
        userPlanId: enrollment.id,
        dayNumber: open.dayNumber,
        completedParts: [...partKeys],
        completedLocalDate: dayComplete ? today : null,
        completedAt: dayComplete ? new Date() : null,
      })
      .onConflictDoUpdate({
        target: [userReadingPlanDays.userPlanId, userReadingPlanDays.dayNumber],
        set: {
          completedParts: [...partKeys],
          completedLocalDate: dayComplete ? today : existing?.localDate ?? null,
          completedAt: dayComplete ? new Date() : null,
        },
      });
    const finishedNumbers = new Set(knownComplete.map((row) => row.dayNumber));
    if (dayComplete) finishedNumbers.add(open.dayNumber);
    const planComplete = dayNumbers.every((dayNumber) => finishedNumbers.has(dayNumber));
    const next = dayNumbers.find((dayNumber) => !finishedNumbers.has(dayNumber)) ?? open.dayNumber;
    await db
      .update(userPlans)
      .set({
        currentDay: planComplete ? open.dayNumber : next,
        completedAt: planComplete ? new Date() : null,
      })
      .where(eq(userPlans.id, enrollment.id));
    const after = planCardState({
      dayNumbers,
      completed: [...finishedNumbers].map((dayNumber) => ({
        dayNumber,
        localDate: dayNumber === open.dayNumber && dayComplete ? today : knownComplete.find((row) => row.dayNumber === dayNumber)?.localDate ?? null,
      })),
      today,
      focusPartsDone: done.length,
      focusPartsTotal: required.size,
    });
    updates.push({
      kind: "reading-plan",
      id: enrollment.id,
      title: enrollment.title,
      dayNumber: open.dayNumber,
      partsDone: done.length,
      partsTotal: required.size,
      dayComplete,
      planComplete,
      percent: after.percent,
    });
  }
  return updates;
}

async function recordDevotionalDays(
  input: {
    userId: string;
    bookId: number;
    chapter: number;
    verse: number;
    source: "scroll" | "listen";
    journalEntry?: string | null;
  },
  today: string,
  chapterLastVerseNumber: number,
): Promise<PlanReadingUpdate[]> {
  const enrolled = await db
    .select({
      id: userPlanEnrollments.id,
      planId: userPlanEnrollments.planId,
      title: devotionalPlans.title,
    })
    .from(userPlanEnrollments)
    .innerJoin(devotionalPlans, eq(devotionalPlans.id, userPlanEnrollments.planId))
    .where(and(eq(userPlanEnrollments.userId, input.userId), eq(userPlanEnrollments.isActive, true)));
  if (!enrolled.length) return [];
  const updates: PlanReadingUpdate[] = [];
  for (const enrollment of enrolled) {
    const [days, completedRows] = await Promise.all([
      db
        .select({
          id: devotionalDays.id,
          dayNumber: devotionalDays.dayNumber,
          bookId: devotionalDays.bookId,
          chapter: devotionalDays.chapter,
          verseStart: devotionalDays.verseStart,
          verseEnd: devotionalDays.verseEnd,
        })
        .from(devotionalDays)
        .where(eq(devotionalDays.planId, enrollment.planId)),
      db
        .select({
          dayId: userPlanProgress.dayId,
          dayNumber: devotionalDays.dayNumber,
          localDate: userPlanProgress.completedLocalDate,
        })
        .from(userPlanProgress)
        .innerJoin(devotionalDays, eq(devotionalDays.id, userPlanProgress.dayId))
        .where(eq(userPlanProgress.enrollmentId, enrollment.id)),
    ]);
    const state = planCardState({
      dayNumbers: days.map((day) => day.dayNumber),
      completed: completedRows.map((row) => ({ dayNumber: row.dayNumber, localDate: row.localDate })),
      today,
      focusPartsDone: 0,
      focusPartsTotal: 1,
    });
    const open = state.pace.find((day) => day.status === "open" && day.canComplete);
    if (!open) continue;
    const day = days.find((item) => item.dayNumber === open.dayNumber);
    if (!day?.bookId || !day.chapter) continue;
    const part: PlanPart = {
      dayNumber: day.dayNumber,
      bookId: day.bookId,
      chapter: day.chapter,
      verseStart: day.verseStart,
      verseEnd: day.verseEnd,
    };
    if (!partMatchesReading(part, {
      bookId: input.bookId,
      chapter: input.chapter,
      verse: input.verse,
      source: input.source,
      chapterLastVerse: chapterLastVerseNumber,
    })) continue;
    await db
      .insert(userPlanProgress)
      .values({
        enrollmentId: enrollment.id,
        dayId: day.id,
        journalEntry: input.journalEntry ?? null,
        completedLocalDate: today,
      })
      .onConflictDoNothing();
    const finished = new Set(completedRows.map((row) => row.dayNumber));
    finished.add(day.dayNumber);
    const planComplete = days.length > 0 && days.every((item) => finished.has(item.dayNumber));
    if (planComplete) {
      await db
        .update(userPlanEnrollments)
        .set({ isActive: false })
        .where(eq(userPlanEnrollments.id, enrollment.id));
    }
    updates.push({
      kind: "devotional",
      id: enrollment.id,
      title: enrollment.title,
      dayNumber: day.dayNumber,
      partsDone: 1,
      partsTotal: 1,
      dayComplete: true,
      planComplete,
      percent: planCardState({
        dayNumbers: days.map((item) => item.dayNumber),
        completed: [...finished].map((dayNumber) => ({
          dayNumber,
          localDate: dayNumber === day.dayNumber ? today : completedRows.find((row) => row.dayNumber === dayNumber)?.localDate ?? null,
        })),
        today,
        focusPartsDone: 1,
        focusPartsTotal: 1,
      }).percent,
    });
  }
  return updates;
}

export type ReadingPlanCard = {
  status: "reading" | "done-today" | "finished";
  focusDay: number;
  completedDays: number;
  percent: number;
  partsDone: number;
  partsTotal: number;
  passage: string | null;
  nextPassage: string | null;
  continueReading: {
    bookId: number;
    chapter: number;
    verseStart: number | null;
    verseEnd: number | null;
  } | null;
};

export async function openReadingTarget(
  userId: string,
  bookId: number,
  chapter: number,
  timeZone: string,
): Promise<{ active: boolean; verse: number | null }> {
  const today = getCalendarDate(new Date(), timeZone).dateKey;
  const enrolled = await db
    .select({ id: userPlans.id, planId: userPlans.planId, currentDay: userPlans.currentDay })
    .from(userPlans)
    .where(and(eq(userPlans.userId, userId), sql`${userPlans.completedAt} IS NULL`));
  const devotional = await db
    .select({ id: userPlanEnrollments.id, planId: userPlanEnrollments.planId })
    .from(userPlanEnrollments)
    .where(and(eq(userPlanEnrollments.userId, userId), eq(userPlanEnrollments.isActive, true)));
  const ends: Array<number | null> = [];
  if (enrolled.length) {
    const days = await db.select().from(planDays).where(inArray(planDays.planId, enrolled.map((row) => row.planId)));
    const stored = await db.select().from(userReadingPlanDays).where(inArray(userReadingPlanDays.userPlanId, enrolled.map((row) => row.id)));
    for (const enrollment of enrolled) {
      const parts = days.filter((day) => day.planId === enrollment.planId && day.bookId && day.chapter);
      const dayNumbers = [...new Set(parts.map((part) => part.dayNumber))];
      const rows = stored.filter((row) => row.userPlanId === enrollment.id);
      const completed = rows.length
        ? rows.filter((row) => finishedProgressRow(row, enrollment.currentDay)).map((row) => ({
          dayNumber: row.dayNumber,
          localDate: row.completedLocalDate,
        }))
        : completedDayRows({ dayNumbers, rows: [], currentDay: enrollment.currentDay, planComplete: false });
      const open = planCardState({
        dayNumbers,
        completed,
        today,
        focusPartsDone: 0,
        focusPartsTotal: 0,
      }).pace.find((day) => day.status === "open" && day.canComplete);
      if (!open) continue;
      for (const part of parts) {
        if (part.dayNumber !== open.dayNumber || part.bookId !== bookId || part.chapter !== chapter) continue;
        ends.push(part.verseEnd);
      }
    }
  }
  for (const enrollment of devotional) {
    const [days, completedRows] = await Promise.all([
      db.select({
        dayNumber: devotionalDays.dayNumber,
        bookId: devotionalDays.bookId,
        chapter: devotionalDays.chapter,
        verseEnd: devotionalDays.verseEnd,
      }).from(devotionalDays).where(eq(devotionalDays.planId, enrollment.planId)),
      db.select({
        dayNumber: devotionalDays.dayNumber,
        localDate: userPlanProgress.completedLocalDate,
      })
        .from(userPlanProgress)
        .innerJoin(devotionalDays, eq(devotionalDays.id, userPlanProgress.dayId))
        .where(eq(userPlanProgress.enrollmentId, enrollment.id)),
    ]);
    const open = planCardState({
      dayNumbers: days.map((day) => day.dayNumber),
      completed: completedRows,
      today,
      focusPartsDone: 0,
      focusPartsTotal: 1,
    }).pace.find((day) => day.status === "open" && day.canComplete);
    if (!open) continue;
    const day = days.find((item) => item.dayNumber === open.dayNumber);
    if (day?.bookId === bookId && day.chapter === chapter) ends.push(day.verseEnd);
  }
  if (!ends.length) return { active: false, verse: null };
  if (ends.some((verse) => verse == null)) return { active: true, verse: null };
  return { active: true, verse: Math.max(...ends.map((verse) => verse ?? 0)) };
}

export async function readingPlanCards(
  enrollments: { id: string; planId: string; currentDay: number; completedAt: Date | string | null }[],
  today: string,
): Promise<Map<string, ReadingPlanCard>> {
  const cards = new Map<string, ReadingPlanCard>();
  if (!enrollments.length) return cards;
  const planIds = [...new Set(enrollments.map((row) => row.planId))];
  const [days, books, stored] = await Promise.all([
    db.select().from(planDays).where(inArray(planDays.planId, planIds)),
    db.select({ id: bibleBooks.id, name: bibleBooks.name }).from(bibleBooks),
    db.select().from(userReadingPlanDays).where(inArray(userReadingPlanDays.userPlanId, enrollments.map((row) => row.id))),
  ]);
  const names = new Map(books.map((book) => [book.id, book.name]));
  for (const enrollment of enrollments) {
    const parts = days
      .filter((day) => day.planId === enrollment.planId && day.bookId && day.chapter)
      .map((day) => ({
        dayNumber: day.dayNumber,
        bookId: day.bookId!,
        chapter: day.chapter!,
        verseStart: day.verseStart,
        verseEnd: day.verseEnd,
      }));
    const dayNumbers = [...new Set(parts.map((part) => part.dayNumber))].sort((a, b) => a - b);
    const storedRows = stored.filter((row) => row.userPlanId === enrollment.id);
    const realCompleted = storedRows.length
      ? storedRows
        .filter((row) => finishedProgressRow(row, enrollment.currentDay))
        .map((row) => ({ dayNumber: row.dayNumber, localDate: row.completedLocalDate }))
      : completedDayRows({
        dayNumbers,
        rows: [],
        currentDay: enrollment.currentDay,
        planComplete: Boolean(enrollment.completedAt),
      });
    const focusGuess = planCardState({
      dayNumbers,
      completed: realCompleted,
      today,
      focusPartsDone: 0,
      focusPartsTotal: 0,
    });
    const focus = focusGuess.focusDay;
    const focusParts = parts.filter((part) => part.dayNumber === focus);
    const saved = storedRows.find((row) => row.dayNumber === focus);
    const doneKeys = new Set(saved?.completedParts ?? []);
    const partsDone = focusParts.filter((part) => doneKeys.has(planPartKey(part))).length;
    const state = planCardState({
      dayNumbers,
      completed: realCompleted,
      today,
      focusPartsDone: partsDone,
      focusPartsTotal: focusParts.length,
    });
    const labelFor = (dayNumber: number | null) => {
      if (dayNumber == null) return null;
      const labels = parts
        .filter((part) => part.dayNumber === dayNumber)
        .map((part) => passageLabel(names.get(part.bookId) ?? "Scripture", part));
      return labels.length ? labels.join(" · ") : null;
    };
    const next = state.pace.find((day) => day.status === "open" && day.dayNumber !== state.focusDay)?.dayNumber
      ?? state.pace.find((day) => day.status === "locked")?.dayNumber
      ?? null;
    const continuePart = focusParts.find((part) => !doneKeys.has(planPartKey(part))) ?? focusParts[0] ?? null;
    cards.set(enrollment.id, {
      status: state.status,
      focusDay: state.focusDay ?? enrollment.currentDay,
      completedDays: state.completedDays,
      percent: state.percent,
      partsDone: state.status === "reading" ? partsDone : state.partsTotal,
      partsTotal: state.partsTotal,
      passage: labelFor(state.focusDay),
      nextPassage: state.status === "done-today" ? labelFor(next) : null,
      continueReading: continuePart
        ? {
          bookId: continuePart.bookId,
          chapter: continuePart.chapter,
          verseStart: continuePart.verseStart,
          verseEnd: continuePart.verseEnd,
        }
        : null,
    });
  }
  return cards;
}
