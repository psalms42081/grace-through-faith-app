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
    const allCollections = await db
      .select()
      .from(kidsCollections)
      .where(and(...conditions))
      .orderBy(kidsCollections.orderIndex);

    const seen = new Map<string, typeof allCollections[0]>();
    for (const col of allCollections) {
      const key = `${col.title}::${col.ageGroup}`;
      if (!seen.has(key)) {
        seen.set(key, col);
      }
    }
    const collections = Array.from(seen.values());

    const collectionsWithCounts = await Promise.all(
      collections.map(async (col) => {
        const [countResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(kidsStories)
          .where(
            and(
              eq(kidsStories.collectionId, col.id),
              eq(kidsStories.published, true)
            )
          );
        return { ...col, storyCount: countResult?.count ?? col.storyCount ?? 0 };
      })
    );

    return res.json(collectionsWithCounts);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/kids/collections/all/stories", async (req, res) => {
  try {
    const { ageGroup } = req.query;
    const conditions = [eq(kidsStories.published, true)];
    if (ageGroup) {
      conditions.push(eq(kidsStories.ageGroup, String(ageGroup)));
    }
    const stories = await db
      .select()
      .from(kidsStories)
      .where(and(...conditions))
      .orderBy(kidsStories.orderInCollection);
    return res.json(stories);
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

async function checkAndAwardBadges(userId: string) {
  try {
    const allBadges = await db.select().from(kidsBadges);
    const earned = await db.select({ badgeId: kidsUserBadges.badgeId }).from(kidsUserBadges).where(eq(kidsUserBadges.userId, userId));
    const earnedSet = new Set(earned.map(e => e.badgeId));

    const completedStories = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(kidsProgress)
      .where(and(eq(kidsProgress.userId, userId), eq(kidsProgress.completed, true)));
    const storyCount = completedStories[0]?.count ?? 0;

    const quizzes = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(kidsProgress)
      .where(and(eq(kidsProgress.userId, userId), sql`${kidsProgress.quizScore} = 100`));
    const perfectQuizCount = quizzes[0]?.count ?? 0;

    const verses = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(kidsProgress)
      .where(and(eq(kidsProgress.userId, userId), eq(kidsProgress.memoryVerseMemorized, true)));
    const verseCount = verses[0]?.count ?? 0;

    const streakData = await db.select().from(kidsStreaks).where(eq(kidsStreaks.userId, userId)).limit(1);
    const longestStreak = streakData[0]?.longestStreak ?? 0;

    const collectionProgress = await db.execute(sql`
      SELECT ks.collection_id, COUNT(*)::int as completed_count,
        (SELECT COUNT(*)::int FROM kids_story WHERE collection_id = ks.collection_id AND published = true) as total_count
      FROM kids_progress kp
      JOIN kids_story ks ON ks.id = kp.story_id
      WHERE kp.user_id = ${userId} AND kp.completed = true
      GROUP BY ks.collection_id
    `);
    const completedCollection = (collectionProgress as any).rows?.some((r: any) => r.completed_count >= r.total_count && r.total_count > 0);

    const badgesToAward: string[] = [];
    for (const badge of allBadges) {
      if (earnedSet.has(badge.id)) continue;
      let qualifies = false;
      switch (badge.requirement) {
        case "complete_story":
          qualifies = storyCount >= (badge.requiredCount ?? 1);
          break;
        case "memorize_verse":
          qualifies = verseCount >= (badge.requiredCount ?? 5);
          break;
        case "complete_collection":
          qualifies = !!completedCollection;
          break;
        case "streak_days":
          qualifies = longestStreak >= (badge.requiredCount ?? 7);
          break;
        case "perfect_quiz":
          qualifies = perfectQuizCount >= (badge.requiredCount ?? 5);
          break;
      }
      if (qualifies) badgesToAward.push(badge.id);
    }

    for (const badgeId of badgesToAward) {
      await db.insert(kidsUserBadges).values({ userId, badgeId }).onConflictDoNothing();
    }

    return badgesToAward.length;
  } catch (err) {
    console.error("[BadgeCheck] Error:", err);
    return 0;
  }
}

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
      const alreadyCompleted = existing[0].completed === true;
      const updated = await db
        .update(kidsProgress)
        .set({ completed: true, completedAt: new Date() })
        .where(eq(kidsProgress.id, existing[0].id))
        .returning();
      const badgesAwarded = await checkAndAwardBadges(userId);
      return res.json({ ...updated[0], firstCompletion: !alreadyCompleted, badgesAwarded });
    }
    const progress = await db
      .insert(kidsProgress)
      .values({ userId, storyId, completed: true, completedAt: new Date() })
      .returning();
    const badgesAwarded = await checkAndAwardBadges(userId);
    return res.json({ ...progress[0], firstCompletion: true, badgesAwarded });
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

router.post("/api/kids/scene/:id/attach-video", async (req, res) => {
  try {
    const { id } = req.params;
    const { videoUrl, timecodes } = req.body;
    if (!videoUrl) return res.status(400).json({ error: "videoUrl is required" });

    const scene = await db
      .select()
      .from(kidsStoryScenes)
      .where(eq(kidsStoryScenes.id, id))
      .limit(1);

    if (!scene.length) return res.status(404).json({ error: "Scene not found" });

    let videoTimecodes = timecodes || null;
    if (!videoTimecodes && scene[0].narration) {
      const sentences = scene[0].narration.match(/[^.!?]+[.!?]+/g) || [scene[0].narration];
      const totalWords = scene[0].narration.split(/\s+/).length;
      const estimatedDurationMs = totalWords * 350;
      let currentMs = 0;
      const segments = sentences.map((sentence) => {
        const sentenceWords = sentence.trim().split(/\s+/).length;
        const segmentDuration = (sentenceWords / totalWords) * estimatedDurationMs;
        const segment = {
          startMs: Math.round(currentMs),
          endMs: Math.round(currentMs + segmentDuration),
          text: sentence.trim(),
        };
        currentMs += segmentDuration;
        return segment;
      });
      videoTimecodes = { segments };
    }

    await db
      .update(kidsStoryScenes)
      .set({ videoUrl, videoTimecodes: videoTimecodes })
      .where(eq(kidsStoryScenes.id, id));

    return res.json({ success: true, videoUrl, videoTimecodes });
  } catch (err) {
    console.error("Attach video error:", err);
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
    if (!profileId && userId !== "guest") {
      const [directProfile] = await db
        .select({ id: childProfiles.id })
        .from(childProfiles)
        .where(eq(childProfiles.id, userId))
        .limit(1);
      if (directProfile) {
        profileId = directProfile.id;
      }
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

router.get("/api/kids/profile/:userId/stats", async (req, res) => {
  try {
    const { userId } = req.params;
    const [profile] = await db
      .select({
        totalPoints: childProfiles.totalPoints,
        currentLevel: childProfiles.currentLevel,
        name: childProfiles.name,
      })
      .from(childProfiles)
      .where(eq(childProfiles.id, userId))
      .limit(1);

    if (profile) {
      return res.json({
        totalPoints: profile.totalPoints ?? 0,
        currentLevel: profile.currentLevel ?? 1,
        name: profile.name,
      });
    }

    return res.json({ totalPoints: 0, currentLevel: 1, name: null });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── KIDS SABBATH SCHOOL ─────────────────────────────────────────────────────

interface SSLesson {
  title: string;
  storySummary: string;
  memoryVerse: string;
  memoryVerseRef: string;
  thinkAboutIt: string;
  prayer: string;
  linkedStorySearch: string;
}

const KIDS_SS_LESSONS: Record<string, SSLesson[]> = {
  little_lambs: [
    {
      title: "God Made the World",
      storySummary: "In the very beginning, God made everything! He made the bright sun, the blue sky, the tall trees, and all the animals. He made you too! Everything God made was good.",
      memoryVerse: "God saw all that he had made, and it was very good.",
      memoryVerseRef: "Genesis 1:31",
      thinkAboutIt: "What is your favorite thing God made? Can you draw it?",
      prayer: "Dear God, thank You for making the world so beautiful. Thank You for making me! Amen.",
      linkedStorySearch: "God Made the Light",
    },
    {
      title: "Noah and the Big Boat",
      storySummary: "God told Noah to build a very big boat called an ark. Noah listened to God even when people laughed at him. God kept Noah, his family, and the animals safe inside the ark when the big rain came.",
      memoryVerse: "Noah did everything just as God commanded him.",
      memoryVerseRef: "Genesis 6:22",
      thinkAboutIt: "If you were on the ark, which two animals would you want to sit next to?",
      prayer: "Dear God, help me to listen to You and obey, just like Noah did. Amen.",
      linkedStorySearch: "Noah Trusts God",
    },
    {
      title: "God Takes Care of Me",
      storySummary: "God takes care of the birds and the flowers. He feeds the birds every day and makes the flowers beautiful. If God takes care of them, He will take care of you too! You are very special to God.",
      memoryVerse: "Look at the birds of the air; your heavenly Father feeds them.",
      memoryVerseRef: "Matthew 6:26",
      thinkAboutIt: "Have you seen a bird today? Who feeds it?",
      prayer: "Dear God, thank You for taking care of me every day. I love You! Amen.",
      linkedStorySearch: "God Made the Animals",
    },
    {
      title: "Jesus Loves the Little Children",
      storySummary: "One day, parents brought their little children to see Jesus. Some grown-ups said the children should go away. But Jesus said, 'Let the little children come to me!' Jesus loves children very much.",
      memoryVerse: "Let the little children come to me.",
      memoryVerseRef: "Mark 10:14",
      thinkAboutIt: "If you could sit on Jesus' lap, what would you tell Him?",
      prayer: "Dear Jesus, thank You for loving me. I want to be close to You always. Amen.",
      linkedStorySearch: "God Made Me",
    },
  ],
  young_disciples: [
    {
      title: "Creation: A World Designed with Purpose",
      storySummary: "God created the world in six days and rested on the seventh. Each day He spoke, and something amazing appeared — light, sky, land, plants, stars, animals, and finally people. God made humans in His own image and gave them the job of caring for the earth.",
      memoryVerse: "In the beginning God created the heavens and the earth.",
      memoryVerseRef: "Genesis 1:1",
      thinkAboutIt: "Why do you think God rested on the seventh day? What can we learn from that?",
      prayer: "Lord, thank You for creating this amazing world. Help me to care for it and remember that I am made in Your image. Amen.",
      linkedStorySearch: "In the Beginning: Creation",
    },
    {
      title: "David Trusts God Against Goliath",
      storySummary: "A giant named Goliath challenged Israel's army, and everyone was afraid. But young David trusted God. With just a sling and a stone, David defeated Goliath — not because he was strong, but because God was with him.",
      memoryVerse: "The Lord who rescued me from the paw of the lion will rescue me from this Philistine.",
      memoryVerseRef: "1 Samuel 17:37",
      thinkAboutIt: "What is a 'giant' problem in your life right now? How can you trust God with it?",
      prayer: "God, when I face big problems, help me remember that You are bigger. Give me courage like David. Amen.",
      linkedStorySearch: "David and the Giant",
    },
    {
      title: "The Sabbath: God's Special Day",
      storySummary: "After creating the world, God set apart the seventh day as holy. He blessed it and rested. The Sabbath is God's gift to us — a day to rest, worship, and spend time with family and God. It reminds us that God is our Creator.",
      memoryVerse: "Remember the Sabbath day by keeping it holy.",
      memoryVerseRef: "Exodus 20:8",
      thinkAboutIt: "What are your favorite things to do on Sabbath? How can you make it more special?",
      prayer: "Dear God, thank You for the gift of Sabbath. Help me to use this day to grow closer to You and my family. Amen.",
      linkedStorySearch: "In the Beginning: Creation",
    },
    {
      title: "Daniel's Faithfulness in Babylon",
      storySummary: "Daniel was taken far from home to Babylon. Even in a strange land with different rules, Daniel stayed faithful to God. He prayed three times a day, even when a law said he would be thrown to the lions. God protected Daniel because of his faithfulness.",
      memoryVerse: "The God we serve is able to deliver us.",
      memoryVerseRef: "Daniel 3:17",
      thinkAboutIt: "Has it ever been hard to do the right thing when others around you weren't? What happened?",
      prayer: "Lord, give me the same courage Daniel had. Help me stay faithful to You no matter what. Amen.",
      linkedStorySearch: "Daniel and the Lions",
    },
  ],
  young_disciples_plus: [
    {
      title: "Identity in Christ: Who Am I Really?",
      storySummary: "The world constantly tells you who you should be — through social media, culture, and peer pressure. But God says something different. You are created in His image, chosen, and deeply loved. Your identity is not in what you do or what others think, but in who God says you are.",
      memoryVerse: "I praise you because I am fearfully and wonderfully made.",
      memoryVerseRef: "Psalm 139:14",
      thinkAboutIt: "When do you feel most pressured to be someone you're not? How does knowing God made you on purpose change that?",
      prayer: "God, help me find my identity in You, not in what the world says. Remind me that I am enough because You made me. Amen.",
      linkedStorySearch: "Who Am I? Identity in Christ",
    },
    {
      title: "The Great Controversy: Why Evil Exists",
      storySummary: "Sin didn't start on earth — it began in heaven when Lucifer rebelled against God. The great controversy is the cosmic battle between good and evil. God didn't destroy Satan immediately because He wanted the universe to understand His character of love. We live in the middle of this battle, but God has already won through Jesus.",
      memoryVerse: "And the God of peace will crush Satan under your feet shortly.",
      memoryVerseRef: "Romans 16:20",
      thinkAboutIt: "How does understanding the great controversy help you make sense of suffering in the world?",
      prayer: "Lord, help me understand the bigger picture. Thank You that even though evil exists, You have already won the victory. Amen.",
      linkedStorySearch: "Joseph: Integrity Through Injustice",
    },
    {
      title: "The Sabbath: Rest in a Restless World",
      storySummary: "In a world that never stops — notifications, homework, social pressure — the Sabbath is God's counter-cultural gift. It's not just a rule; it's an invitation to rest, reconnect, and remember who made you. The Sabbath is a weekly reminder that your worth isn't in your productivity.",
      memoryVerse: "Come to me, all you who are weary and burdened, and I will give you rest.",
      memoryVerseRef: "Matthew 11:28",
      thinkAboutIt: "Do you truly rest on Sabbath, or do you just avoid work? What would real Sabbath rest look like for you?",
      prayer: "God, teach me to truly rest in You. Help me see Sabbath not as a restriction but as Your gift of freedom. Amen.",
      linkedStorySearch: "Purpose and Calling",
    },
    {
      title: "Standing Alone: Faith When It Costs You",
      storySummary: "Daniel's three friends — Shadrach, Meshach, and Abednego — were told to bow to an idol or be thrown into a fiery furnace. They refused. They said, 'Our God is able to save us, but even if He doesn't, we will not bow.' God walked with them through the fire.",
      memoryVerse: "If we are thrown into the blazing furnace, the God we serve is able to deliver us.",
      memoryVerseRef: "Daniel 3:17",
      thinkAboutIt: "Have you ever had to stand alone for something you believed? What gave you strength?",
      prayer: "Lord, give me the courage to stand for what's right even when I stand alone. Walk with me through my fires. Amen.",
      linkedStorySearch: "Standing Alone: When Faith Costs You",
    },
  ],
};

router.get("/api/kids/sabbath-school/current", async (req, res) => {
  try {
    const ageGroup = String(req.query.ageGroup || "little_lambs");
    const lessons = KIDS_SS_LESSONS[ageGroup] || KIDS_SS_LESSONS.little_lambs;
    const weekOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 86400000));
    const lesson = lessons[weekOfYear % lessons.length];

    let linkedStory: { id: string; title: string } | null = null;
    if (lesson.linkedStorySearch) {
      const stories = await db
        .select({ id: kidsStories.id, title: kidsStories.title })
        .from(kidsStories)
        .where(
          and(
            eq(kidsStories.published, true),
            sql`${kidsStories.title} ILIKE ${'%' + lesson.linkedStorySearch + '%'}`
          )
        )
        .limit(1);
      if (stories.length > 0) {
        linkedStory = stories[0];
      }
    }

    const { linkedStorySearch, ...lessonData } = lesson;
    res.json({ lesson: { ...lessonData, linkedStory }, weekNumber: weekOfYear + 1, ageGroup });
  } catch (err) {
    console.error("Kids SS error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

  export default router;
  