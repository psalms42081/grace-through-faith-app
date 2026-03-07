import { db } from "../db";
import {
  sabbathSchoolQuarterlies,
  sabbathSchoolLessons,
  sabbathSchoolDays,
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import YAML from "yaml";

const BASE_URL =
  "https://raw.githubusercontent.com/Adventech/sabbath-school-lessons/master/src";

function getCurrentQuarterCode(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quarter = month <= 3 ? "01" : month <= 6 ? "02" : month <= 9 ? "03" : "04";
  return `${year}-${quarter}`;
}

function getPreviousQuarterCode(code: string): string {
  const [yearStr, qStr] = code.split("-");
  let year = parseInt(yearStr);
  let q = parseInt(qStr);
  q--;
  if (q < 1) {
    q = 4;
    year--;
  }
  return `${year}-${String(q).padStart(2, "0")}`;
}

function parseDateStr(dateStr: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return new Date(dateStr);
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return await res.text();
  } catch (err) {
    console.error(`Failed to fetch ${url}:`, err);
    return null;
  }
}

export async function syncCurrentQuarter(lang: string = "en"): Promise<void> {
  const quarterCode = getCurrentQuarterCode();
  console.log(`[SabbathSchool] Syncing quarter ${quarterCode} (${lang})...`);

  let activeQuarterCode = quarterCode;
  let infoYml = await fetchText(`${BASE_URL}/${lang}/${quarterCode}/info.yml`);
  if (!infoYml) {
    console.warn(`[SabbathSchool] No quarterly found for ${quarterCode}. Trying previous quarter...`);
    const prev = getPreviousQuarterCode(quarterCode);
    infoYml = await fetchText(`${BASE_URL}/${lang}/${prev}/info.yml`);
    if (!infoYml) {
      console.warn(`[SabbathSchool] No quarterly found for ${prev} either. Skipping sync.`);
      return;
    }
    activeQuarterCode = prev;
    console.log(`[SabbathSchool] Using previous quarter ${prev}`);
  }

  const rawInfo = infoYml.replace(/^---\s*\n/, "");
  const info = YAML.parse(rawInfo);

  const existing = await db
    .select()
    .from(sabbathSchoolQuarterlies)
    .where(eq(sabbathSchoolQuarterlies.quarterCode, activeQuarterCode))
    .limit(1);

  let quarterlyId: string;

  if (existing.length > 0) {
    quarterlyId = existing[0].id;
    await db
      .update(sabbathSchoolQuarterlies)
      .set({
        title: info.title || activeQuarterCode,
        description: info.description || null,
        humanDate: info.human_date || null,
        startDate: info.start_date || null,
        endDate: info.end_date || null,
        colorPrimary: info.color_primary || null,
        lastSyncedAt: new Date(),
      })
      .where(eq(sabbathSchoolQuarterlies.id, quarterlyId));
  } else {
    const [inserted] = await db
      .insert(sabbathSchoolQuarterlies)
      .values({
        quarterCode: activeQuarterCode,
        language: lang,
        title: info.title || activeQuarterCode,
        description: info.description || null,
        humanDate: info.human_date || null,
        startDate: info.start_date || null,
        endDate: info.end_date || null,
        colorPrimary: info.color_primary || null,
        coverUrl: `${BASE_URL}/${lang}/${activeQuarterCode}/cover.png`,
        lastSyncedAt: new Date(),
      })
      .returning();
    quarterlyId = inserted.id;
  }

  for (let lessonNum = 1; lessonNum <= 13; lessonNum++) {
    const lessonDir = String(lessonNum).padStart(2, "0");
    const lessonInfoYml = await fetchText(
      `${BASE_URL}/${lang}/${activeQuarterCode}/${lessonDir}/info.yml`
    );
    if (!lessonInfoYml) continue;

    const rawLessonInfo = lessonInfoYml.replace(/^---\s*\n/, "");
    const lessonInfo = YAML.parse(rawLessonInfo);

    const existingLesson = await db
      .select()
      .from(sabbathSchoolLessons)
      .where(
        and(
          eq(sabbathSchoolLessons.quarterlyId, quarterlyId),
          eq(sabbathSchoolLessons.lessonNumber, lessonNum)
        )
      )
      .limit(1);

    let lessonId: string;

    if (existingLesson.length > 0) {
      lessonId = existingLesson[0].id;
      await db
        .update(sabbathSchoolLessons)
        .set({
          title: lessonInfo.title || `Lesson ${lessonNum}`,
          startDate: lessonInfo.start_date || null,
          endDate: lessonInfo.end_date || null,
        })
        .where(eq(sabbathSchoolLessons.id, lessonId));
    } else {
      const [insertedLesson] = await db
        .insert(sabbathSchoolLessons)
        .values({
          quarterlyId,
          lessonNumber: lessonNum,
          title: lessonInfo.title || `Lesson ${lessonNum}`,
          startDate: lessonInfo.start_date || null,
          endDate: lessonInfo.end_date || null,
        })
        .returning();
      lessonId = insertedLesson.id;
    }

    for (let dayNum = 1; dayNum <= 7; dayNum++) {
      const dayFile = String(dayNum).padStart(2, "0");
      const dayMd = await fetchText(
        `${BASE_URL}/${lang}/${activeQuarterCode}/${lessonDir}/${dayFile}.md`
      );
      if (!dayMd) continue;

      const frontmatterMatch = dayMd.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
      let dayTitle: string | null = null;
      let dayDate: string | null = null;
      let contentBody = dayMd;

      if (frontmatterMatch) {
        try {
          const fm = YAML.parse(frontmatterMatch[1]);
          dayTitle = fm.title || null;
          dayDate = fm.date || null;
        } catch {}
        contentBody = frontmatterMatch[2];
      }

      const existingDay = await db
        .select()
        .from(sabbathSchoolDays)
        .where(
          and(
            eq(sabbathSchoolDays.lessonId, lessonId),
            eq(sabbathSchoolDays.dayNumber, dayNum)
          )
        )
        .limit(1);

      if (existingDay.length > 0) {
        await db
          .update(sabbathSchoolDays)
          .set({
            title: dayTitle,
            date: dayDate,
            contentMarkdown: contentBody,
          })
          .where(eq(sabbathSchoolDays.id, existingDay[0].id));
      } else {
        await db.insert(sabbathSchoolDays).values({
          lessonId,
          dayNumber: dayNum,
          title: dayTitle,
          date: dayDate,
          contentMarkdown: contentBody,
        });
      }
    }
  }

  console.log(`[SabbathSchool] Sync complete for ${activeQuarterCode}`);
}

export async function getCurrentLessonNumber(quarterlyId: string): Promise<number> {
  const now = new Date();
  const todayStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;

  const lessons = await db
    .select()
    .from(sabbathSchoolLessons)
    .where(eq(sabbathSchoolLessons.quarterlyId, quarterlyId))
    .orderBy(sabbathSchoolLessons.lessonNumber);

  for (const lesson of lessons) {
    if (lesson.startDate && lesson.endDate) {
      const start = parseDateStr(lesson.startDate);
      const end = parseDateStr(lesson.endDate);
      if (start && end) {
        end.setHours(23, 59, 59, 999);
        if (now >= start && now <= end) {
          return lesson.lessonNumber;
        }
      }
    }
  }

  let closest = lessons[0];
  let closestDiff = Infinity;
  for (const lesson of lessons) {
    if (lesson.startDate) {
      const start = parseDateStr(lesson.startDate);
      if (start) {
        const diff = Math.abs(now.getTime() - start.getTime());
        if (diff < closestDiff) {
          closestDiff = diff;
          closest = lesson;
        }
      }
    }
  }

  return closest?.lessonNumber || 1;
}

export async function shouldSync(): Promise<boolean> {
  const quarterCode = getCurrentQuarterCode();
  const existing = await db
    .select()
    .from(sabbathSchoolQuarterlies)
    .where(eq(sabbathSchoolQuarterlies.quarterCode, quarterCode))
    .limit(1);

  if (existing.length === 0) return true;

  const lastSynced = existing[0].lastSyncedAt;
  if (!lastSynced) return true;

  const hoursSinceSync =
    (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync >= 24;
}

export async function initSabbathSchoolSync(): Promise<void> {
  try {
    const needsSync = await shouldSync();
    if (needsSync) {
      await syncCurrentQuarter("en");
    } else {
      console.log("[SabbathSchool] Content is fresh, skipping sync.");
    }
  } catch (err) {
    console.error("[SabbathSchool] Initial sync failed:", err);
  }

  setInterval(
    async () => {
      try {
        const needsSync = await shouldSync();
        if (needsSync) {
          await syncCurrentQuarter("en");
        }
      } catch (err) {
        console.error("[SabbathSchool] Periodic sync failed:", err);
      }
    },
    24 * 60 * 60 * 1000
  );
}
