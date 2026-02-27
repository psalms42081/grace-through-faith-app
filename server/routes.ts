import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { db } from "./db";
import {
  bibleBooks,
  bibleVerses,
  bibleTranslations,
  strongEntries,
  verseStrongMaps,
  contextCards,
  commentators,
  commentaryEntries,
  applicationTemplates,
  locations,
  locationVerseMaps,
  timelineEvents,
  eventVerseMaps,
  devotionalPlans,
  devotionalDays,
  userPlanEnrollments,
  userPlanProgress,
  userNotes,
  userHighlights,
  userBookmarks,
} from "../shared/schema";
import { eq, and, ilike, sql } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {

  // ─── PASSAGE ────────────────────────────────────────────────────────────────

  app.get("/api/passage", async (req, res) => {
    try {
      const { book, chapter, translation = "KJV" } = req.query;
      if (!book || !chapter) {
        return res.status(400).json({ error: "book and chapter are required" });
      }

      const bookRecord = await db
        .select()
        .from(bibleBooks)
        .where(eq(bibleBooks.id, Number(book)))
        .limit(1);

      if (!bookRecord.length) {
        return res.status(404).json({ error: "Book not found" });
      }

      const translationRecord = await db
        .select()
        .from(bibleTranslations)
        .where(eq(bibleTranslations.abbreviation, String(translation)))
        .limit(1);

      if (!translationRecord.length) {
        return res.status(404).json({ error: "Translation not found" });
      }

      const verses = await db
        .select()
        .from(bibleVerses)
        .where(
          and(
            eq(bibleVerses.bookId, Number(book)),
            eq(bibleVerses.chapter, Number(chapter)),
            eq(bibleVerses.translationId, translationRecord[0].id)
          )
        )
        .orderBy(bibleVerses.verse);

      return res.json({ book: bookRecord[0], chapter: Number(chapter), verses });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── BOOKS ──────────────────────────────────────────────────────────────────

  app.get("/api/books", async (_req, res) => {
    try {
      const books = await db.select().from(bibleBooks).orderBy(bibleBooks.orderIndex);
      return res.json(books);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── VERSE ──────────────────────────────────────────────────────────────────

  app.get("/api/verse", async (req, res) => {
    try {
      const { book, chapter, verse, translation = "KJV" } = req.query;
      if (!book || !chapter || !verse) {
        return res.status(400).json({ error: "book, chapter, and verse are required" });
      }

      const translationRecord = await db
        .select()
        .from(bibleTranslations)
        .where(eq(bibleTranslations.abbreviation, String(translation)))
        .limit(1);

      if (!translationRecord.length) {
        return res.status(404).json({ error: "Translation not found" });
      }

      const verseRecord = await db
        .select()
        .from(bibleVerses)
        .where(
          and(
            eq(bibleVerses.bookId, Number(book)),
            eq(bibleVerses.chapter, Number(chapter)),
            eq(bibleVerses.verse, Number(verse)),
            eq(bibleVerses.translationId, translationRecord[0].id)
          )
        )
        .limit(1);

      if (!verseRecord.length) {
        return res.status(404).json({ error: "Verse not found" });
      }

      return res.json(verseRecord[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── SEARCH ─────────────────────────────────────────────────────────────────

  app.get("/api/search", async (req, res) => {
    try {
      const { q, translation = "KJV" } = req.query;
      if (!q) {
        return res.status(400).json({ error: "q (query) is required" });
      }

      const query = String(q).trim();

      const translationRecord = await db
        .select()
        .from(bibleTranslations)
        .where(eq(bibleTranslations.abbreviation, String(translation)))
        .limit(1);

      if (!translationRecord.length) {
        return res.status(404).json({ error: "Translation not found" });
      }

      const results = await db
        .select()
        .from(bibleVerses)
        .where(
          and(
            eq(bibleVerses.translationId, translationRecord[0].id),
            ilike(bibleVerses.text, `%${query}%`)
          )
        )
        .limit(50);

      return res.json({ results, total: results.length });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── STRONG'S WORD STUDY ─────────────────────────────────────────────────────

  app.get("/api/strong/:id", async (req, res) => {
    try {
      const entry = await db
        .select()
        .from(strongEntries)
        .where(eq(strongEntries.id, req.params.id))
        .limit(1);

      if (!entry.length) {
        return res.status(404).json({ error: "Strong's entry not found" });
      }

      return res.json(entry[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/strong/verse/:verseId", async (req, res) => {
    try {
      const maps = await db
        .select({
          map: verseStrongMaps,
          entry: strongEntries,
        })
        .from(verseStrongMaps)
        .leftJoin(strongEntries, eq(verseStrongMaps.strongId, strongEntries.id))
        .where(eq(verseStrongMaps.verseId, req.params.verseId))
        .orderBy(verseStrongMaps.wordPosition);

      return res.json(maps);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── CONTEXT ─────────────────────────────────────────────────────────────────

  app.get("/api/context", async (req, res) => {
    try {
      const { book, chapter } = req.query;
      if (!book) {
        return res.status(400).json({ error: "book is required" });
      }

      const cards = await db
        .select()
        .from(contextCards)
        .where(
          chapter
            ? and(
                eq(contextCards.bookId, Number(book)),
                eq(contextCards.chapter, Number(chapter))
              )
            : eq(contextCards.bookId, Number(book))
        );

      return res.json(cards);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── COMMENTARY ──────────────────────────────────────────────────────────────

  app.get("/api/commentary", async (req, res) => {
    try {
      const { book, chapter } = req.query;
      if (!book || !chapter) {
        return res.status(400).json({ error: "book and chapter are required" });
      }

      const entries = await db
        .select({
          entry: commentaryEntries,
          commentator: commentators,
        })
        .from(commentaryEntries)
        .leftJoin(commentators, eq(commentaryEntries.commentatorId, commentators.id))
        .where(
          and(
            eq(commentaryEntries.bookId, Number(book)),
            eq(commentaryEntries.chapter, Number(chapter))
          )
        );

      return res.json(entries);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── APPLICATION ─────────────────────────────────────────────────────────────

  app.get("/api/application", async (req, res) => {
    try {
      const { book, chapter } = req.query;
      if (!book) {
        return res.status(400).json({ error: "book is required" });
      }

      const templates = await db
        .select()
        .from(applicationTemplates)
        .where(
          chapter
            ? and(
                eq(applicationTemplates.bookId, Number(book)),
                eq(applicationTemplates.chapter, Number(chapter))
              )
            : eq(applicationTemplates.bookId, Number(book))
        );

      return res.json(templates);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── LOCATIONS ────────────────────────────────────────────────────────────────

  app.get("/api/location", async (req, res) => {
    try {
      const allLocations = await db.select().from(locations);
      return res.json(allLocations);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/location/:id", async (req, res) => {
    try {
      const location = await db
        .select()
        .from(locations)
        .where(eq(locations.id, req.params.id))
        .limit(1);

      if (!location.length) {
        return res.status(404).json({ error: "Location not found" });
      }

      return res.json(location[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── TIMELINE ─────────────────────────────────────────────────────────────────

  app.get("/api/timeline", async (req, res) => {
    try {
      const events = await db
        .select()
        .from(timelineEvents)
        .orderBy(timelineEvents.yearApprox);

      return res.json(events);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── DEVOTIONALS ─────────────────────────────────────────────────────────────

  app.get("/api/devotionals/plans", async (_req, res) => {
    try {
      const plans = await db
        .select()
        .from(devotionalPlans)
        .where(eq(devotionalPlans.isPublished, true));
      return res.json(plans);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/devotionals/enroll", async (req, res) => {
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

  app.get("/api/devotionals/today", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const activeEnrollment = await db
        .select()
        .from(userPlanEnrollments)
        .where(
          and(
            eq(userPlanEnrollments.userId, String(userId)),
            eq(userPlanEnrollments.isActive, true)
          )
        )
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
        return res.json({ today: null, message: "Plan completed!", planComplete: true });
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

  app.post("/api/devotionals/complete", async (req, res) => {
    try {
      const { enrollmentId, dayId, journalEntry } = req.body;
      if (!enrollmentId || !dayId) {
        return res.status(400).json({ error: "enrollmentId and dayId are required" });
      }

      const progress = await db
        .insert(userPlanProgress)
        .values({ enrollmentId, dayId, journalEntry })
        .onConflictDoNothing()
        .returning();

      return res.json({ progress: progress[0] ?? null });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── USER NOTES ───────────────────────────────────────────────────────────────

  app.get("/api/notes/:userId", async (req, res) => {
    try {
      const notes = await db
        .select()
        .from(userNotes)
        .where(eq(userNotes.userId, req.params.userId))
        .orderBy(userNotes.updatedAt);
      return res.json(notes);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/notes", async (req, res) => {
    try {
      const { userId, verseId, content } = req.body;
      if (!userId || !verseId || !content) {
        return res.status(400).json({ error: "userId, verseId, and content are required" });
      }
      const note = await db
        .insert(userNotes)
        .values({ userId, verseId, content })
        .returning();
      return res.json(note[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── USER HIGHLIGHTS ──────────────────────────────────────────────────────────

  app.get("/api/highlights/:userId", async (req, res) => {
    try {
      const highlights = await db
        .select()
        .from(userHighlights)
        .where(eq(userHighlights.userId, req.params.userId));
      return res.json(highlights);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/highlights", async (req, res) => {
    try {
      const { userId, verseId, color = "yellow" } = req.body;
      if (!userId || !verseId) {
        return res.status(400).json({ error: "userId and verseId are required" });
      }
      const highlight = await db
        .insert(userHighlights)
        .values({ userId, verseId, color })
        .onConflictDoNothing()
        .returning();
      return res.json(highlight[0] ?? null);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── USER BOOKMARKS ───────────────────────────────────────────────────────────

  app.get("/api/bookmarks/:userId", async (req, res) => {
    try {
      const bookmarks = await db
        .select()
        .from(userBookmarks)
        .where(eq(userBookmarks.userId, req.params.userId))
        .orderBy(userBookmarks.createdAt);
      return res.json(bookmarks);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/bookmarks", async (req, res) => {
    try {
      const { userId, verseId, label } = req.body;
      if (!userId || !verseId) {
        return res.status(400).json({ error: "userId and verseId are required" });
      }
      const bookmark = await db
        .insert(userBookmarks)
        .values({ userId, verseId, label })
        .onConflictDoNothing()
        .returning();
      return res.json(bookmark[0] ?? null);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/bookmarks/:id", async (req, res) => {
    try {
      await db
        .delete(userBookmarks)
        .where(eq(userBookmarks.id, req.params.id));
      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
