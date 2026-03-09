import { Router, Request } from "express";
  import { db } from "../db";
  import {
    users,
    childProfiles,
    kidsProgress,
    kidsStories,
    kidsStreaks,
    kidsUserBadges,
    kidsBadges,
    bibleBooks,
    readingHistory,
    prayerRequests,
    dinnerTableTopics,
  } from "../../shared/schema";
  import { CONTENT_LANGUAGES } from "../../shared/schema";
  import { eq, and, sql, desc, asc } from "drizzle-orm";
  import { requireAuth, checkProStatus } from "../middleware/auth";
  import {
    generateConversationStarter,
    generateDinnerTableTopic,
    generateScripturalEncouragement,
  } from "../services/ai-engine";

  const router = Router();

  router.get("/api/family/children", requireAuth, async (req, res) => {
  try {
    const parentId = req.authUserId!;
    const children = await db
      .select()
      .from(childProfiles)
      .where(eq(childProfiles.parentId, parentId))
      .orderBy(asc(childProfiles.createdAt));
    return res.json(children);
  } catch (err) {
    console.error("Family children error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/family/children", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { name, avatarUrl, ageGroup } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Child name is required" });
    }
    const validAgeGroups = ["little_lambs", "young_disciples", "young_disciples_plus"];
    const [child] = await db
      .insert(childProfiles)
      .values({
        parentId: userId,
        name,
        avatarUrl: avatarUrl || null,
        ageGroup: validAgeGroups.includes(ageGroup) ? ageGroup : "little_lambs",
      })
      .returning();
    return res.json(child);
  } catch (err) {
    console.error("Add child error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/family/children/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { name, ageGroup } = req.body;
    const [existing] = await db
      .select()
      .from(childProfiles)
      .where(and(eq(childProfiles.id, String(req.params.id)), eq(childProfiles.parentId, userId)));
    if (!existing) {
      return res.status(404).json({ error: "Child profile not found" });
    }
    const updates: Record<string, any> = {};
    if (name) updates.name = name;
    const validAgeGroups = ["little_lambs", "young_disciples", "young_disciples_plus"];
    if (ageGroup && validAgeGroups.includes(ageGroup)) updates.ageGroup = ageGroup;
    if (Object.keys(updates).length === 0) {
      return res.json(existing);
    }
    const [updated] = await db
      .update(childProfiles)
      .set(updates)
      .where(eq(childProfiles.id, String(req.params.id)))
      .returning();
    return res.json(updated);
  } catch (err) {
    console.error("Update child error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/family/children/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const [child] = await db
      .select()
      .from(childProfiles)
      .where(and(eq(childProfiles.id, String(req.params.id)), eq(childProfiles.parentId, userId)));
    if (!child) {
      return res.status(404).json({ error: "Child profile not found" });
    }
    await db.delete(childProfiles).where(eq(childProfiles.id, String(req.params.id)));
    return res.json({ success: true });
  } catch (err) {
    console.error("Delete child error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/family/stats", requireAuth, checkProStatus, async (req, res) => {
  try {
    const parentId = req.authUserId!;

    const children = await db
      .select()
      .from(childProfiles)
      .where(eq(childProfiles.parentId, parentId));

    const childStats = await Promise.all(
      children.map(async (child) => {
        const progress = await db
          .select({
            storyId: kidsProgress.storyId,
            completed: kidsProgress.completed,
            quizScore: kidsProgress.quizScore,
            completedAt: kidsProgress.completedAt,
          })
          .from(kidsProgress)
          .where(eq(kidsProgress.userId, child.id));

        const completedStories = progress.filter((p) => p.completed);

        const badges = await db
          .select({
            badgeId: kidsUserBadges.badgeId,
            earnedAt: kidsUserBadges.earnedAt,
            name: kidsBadges.name,
            icon: kidsBadges.icon,
          })
          .from(kidsUserBadges)
          .innerJoin(kidsBadges, eq(kidsUserBadges.badgeId, kidsBadges.id))
          .where(eq(kidsUserBadges.userId, child.id));

        const storyDetails = await Promise.all(
          completedStories.slice(-5).map(async (p) => {
            const [story] = await db
              .select({ title: kidsStories.title, scriptureRef: kidsStories.scriptureRef })
              .from(kidsStories)
              .where(eq(kidsStories.id, p.storyId));
            return story || { title: "Unknown Story", scriptureRef: null };
          })
        );

        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weeklyCompleted = completedStories.filter(
          (p) => p.completedAt && new Date(p.completedAt) >= weekAgo
        );

        return {
          child: {
            id: child.id,
            name: child.name,
            avatarUrl: child.avatarUrl,
            totalPoints: child.totalPoints,
            currentLevel: child.currentLevel,
          },
          storiesCompleted: completedStories.length,
          storiesThisWeek: weeklyCompleted.length,
          averageQuizScore:
            completedStories.length > 0
              ? Math.round(
                  completedStories.reduce((sum, p) => sum + (p.quizScore || 0), 0) /
                    completedStories.length
                )
              : 0,
          badgesEarned: badges.length,
          recentBadges: badges.slice(-3),
          recentStories: storyDetails,
        };
      })
    );

    const totalStoriesCompleted = childStats.reduce((s, c) => s + c.storiesCompleted, 0);
    const totalBadgesEarned = childStats.reduce((s, c) => s + c.badgesEarned, 0);
    const totalWeeklyStories = childStats.reduce((s, c) => s + c.storiesThisWeek, 0);

    return res.json({
      children: childStats,
      summary: {
        totalChildren: children.length,
        totalStoriesCompleted,
        totalBadgesEarned,
        totalWeeklyStories,
      },
    });
  } catch (err) {
    console.error("Family stats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/family/conversation-starter/:childId", requireAuth, checkProStatus, async (req, res) => {
  try {
    const childId = String(req.params.childId);
    const userId = req.authUserId!;

    const [child] = await db
      .select()
      .from(childProfiles)
      .where(and(eq(childProfiles.id, childId), eq(childProfiles.parentId, userId)));

    if (!child) {
      return res.status(404).json({ error: "Child profile not found" });
    }

    const completedProgress = await db
      .select({ storyId: kidsProgress.storyId })
      .from(kidsProgress)
      .where(and(eq(kidsProgress.userId, childId), eq(kidsProgress.completed, true)));

    const storyDetails = await Promise.all(
      completedProgress.slice(-5).map(async (p) => {
        const [story] = await db
          .select({ title: kidsStories.title, scriptureRef: kidsStories.scriptureRef })
          .from(kidsStories)
          .where(eq(kidsStories.id, p.storyId));
        return story || { title: "Unknown Story", scriptureRef: null };
      })
    );

    const result = await generateConversationStarter(child.name, storyDetails);
    return res.json({ childName: child.name, ...result });
  } catch (err) {
    console.error("Conversation starter error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── FAMILY KINGDOM MAP (Heatmap) ────────────────────────────────────────

router.get("/api/family/heatmap", requireAuth, checkProStatus, async (req, res) => {
  try {
    const parentId = req.authUserId!;

    const allBooks = await db
      .select()
      .from(bibleBooks)
      .orderBy(asc(bibleBooks.id));

    const children = await db
      .select()
      .from(childProfiles)
      .where(eq(childProfiles.parentId, parentId));

    const parentReading = await db
      .select({
        bookId: readingHistory.bookId,
        bookName: readingHistory.bookName,
        chapter: readingHistory.chapter,
      })
      .from(readingHistory)
      .where(eq(readingHistory.userId, parentId));

    const parentChaptersPerBook: Record<number, Set<number>> = {};
    for (const r of parentReading) {
      if (!parentChaptersPerBook[r.bookId]) parentChaptersPerBook[r.bookId] = new Set();
      parentChaptersPerBook[r.bookId].add(r.chapter);
    }

    const childProgressMap: Record<string, { name: string; bookProgress: Record<number, number> }> = {};

    for (const child of children) {
      const progress = await db
        .select({
          storyId: kidsProgress.storyId,
          completed: kidsProgress.completed,
        })
        .from(kidsProgress)
        .where(and(eq(kidsProgress.userId, child.id), eq(kidsProgress.completed, true)));

      const storyIds = progress.map((p) => p.storyId);
      const bookHits: Record<number, number> = {};

      if (storyIds.length > 0) {
        const stories = await db
          .select({ id: kidsStories.id, scriptureRef: kidsStories.scriptureRef })
          .from(kidsStories)
          .where(sql`${kidsStories.id} IN ${storyIds}`);

        for (const story of stories) {
          if (story.scriptureRef) {
            const matchedBook = allBooks.find((b) =>
              story.scriptureRef!.toLowerCase().startsWith(b.name.toLowerCase()) ||
              story.scriptureRef!.toLowerCase().startsWith(b.abbreviation.toLowerCase())
            );
            if (matchedBook) {
              bookHits[matchedBook.id] = (bookHits[matchedBook.id] || 0) + 1;
            }
          }
        }
      }

      const bookProgress: Record<number, number> = {};
      for (const book of allBooks) {
        const hits = bookHits[book.id] || 0;
        bookProgress[book.id] = hits > 0 ? Math.min(100, Math.round((hits / Math.max(1, book.chapterCount)) * 100)) : 0;
      }

      childProgressMap[child.id] = { name: child.name, bookProgress };
    }

    const books = allBooks.map((book) => {
      const parentChapters = parentChaptersPerBook[book.id]?.size || 0;
      const parentProgress = Math.min(100, Math.round((parentChapters / book.chapterCount) * 100));

      const members: { name: string; role: string; progress: number }[] = [
        { name: "You", role: "parent", progress: parentProgress },
      ];

      const progressValues = [parentProgress];

      for (const child of children) {
        const cp = childProgressMap[child.id]?.bookProgress[book.id] || 0;
        members.push({ name: child.name, role: "child", progress: cp });
        progressValues.push(cp);
      }

      const avgProgress = progressValues.length > 0
        ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
        : 0;

      const conquered = progressValues.length > 0 && progressValues.every((p) => p >= 100);

      return {
        bookId: book.id,
        bookName: book.name,
        progress: avgProgress,
        conquered,
        members,
      };
    });

    const booksWithProgress = books.filter((b) => b.progress > 0 && b.progress < 100);
    let familyQuest = null;
    if (booksWithProgress.length > 0) {
      const questBook = booksWithProgress.reduce((best, b) =>
        b.progress > best.progress ? b : best, booksWithProgress[0]);
      familyQuest = {
        bookName: questBook.bookName,
        message: `This week, our family is exploring ${questBook.bookName} together!`,
      };
    }

    return res.json({ books, familyQuest });
  } catch (err) {
    console.error("Family heatmap error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── FAMILY ALTAR (Prayer Wall) ──────────────────────────────────────────

router.get("/api/family/prayers", requireAuth, checkProStatus, async (req, res) => {
  try {
    const familyId = req.authUserId!;
    const prayers = await db
      .select()
      .from(prayerRequests)
      .where(eq(prayerRequests.familyId, familyId))
      .orderBy(desc(prayerRequests.createdAt));
    return res.json(prayers);
  } catch (err) {
    console.error("Family prayers fetch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/family/prayers", requireAuth, checkProStatus, async (req, res) => {
  try {
    const { title, content, category, authorName } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Prayer title is required" });
    }

    const uId = req.authUserId!;
    const fId = uId;

    let scripturalVerse: string | null = null;
    let scripturalNote: string | null = null;
    try {
      const encouragement = await generateScripturalEncouragement(title, content || "");
      scripturalVerse = encouragement.verse;
      scripturalNote = encouragement.note;
    } catch (aiErr) {
      console.error("AI encouragement generation failed:", aiErr);
    }

    const [prayer] = await db
      .insert(prayerRequests)
      .values({
        userId: uId,
        familyId: fId,
        title: title.trim(),
        content: content?.trim() || null,
        category: category || "family",
        authorName: authorName || null,
        scripturalVerse,
        scripturalNote,
      })
      .returning();

    console.log(`\n🙏 FAMILY PRAYER POSTED: "${title}" by ${authorName || uId}`);
    if (scripturalVerse) {
      console.log(`   Scripture: ${scripturalVerse.substring(0, 80)}...`);
    }

    return res.json(prayer);
  } catch (err) {
    console.error("Family prayer post error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/family/prayers/:id/support", requireAuth, checkProStatus, async (req, res) => {
  try {
    const id = String(req.params.id);
    const memberName = String(req.body.memberName || req.authUserId!);

    const [prayer] = await db
      .select()
      .from(prayerRequests)
      .where(eq(prayerRequests.id, id));

    if (!prayer) {
      return res.status(404).json({ error: "Prayer not found" });
    }

    const currentSupported: string[] = Array.isArray(prayer.supportedBy) ? prayer.supportedBy : [];
    if (currentSupported.includes(memberName)) {
      return res.json({ success: true, message: "Already prayed for this", supportCount: prayer.supportCount });
    }

    const newSupported = [...currentSupported, memberName];
    const [updated] = await db
      .update(prayerRequests)
      .set({
        supportCount: sql`${prayerRequests.supportCount} + 1`,
        supportedBy: newSupported,
        updatedAt: new Date(),
      })
      .where(eq(prayerRequests.id, id))
      .returning();

    return res.json({ success: true, supportCount: updated.supportCount });
  } catch (err) {
    console.error("Prayer support error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/family/prayers/:id/answered", requireAuth, checkProStatus, async (req, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.authUserId!;
    const answered = req.body.answered !== false;

    const [prayer] = await db
      .select()
      .from(prayerRequests)
      .where(and(eq(prayerRequests.id, id), eq(prayerRequests.familyId, userId)));

    if (!prayer) {
      return res.status(404).json({ error: "Prayer not found" });
    }

    const [updated] = await db
      .update(prayerRequests)
      .set({
        answered,
        answeredAt: answered ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(prayerRequests.id, id))
      .returning();

    return res.json(updated);
  } catch (err) {
    console.error("Prayer answered error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DINNER TABLE TOPICS (Parent Bridge) ─────────────────────────────────

router.get("/api/family/dinner-topics", requireAuth, checkProStatus, async (req, res) => {
  try {
    const parentId = req.authUserId!;
    const topics = await db
      .select()
      .from(dinnerTableTopics)
      .where(eq(dinnerTableTopics.parentId, parentId))
      .orderBy(desc(dinnerTableTopics.createdAt))
      .limit(20);
    return res.json(topics);
  } catch (err) {
    console.error("Dinner topics fetch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/family/dinner-topics/:id/discussed", requireAuth, checkProStatus, async (req, res) => {
  try {
    const id = String(req.params.id);
    const userId = req.authUserId!;

    const [topic] = await db
      .select()
      .from(dinnerTableTopics)
      .where(and(eq(dinnerTableTopics.id, id), eq(dinnerTableTopics.parentId, userId)))
      .limit(1);

    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    if (topic.discussed) {
      return res.json({ success: true, message: "Already discussed", bonusPoints: 0 });
    }

    await db
      .update(dinnerTableTopics)
      .set({ discussed: true, discussedAt: new Date(), bonusPointsAwarded: true })
      .where(eq(dinnerTableTopics.id, id));

    let bonusPoints = 25;

    if (topic.childProfileId) {
      await db
        .update(childProfiles)
        .set({
          totalPoints: sql`${childProfiles.totalPoints} + ${bonusPoints}`,
          currentLevel: sql`GREATEST(1, (${childProfiles.totalPoints} + ${bonusPoints}) / 100 + 1)`,
        })
        .where(eq(childProfiles.id, topic.childProfileId));
    }

    console.log(`\n✅ DINNER TOPIC DISCUSSED: "${topic.storyTitle}" for ${topic.childName}`);
    console.log(`   +${bonusPoints} bonus points awarded to family account\n`);

    return res.json({ success: true, bonusPoints });
  } catch (err) {
    console.error("Mark discussed error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── CONTENT LANGUAGE RESOLVER ────────────────────────────────────────────

function resolveContentLang(req: Request): string | null {
  const lang = String(req.query.lang || "").split("-")[0].toLowerCase();
  if (lang && (CONTENT_LANGUAGES as readonly string[]).includes(lang) && lang !== "en") {
    return lang;
  }
  return null;
}

// ─── FORMATION TRACKS API ──────────────────────────────────────────────────


  export default router;
  