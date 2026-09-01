import { db } from "../db";
import {
  sabbathSchoolQuarterlies,
  sabbathSchoolLessons,
  sabbathSchoolDays,
  sabbathSchoolDiscussionPrep,
  resources,
} from "../../shared/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { fetchWithTimeout } from "./api-client";
import { buildSourcePacket } from "./source-packet-builder";
import {
  extractSabbathSchoolAudioMetadata,
  normalizeSabbathSchoolAudioUrl,
} from "./sabbath-school-audio-metadata";
import { sabbathSchoolDateAtUtcMidnight } from "./sabbath-school-date";
import {
  SABBATH_SCHOOL_TRACKS,
  SYNCED_SABBATH_SCHOOL_TRACKS,
  type SabbathSchoolTrackId,
} from "../../lib/sabbath-school-tracks";

const BASE_URL = "https://sabbath-school.adventech.io/api/v2";

type CurriculumType = SabbathSchoolTrackId;

function getCurrentQuarterCode(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const quarter = month <= 3 ? "01" : month <= 6 ? "02" : month <= 9 ? "03" : "04";
  return `${year}-${quarter}`;
}

function getQuarterCodesForAllCurriculums(): Array<{ code: string; type: CurriculumType }> {
  const base = getCurrentQuarterCode();
  return SYNCED_SABBATH_SCHOOL_TRACKS.map((type) => ({
    code: `${base}${SABBATH_SCHOOL_TRACKS[type].adventechSuffix}`,
    type,
  }));
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

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as JsonObject;
}

function pickString(obj: JsonObject | null, keys: string[]): string | null {
  if (!obj) return null;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function pickNumber(obj: JsonObject | null, keys: string[]): number | null {
  if (!obj) return null;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return null;
}

function extractCollection(payload: unknown, arrayKeys: string[]): JsonObject[] {
  if (Array.isArray(payload)) {
    return payload.map((item) => asObject(item)).filter((item): item is JsonObject => !!item);
  }
  const obj = asObject(payload);
  if (!obj) return [];

  for (const key of arrayKeys) {
    const value = obj[key];
    if (Array.isArray(value)) {
      return value.map((item) => asObject(item)).filter((item): item is JsonObject => !!item);
    }
  }

  const objValues = Object.values(obj);
  if (objValues.every((v) => asObject(v))) {
    return objValues.map((item) => asObject(item)).filter((item): item is JsonObject => !!item);
  }

  return [];
}

function parseLessonNumberFromCode(code: string | null): number | null {
  if (!code) return null;
  const parsed = parseInt(code, 10);
  if (!Number.isNaN(parsed)) return parsed;
  const match = code.match(/(\d{1,2})$/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  return Number.isNaN(n) ? null : n;
}

function getQuarterCodeFromItem(item: JsonObject): string | null {
  return pickString(item, ["id", "quarter", "quarterCode", "code", "slug"]);
}

function getLessonCodeFromItem(item: JsonObject): string | null {
  return pickString(item, ["id", "lesson", "lessonCode", "code", "slug"]);
}

function getLessonNumberFromItem(item: JsonObject, fallbackIndex: number): number {
  const fromFields = pickNumber(item, ["index", "lessonNumber", "lesson_number", "week", "weekNumber"]);
  if (fromFields !== null) return fromFields;
  const fromCode = parseLessonNumberFromCode(getLessonCodeFromItem(item));
  if (fromCode !== null) return fromCode;
  return fallbackIndex + 1;
}

function getDayContentMarkdown(dayPayload: unknown): string {
  const dayObj = asObject(dayPayload);
  if (!dayObj) return "";
  const candidates: unknown[] = [
    dayObj.contentMarkdown,
    dayObj.markdown,
    dayObj.content,
    dayObj.read,
    dayObj.body,
    dayObj.text,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
    if (Array.isArray(candidate)) {
      const allStrings = candidate.every((x) => typeof x === "string");
      if (allStrings) {
        return (candidate as string[]).join("\n\n");
      }
    }
    const nested = asObject(candidate);
    if (nested) {
      const nestedText = pickString(nested, ["markdown", "content", "text", "body"]);
      if (nestedText) return nestedText;
    }
  }

  return "";
}

function extractDayCodes(lessonItem: JsonObject): string[] {
  const days = lessonItem.days;
  if (!Array.isArray(days)) return [];
  const codes = days
    .map((d) => asObject(d))
    .filter((d): d is JsonObject => !!d)
    .map((d) => pickString(d, ["id", "day", "code", "slug"]))
    .filter((d): d is string => !!d);
  return codes;
}

function collectObjectsDeep(value: unknown, out: JsonObject[] = []): JsonObject[] {
  const obj = asObject(value);
  if (obj) {
    out.push(obj);
    for (const child of Object.values(obj)) {
      collectObjectsDeep(child, out);
    }
    return out;
  }
  if (Array.isArray(value)) {
    for (const child of value) {
      collectObjectsDeep(child, out);
    }
  }
  return out;
}

function absolutizeMediaUrl(url: string): string {
  try {
    return new URL(url, `${BASE_URL}/`).toString();
  } catch {
    return url;
  }
}

function getMediaUrl(entry: JsonObject, keys: string[]): string | null {
  const url = pickString(entry, keys);
  if (!url) return null;
  return absolutizeMediaUrl(url);
}

function getLessonNumberFromMediaEntry(entry: JsonObject): number | null {
  const direct = pickNumber(entry, ["lesson", "lessonNumber", "lesson_number", "week", "weekNumber"]);
  if (direct !== null) return direct;
  const lessonCode = pickString(entry, ["lessonCode", "lesson_id", "lessonId"]);
  const fromCode = parseLessonNumberFromCode(lessonCode);
  if (fromCode !== null) return fromCode;

  const probe = pickString(entry, ["target", "path", "url", "src", "id", "reference"]);
  if (!probe) return null;
  const adventechVideoMatch = probe.match(/^[a-z]{2,3}\/\d{4}-\d{2}[^\/]*\/(\d{1,2})$/);
  if (adventechVideoMatch) {
    return parseInt(adventechVideoMatch[1], 10);
  }
  const indexVideoMatch = probe.match(/^[a-z]{2,3}-\d{4}-\d{2}[^-]*-(\d{1,2})$/);
  if (indexVideoMatch) {
    return parseInt(indexVideoMatch[1], 10);
  }
  // Parse Adventech target format: "en/2026-02/01/03"
  const adventechMatch = probe.match(/^[a-z]{2,3}\/\d{4}-\d{2}[^\/]*\/(\d{1,2})\/(\d{1,2})$/);
  if (adventechMatch) {
    return parseInt(adventechMatch[1], 10);
  }
  // Fallback: parse targetIndex-like format "en-2026-02-01-03"
  const indexMatch = probe.match(/[a-z]{2,3}-\d{4}-\d{2}[^-]*-(\d{1,2})-(\d{1,2})$/);
  if (indexMatch) {
    return parseInt(indexMatch[1], 10);
  }
  const slashMatch = probe.match(/lessons\/(\d{1,2})/i);
  if (slashMatch) return parseInt(slashMatch[1], 10);
  const wordMatch = probe.match(/lesson[^\d]{0,3}(\d{1,2})/i);
  if (wordMatch) return parseInt(wordMatch[1], 10);
  return null;
}

function getDayNumberFromMediaEntry(entry: JsonObject): number | null {
  const direct = pickNumber(entry, ["day", "dayNumber", "day_number", "index"]);
  if (direct !== null) return direct;

  const probe = pickString(entry, ["target", "path", "url", "src", "id", "reference"]);
  if (!probe) return null;
  // Parse Adventech target format: "en/2026-02/01/03"
  const adventechMatch = probe.match(/^[a-z]{2,3}\/\d{4}-\d{2}[^\/]*\/(\d{1,2})\/(\d{1,2})$/);
  if (adventechMatch) {
    return parseInt(adventechMatch[2], 10);
  }
  // Fallback: parse targetIndex-like format "en-2026-02-01-03"
  const indexMatch = probe.match(/[a-z]{2,3}-\d{4}-\d{2}[^-]*-(\d{1,2})-(\d{1,2})$/);
  if (indexMatch) {
    return parseInt(indexMatch[2], 10);
  }
  const slashMatch = probe.match(/days\/(\d{1,2})/i);
  if (slashMatch) return parseInt(slashMatch[1], 10);
  const wordMatch = probe.match(/day[^\d]{0,3}(\d{1,2})/i);
  if (wordMatch) return parseInt(wordMatch[1], 10);
  return null;
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetchWithTimeout(url, { service: "external", serviceLabel: "sabbath-school" });
    if (!res.ok) {
      console.error(`[SabbathSchool] Fetch failed (${res.status}) for ${url}`);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`[SabbathSchool] Fetch error for ${url}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

async function syncQuarter(
  quarterCodeToSync: string,
  lang: string = "en",
  generateCompanions: boolean = true,
  curriculumType: CurriculumType = "adult"
): Promise<string | null> {
  const quarterlyIndex = await fetchJson(`${BASE_URL}/${lang}/quarterlies/index.json`);
  if (!quarterlyIndex) return null;

  console.log(`[SabbathSchool] Syncing quarter ${quarterCodeToSync} (${lang})...`);

  const activeQuarterCode = quarterCodeToSync;
  const quarterItems = extractCollection(quarterlyIndex, ["quarterlies", "items", "data"]);
  const quarterInfo = quarterItems.find((item) => getQuarterCodeFromItem(item) === activeQuarterCode) || null;
  const quarterTitle = pickString(quarterInfo, ["title", "name"]) || activeQuarterCode;
  const quarterDescription = pickString(quarterInfo, ["description", "intro", "subtitle"]);
  const quarterHumanDate = pickString(quarterInfo, ["human_date", "humanDate", "date"]);
  const quarterStartDate = pickString(quarterInfo, ["start_date", "startDate"]);
  const quarterEndDate = pickString(quarterInfo, ["end_date", "endDate"]);
  const quarterColorPrimary = pickString(quarterInfo, ["color_primary", "colorPrimary", "color"]);
  const quarterCoverUrl =
    pickString(quarterInfo, ["cover", "cover_url", "coverUrl", "image"]) ||
    `${BASE_URL}/${lang}/quarterlies/${activeQuarterCode}/cover.png`;

  // Fetch the lessons index BEFORE writing the quarterly row, so a failed or
  // empty lessons fetch can't leave behind a "fresh" quarterly with no lessons
  // (which previously suppressed resync for 24h via shouldSync).
  const lessonsIndex = await fetchJson(
    `${BASE_URL}/${lang}/quarterlies/${activeQuarterCode}/lessons/index.json`
  );
  const lessonItems = extractCollection(lessonsIndex, ["lessons", "items", "data"]);
  if (lessonItems.length === 0) {
    console.error(
      `[SabbathSchool] Lessons index for ${activeQuarterCode} (${lang}) returned no lessons — aborting sync of this quarter so it will be retried.`
    );
    return null;
  }

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
        title: quarterTitle,
        description: quarterDescription,
        humanDate: quarterHumanDate,
        startDate: quarterStartDate,
        endDate: quarterEndDate,
        colorPrimary: quarterColorPrimary,
        coverUrl: quarterCoverUrl,
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
        title: quarterTitle,
        description: quarterDescription,
        humanDate: quarterHumanDate,
        startDate: quarterStartDate,
        endDate: quarterEndDate,
        colorPrimary: quarterColorPrimary,
        coverUrl: quarterCoverUrl,
        lastSyncedAt: new Date(),
      })
      .returning();
    quarterlyId = inserted.id;
  }

  const updatedLessonIds: string[] = [];

  for (let i = 0; i < lessonItems.length; i++) {
    const lessonItem = lessonItems[i];
    const lessonNum = getLessonNumberFromItem(lessonItem, i);
    const lessonCode = getLessonCodeFromItem(lessonItem) || String(lessonNum).padStart(2, "0");
    const lessonTitle = pickString(lessonItem, ["title", "name"]) || `Lesson ${lessonNum}`;
    const lessonStartDate = pickString(lessonItem, ["start_date", "startDate"]);
    const lessonEndDate = pickString(lessonItem, ["end_date", "endDate"]);

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
          title: lessonTitle,
          startDate: lessonStartDate,
          endDate: lessonEndDate,
        })
        .where(eq(sabbathSchoolLessons.id, lessonId));
      updatedLessonIds.push(lessonId);
    } else {
      const [insertedLesson] = await db
        .insert(sabbathSchoolLessons)
        .values({
          quarterlyId,
          lessonNumber: lessonNum,
          title: lessonTitle,
          startDate: lessonStartDate,
          endDate: lessonEndDate,
        })
        .returning();
      lessonId = insertedLesson.id;
      updatedLessonIds.push(lessonId);
    }

    const extractedDayCodes = extractDayCodes(lessonItem);
    const dayCodes =
      extractedDayCodes.length > 0
        ? extractedDayCodes
        : Array.from({ length: 7 }, (_, idx) => String(idx + 1).padStart(2, "0"));

    for (const dayCode of dayCodes) {
      const dayNum = parseInt(dayCode, 10);
      if (Number.isNaN(dayNum)) continue;
      const dayPayload = await fetchJson(
        `${BASE_URL}/${lang}/quarterlies/${activeQuarterCode}/lessons/${lessonCode}/days/${dayCode}/read/index.json`
      );
      if (!dayPayload) continue;

      const dayObj = asObject(dayPayload);
      const dayTitle = pickString(dayObj, ["title", "name", "dayTitle"]);
      const dayDate = pickString(dayObj, ["date", "fullDate", "dayDate"]);
      const contentBody = getDayContentMarkdown(dayPayload);

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

  try {
    await syncQuarterlyAudio(activeQuarterCode, lang);
  } catch (err) {
    console.error(`[SabbathSchool] Audio sync failed for ${activeQuarterCode}:`, err);
  }
  try {
    await syncQuarterlyVideos(activeQuarterCode, lang);
  } catch (err) {
    console.error(`[SabbathSchool] Video sync failed for ${activeQuarterCode}:`, err);
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

type VideoClipPayload = {
  title: string | null;
  src: string;
  thumbnail: string | null;
  duration: string | null;
  target: string | null;
  dayNumber: number | null;
};

type VideoArtistPayload = {
  artist: string;
  clips: VideoClipPayload[];
};

export async function syncQuarterlyAudio(quarterCode: string, lang: string = "en"): Promise<void> {
  const audioPayload = await fetchJson(
    `${BASE_URL}/${lang}/quarterlies/${quarterCode}/audio.json`
  );
  if (!audioPayload) return;

  const audioMetadata = extractSabbathSchoolAudioMetadata(
    audioPayload,
    quarterCode,
    lang
  );
  if (audioMetadata.length === 0) {
    console.error(
      `[SabbathSchool] Audio feed for ${quarterCode} (${lang}) contained no usable lesson-day MP3s; preserving existing audio URLs.`
    );
    return;
  }

  const [quarterly] = await db
    .select()
    .from(sabbathSchoolQuarterlies)
    .where(eq(sabbathSchoolQuarterlies.quarterCode, quarterCode))
    .limit(1);
  if (!quarterly) return;

  const lessons = await db
    .select()
    .from(sabbathSchoolLessons)
    .where(eq(sabbathSchoolLessons.quarterlyId, quarterly.id));
  if (lessons.length === 0) return;

  const lessonIds = lessons.map((lesson) => lesson.id);
  const lessonByNumber = new Map<number, string>(
    lessons.map((lesson) => [lesson.lessonNumber, lesson.id])
  );

  const days = await db
    .select()
    .from(sabbathSchoolDays)
    .where(inArray(sabbathSchoolDays.lessonId, lessonIds));
  const dayByLessonAndNumber = new Map<string, string>();
  for (const day of days) {
    dayByLessonAndNumber.set(`${day.lessonId}:${day.dayNumber}`, day.id);
  }

  const updates = new Map<string, string>();

  for (const metadata of audioMetadata) {
    const lessonId = lessonByNumber.get(metadata.lessonNumber);
    if (!lessonId) continue;
    const dayId = dayByLessonAndNumber.get(`${lessonId}:${metadata.dayNumber}`);
    if (!dayId) continue;
    updates.set(dayId, metadata.audioUrl);
  }

  if (updates.size === 0) {
    console.error(
      `[SabbathSchool] Audio feed for ${quarterCode} (${lang}) did not match any stored lesson days; preserving existing audio URLs.`
    );
    return;
  }

  await db.transaction(async (tx) => {
    for (const [dayId, audioUrl] of updates.entries()) {
      await tx
        .update(sabbathSchoolDays)
        .set({ audioUrl })
        .where(eq(sabbathSchoolDays.id, dayId));
    }

    const invalidStoredDayIds = days
      .filter(
        (day) =>
          day.audioUrl &&
          !updates.has(day.id) &&
          normalizeSabbathSchoolAudioUrl(day.audioUrl) === null
      )
      .map((day) => day.id);
    if (invalidStoredDayIds.length > 0) {
      await tx
        .update(sabbathSchoolDays)
        .set({ audioUrl: null })
        .where(inArray(sabbathSchoolDays.id, invalidStoredDayIds));
    }
  });

  console.log(
    `[SabbathSchool] Mapped ${updates.size} usable lesson-day audio tracks for ${quarterCode} (${lang}).`
  );
}

export async function syncQuarterlyVideos(quarterCode: string, lang: string = "en"): Promise<void> {
  const videoPayload = await fetchJson(
    `${BASE_URL}/${lang}/quarterlies/${quarterCode}/video.json`
  );
  if (!videoPayload) return;

  const [quarterly] = await db
    .select()
    .from(sabbathSchoolQuarterlies)
    .where(eq(sabbathSchoolQuarterlies.quarterCode, quarterCode))
    .limit(1);
  if (!quarterly) return;

  const lessons = await db
    .select()
    .from(sabbathSchoolLessons)
    .where(eq(sabbathSchoolLessons.quarterlyId, quarterly.id));
  if (lessons.length === 0) return;

  const lessonByNumber = new Map<number, { id: string }>(
    lessons.map((lesson) => [lesson.lessonNumber, { id: lesson.id }])
  );

  await db
    .update(sabbathSchoolLessons)
    .set({ videoByArtist: null })
    .where(eq(sabbathSchoolLessons.quarterlyId, quarterly.id));

  const mediaEntries = collectObjectsDeep(videoPayload);
  const lessonGroups = new Map<string, Map<string, VideoClipPayload[]>>();

  for (const entry of mediaEntries) {
    const videoUrl = getMediaUrl(entry, ["video", "videoUrl", "src", "url", "href", "file", "path"]);
    if (!videoUrl) continue;
    if (!/(youtube|youtu\.be|vimeo|\.mp4|\.m3u8)/i.test(videoUrl)) continue;

    const lessonNumber = getLessonNumberFromMediaEntry(entry);
    if (lessonNumber === null) continue;
    const lesson = lessonByNumber.get(lessonNumber);
    if (!lesson) continue;

    const artist = pickString(entry, ["artist", "speaker", "presenter", "author", "name"]) || "Unknown";
    const clip: VideoClipPayload = {
      title: pickString(entry, ["title", "name", "description"]),
      src: videoUrl,
      thumbnail: getMediaUrl(entry, ["thumbnail", "thumbnailUrl", "thumb", "image"]),
      duration: pickString(entry, ["duration", "length"]),
      target: pickString(entry, ["target", "reference", "id"]),
      dayNumber: getDayNumberFromMediaEntry(entry),
    };

    if (!lessonGroups.has(lesson.id)) {
      lessonGroups.set(lesson.id, new Map<string, VideoClipPayload[]>());
    }
    const byArtist = lessonGroups.get(lesson.id)!;
    if (!byArtist.has(artist)) {
      byArtist.set(artist, []);
    }
    byArtist.get(artist)!.push(clip);
  }

  for (const [lessonId, artistMap] of lessonGroups.entries()) {
    const payload: VideoArtistPayload[] = Array.from(artistMap.entries()).map(([artist, clips]) => ({
      artist,
      clips,
    }));

    await db
      .update(sabbathSchoolLessons)
      .set({ videoByArtist: payload })
      .where(eq(sabbathSchoolLessons.id, lessonId));
  }
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

  // Only treat a quarter as "existing" if it actually has lessons — a
  // quarterly row with zero lessons is a partial sync and must be retried.
  const existingQuarters = await db
    .select({ quarterCode: sabbathSchoolQuarterlies.quarterCode })
    .from(sabbathSchoolQuarterlies)
    .where(
      sql`EXISTS (SELECT 1 FROM ${sabbathSchoolLessons} WHERE ${sabbathSchoolLessons.quarterlyId} = ${sabbathSchoolQuarterlies.id})`
    );
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

export async function getCurrentLessonNumber(
  quarterlyId: string,
  timeZone = "UTC",
  now = new Date()
): Promise<number> {
  const today = sabbathSchoolDateAtUtcMidnight(now, timeZone);

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
    // A quarterly with no lessons is a partial/failed sync — always repair it,
    // regardless of how recently lastSyncedAt was stamped.
    const lessonCount = await db
      .select({ id: sabbathSchoolLessons.id })
      .from(sabbathSchoolLessons)
      .where(eq(sabbathSchoolLessons.quarterlyId, currentQ[0].id))
      .limit(1);
    if (lessonCount.length === 0) {
      console.warn(
        `[SabbathSchool] Quarterly ${currentQ[0].quarterCode} exists but has zero lessons — forcing resync.`
      );
      return true;
    }

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
