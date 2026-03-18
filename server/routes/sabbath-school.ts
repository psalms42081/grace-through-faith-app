import { Router } from "express";
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
import { requireAuth, getAuthUserId } from "../middleware/auth";
import { generateDiscussionPrep } from "../services/ai-engine";
import {
  getCurrentLessonNumber,
  getMostRecentQuarterly,
  syncCurrentQuarter,
} from "../services/sabbath-school-sync";

const router = Router();

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

router.get("/api/sabbath-school/current", async (req, res) => {
  try {
    const userId = getAuthUserId(req) || "guest";

    let q = await getMostRecentQuarterly();

    if (!q) {
      try {
        await syncCurrentQuarter("en");
        q = await getMostRecentQuarterly();
      } catch {}
    }

    if (!q) {
      return res.json({ quarterly: null, currentLesson: null, message: "No quarterly available" });
    }

    const currentLessonNum = await getCurrentLessonNumber(q.id);

    const lessons = await db
      .select()
      .from(sabbathSchoolLessons)
      .where(eq(sabbathSchoolLessons.quarterlyId, q.id))
      .orderBy(sabbathSchoolLessons.lessonNumber);

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
      completed: progress.some((p) => p.dayId === day.id && p.completed),
      journalEntry:
        progress.find((p) => p.dayId === day.id)?.journalEntry || null,
    }));

    const now = new Date();
    const todayStr = `${String(now.getUTCDate()).padStart(2, "0")}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${now.getUTCFullYear()}`;
    const todayDayNumber = daysWithProgress.find((d) => d.date === todayStr)?.dayNumber || null;

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
    const userId = getAuthUserId(req) || "guest";
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
    const quarters = await db
      .select()
      .from(sabbathSchoolQuarterlies)
      .orderBy(desc(sabbathSchoolQuarterlies.quarterCode));

    return res.json({ quarters });
  } catch (err) {
    console.error("Sabbath School quarters error:", err);
    return res.status(500).json({ error: "Failed to fetch quarters" });
  }
});

router.get("/api/sabbath-school/quarter/:quarterCode", async (req, res) => {
  try {
    const userId = getAuthUserId(req) || "guest";
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
    const userId = getAuthUserId(req) || "guest";
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
