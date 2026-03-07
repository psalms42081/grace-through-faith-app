import { Router } from "express";
  import { db } from "../db";
  import {
    devotionalPlans,
    devotionalDays,
    userPlanEnrollments,
    userPlanProgress,
    bibleVerses,
    bibleBooks,
  } from "../../shared/schema";
  import { eq, and, sql, desc, asc } from "drizzle-orm";
  import { extractUserId } from "../middleware/auth";
  import { generateScripturalEncouragement } from "../services/ai-engine";
  import type { StudyDepth } from "../services/ai-engine";

  const router = Router();

  router.get("/api/devotionals/plans", async (req, res) => {
  try {
    const traditionKey = String(req.query.traditionKey || "all");
    const conditions = [eq(devotionalPlans.isPublished, true)];
    if (traditionKey !== "all") {
      conditions.push(eq(devotionalPlans.traditionKey, traditionKey));
    }
    const plans = await db
      .select()
      .from(devotionalPlans)
      .where(and(...conditions));
    return res.json(plans);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/devotionals/plans/:planId/days", async (req, res) => {
  try {
    const days = await db
      .select()
      .from(devotionalDays)
      .where(eq(devotionalDays.planId, String(req.params.planId)))
      .orderBy(devotionalDays.dayNumber);
    return res.json(days);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/devotionals/enroll", async (req, res) => {
  try {
    const { userId, planId } = req.body;
    if (!userId || !planId) {
      return res.status(400).json({ error: "userId and planId are required" });
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
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/devotionals/user-progress", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const enrollments = await db
      .select()
      .from(userPlanEnrollments)
      .where(eq(userPlanEnrollments.userId, String(userId)));

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
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/devotionals/today", async (req, res) => {
  try {
    const { userId, planId, depth } = req.query;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const conditions = [
      eq(userPlanEnrollments.userId, String(userId)),
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

    return res.json({
      today: todayDay,
      enrollment: activeEnrollment[0],
      completedCount: completedDays.length,
      totalDays: allDays.length,
      depth: depth || "standard",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/devotionals/reflect", async (req, res) => {
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


router.post("/api/reading-plans/generate", async (req, res) => {
  try {
    const { topic, durationDays, difficulty, userId, depth } = req.body;
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
  