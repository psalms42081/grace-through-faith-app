import { Router } from "express";
  import { db } from "../db";
  import {
    kidsCollections,
    kidsStories,
    kidsQuizQuestions,
    kidsProgress,
    kidsBadges,
    kidsUserBadges,
    kidsStreaks,
    kidsWonderCache,
    kidsStoryScenes,
    childProfiles,
    dinnerTableTopics,
  } from "../../shared/schema";
  import { eq, and, sql, desc, asc } from "drizzle-orm";
  import { extractUserId } from "../middleware/auth";
  import {
    generatePauseAndWonder,
    generateStoryScenes,
    generateSceneImage,
    generateDinnerTableTopic,
  } from "../services/ai-engine";

  const router = Router();

  router.get("/api/kids/collections", async (req, res) => {
  try {
    const { ageGroup } = req.query;
    const conditions = [eq(kidsCollections.published, true)];
    if (ageGroup) {
      conditions.push(eq(kidsCollections.ageGroup, String(ageGroup)));
    }
    const collections = await db
      .select()
      .from(kidsCollections)
      .where(and(...conditions))
      .orderBy(kidsCollections.orderIndex);
    return res.json(collections);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/kids/collections/:id/stories", async (req, res) => {
  try {
    const stories = await db
      .select()
      .from(kidsStories)
      .where(
        and(
          eq(kidsStories.collectionId, req.params.id),
          eq(kidsStories.published, true)
        )
      )
      .orderBy(kidsStories.orderInCollection);
    return res.json(stories);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/kids/stories/:id", async (req, res) => {
  try {
    const story = await db
      .select()
      .from(kidsStories)
      .where(eq(kidsStories.id, req.params.id))
      .limit(1);
    if (!story.length) {
      return res.status(404).json({ error: "Story not found" });
    }
    return res.json(story[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/kids/stories/:id/quiz", async (req, res) => {
  try {
    const questions = await db
      .select()
      .from(kidsQuizQuestions)
      .where(eq(kidsQuizQuestions.storyId, req.params.id));
    return res.json(questions);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/kids/progress/complete", async (req, res) => {
  try {
    const { userId, storyId } = req.body;
    if (!userId || !storyId) {
      return res.status(400).json({ error: "userId and storyId are required" });
    }
    const existing = await db
      .select()
      .from(kidsProgress)
      .where(
        and(
          eq(kidsProgress.userId, userId),
          eq(kidsProgress.storyId, storyId)
        )
      )
      .limit(1);
    if (existing.length) {
      const updated = await db
        .update(kidsProgress)
        .set({ completed: true, completedAt: new Date() })
        .where(eq(kidsProgress.id, existing[0].id))
        .returning();
      return res.json(updated[0]);
    }
    const progress = await db
      .insert(kidsProgress)
      .values({ userId, storyId, completed: true, completedAt: new Date() })
      .returning();
    return res.json(progress[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

async function triggerParentBridge(storyId: string, quizScore: number, childProfileId?: string) {
  if (!childProfileId) return;

  const [child] = await db.select().from(childProfiles).where(eq(childProfiles.id, childProfileId)).limit(1);
  if (!child) return;

  const [story] = await db
    .select({ title: kidsStories.title, scriptureRef: kidsStories.scriptureRef })
    .from(kidsStories)
    .where(eq(kidsStories.id, storyId))
    .limit(1);
  if (!story) return;

  const topicData = await generateDinnerTableTopic({
    childName: child.name,
    storyTitle: story.title,
    scriptureRef: story.scriptureRef,
    quizScore,
  });

  await db.insert(dinnerTableTopics).values({
    parentId: child.parentId,
    childProfileId: child.id,
    childName: child.name,
    storyId,
    storyTitle: story.title,
    scriptureRef: story.scriptureRef,
    quizScore,
    notificationText: topicData.notificationText,
    dinnerQuestion: topicData.dinnerQuestion,
    followUpQuestions: topicData.followUpQuestions,
  });

  console.log(`\n📱 PUSH NOTIFICATION → Parent (${child.parentId}):`);
  console.log(`   ${topicData.notificationText}`);
  console.log(`   🍽️ Dinner Question: ${topicData.dinnerQuestion}\n`);
}

router.post("/api/kids/progress/quiz", async (req, res) => {
  try {
    const { userId, storyId, score, childProfileId } = req.body;
    if (!userId || !storyId || score === undefined) {
      return res.status(400).json({ error: "userId, storyId, and score are required" });
    }
    const existing = await db
      .select()
      .from(kidsProgress)
      .where(
        and(
          eq(kidsProgress.userId, userId),
          eq(kidsProgress.storyId, storyId)
        )
      )
      .limit(1);
    let result;
    if (existing.length) {
      const updated = await db
        .update(kidsProgress)
        .set({ quizScore: score })
        .where(eq(kidsProgress.id, existing[0].id))
        .returning();
      result = updated[0];
    } else {
      const [progress] = await db
        .insert(kidsProgress)
        .values({ userId, storyId, quizScore: score })
        .returning();
      result = progress;
    }

    triggerParentBridge(storyId, score, childProfileId).catch((err) =>
      console.error("Parent Bridge background error:", err)
    );

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/kids/progress/memorize", async (req, res) => {
  try {
    const { userId, storyId } = req.body;
    if (!userId || !storyId) {
      return res.status(400).json({ error: "userId and storyId are required" });
    }
    const existing = await db
      .select()
      .from(kidsProgress)
      .where(
        and(
          eq(kidsProgress.userId, userId),
          eq(kidsProgress.storyId, storyId)
        )
      )
      .limit(1);
    if (existing.length) {
      const updated = await db
        .update(kidsProgress)
        .set({ memoryVerseMemorized: true })
        .where(eq(kidsProgress.id, existing[0].id))
        .returning();
      return res.json(updated[0]);
    }
    const progress = await db
      .insert(kidsProgress)
      .values({ userId, storyId, memoryVerseMemorized: true })
      .returning();
    return res.json(progress[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/kids/progress/:userId", async (req, res) => {
  try {
    const progressRows = await db
      .select()
      .from(kidsProgress)
      .where(eq(kidsProgress.userId, req.params.userId));
    return res.json(progressRows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/kids/badges", async (_req, res) => {
  try {
    const badges = await db.select().from(kidsBadges);
    return res.json(badges);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/kids/badges/:userId", async (req, res) => {
  try {
    const userBadges = await db
      .select({
        userBadge: kidsUserBadges,
        badge: kidsBadges,
      })
      .from(kidsUserBadges)
      .innerJoin(kidsBadges, eq(kidsUserBadges.badgeId, kidsBadges.id))
      .where(eq(kidsUserBadges.userId, req.params.userId));
    const flattened = userBadges.map(ub => ({
      ...ub.badge,
      earnedAt: ub.userBadge.earnedAt,
    }));
    return res.json(flattened);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/kids/streak/:userId", async (req, res) => {
  try {
    const streak = await db
      .select()
      .from(kidsStreaks)
      .where(eq(kidsStreaks.userId, req.params.userId))
      .limit(1);
    if (!streak.length) {
      return res.json({ currentStreak: 0, longestStreak: 0, lastActivityDate: null });
    }
    return res.json(streak[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/kids/streak/update", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    const today = new Date().toISOString().split("T")[0];
    const existing = await db
      .select()
      .from(kidsStreaks)
      .where(eq(kidsStreaks.userId, userId))
      .limit(1);
    if (existing.length) {
      const streak = existing[0];
      if (streak.lastActivityDate === today) {
        return res.json(streak);
      }
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const isConsecutive = streak.lastActivityDate === yesterday;
      const newCurrent = isConsecutive ? (streak.currentStreak ?? 0) + 1 : 1;
      const newLongest = Math.max(newCurrent, streak.longestStreak ?? 0);
      const updated = await db
        .update(kidsStreaks)
        .set({
          currentStreak: newCurrent,
          longestStreak: newLongest,
          lastActivityDate: today,
        })
        .where(eq(kidsStreaks.id, streak.id))
        .returning();
      return res.json(updated[0]);
    }
    const newStreak = await db
      .insert(kidsStreaks)
      .values({ userId, currentStreak: 1, longestStreak: 1, lastActivityDate: today })
      .returning();
    return res.json(newStreak[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/kids/daily", async (req, res) => {
  try {
    const { ageGroup } = req.query;
    if (!ageGroup) {
      return res.status(400).json({ error: "ageGroup is required" });
    }
    const stories = await db
      .select()
      .from(kidsStories)
      .where(
        and(
          eq(kidsStories.ageGroup, String(ageGroup)),
          eq(kidsStories.published, true)
        )
      )
      .orderBy(kidsStories.orderInCollection);
    if (!stories.length) {
      return res.json(null);
    }
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    const todayStory = stories[dayOfYear % stories.length];
    return res.json(todayStory);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── KIDS INTERACTIVE STORYTELLER (Pause & Wonder) ─────────────────────────

router.get("/api/kids/stories/:id/wonder", async (req, res) => {
  try {
    const { id: storyId } = req.params;
    const ageGroup = String(req.query.ageGroup || "little_lambs");

    const cached = await db
      .select()
      .from(kidsWonderCache)
      .where(and(eq(kidsWonderCache.storyId, storyId), eq(kidsWonderCache.ageGroup, ageGroup)))
      .limit(1);

    if (cached.length) {
      return res.json({ moments: cached[0].moments });
    }

    const [story] = await db
      .select({ title: kidsStories.title, storyText: kidsStories.storyText })
      .from(kidsStories)
      .where(eq(kidsStories.id, storyId));

    if (!story) {
      return res.status(404).json({ error: "Story not found" });
    }

    const moments = await generatePauseAndWonder(story.title, story.storyText, ageGroup);

    await db.insert(kidsWonderCache).values({ storyId, ageGroup, moments }).onConflictDoNothing();

    return res.json({ moments });
  } catch (err) {
    console.error("Wonder generation error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/kids/wonder/answer", async (req, res) => {
  try {
    const { userId = "guest", storyId, momentIndex, childProfileId } = req.body;
    if (!storyId || momentIndex === undefined) {
      return res.status(400).json({ error: "storyId and momentIndex are required" });
    }

    const existing = await db
      .select()
      .from(kidsProgress)
      .where(and(eq(kidsProgress.userId, userId), eq(kidsProgress.storyId, storyId)))
      .limit(1);

    let currentAnswers: number[] = [];
    let isNewAnswer = false;

    if (existing.length) {
      currentAnswers = (existing[0].wonderAnswers as number[]) || [];
      if (!currentAnswers.includes(momentIndex)) {
        isNewAnswer = true;
        currentAnswers.push(momentIndex);
        await db
          .update(kidsProgress)
          .set({ wonderAnswers: currentAnswers })
          .where(eq(kidsProgress.id, existing[0].id));
      }
    } else {
      isNewAnswer = true;
      currentAnswers = [momentIndex];
      await db.insert(kidsProgress).values({
        userId,
        storyId,
        wonderAnswers: currentAnswers,
      });
    }

    if (isNewAnswer && childProfileId) {
      await db
        .update(childProfiles)
        .set({
          totalPoints: sql`${childProfiles.totalPoints} + 10`,
          currentLevel: sql`GREATEST(1, (${childProfiles.totalPoints} + 10) / 100 + 1)`,
        })
        .where(eq(childProfiles.id, childProfileId));
    }

    return res.json({ success: true, pointsAwarded: isNewAnswer ? 10 : 0, wonderAnswers: currentAnswers });
  } catch (err) {
    console.error("Wonder answer error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── KIDS STORY ENGINE (Scene-based) ────────────────────────────────────────

router.get("/api/kids/story/:id/scenes", async (req, res) => {
  try {
    const { id } = req.params;
    const scenes = await db
      .select()
      .from(kidsStoryScenes)
      .where(eq(kidsStoryScenes.storyId, id))
      .orderBy(asc(kidsStoryScenes.sceneIndex));
    return res.json(scenes);
  } catch (err) {
    console.error("Get scenes error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/kids/story/:id/generate", async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await db
      .select()
      .from(kidsStoryScenes)
      .where(eq(kidsStoryScenes.storyId, id))
      .orderBy(asc(kidsStoryScenes.sceneIndex));

    if (existing.length > 0) {
      return res.json(existing);
    }

    const story = await db
      .select()
      .from(kidsStories)
      .where(eq(kidsStories.id, id))
      .limit(1);

    if (!story.length) {
      return res.status(404).json({ error: "Story not found" });
    }

    const s = story[0];
    const scenes = await generateStoryScenes(
      s.title,
      s.storyText,
      s.scriptureRef,
      s.ageGroup
    );

    const inserted = [];
    for (const scene of scenes) {
      const [row] = await db
        .insert(kidsStoryScenes)
        .values({
          storyId: id,
          sceneIndex: scene.sceneIndex,
          narration: scene.narration,
          illustrationPrompt: scene.illustrationPrompt,
          mood: scene.mood || "PEACE",
          pauseAndWonder: scene.pauseAndWonder,
        })
        .returning();
      inserted.push(row);
    }

    return res.json(inserted);
  } catch (err) {
    console.error("Generate scenes error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/kids/scene/:id/generate-image", async (req, res) => {
  try {
    const { id } = req.params;
    const scene = await db
      .select()
      .from(kidsStoryScenes)
      .where(eq(kidsStoryScenes.id, id))
      .limit(1);

    if (!scene.length) {
      return res.status(404).json({ error: "Scene not found" });
    }

    if (scene[0].imageUrl) {
      return res.json({ imageUrl: scene[0].imageUrl });
    }

    const imageUrl = await generateSceneImage(
      scene[0].illustrationPrompt,
      id
    );

    if (!imageUrl) {
      return res.status(500).json({ error: "Image generation failed" });
    }

    await db
      .update(kidsStoryScenes)
      .set({ imageUrl })
      .where(eq(kidsStoryScenes.id, id));

    return res.json({ imageUrl });
  } catch (err) {
    console.error("Scene image generation error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/kids/audio-assets", (_req, res) => {
  res.json({
    AWE: {
      label: "Wonder & Awe",
      url: "https://cdn.pixabay.com/audio/2024/11/26/audio_d27ac6bfaf.mp3",
    },
    PEACE: {
      label: "Gentle Peace",
      url: "https://cdn.pixabay.com/audio/2022/02/23/audio_ea70ad08e3.mp3",
    },
    TENSION: {
      label: "Rising Tension",
      url: "https://cdn.pixabay.com/audio/2024/09/10/audio_6e1e4e5552.mp3",
    },
    JOY: {
      label: "Joyful Celebration",
      url: "https://cdn.pixabay.com/audio/2022/10/30/audio_9a8d089bbc.mp3",
    },
  });
});

router.post("/api/kids/story/award-points", async (req, res) => {
  try {
    const { userId = "guest", storyId, childProfileId: providedProfileId, points = 25 } = req.body;

    let profileId = providedProfileId;
    if (!profileId) {
      const [firstChild] = await db
        .select({ id: childProfiles.id })
        .from(childProfiles)
        .where(eq(childProfiles.parentId, userId))
        .limit(1);
      profileId = firstChild?.id;
    }

    if (!profileId) {
      return res.json({ success: true, totalPoints: 0, currentLevel: 1, leveledUp: false });
    }

    const before = await db
      .select({ totalPoints: childProfiles.totalPoints, currentLevel: childProfiles.currentLevel })
      .from(childProfiles)
      .where(eq(childProfiles.id, profileId))
      .limit(1);

    const oldLevel = before[0]?.currentLevel ?? 1;

    await db
      .update(childProfiles)
      .set({
        totalPoints: sql`${childProfiles.totalPoints} + ${points}`,
        currentLevel: sql`GREATEST(1, (${childProfiles.totalPoints} + ${points}) / 100 + 1)`,
      })
      .where(eq(childProfiles.id, profileId));

    const after = await db
      .select({ totalPoints: childProfiles.totalPoints, currentLevel: childProfiles.currentLevel })
      .from(childProfiles)
      .where(eq(childProfiles.id, profileId))
      .limit(1);

    const newLevel = after[0]?.currentLevel ?? 1;
    const totalPoints = after[0]?.totalPoints ?? 0;

    return res.json({
      success: true,
      totalPoints,
      currentLevel: newLevel,
      leveledUp: newLevel > oldLevel,
    });
  } catch (err) {
    console.error("Award points error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PRAYER JOURNAL ──────────────────────────────────────────────────────────


  export default router;
  