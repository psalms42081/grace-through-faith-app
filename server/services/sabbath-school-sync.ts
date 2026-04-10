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

type CurriculumType = "adult" | "inverse";

function getCurrentQuarterCode(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const quarter = month <= 3 ? "01" : month <= 6 ? "02" : month <= 9 ? "03" : "04";
  return `${year}-${quarter}`;
}

function getQuarterCodesForAllCurriculums(): Array<{ code: string; type: CurriculumType }> {
  const base = getCurrentQuarterCode();
  return [
    { code: base, type: "adult" },
    { code: `${base}-cq`, type: "inverse" },
  ];
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

async function syncQuarter(
  quarterCodeToSync: string,
  lang: string = "en",
  generateCompanions: boolean = true,
  curriculumType: CurriculumType = "adult"
): Promise<string | null> {
  const infoYml = await fetchText(`${BASE_URL}/${lang}/${quarterCodeToSync}/info.yml`);
  if (!infoYml) return null;

  console.log(`[SabbathSchool] Syncing quarter ${quarterCodeToSync} (${lang})...`);

  const activeQuarterCode = quarterCodeToSync;

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
        curriculumType,
        lastSyncedAt: new Date(),
      })
      .where(eq(sabbathSchoolQuarterlies.id, quarterlyId));
  } else {
    const [inserted] = await db
      .insert(sabbathSchoolQuarterlies)
      .values({
        quarterCode: activeQuarterCode,
        language: lang,
        curriculumType,
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

  if (generateCompanions) {
    buildAndGenerateCompanions(quarterlyId, updatedLessonIds).catch((err) => {
      console.error("[content:pipeline] Source packet + generation pipeline failed:", err);
    });
  }

  return quarterlyId;
}

export async function syncCurrentQuarter(lang: string = "en"): Promise<void> {
  const curriculums = getQuarterCodesForAllCurriculums();
  await Promise.all(
    curriculums.map(({ code, type }) => syncQuarter(code, lang, true, type))
  );
}

function getNextQuarterCode(code: string): string {
  const [yearStr, qStr] = code.split("-");
  let year = parseInt(yearStr);
  let q = parseInt(qStr);
  q++;
  if (q > 4) {
    q = 1;
    year++;
  }
  return `${year}-${String(q).padStart(2, "0")}`;
}

async function syncAdjacentQuarters(lang: string = "en", pastCount: number = 8): Promise<void> {
  const currentCode = getCurrentQuarterCode();

  const existingQuarters = await db
    .select({ quarterCode: sabbathSchoolQuarterlies.quarterCode })
    .from(sabbathSchoolQuarterlies);
  const existingCodes = new Set(existingQuarters.map(q => q.quarterCode));

  const codesToSync: string[] = [];

  const next = getNextQuarterCode(currentCode);
  if (!existingCodes.has(next)) codesToSync.push(next);

  let prev = getPreviousQuarterCode(currentCode);
  for (let i = 0; i < pastCount; i++) {
    if (!existingCodes.has(prev)) codesToSync.push(prev);
    prev = getPreviousQuarterCode(prev);
  }

  let synced = 0;
  for (const code of codesToSync) {
    const result = await syncQuarter(code, lang, false);
    if (result) synced++;
  }

  if (synced > 0) {
    console.log(`[SabbathSchool] Synced ${synced} adjacent quarter(s)`);
  } else {
    console.log(`[SabbathSchool] No new quarters found to sync`);
  }
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
    const lessonSourceCondition = sql`${resources.sourceRef}->>'type' = 'sabbath-school' AND ${resources.sourceRef}->>'lessonId' = ${lessonId}`;

    const activeCompanions = await db
      .select({
        id: resources.id,
        status: resources.status,
        sourcePacketId: resources.sourcePacketId,
        contentJson: resources.contentJson,
        supersedesResourceId: resources.supersedesResourceId,
      })
      .from(resources)
      .where(and(lessonSourceCondition, sql`${resources.status} != 'archived'`))
      .orderBy(desc(resources.createdAt));

    const publishedCompanion = activeCompanions.find(r => r.status === "published");
    const pendingDraft = activeCompanions.find(r => r.status === "draft" && r.supersedesResourceId);
    const existing = publishedCompanion || activeCompanions[0];

    if (existing && !changed) {
      continue;
    }

    if (pendingDraft) {
      await db.delete(resources).where(eq(resources.id, pendingDraft.id));
      console.log(`[content:sync] Removed stale pending draft ${pendingDraft.id} for lesson ${lessonId}`);
    }

    const supersedesTarget = publishedCompanion || activeCompanions.find(r => r.id !== pendingDraft?.id);
    const previousContentJson = supersedesTarget ? supersedesTarget.contentJson : null;
    const supersedesId = supersedesTarget ? supersedesTarget.id : null;
    const reason = existing ? "source_changed" : "new";

    try {
      console.log(`[content:sync] Auto-generating companion for lesson ${lessonId} (${reason}, packet: ${packetId})`);
      const resourceId = await generateSabbathSchoolCompanion(lessonId, { sourcePacketId: packetId });

      const updateData: Record<string, any> = {};
      if (previousContentJson) {
        updateData.previousContentJson = previousContentJson;
      }
      if (supersedesId) {
        updateData.supersedesResourceId = supersedesId;
      }
      if (Object.keys(updateData).length > 0) {
        await db.update(resources)
          .set(updateData)
          .where(eq(resources.id, resourceId));
        console.log(`[content:sync] Linked new draft to superseded resource ${supersedesId}`);
      }

      console.log(`[content:sync] Companion created: ${resourceId} (${reason})`);
    } catch (err) {
      console.error(`[content:sync] Failed for lesson ${lessonId}:`, err);
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

  syncAdjacentQuarters("en", 8).catch((err) => {
    console.error("[SabbathSchool] Adjacent quarters sync failed:", err);
  });

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
