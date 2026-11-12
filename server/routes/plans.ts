import { Router } from "express";
import { db } from "../db";
import { readingPlans, planDays, userPlans, userReadingPlanDays, bibleBooks } from "../../shared/schema";
import { eq, asc, and, ne } from "drizzle-orm";
import { requireAuth, getAuthUserId } from "../middleware/auth";
import { cachedResponse } from "../middleware/response-cache";
import { getCalendarDate, normalizeTimeZone } from "../../shared/calendar-date";
import {
  PlanProgressUnavailable,
  openReadingTarget,
  readingPlanCards,
  recordPlanReading,
} from "../services/plan-reading-progress";

const router = Router();

router.get("/api/plans", cachedResponse(300), async (_req, res) => {
  try {
    const plans = await db
      .select()
      .from(readingPlans)
      // Custom plans are private journeys, not browseable catalog options.
      // Their detail and enrollment lookups intentionally remain unfiltered.
      .where(ne(readingPlans.type, "custom"))
      .orderBy(asc(readingPlans.category), asc(readingPlans.title));

    res.json(plans);
  } catch (err) {
    console.error("Plans list error:", err);
    res.status(500).json({ error: "Failed to fetch plans" });
  }
});

router.get("/api/plans/:id", cachedResponse(300), async (req, res) => {
  try {
    const id = String(req.params.id);
    const [plan] = await db
      .select()
      .from(readingPlans)
      .where(eq(readingPlans.id, id));

    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const days = await db
      .select()
      .from(planDays)
      .where(eq(planDays.planId, id))
      .orderBy(asc(planDays.dayNumber));

    res.json({ ...plan, days });
  } catch (err) {
    console.error("Plan detail error:", err);
    res.status(500).json({ error: "Failed to fetch plan" });
  }
});

router.post("/api/user-plans", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ error: "planId is required" });
    }

    const [plan] = await db
      .select()
      .from(readingPlans)
      .where(eq(readingPlans.id, planId));

    if (!plan) {
      return res.status(404).json({ error: "Plan not found" });
    }

    const existing = await db
      .select()
      .from(userPlans)
      .where(and(eq(userPlans.userId, userId), eq(userPlans.planId, planId)));

    if (existing.length > 0 && !existing[0].completedAt) {
      return res.status(409).json({ error: "Already enrolled in this plan" });
    }

    if (existing.length > 0) {
      try {
        await db.delete(userReadingPlanDays).where(eq(userReadingPlanDays.userPlanId, existing[0].id));
      } catch (err) {
        if (!(err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "42P01")) throw err;
      }
      const [restarted] = await db
        .update(userPlans)
        .set({
          startDate: new Date(),
          currentDay: 1,
          completedAt: null,
        })
        .where(and(eq(userPlans.id, existing[0].id), eq(userPlans.userId, userId)))
        .returning();
      return res.status(200).json(restarted);
    }

    const [enrolled] = await db
      .insert(userPlans)
      .values({
        userId,
        planId,
        startDate: new Date(),
        currentDay: 1,
      })
      .returning();

    res.status(201).json(enrolled);
  } catch (err) {
    console.error("Enroll plan error:", err);
    res.status(500).json({ error: "Failed to enroll in plan" });
  }
});

router.get("/api/user-plans", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;

    const enrolled = await db
      .select({
        id: userPlans.id,
        userId: userPlans.userId,
        planId: userPlans.planId,
        startDate: userPlans.startDate,
        currentDay: userPlans.currentDay,
        completedAt: userPlans.completedAt,
        notificationTime: userPlans.notificationTime,
        createdAt: userPlans.createdAt,
        planTitle: readingPlans.title,
        planDescription: readingPlans.description,
        planCategory: readingPlans.category,
        planCoverImageUrl: readingPlans.coverImageUrl,
        planDurationDays: readingPlans.durationDays,
        planType: readingPlans.type,
        planStatus: readingPlans.status,
      })
      .from(userPlans)
      .innerJoin(readingPlans, eq(userPlans.planId, readingPlans.id))
      .where(eq(userPlans.userId, userId))
      .orderBy(asc(userPlans.createdAt));

    const today = getCalendarDate(new Date(), normalizeTimeZone(req.query.timeZone)).dateKey;
    try {
      const cards = await readingPlanCards(enrolled, today);
      res.json(enrolled.map((row) => ({ ...row, progress: cards.get(row.id) ?? null })));
    } catch (err) {
      if (err instanceof PlanProgressUnavailable || (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "42P01")) {
        res.json(enrolled.map((row) => ({ ...row, progress: null })));
        return;
      }
      throw err;
    }
  } catch (err) {
    console.error("User plans list error:", err);
    res.status(500).json({ error: "Failed to fetch user plans" });
  }
});

router.patch("/api/user-plans/:id/day/:day", requireAuth, async (_req, res) => {
  res.status(409).json({ error: "A plan day is recorded when its reading is finished." });
});

router.get("/api/user-plans/reading-target", requireAuth, async (req, res) => {
  const bookId = Number(req.query.bookId);
  const chapter = Number(req.query.chapter);
  if (!bookId || !chapter) return res.status(400).json({ error: "bookId and chapter are required" });
  try {
    const target = await openReadingTarget(
      req.authUserId!,
      bookId,
      chapter,
      normalizeTimeZone(req.query.timeZone),
    );
    res.json(target);
  } catch (err) {
    if (err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "42P01") {
      return res.json({ active: false, verse: null });
    }
    console.error("Plan reading target error:", err);
    res.status(500).json({ error: "Failed to look up the reading" });
  }
});

router.post("/api/user-plans/read", requireAuth, async (req, res) => {
  const bookId = Number(req.body?.bookId);
  const chapter = Number(req.body?.chapter);
  const verse = Number(req.body?.verse);
  const translation = typeof req.body?.translation === "string" ? req.body.translation.trim().toUpperCase() : "";
  const source = req.body?.source === "listen" ? "listen" : "scroll";
  if (!bookId || !chapter || !verse || !translation) {
    return res.status(400).json({ error: "bookId, chapter, verse, and translation are required" });
  }
  try {
    const result = await recordPlanReading({
      userId: req.authUserId!,
      bookId,
      chapter,
      verse,
      translation,
      source,
      timeZone: normalizeTimeZone(req.body?.timeZone ?? req.query.timeZone),
      journalEntry: typeof req.body?.journalEntry === "string" ? req.body.journalEntry : null,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof PlanProgressUnavailable) {
      return res.status(503).json({ error: "Reading progress storage is not ready. Apply migration 0032." });
    }
    console.error("Plan reading progress error:", err);
    res.status(500).json({ error: "Failed to record reading" });
  }
});

router.post("/api/plans/custom", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { bookId, durationDays } = req.body;

    if (!bookId || !durationDays || durationDays < 1) {
      return res.status(400).json({ error: "bookId and durationDays are required" });
    }

    const [book] = await db
      .select()
      .from(bibleBooks)
      .where(eq(bibleBooks.id, bookId));

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const totalChapters = book.chapterCount;
    const chaptersPerDay = totalChapters / durationDays;

    const days: { dayNumber: number; bookId: number; chapter: number }[] = [];
    let chapterIdx = 0;

    for (let d = 1; d <= durationDays; d++) {
      const endChapter = d === durationDays
        ? totalChapters
        : Math.round(chaptersPerDay * d);
      const startChapter = chapterIdx + 1;

      for (let ch = startChapter; ch <= endChapter; ch++) {
        days.push({ dayNumber: d, bookId, chapter: ch });
      }

      chapterIdx = endChapter;
    }

    const [plan] = await db
      .insert(readingPlans)
      .values({
        title: `${book.name} in ${durationDays} Days`,
        description: `A custom reading plan to read through ${book.name} in ${durationDays} days.`,
        category: "Custom",
        durationDays,
        type: "custom",
        status: "active",
      })
      .returning();

    if (days.length > 0) {
      await db.insert(planDays).values(
        days.map((d) => ({
          planId: plan.id,
          dayNumber: d.dayNumber,
          bookId: d.bookId,
          chapter: d.chapter,
        }))
      );
    }

    const [enrollment] = await db
      .insert(userPlans)
      .values({
        userId,
        planId: plan.id,
        startDate: new Date(),
        currentDay: 1,
      })
      .returning();

    const allDays = await db
      .select()
      .from(planDays)
      .where(eq(planDays.planId, plan.id))
      .orderBy(asc(planDays.dayNumber));

    res.status(201).json({ ...plan, days: allDays, enrollment });
  } catch (err) {
    console.error("Custom plan error:", err);
    res.status(500).json({ error: "Failed to create custom plan" });
  }
});

export default router;
