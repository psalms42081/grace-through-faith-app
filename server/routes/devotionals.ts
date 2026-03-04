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

router.get("/api/devotionals/today", async (req, res) => {
  try {
    const { userId, planId } = req.query;
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


  export default router;
  