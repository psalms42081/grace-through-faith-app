import { Router } from "express";
import fetch from "node-fetch";
import { db } from "../db";
import {
  sabbathSchoolQuarterlies,
  sabbathSchoolLessons,
  sabbathSchoolDays,
  sabbathSchoolUserProgress,
  sabbathSchoolDiscussionPrep,
  resources,
} from "../../shared/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import { extractUserId } from "../middleware/auth";
import {
  generateDiscussionPrep,
  generateSabbathSchoolTutorResponse,
} from "../services/ai-engine";
import {
  getCurrentLessonNumber,
  getMostRecentQuarterly,
  syncCurrentQuarter,
} from "../services/sabbath-school-sync";
import { normalizeSabbathSchoolAudioUrl } from "../services/sabbath-school-audio-metadata";
import {
  findTodayDayNumber,
  normalizeSabbathSchoolTimeZone,
} from "../services/sabbath-school-date";
import { createDayTutorRouter } from "./sabbath-school-tutor";
import {
  parseSabbathSchoolTrackId,
  tracksFromAvailableIds,
  type SabbathSchoolTrackId,
} from "../../lib/sabbath-school-tracks";

const router = Router();

router.get("/api/sabbath-school/video", async (req, res) => {
  const source = typeof req.query.url === "string" ? req.query.url : "";
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return res.status(400).json({ error: "Invalid video URL" });
  }

  if (
    sourceUrl.protocol !== "https:" ||
    sourceUrl.hostname !== "sabbath-school-media.adventech.io" ||
    !sourceUrl.pathname.startsWith("/video/")
  ) {
    return res.status(400).json({ error: "Unsupported video source" });
  }

  try {
    const headers: Record<string, string> = {};
    if (req.headers.range) headers.Range = req.headers.range;
    const controller = new AbortController();
    const connectionTimer = setTimeout(() => controller.abort(), 20_000);
    let upstream;
    try {
      upstream = await fetch(sourceUrl, {
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(connectionTimer);
    }
    if (!upstream.ok && upstream.status !== 206) {
      return res.status(502).json({ error: "Lesson video unavailable" });
    }

    res.status(upstream.status);
    for (const name of [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ]) {
      const value = upstream.headers.get(name);
      if (value) res.setHeader(name, value);
    }
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.removeHeader("Access-Control-Allow-Credentials");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    if (!upstream.body) return res.end();
    upstream.body.on("error", () => {
      if (!res.headersSent) res.status(502);
      res.end();
    });
    upstream.body.pipe(res);
    return;
  } catch {
    return res.status(502).json({ error: "Lesson video unavailable" });
  }
});

async function findDayTutorContext(lessonId: string, dayId: string) {
  const [context] = await db
    .select({
      quarterlyTitle: sabbathSchoolQuarterlies.title,
      lessonTitle: sabbathSchoolLessons.title,
      lessonNumber: sabbathSchoolLessons.lessonNumber,
      dayTitle: sabbathSchoolDays.title,
      dayNumber: sabbathSchoolDays.dayNumber,
      sourceContent: sabbathSchoolDays.contentMarkdown,
    })
    .from(sabbathSchoolDays)
    .innerJoin(
      sabbathSchoolLessons,
      eq(sabbathSchoolDays.lessonId, sabbathSchoolLessons.id)
    )
    .innerJoin(
      sabbathSchoolQuarterlies,
      eq(sabbathSchoolLessons.quarterlyId, sabbathSchoolQuarterlies.id)
    )
    .where(
      and(
        eq(sabbathSchoolDays.id, dayId),
        eq(sabbathSchoolLessons.id, lessonId)
      )
    )
    .limit(1);

  return context || null;
}

async function findCompanionForLesson(lessonId: string) {
  const [companion] = await db
    .select({
      id: resources.id,
      slug: resources.slug,
      title: resources.title,
      description: resources.description,
    })
    .from(resources)
    .where(
      and(
        eq(resources.resourceType, "sabbath-school-companion"),
        eq(resources.status, "published"),
        sql`${resources.sourceRef}->>'lessonId' = ${lessonId}`
      )
    )
    .limit(1);
  return companion || null;
}

async function findCompanionsForQuarterly(quarterlyId: string) {
  const companions = await db
    .select({
      id: resources.id,
      slug: resources.slug,
      title: resources.title,
      sourceRef: resources.sourceRef,
    })
    .from(resources)
    .where(
      and(
        eq(resources.resourceType, "sabbath-school-companion"),
        eq(resources.status, "published"),
        sql`${resources.sourceRef}->>'quarterlyId' = ${quarterlyId}`
      )
    );
  const map: Record<string, { slug: string; title: string }> = {};
  for (const c of companions) {
    const ref = c.sourceRef as any;
    if (ref?.lessonId) {
      map[ref.lessonId] = { slug: c.slug, title: c.title };
    }
  }
  return map;
}

router.get("/api/sabbath-school/tracks", async (_req, res) => {
  try {
    const rows = await db
      .selectDistinct({
        curriculumType: sabbathSchoolQuarterlies.curriculumType,
      })
      .from(sabbathSchoolQuarterlies)
      .innerJoin(
        sabbathSchoolLessons,
        eq(sabbathSchoolLessons.quarterlyId, sabbathSchoolQuarterlies.id),
      )
      .innerJoin(
        sabbathSchoolDays,
        eq(sabbathSchoolDays.lessonId, sabbathSchoolLessons.id),
      )
      .where(
        and(
          eq(sabbathSchoolQuarterlies.language, "en"),
          sql`coalesce(${sabbathSchoolDays.contentMarkdown}, '') <> ''`,
        ),
      );

    const availableIds = rows.map((row) => row.curriculumType);
    const tracks = tracksFromAvailableIds(availableIds).map((track) => ({
      id: track.id,
      shortLabel: track.shortLabel,
      pickerLabel: track.pickerLabel,
    }));

    return res.json({ tracks });
  } catch (err) {
    console.error("Sabbath School tracks error:", err);
    return res.status(500).json({ error: "Failed to fetch Sabbath School tracks" });
  }
});

router.get("/api/sabbath-school/current", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const curriculum: SabbathSchoolTrackId = parseSabbathSchoolTrackId(
      req.query.curriculum,
    );
    const timeZone = normalizeSabbathSchoolTimeZone(req.query.timeZone);
    const now = new Date();

    let q = (
      await db
        .select()
        .from(sabbathSchoolQuarterlies)
        .where(
          and(
            eq(sabbathSchoolQuarterlies.language, "en"),
            eq(sabbathSchoolQuarterlies.curriculumType, curriculum)
          )
        )
        .orderBy(desc(sabbathSchoolQuarterlies.quarterCode))
        .limit(1)
    )[0] || null;

    if (!q) {
      try {
        await syncCurrentQuarter("en");
        q = (
          await db
            .select()
            .from(sabbathSchoolQuarterlies)
            .where(
              and(
                eq(sabbathSchoolQuarterlies.language, "en"),
                eq(sabbathSchoolQuarterlies.curriculumType, curriculum)
              )
            )
            .orderBy(desc(sabbathSchoolQuarterlies.quarterCode))
            .limit(1)
        )[0] || null;
      } catch (err) {
        console.error("[SabbathSchool] On-demand quarterly sync failed:", err instanceof Error ? err.message : err);
      }
    }

    if (!q) {
      return res.json({ quarterly: null, currentLesson: null, message: "No quarterly available" });
    }

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
        console.error("[SabbathSchool] On-demand lesson repair sync failed:", err instanceof Error ? err.message : err);
      }
    }

    if (lessons.length === 0) {
      const allQuarters = await db
        .select()
        .from(sabbathSchoolQuarterlies)
        .where(
          and(
            eq(sabbathSchoolQuarterlies.language, "en"),
            eq(sabbathSchoolQuarterlies.curriculumType, curriculum)
          )
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

    const currentLessonNum = await getCurrentLessonNumber(q.id, timeZone, now);

    const currentLesson = lessons.find((l) => l.lessonNumber === currentLessonNum) || lessons[0];

    if (!currentLesson) {
      return res.json({ quarterly: q, currentLesson: null, lessons });
    }

    const days = await db
      .select()
      .from(sabbathSchoolDays)
      .where(eq(sabbathSchoolDays.lessonId, currentLesson.id))
      .orderBy(sabbathSchoolDays.dayNumber);

    const dayIds = days.map((d) => d.id);
    let progress: any[] = [];
    if (dayIds.length > 0) {
      const allProgress = await db
        .select()
        .from(sabbathSchoolUserProgress)
        .where(eq(sabbathSchoolUserProgress.userId, userId));
      progress = allProgress.filter((p) => dayIds.includes(p.dayId));
    }

    const daysWithProgress = days.map((day) => ({
      ...day,
      audioUrl: normalizeSabbathSchoolAudioUrl(day.audioUrl),
      completed: progress.some((p) => p.dayId === day.id && p.completed),
      journalEntry:
        progress.find((p) => p.dayId === day.id)?.journalEntry || null,
    }));

    const todayDayNumber = findTodayDayNumber(daysWithProgress, now, timeZone);

    const companion = await findCompanionForLesson(currentLesson.id);

    return res.json({
      quarterly: q,
      currentLesson: {
        ...currentLesson,
        days: daysWithProgress,
      },
      currentLessonNumber: currentLessonNum,
      totalLessons: lessons.length,
      completedDays: daysWithProgress.filter((d) => d.completed).length,
      todayDayNumber,
      companion,
    });
  } catch (err) {
    console.error("Sabbath School current error:", err);
    return res.status(500).json({ error: "Failed to fetch Sabbath School data" });
  }
});

router.get("/api/sabbath-school/lesson/:lessonNumber", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const lessonNumber = parseInt(req.params.lessonNumber);
    const quarterCode = req.query.quarterCode as string | undefined;

    let quarterly: any = null;
    if (quarterCode) {
      const [q] = await db.select().from(sabbathSchoolQuarterlies).where(eq(sabbathSchoolQuarterlies.quarterCode, quarterCode)).limit(1);
      quarterly = q || null;
    }
    if (!quarterly) {
      quarterly = await getMostRecentQuarterly();
    }

    if (!quarterly) {
      return res.status(404).json({ error: "Quarterly not found" });
    }

    const lesson = await db
      .select()
      .from(sabbathSchoolLessons)
      .where(
        and(
          eq(sabbathSchoolLessons.quarterlyId, quarterly.id),
          eq(sabbathSchoolLessons.lessonNumber, lessonNumber)
        )
      )
      .limit(1);

    if (lesson.length === 0) {
      return res.status(404).json({ error: "Lesson not found" });
    }

    const days = await db
      .select()
      .from(sabbathSchoolDays)
      .where(eq(sabbathSchoolDays.lessonId, lesson[0].id))
      .orderBy(sabbathSchoolDays.dayNumber);

    const dayIds = days.map((d) => d.id);
    let progress: any[] = [];
    if (dayIds.length > 0) {
      const allProgress = await db
        .select()
        .from(sabbathSchoolUserProgress)
        .where(eq(sabbathSchoolUserProgress.userId, userId));
      progress = allProgress.filter((p) => dayIds.includes(p.dayId));
    }

    const daysWithProgress = days.map((day) => ({
      ...day,
      audioUrl: normalizeSabbathSchoolAudioUrl(day.audioUrl),
      completed: progress.some((p) => p.dayId === day.id && p.completed),
      journalEntry:
        progress.find((p) => p.dayId === day.id)?.journalEntry || null,
    }));

    return res.json({
      lesson: {
        ...lesson[0],
        days: daysWithProgress,
      },
      quarterly,
    });
  } catch (err) {
    console.error("Sabbath School lesson error:", err);
    return res.status(500).json({ error: "Failed to fetch lesson" });
  }
});

router.get("/api/sabbath-school/quarters", async (req, res) => {
  try {
    const curriculum = req.query.curriculum
      ? parseSabbathSchoolTrackId(req.query.curriculum)
      : null;
    const quarters = await db
      .select()
      .from(sabbathSchoolQuarterlies)
      .where(
        curriculum
          ? and(
              eq(sabbathSchoolQuarterlies.language, "en"),
              eq(sabbathSchoolQuarterlies.curriculumType, curriculum),
            )
          : eq(sabbathSchoolQuarterlies.language, "en"),
      )
      .orderBy(desc(sabbathSchoolQuarterlies.quarterCode));

    return res.json({ quarters });
  } catch (err) {
    console.error("Sabbath School quarters error:", err);
    return res.status(500).json({ error: "Failed to fetch quarters" });
  }
});

router.get("/api/sabbath-school/quarter/:quarterCode", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { quarterCode } = req.params;

    const [quarterly] = await db
      .select()
      .from(sabbathSchoolQuarterlies)
      .where(eq(sabbathSchoolQuarterlies.quarterCode, quarterCode))
      .limit(1);

    if (!quarterly) {
      return res.status(404).json({ error: "Quarter not found" });
    }

    const lessons = await db
      .select()
      .from(sabbathSchoolLessons)
      .where(eq(sabbathSchoolLessons.quarterlyId, quarterly.id))
      .orderBy(sabbathSchoolLessons.lessonNumber);

    const companionMap = await findCompanionsForQuarterly(quarterly.id);

    const lessonsWithCompanions = lessons.map((l) => ({
      ...l,
      companion: companionMap[l.id] || null,
    }));

    return res.json({ quarterly, lessons: lessonsWithCompanions });
  } catch (err) {
    console.error("Sabbath School quarter detail error:", err);
    return res.status(500).json({ error: "Failed to fetch quarter detail" });
  }
});

router.post("/api/sabbath-school/complete", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { dayId, journalEntry } = req.body;

    if (!dayId) {
      return res.status(400).json({ error: "dayId is required" });
    }

    const existing = await db
      .select()
      .from(sabbathSchoolUserProgress)
      .where(
        and(
          eq(sabbathSchoolUserProgress.userId, userId),
          eq(sabbathSchoolUserProgress.dayId, dayId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(sabbathSchoolUserProgress)
        .set({
          completed: true,
          journalEntry: journalEntry || existing[0].journalEntry,
          completedAt: new Date(),
        })
        .where(eq(sabbathSchoolUserProgress.id, existing[0].id));
    } else {
      await db.insert(sabbathSchoolUserProgress).values({
        userId,
        dayId,
        completed: true,
        journalEntry: journalEntry || null,
        completedAt: new Date(),
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Sabbath School complete error:", err);
    return res.status(500).json({ error: "Failed to save progress" });
  }
});

router.use(
  createDayTutorRouter({
    findContext: findDayTutorContext,
    generateResponse: generateSabbathSchoolTutorResponse,
  }),
);

router.post(
  "/api/sabbath-school/discussion-prep",
  aiGenerationLimiter,
  async (req, res) => {
    try {
      const { lessonId, depth = "standard" } = req.body;

      if (!lessonId) {
        return res.status(400).json({ error: "lessonId is required" });
      }

      const cached = await db
        .select()
        .from(sabbathSchoolDiscussionPrep)
        .where(
          and(
            eq(sabbathSchoolDiscussionPrep.lessonId, lessonId),
            eq(sabbathSchoolDiscussionPrep.depth, depth)
          )
        )
        .limit(1);

      if (cached.length > 0) {
        // Fire video generation if not yet done
//        if (!cached[0].lifeApplicationVideoUrl) {
//          import("../services/lifeApplicationVideoService")
//            .then(({ generateLifeApplicationVideo }) => {
//              generateLifeApplicationVideo(
//                cached[0].id,
//                cached[0].reflectionPrompts as string[],
//                "Lesson"
//              ).catch(console.error);
//            });
//        }
        return res.json({
          keyQuestions: cached[0].keyQuestions,
          aiSummary: cached[0].aiSummary,
          reflectionPrompts: cached[0].reflectionPrompts,
          cached: true,
        });
      }

      const lesson = await db
        .select()
        .from(sabbathSchoolLessons)
        .where(eq(sabbathSchoolLessons.id, lessonId))
        .limit(1);

      if (lesson.length === 0) {
        return res.status(404).json({ error: "Lesson not found" });
      }

      const days = await db
        .select()
        .from(sabbathSchoolDays)
        .where(eq(sabbathSchoolDays.lessonId, lessonId))
        .orderBy(sabbathSchoolDays.dayNumber);

      const daysContent = days
        .map((d) => `## Day ${d.dayNumber}: ${d.title || ""}\n${d.contentMarkdown || ""}`)
        .join("\n\n");

      const result = await generateDiscussionPrep({
        lessonTitle: lesson[0].title,
        daysContent,
        depth: depth as any,
      });

      await db
        .insert(sabbathSchoolDiscussionPrep)
        .values({
          lessonId,
          keyQuestions: result.keyQuestions,
          aiSummary: result.aiSummary,
          reflectionPrompts: result.reflectionPrompts,
          depth,
        })
        .onConflictDoNothing();

      // Fire video generation in background — non-blocking
      const [inserted] = await db
        .select({ id: sabbathSchoolDiscussionPrep.id })
        .from(sabbathSchoolDiscussionPrep)
        .where(eq(sabbathSchoolDiscussionPrep.lessonId, lessonId))
        .limit(1);

//      if (inserted?.id) {
//        import("../services/lifeApplicationVideoService")
//          .then(({ generateLifeApplicationVideo }) => {
//            generateLifeApplicationVideo(
//              inserted.id,
//              result.reflectionPrompts,
//              lesson[0].title
//            ).catch(console.error);
//          });
//      }

      return res.json({
        ...result,
        cached: false,
      });
    } catch (err) {
      console.error("Discussion prep error:", err);
      return res.status(500).json({ error: "Failed to generate discussion guide" });
    }
  }
);

export default router;
