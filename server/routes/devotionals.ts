import { Router } from "express";
  import { db } from "../db";
  import { cachedResponse } from "../middleware/response-cache";
  import { getErrorStatusCode } from "../services/ai-semaphore";
  import {
    devotionalPlans,
    devotionalDays,
    userPlanEnrollments,
    userPlanProgress,
    bibleVerses,
    bibleBooks,
  } from "../../shared/schema";
  import { eq, and, sql, desc, asc } from "drizzle-orm";
  import { optionalAuth, getEffectiveUserId } from "../middleware/auth";
  import { generateScripturalEncouragement } from "../services/ai-engine";
  import type { StudyDepth } from "../services/ai-engine";
  import { translateObject, translateBatch } from "../services/translationService";
  import { normalizeLanguageCode } from "../services/languageAwareContent";

  const router = Router();

  router.get("/api/devotionals/plans", cachedResponse(120), async (req, res) => {
  try {
    const traditionKey = String(req.query.traditionKey || "all");
    const lang = normalizeLanguageCode(String(req.query.lang || "en"));
    const conditions = [eq(devotionalPlans.isPublished, true)];
    if (traditionKey !== "all") {
      conditions.push(eq(devotionalPlans.traditionKey, traditionKey));
    }
    let plans = await db
      .select()
      .from(devotionalPlans)
      .where(and(...conditions));

    if (lang !== "en") {
      plans = await Promise.all(
        plans.map((p) => translateObject(p, lang, ["title", "description"] as any))
      );
    }

    return res.json(plans);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/devotionals/plans/:planId/days", optionalAuth, async (req, res) => {
  try {
    const days = await db
      .select()
      .from(devotionalDays)
      .where(eq(devotionalDays.planId, String(req.params.planId)))
      .orderBy(devotionalDays.dayNumber);
    return res.json(days);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.post("/api/devotionals/enroll", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ error: "planId is required" });
    }

    const existing = await db
      .select()
      .from(userPlanEnrollments)
      .where(
        and(
          eq(userPlanEnrollments.userId, userId),
          eq(userPlanEnrollments.planId, planId)
        )
      )
      .limit(1);

    if (existing.length) {
      return res.json({ enrollment: existing[0], alreadyEnrolled: true });
    }

    const enrollment = await db
      .insert(userPlanEnrollments)
      .values({ userId, planId })
      .returning();

    return res.json({ enrollment: enrollment[0], alreadyEnrolled: false });
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/devotionals/user-progress", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);

    const enrollments = await db
      .select()
      .from(userPlanEnrollments)
      .where(eq(userPlanEnrollments.userId, userId));

    if (!enrollments.length) {
      return res.json([]);
    }

    const results = await Promise.all(
      enrollments.map(async (enrollment) => {
        const allDays = await db
          .select()
          .from(devotionalDays)
          .where(eq(devotionalDays.planId, enrollment.planId))
          .orderBy(devotionalDays.dayNumber);

        const completedDays = await db
          .select()
          .from(userPlanProgress)
          .where(eq(userPlanProgress.enrollmentId, enrollment.id));

        return {
          planId: enrollment.planId,
          isActive: enrollment.isActive,
          completedCount: completedDays.length,
          totalDays: allDays.length,
        };
      })
    );

    return res.json(results);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/devotionals/today", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const { planId, depth } = req.query;
    const lang = normalizeLanguageCode(String(req.query.lang || "en"));

    const conditions = [
      eq(userPlanEnrollments.userId, userId),
      eq(userPlanEnrollments.isActive, true),
    ];
    if (planId) {
      conditions.push(eq(userPlanEnrollments.planId, String(planId)));
    }

    const activeEnrollment = await db
      .select()
      .from(userPlanEnrollments)
      .where(and(...conditions))
      .orderBy(desc(userPlanEnrollments.enrolledAt))
      .limit(1);

    if (!activeEnrollment.length) {
      return res.json({ today: null, message: "No active plan enrollment" });
    }

    const completedDays = await db
      .select()
      .from(userPlanProgress)
      .where(eq(userPlanProgress.enrollmentId, activeEnrollment[0].id));

    const completedDayIds = new Set(completedDays.map((p) => p.dayId));

    const allDays = await db
      .select()
      .from(devotionalDays)
      .where(eq(devotionalDays.planId, activeEnrollment[0].planId))
      .orderBy(devotionalDays.dayNumber);

    const todayDay = allDays.find((d) => !completedDayIds.has(d.id));

    if (!todayDay) {
      await db
        .update(userPlanEnrollments)
        .set({ isActive: false })
        .where(eq(userPlanEnrollments.id, activeEnrollment[0].id));
      return res.json({ today: null, message: "Plan completed!", planComplete: true, completedPlanId: activeEnrollment[0].planId });
    }

    const [plan] = await db
      .select({ title: devotionalPlans.title })
      .from(devotionalPlans)
      .where(eq(devotionalPlans.id, activeEnrollment[0].planId))
      .limit(1);

    let translatedDay: typeof todayDay = todayDay;
    let translatedPlanTitle = plan?.title ?? null;

    if (lang !== "en") {
      translatedDay = await translateObject(todayDay, lang, [
        "title", "passageLabel", "contextNote", "historicVoiceExcerpt", "prayerPrompt",
      ] as any);
      // Translate reflection questions array
      if (Array.isArray(todayDay.reflectionQuestions) && todayDay.reflectionQuestions.length) {
        const translated = await translateBatch(todayDay.reflectionQuestions as string[], lang);
        (translatedDay as any).reflectionQuestions = translated;
      }
      if (plan?.title) {
        const [tt] = await translateBatch([plan.title], lang);
        translatedPlanTitle = tt;
      }
    }

    return res.json({
      today: translatedDay,
      enrollment: {
        ...activeEnrollment[0],
        plan: plan ? { title: translatedPlanTitle } : null,
      },
      completedCount: completedDays.length,
      totalDays: allDays.length,
      depth: depth || "standard",
    });
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.post("/api/devotionals/reflect", optionalAuth, async (req, res) => {
  const userId = getEffectiveUserId(req);
  if (userId === "guest") {
    return res.status(401).json({ error: "Authentication required for AI reflections" });
  }
  try {
    const { question, userAnswer, passageLabel, dayTitle, previousExchanges } = req.body;
    if (!question || !userAnswer) {
      return res.status(400).json({ error: "Question and answer are required" });
    }
    const cappedHistory = Array.isArray(previousExchanges)
      ? previousExchanges.slice(-6)
      : [];
    const { generateReflectionResponse } = await import("../services/ai-engine");
    const result = await generateReflectionResponse({
      question,
      userAnswer: userAnswer.trim().slice(0, 2000),
      passageLabel,
      dayTitle,
      previousExchanges: cappedHistory,
    });
    return res.json(result);
  } catch (err) {
    console.error("Reflection response error:", err);
    return res.json({
      response: "Thank you for sharing your reflection. Your thoughtfulness in engaging with God's Word is encouraging. Keep seeking Him through scripture.",
      followUp: null,
    });
  }
});


router.post("/api/reading-plans/generate", (_req, res) => {
  return res.status(503).json({ error: "AI plan generation is currently disabled." });
});

router.post("/api/reading-plans/generate-disabled", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const { topic, durationDays, difficulty, depth } = req.body;
    if (!topic || !durationDays) {
      return res.status(400).json({ error: "topic and durationDays are required" });
    }

    const studyDepth = (depth || "standard") as StudyDepth;
    const { generateReadingPlan, resolveBookId } = await import("../services/ai-engine");

    const plan = await generateReadingPlan({
      topic: String(topic).slice(0, 200),
      durationDays: Math.min(Math.max(Number(durationDays), 3), 30),
      difficulty: String(difficulty || "intermediate"),
    });

    const [savedPlan] = await db
      .insert(devotionalPlans)
      .values({
        title: plan.title,
        description: plan.description,
        totalDays: plan.days.length,
        theme: plan.theme,
        targetGoals: plan.targetGoals,
        difficultyLevel: difficulty || "intermediate",
        estimatedMinutesPerDay: plan.estimatedMinutesPerDay,
        isPublished: false,
        isAiGenerated: true,
        generatedForUserId: userId || null,
      })
      .returning();

    const dayValues = plan.days.map((day) => {
      const bookId = resolveBookId(day.bookName);
      return {
        planId: savedPlan.id,
        dayNumber: day.dayNumber,
        title: day.title,
        bookId,
        chapter: day.chapter,
        verseStart: day.verseStart,
        verseEnd: day.verseEnd,
        passageLabel: day.passageLabel,
        contextNote: day.contextNote,
        reflectionQuestions: day.reflectionQuestions,
        prayerPrompt: day.prayerPrompt,
        thenContext: day.thenContext,
        nowApplication: day.nowApplication,
      };
    });

    if (dayValues.length > 0) {
      await db.insert(devotionalDays).values(dayValues);
    }

    const savedDays = await db
      .select()
      .from(devotionalDays)
      .where(eq(devotionalDays.planId, savedPlan.id))
      .orderBy(devotionalDays.dayNumber);

    return res.json({ plan: savedPlan, days: savedDays });
  } catch (err: any) {
    console.error("Generate reading plan error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate reading plan" });
  }
});

  export default router;
  