import { db } from "../db";
import {
  sabbathSchoolQuarterlies,
  sabbathSchoolLessons,
} from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  getCurrentLessonNumber,
  syncCurrentQuarter,
} from "./sabbath-school-sync";
import {
  buildSsWeekKey,
  parseGroupCurriculum,
  type SabbathSchoolWeekPointer,
} from "../../lib/bible-small-group";
import type { SabbathSchoolTrackId } from "../../lib/sabbath-school-tracks";

export type CurrentSabbathSchoolLesson = {
  quarterly: typeof sabbathSchoolQuarterlies.$inferSelect;
  lessons: (typeof sabbathSchoolLessons.$inferSelect)[];
  currentLesson: typeof sabbathSchoolLessons.$inferSelect;
  currentLessonNumber: number;
  pointer: SabbathSchoolWeekPointer;
};

/**
 * Shared current-week resolver for Sabbath School surfaces and Bible groups.
 * Returns lesson metadata only — never day HTML / markdown.
 */
export async function loadCurrentSabbathSchoolLesson(
  curriculum: SabbathSchoolTrackId,
  timeZone = "UTC",
  now = new Date(),
): Promise<CurrentSabbathSchoolLesson | null> {
  let q =
    (
      await db
        .select()
        .from(sabbathSchoolQuarterlies)
        .where(
          and(
            eq(sabbathSchoolQuarterlies.language, "en"),
            eq(sabbathSchoolQuarterlies.curriculumType, curriculum),
          ),
        )
        .orderBy(desc(sabbathSchoolQuarterlies.quarterCode))
        .limit(1)
    )[0] || null;

  if (!q) {
    try {
      await syncCurrentQuarter("en");
      q =
        (
          await db
            .select()
            .from(sabbathSchoolQuarterlies)
            .where(
              and(
                eq(sabbathSchoolQuarterlies.language, "en"),
                eq(sabbathSchoolQuarterlies.curriculumType, curriculum),
              ),
            )
            .orderBy(desc(sabbathSchoolQuarterlies.quarterCode))
            .limit(1)
        )[0] || null;
    } catch (err) {
      console.error(
        "[SabbathSchool] On-demand quarterly sync failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (!q) return null;

  let lessons = await db
    .select()
    .from(sabbathSchoolLessons)
    .where(eq(sabbathSchoolLessons.quarterlyId, q.id))
    .orderBy(sabbathSchoolLessons.lessonNumber);

  if (lessons.length === 0) {
    try {
      await syncCurrentQuarter("en");
      lessons = await db
        .select()
        .from(sabbathSchoolLessons)
        .where(eq(sabbathSchoolLessons.quarterlyId, q.id))
        .orderBy(sabbathSchoolLessons.lessonNumber);
    } catch (err) {
      console.error(
        "[SabbathSchool] On-demand lesson repair sync failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  if (lessons.length === 0) {
    const allQuarters = await db
      .select()
      .from(sabbathSchoolQuarterlies)
      .where(
        and(
          eq(sabbathSchoolQuarterlies.language, "en"),
          eq(sabbathSchoolQuarterlies.curriculumType, curriculum),
        ),
      )
      .orderBy(desc(sabbathSchoolQuarterlies.quarterCode));

    for (const candidate of allQuarters) {
      if (candidate.id === q.id) continue;
      const candidateLessons = await db
        .select()
        .from(sabbathSchoolLessons)
        .where(eq(sabbathSchoolLessons.quarterlyId, candidate.id))
        .limit(1);
      if (candidateLessons.length > 0) {
        q = candidate;
        lessons = await db
          .select()
          .from(sabbathSchoolLessons)
          .where(eq(sabbathSchoolLessons.quarterlyId, q.id))
          .orderBy(sabbathSchoolLessons.lessonNumber);
        break;
      }
    }
  }

  if (lessons.length === 0) return null;

  const currentLessonNumber = await getCurrentLessonNumber(q.id, timeZone, now);
  const currentLesson =
    lessons.find((l) => l.lessonNumber === currentLessonNumber) || lessons[0];
  if (!currentLesson) return null;

  const groupCurriculum = parseGroupCurriculum(curriculum);

  return {
    quarterly: q,
    lessons,
    currentLesson,
    currentLessonNumber,
    pointer: {
      ssWeekKey: buildSsWeekKey(
        groupCurriculum,
        q.quarterCode,
        currentLesson.lessonNumber,
      ),
      curriculum: groupCurriculum,
      quarterCode: q.quarterCode,
      lessonNumber: currentLesson.lessonNumber,
      lessonTitle: currentLesson.title,
      startDate: currentLesson.startDate,
      endDate: currentLesson.endDate,
    },
  };
}

export async function resolveCurrentWeekPointer(
  curriculum: SabbathSchoolTrackId,
  timeZone = "UTC",
  now = new Date(),
): Promise<SabbathSchoolWeekPointer | null> {
  const loaded = await loadCurrentSabbathSchoolLesson(curriculum, timeZone, now);
  return loaded?.pointer ?? null;
}
