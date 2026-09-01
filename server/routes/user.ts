import { Router } from "express";
  import { db } from "../db";
  import {
    users,
    userActivityCounters,
    userNotes,
    userHighlights,
    userBookmarks,
    prayerRequests,
    readingHistory,
    readingStreaks,
    bibleBooks,
    bibleTranslations,
    bibleVerses,
  } from "../../shared/schema";
  import { eq, and, sql, desc, asc } from "drizzle-orm";
  import { requireAuth, optionalAuth, getEffectiveUserId } from "../middleware/auth";
  import { validate, noteSchema, highlightSchema, bookmarkSchema, prayerSchema, readingHistorySchema } from "../middleware/validate";
  import {
    addCalendarDays,
    getCalendarDate,
    getSundayWeekStartDateKey,
    normalizeTimeZone,
  } from "../../shared/calendar-date";

  const router = Router();

  const PROVIDER_VERSE_ID = /^[a-z0-9]+-(\d+)-(\d+)-(\d+)$/i;

  /**
   * User annotations keep their existing bible_verse foreign key. API.Bible
   * verse IDs encode the same canonical location but are not database rows, so
   * resolve them to the local KJV row before persistence.
   */
  async function resolveAnnotationVerseId(verseId: string): Promise<string | null> {
    const [existing] = await db
      .select({ id: bibleVerses.id })
      .from(bibleVerses)
      .where(eq(bibleVerses.id, verseId))
      .limit(1);
    if (existing) return existing.id;

    const match = PROVIDER_VERSE_ID.exec(verseId);
    if (!match) return null;
    const [, rawBookId, rawChapter, rawVerse] = match;
    const [canonical] = await db
      .select({ id: bibleVerses.id })
      .from(bibleVerses)
      .innerJoin(bibleTranslations, eq(bibleVerses.translationId, bibleTranslations.id))
      .where(and(
        eq(bibleTranslations.abbreviation, "KJV"),
        eq(bibleVerses.bookId, Number(rawBookId)),
        eq(bibleVerses.chapter, Number(rawChapter)),
        eq(bibleVerses.verse, Number(rawVerse)),
      ))
      .limit(1);
    return canonical?.id ?? null;
  }

  router.post("/api/user/start-trial", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    await db.update(users).set({ isPro: true }).where(eq(users.id, userId));
    return res.json({ success: true, isPro: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/user/pro-status", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (userId === "guest") {
      return res.json({ isPro: false, isPatron: false, donationAmount: 0 });
    }
    const [user] = await db
      .select({ isPro: users.isPro, isPatron: users.isPatron, donationAmount: users.donationAmount })
      .from(users)
      .where(eq(users.id, userId));
    return res.json({
      isPro: user?.isPro ?? false,
      isPatron: user?.isPatron ?? false,
      donationAmount: user?.donationAmount ?? 0,
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/user/donate", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const amount = Math.max(1, Math.round(Number(req.body?.amount) || 5));

    const [user] = await db
      .select({ donationAmount: users.donationAmount })
      .from(users)
      .where(eq(users.id, userId));

    const currentDonation = user?.donationAmount ?? 0;

    await db
      .update(users)
      .set({
        isPro: true,
        isPatron: true,
        donationAmount: currentDonation + amount,
      })
      .where(eq(users.id, userId));

    console.log(`\nMISSION PARTNER: User ${userId} donated $${amount} (total: $${currentDonation + amount})`);

    return res.json({
      success: true,
      isPatron: true,
      isPro: true,
      totalDonated: currentDonation + amount,
    });
  } catch (err) {
    console.error("Donate error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/user/track-activity", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const featureType = String(req.body?.featureType || "unknown");

    const [existing] = await db
      .select()
      .from(userActivityCounters)
      .where(and(
        eq(userActivityCounters.userId, userId),
        eq(userActivityCounters.featureType, featureType)
      ));

    if (existing) {
      await db
        .update(userActivityCounters)
        .set({
          useCount: sql`${userActivityCounters.useCount} + 1`,
          lastUsedAt: new Date(),
        })
        .where(eq(userActivityCounters.id, existing.id));
    } else {
      await db
        .insert(userActivityCounters)
        .values({ userId, featureType, useCount: 1 });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Track activity error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/user/mission-status", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (userId === "guest") {
      return res.json({ shouldInvite: false, isPatron: false, totalUses: 0 });
    }

    const [user] = await db
      .select({
        isPatron: users.isPatron,
        isPro: users.isPro,
        lastMissionInvite: users.lastMissionInvite,
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return res.json({ shouldInvite: false, isPatron: false, totalUses: 0 });
    }

    if (user.isPatron) {
      return res.json({ shouldInvite: false, isPatron: true, totalUses: 0 });
    }

    if (user.lastMissionInvite) {
      const daysSince = (Date.now() - new Date(user.lastMissionInvite).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 30) {
        return res.json({ shouldInvite: false, isPatron: false, totalUses: 0 });
      }
    }

    const counters = await db
      .select({ useCount: userActivityCounters.useCount })
      .from(userActivityCounters)
      .where(eq(userActivityCounters.userId, userId));

    const totalUses = counters.reduce((sum, c) => sum + (c.useCount ?? 0), 0);

    return res.json({
      shouldInvite: totalUses >= 10,
      isPatron: false,
      totalUses,
    });
  } catch (err) {
    console.error("Mission status error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/user/dismiss-mission-invite", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    await db
      .update(users)
      .set({ lastMissionInvite: new Date() })
      .where(eq(users.id, userId));
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/user/preferences", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (userId === "guest") {
      return res.json({
        preferredLanguage: "en",
        preferredBibleTranslation: null,
        preferredNarrator: "george",
        preferredCurriculum: "adult",
      });
    }
    const [user] = await db
      .select({
        preferredLanguage: users.preferredLanguage,
        preferredBibleTranslation: users.preferredBibleTranslation,
        preferredNarrator: users.preferredNarrator,
        preferredCurriculum: users.preferredCurriculum,
      })
      .from(users)
      .where(eq(users.id, userId));
    return res.json({
      preferredLanguage: user?.preferredLanguage ?? "en",
      preferredBibleTranslation: user?.preferredBibleTranslation ?? null,
      preferredNarrator: user?.preferredNarrator ?? "george",
      preferredCurriculum: user?.preferredCurriculum ?? "adult",
    });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/api/user/preferences", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const updates: Record<string, any> = {};
    if (req.body.preferredLanguage !== undefined) {
      updates.preferredLanguage = String(req.body.preferredLanguage).substring(0, 10);
    }
    if (req.body.preferredBibleTranslation !== undefined) {
      const val = req.body.preferredBibleTranslation;
      updates.preferredBibleTranslation = val ? String(val).substring(0, 10) : null;
    }
    if (req.body.preferredNarrator !== undefined) {
      const val = String(req.body.preferredNarrator);
      const valid = ["george", "sarah"];
      updates.preferredNarrator = valid.includes(val) ? val : "george";
    }
    if (req.body.preferredCurriculum !== undefined) {
      const val = String(req.body.preferredCurriculum).toLowerCase();
      const valid = ["adult", "inverse", "cornerstone"];
      updates.preferredCurriculum = valid.includes(val) ? val : "adult";
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid preferences provided" });
    }
    await db.update(users).set(updates).where(eq(users.id, userId));
    return res.json({ success: true, ...updates });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});


  router.get("/api/notes/:userId", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (userId === "guest") {
      return res.json([]);
    }
    const notes = await db
      .select({
        id: userNotes.id,
        userId: userNotes.userId,
        verseId: userNotes.verseId,
        content: userNotes.content,
        createdAt: userNotes.createdAt,
        updatedAt: userNotes.updatedAt,
        bookId: bibleVerses.bookId,
        chapter: bibleVerses.chapter,
        verse: bibleVerses.verse,
        verseText: bibleVerses.text,
        bookName: bibleBooks.name,
      })
      .from(userNotes)
      .leftJoin(bibleVerses, eq(userNotes.verseId, bibleVerses.id))
      .leftJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
      .where(eq(userNotes.userId, userId))
      .orderBy(desc(userNotes.updatedAt));
    return res.json(notes);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/notes", requireAuth, validate(noteSchema), async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { verseId, content } = req.body;
    const persistedVerseId = await resolveAnnotationVerseId(verseId);
    if (!persistedVerseId) return res.status(400).json({ error: "Verse not found" });
    const note = await db
      .insert(userNotes)
      .values({ userId, verseId: persistedVerseId, content })
      .returning();
    return res.json(note[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/highlights/:userId", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (userId === "guest") {
      return res.json([]);
    }
    const highlights = await db
      .select({
        id: userHighlights.id,
        userId: userHighlights.userId,
        verseId: userHighlights.verseId,
        color: userHighlights.color,
        createdAt: userHighlights.createdAt,
        bookId: bibleVerses.bookId,
        chapter: bibleVerses.chapter,
        verse: bibleVerses.verse,
        verseText: bibleVerses.text,
        bookName: bibleBooks.name,
      })
      .from(userHighlights)
      .leftJoin(bibleVerses, eq(userHighlights.verseId, bibleVerses.id))
      .leftJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
      .where(eq(userHighlights.userId, userId))
      .orderBy(desc(userHighlights.createdAt));
    return res.json(highlights);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/highlights", requireAuth, validate(highlightSchema), async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { verseId, color = "yellow" } = req.body;
    const persistedVerseId = await resolveAnnotationVerseId(verseId);
    if (!persistedVerseId) return res.status(400).json({ error: "Verse not found" });
    const highlight = await db
      .insert(userHighlights)
      .values({ userId, verseId: persistedVerseId, color })
      .onConflictDoNothing()
      .returning();
    return res.json(highlight[0] ?? null);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/bookmarks/:userId", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (userId === "guest") {
      return res.json([]);
    }
    const bookmarks = await db
      .select({
        id: userBookmarks.id,
        userId: userBookmarks.userId,
        verseId: userBookmarks.verseId,
        label: userBookmarks.label,
        createdAt: userBookmarks.createdAt,
        bookId: bibleVerses.bookId,
        chapter: bibleVerses.chapter,
        verse: bibleVerses.verse,
        verseText: bibleVerses.text,
        bookName: bibleBooks.name,
      })
      .from(userBookmarks)
      .leftJoin(bibleVerses, eq(userBookmarks.verseId, bibleVerses.id))
      .leftJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
      .where(eq(userBookmarks.userId, userId))
      .orderBy(desc(userBookmarks.createdAt));
    return res.json(bookmarks);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/bookmarks", requireAuth, validate(bookmarkSchema), async (req, res) => {
  try {
    const userId = req.authUserId!;
    const { verseId, label } = req.body;
    const persistedVerseId = await resolveAnnotationVerseId(verseId);
    if (!persistedVerseId) return res.status(400).json({ error: "Verse not found" });
    const bookmark = await db
      .insert(userBookmarks)
      .values({ userId, verseId: persistedVerseId, label })
      .onConflictDoNothing()
      .returning();
    return res.json(bookmark[0] ?? null);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/bookmarks/:id", requireAuth, async (req, res) => {
  try {
    const userId = req.authUserId!;
    const [existing] = await db
      .select({ userId: userBookmarks.userId })
      .from(userBookmarks)
      .where(eq(userBookmarks.id, String(req.params.id)));
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== userId) return res.status(403).json({ error: "Forbidden" });
    await db
      .delete(userBookmarks)
      .where(eq(userBookmarks.id, String(req.params.id)));
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});


  router.get("/api/prayers", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (userId === "guest") {
      return res.json([]);
    }
    const prayers = await db
      .select()
      .from(prayerRequests)
      .where(eq(prayerRequests.userId, userId))
      .orderBy(desc(prayerRequests.createdAt));
    return res.json(prayers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/prayers", optionalAuth, (req, res, next) => {
  const userId = getEffectiveUserId(req);
  if (userId === "guest") {
    return res.status(401).json({ error: "A device ID or login is required to save prayers" });
  }
  next();
}, validate(prayerSchema), async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const { title, content, category = "personal" } = req.body;
    const [prayer] = await db
      .insert(prayerRequests)
      .values({ userId, title, content, category })
      .returning();
    return res.json(prayer);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/api/prayers/:id", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const id = String(req.params.id);
    const [existing] = await db
      .select({ userId: prayerRequests.userId })
      .from(prayerRequests)
      .where(eq(prayerRequests.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== userId) return res.status(403).json({ error: "Forbidden" });

    const updates: Record<string, any> = {};
    if (req.body.title !== undefined) updates.title = req.body.title;
    if (req.body.content !== undefined) updates.content = req.body.content;
    if (req.body.category !== undefined) updates.category = req.body.category;
    if (req.body.answered !== undefined) {
      updates.answered = req.body.answered;
      updates.answeredAt = req.body.answered ? new Date() : null;
    }
    updates.updatedAt = new Date();
    const [updated] = await db
      .update(prayerRequests)
      .set(updates)
      .where(eq(prayerRequests.id, id))
      .returning();
    if (!updated) return res.status(404).json({ error: "Not found" });
    return res.json(updated);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/prayers/:id", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const id = String(req.params.id);
    const [existing] = await db
      .select({ userId: prayerRequests.userId })
      .from(prayerRequests)
      .where(eq(prayerRequests.id, id));
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.userId !== userId) return res.status(403).json({ error: "Forbidden" });
    await db.delete(prayerRequests).where(eq(prayerRequests.id, id));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/reading-history", optionalAuth, validate(readingHistorySchema), async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    const { bookId, bookName, chapter } = req.body;
    const translation = String(req.body.translation).trim().toUpperCase();

    const [entry] = await db
      .insert(readingHistory)
      .values({ userId, bookId: Number(bookId), bookName, chapter: Number(chapter), translation })
      .returning();

    const timeZone = normalizeTimeZone(req.query.timeZone);
    const today = getCalendarDate(new Date(), timeZone).dateKey;
    const existing = await db
      .select()
      .from(readingStreaks)
      .where(eq(readingStreaks.userId, userId));

    if (existing.length === 0) {
      await db.insert(readingStreaks).values({
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastReadDate: today,
      });
    } else {
      const streak = existing[0];
      const lastDate = streak.lastReadDate;
      if (lastDate === today) {
      } else {
        const yesterdayStr = addCalendarDays(today, -1);
        let newStreak = 1;
        if (lastDate === yesterdayStr) {
          newStreak = (streak.currentStreak ?? 0) + 1;
        }
        const newLongest = Math.max(newStreak, streak.longestStreak ?? 0);
        await db
          .update(readingStreaks)
          .set({ currentStreak: newStreak, longestStreak: newLongest, lastReadDate: today })
          .where(eq(readingStreaks.userId, userId));
      }
    }

    return res.json(entry);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/reading-history/recent", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (userId === "guest") {
      return res.json([]);
    }
    const recent = await db
      .select()
      .from(readingHistory)
      .where(eq(readingHistory.userId, userId))
      .orderBy(desc(readingHistory.readAt))
      .limit(5);
    return res.json(recent);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/api/reading-history/reset", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).authUserId as string;
    await db.delete(readingHistory).where(eq(readingHistory.userId, userId));
    return res.json({ success: true, message: "Reading history cleared" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/reading-history/book/:bookId", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (userId === "guest") {
      return res.json([]);
    }
    const bookId = Number(req.params.bookId);
    if (isNaN(bookId)) {
      return res.status(400).json({ error: "Invalid bookId" });
    }
    const rows = await db
      .select({ chapter: readingHistory.chapter })
      .from(readingHistory)
      .where(and(eq(readingHistory.userId, userId), eq(readingHistory.bookId, bookId)));
    const chapters = [...new Set(rows.map((r) => r.chapter))];
    return res.json(chapters);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/reading-streaks", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (userId === "guest") {
      return res.json({ currentStreak: 0, longestStreak: 0, lastReadDate: null });
    }
    const [streak] = await db
      .select()
      .from(readingStreaks)
      .where(eq(readingStreaks.userId, userId));
    if (!streak) {
      return res.json({ currentStreak: 0, longestStreak: 0, lastReadDate: null });
    }
    const timeZone = normalizeTimeZone(req.query.timeZone);
    const today = getCalendarDate(new Date(), timeZone).dateKey;
    const yesterdayStr = addCalendarDays(today, -1);
    if (streak.lastReadDate !== today && streak.lastReadDate !== yesterdayStr) {
      await db
        .update(readingStreaks)
        .set({ currentStreak: 0 })
        .where(eq(readingStreaks.userId, userId));
      return res.json({ currentStreak: 0, longestStreak: streak.longestStreak ?? 0, lastReadDate: streak.lastReadDate });
    }
    return res.json(streak);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/reading-streaks/weekly", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (userId === "guest") {
      return res.json({
        daysRead: [false, false, false, false, false, false, false],
        perfectWeeks: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastReadDate: null,
      });
    }
    const timeZone = normalizeTimeZone(req.query.timeZone);
    const startOfWeekDateKey = getSundayWeekStartDateKey(new Date(), timeZone);

    const reads = await db
      .select({
        localDate: sql<string>`to_char(
          (${readingHistory.readAt} AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone},
          'YYYY-MM-DD'
        )`,
      })
      .from(readingHistory)
      .where(
        and(
          eq(readingHistory.userId, userId),
          sql`((${readingHistory.readAt} AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone})::date >= ${startOfWeekDateKey}::date`
        )
      );

    const daysRead: boolean[] = [false, false, false, false, false, false, false];
    for (const r of reads) {
      const d = new Date(`${r.localDate}T00:00:00.000Z`).getUTCDay();
      daysRead[d] = true;
    }

    const perfectWeekResult = await db.execute(sql`
      SELECT COUNT(*) as count FROM (
        SELECT date_trunc(
          'week',
          (${readingHistory.readAt} AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}
        ) as week_start
        FROM ${readingHistory}
        WHERE ${readingHistory.userId} = ${userId}
        GROUP BY week_start
        HAVING COUNT(DISTINCT EXTRACT(
          DOW FROM (${readingHistory.readAt} AT TIME ZONE 'UTC') AT TIME ZONE ${timeZone}
        )) = 7
      ) pw
    `);
    const perfectWeeks = Number(perfectWeekResult.rows?.[0]?.count ?? 0);

    const [streak] = await db
      .select()
      .from(readingStreaks)
      .where(eq(readingStreaks.userId, userId));

    return res.json({
      daysRead,
      perfectWeeks,
      currentStreak: streak?.currentStreak ?? 0,
      longestStreak: streak?.longestStreak ?? 0,
      lastReadDate: streak?.lastReadDate ?? null,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/spiritual-rings", optionalAuth, async (req, res) => {
  try {
    const userId = getEffectiveUserId(req);
    if (userId === "guest") {
      return res.json({
        study: { current: 0, goal: 3, label: "Study" },
        prayer: { current: 0, goal: 2, label: "Prayer" },
        engage: { current: 0, goal: 2, label: "Engage" },
      });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const studyRows = await db
      .select({ cnt: sql<number>`COUNT(DISTINCT (${readingHistory.bookId}::text || ':' || ${readingHistory.chapter}::text))` })
      .from(readingHistory)
      .where(and(eq(readingHistory.userId, userId), sql`${readingHistory.readAt} >= ${today}`));
    const chaptersRead = Number(studyRows[0]?.cnt ?? 0);

    const prayerRows = await db
      .select({ cnt: sql<number>`COUNT(*)` })
      .from(prayerRequests)
      .where(and(eq(prayerRequests.userId, userId), sql`${prayerRequests.createdAt} >= ${today}`));
    const prayerCount = Number(prayerRows[0]?.cnt ?? 0);

    const journalResult = await db.execute(sql`
      SELECT COUNT(*) as cnt FROM (
        SELECT id FROM study_journal_entries WHERE user_id = ${userId} AND created_at >= ${today}
        UNION ALL
        SELECT id FROM study_guide_session WHERE user_id = ${userId} AND created_at >= ${today}
      ) combined
    `);
    const shareCount = Number((journalResult as any).rows?.[0]?.cnt ?? 0);

    return res.json({
      study: { current: chaptersRead, goal: 3, label: "Study" },
      prayer: { current: prayerCount, goal: 2, label: "Prayer" },
      engage: { current: shareCount, goal: 2, label: "Engage" },
    });
  } catch (err) {
    console.error("Spiritual rings error:", err);
    return res.json({
      study: { current: 0, goal: 3, label: "Study" },
      prayer: { current: 0, goal: 2, label: "Prayer" },
      engage: { current: 0, goal: 2, label: "Engage" },
    });
  }
});

  export default router;
