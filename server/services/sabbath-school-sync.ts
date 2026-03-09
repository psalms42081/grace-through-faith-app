import { db } from "../db";
import {
  sabbathSchoolQuarterlies,
  sabbathSchoolLessons,
  sabbathSchoolDays,
  sabbathSchoolDiscussionPrep,
  resources,
} from "../../shared/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import YAML from "yaml";
import { fetchWithTimeout } from "./api-client";
import { buildSourcePacket } from "./source-packet-builder";

const BASE_URL =
  "https://raw.githubusercontent.com/Adventech/sabbath-school-lessons/master/src";

function getCurrentQuarterCode(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
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
    return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
  }
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
}

function todayUTCMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetchWithTimeout(url, { service: "external", serviceLabel: "sabbath-school" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
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

  const updatedLessonIds: string[] = [];

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
      updatedLessonIds.push(lessonId);
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
      updatedLessonIds.push(lessonId);
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
        const contentChanged = existingDay[0].contentMarkdown !== contentBody;
        await db
          .update(sabbathSchoolDays)
          .set({
            title: dayTitle,
            date: dayDate,
            contentMarkdown: contentBody,
          })
          .where(eq(sabbathSchoolDays.id, existingDay[0].id));
        if (contentChanged && !updatedLessonIds.includes(lessonId)) {
          updatedLessonIds.push(lessonId);
        }
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

  if (updatedLessonIds.length > 0) {
    await invalidateDiscussionCache(updatedLessonIds);
  }

  console.log(`[SabbathSchool] Sync complete for ${activeQuarterCode}`);

  buildAndGenerateCompanions(quarterlyId, updatedLessonIds).catch((err) => {
    console.error("[content:pipeline] Source packet + generation pipeline failed:", err);
  });
}

async function buildAndGenerateCompanions(quarterlyId: string, lessonIds: string[]): Promise<void> {
  if (lessonIds.length === 0) return;

  const packetResults: Array<{ lessonId: string; packetId: string; changed: boolean }> = [];

  for (const lessonId of lessonIds) {
    try {
      const result = await buildSourcePacket(lessonId);
      packetResults.push({ lessonId, packetId: result.id, changed: result.changed || result.isNew });
    } catch (err) {
      console.error(`[source-packet] Failed to build packet for lesson ${lessonId}:`, err);
    }
  }

  console.log(`[source-packet] Built ${packetResults.length}/${lessonIds.length} packets`);

  await triggerCompanionGeneration(quarterlyId, packetResults);
}

export async function getCurrentLessonNumber(quarterlyId: string): Promise<number> {
  const today = todayUTCMidnight();

  const lessons = await db
    .select()
    .from(sabbathSchoolLessons)
    .where(eq(sabbathSchoolLessons.quarterlyId, quarterlyId))
    .orderBy(sabbathSchoolLessons.lessonNumber);

  if (lessons.length === 0) return 1;

  for (const lesson of lessons) {
    if (lesson.startDate && lesson.endDate) {
      const start = parseDateStr(lesson.startDate);
      const end = parseDateStr(lesson.endDate);
      if (start && end) {
        if (today >= start && today <= end) {
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
        const diff = Math.abs(today.getTime() - start.getTime());
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

  const currentQ = await db
    .select()
    .from(sabbathSchoolQuarterlies)
    .where(eq(sabbathSchoolQuarterlies.quarterCode, quarterCode))
    .limit(1);

  if (currentQ.length > 0) {
    const lastSynced = currentQ[0].lastSyncedAt;
    if (lastSynced) {
      const hoursSinceSync = (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60);
      return hoursSinceSync >= 24;
    }
    return true;
  }

  const anyQ = await db
    .select()
    .from(sabbathSchoolQuarterlies)
    .orderBy(desc(sabbathSchoolQuarterlies.lastSyncedAt))
    .limit(1);

  if (anyQ.length === 0) return true;

  const lastSynced = anyQ[0].lastSyncedAt;
  if (!lastSynced) return true;

  const hoursSinceSync = (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60);
  return hoursSinceSync >= 24;
}

export async function getMostRecentQuarterly() {
  const quarterCode = getCurrentQuarterCode();
  const currentQ = await db
    .select()
    .from(sabbathSchoolQuarterlies)
    .where(eq(sabbathSchoolQuarterlies.quarterCode, quarterCode))
    .limit(1);

  if (currentQ.length > 0) return currentQ[0];

  const fallback = await db
    .select()
    .from(sabbathSchoolQuarterlies)
    .orderBy(desc(sabbathSchoolQuarterlies.quarterCode))
    .limit(1);

  return fallback[0] || null;
}

async function triggerCompanionGeneration(
  quarterlyId: string,
  packets: Array<{ lessonId: string; packetId: string; changed: boolean }>
): Promise<void> {
  if (packets.length === 0) return;

  const { generateSabbathSchoolCompanion } = await import("./content-engine");

  for (const { lessonId, packetId, changed } of packets) {
    const existing = await db
      .select({ id: resources.id, sourcePacketId: resources.sourcePacketId })
      .from(resources)
      .where(
        sql`${resources.sourceRef}->>'type' = 'sabbath-school' AND ${resources.sourceRef}->>'lessonId' = ${lessonId}`
      )
      .limit(1);

    if (existing.length > 0 && !changed) {
      continue;
    }

    if (existing.length > 0 && changed) {
      console.log(`[content:regenerate] Source content changed for lesson ${lessonId}, regenerating companion`);
      try {
        await db.update(resources).set({
          generationStatus: "regenerating",
          updatedAt: new Date(),
        }).where(eq(resources.id, existing[0].id));
      } catch {}
    }

    try {
      console.log(`[content:generate] Generating companion for lesson ${lessonId} (packet: ${packetId})`);
      await generateSabbathSchoolCompanion(lessonId, { sourcePacketId: packetId });

      if (existing.length > 0) {
        await db.update(resources).set({
          status: "draft",
          generationStatus: "completed",
          reviewStatus: "pending",
          updatedAt: new Date(),
        }).where(eq(resources.id, existing[0].id));
        console.log(`[content:regenerate] Old companion ${existing[0].id} marked as draft (superseded)`);
      }

      console.log(`[content:ready] Companion for lesson ${lessonId} created`);
    } catch (err) {
      console.error(`[content:generate] Failed for lesson ${lessonId}:`, err);
      if (existing.length > 0) {
        await db.update(resources).set({
          generationStatus: "failed",
          updatedAt: new Date(),
        }).where(eq(resources.id, existing[0].id)).catch(() => {});
      }
    }
  }
}

export async function invalidateDiscussionCache(lessonIds: string[]): Promise<void> {
  if (lessonIds.length === 0) return;
  try {
    await db
      .delete(sabbathSchoolDiscussionPrep)
      .where(inArray(sabbathSchoolDiscussionPrep.lessonId, lessonIds));
    console.log(`[SabbathSchool] Invalidated discussion prep cache for ${lessonIds.length} lessons`);
  } catch (err) {
    console.error("[SabbathSchool] Failed to invalidate discussion cache:", err);
  }
}

export async function initSabbathSchoolSync(): Promise<void> {
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 10000;

  async function attemptSync(attempt: number): Promise<void> {
    try {
      const needsSync = await shouldSync();
      if (needsSync) {
        await syncCurrentQuarter("en");
      } else {
        console.log("[SabbathSchool] Content is fresh, skipping sync.");
      }
    } catch (err) {
      console.error(`[SabbathSchool] Sync attempt ${attempt}/${MAX_RETRIES} failed:`, err);
      if (attempt < MAX_RETRIES) {
        console.log(`[SabbathSchool] Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
        return attemptSync(attempt + 1);
      }
      console.error("[SabbathSchool] All sync retries exhausted. Will try again in 24h.");
    }
  }

  await attemptSync(1);

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
