import type { Express } from "express";
import { createServer, type Server } from "node:http";
import OpenAI from "openai";
import { textToSpeech, isValidVoice } from "./openai-tts";
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
  users,
  kidsCollections,
  kidsStories,
  kidsQuizQuestions,
  kidsProgress,
  kidsBadges,
  kidsUserBadges,
  kidsStreaks,
} from "../shared/schema";
import { eq, and, ilike, sql, desc } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {

  db.select().from(users).where(eq(users.id, "guest")).then((rows) => {
    if (rows.length === 0) {
      db.insert(users).values({ id: "guest", username: "guest", password: "guest" }).then(() => {
        console.log("Guest user created");
      });
    }
  });


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
      const { q, translation = "KJV", limit: limitStr = "50" } = req.query;
      if (!q) {
        return res.status(400).json({ error: "q (query) is required" });
      }

      const query = String(q).trim();
      const resultLimit = Math.min(Number(limitStr) || 50, 100);

      const translationRecord = await db
        .select()
        .from(bibleTranslations)
        .where(eq(bibleTranslations.abbreviation, String(translation)))
        .limit(1);

      if (!translationRecord.length) {
        return res.status(404).json({ error: "Translation not found" });
      }

      const results = await db
        .select({
          id: bibleVerses.id,
          bookId: bibleVerses.bookId,
          chapter: bibleVerses.chapter,
          verse: bibleVerses.verse,
          text: bibleVerses.text,
          bookName: bibleBooks.name,
          bookAbbreviation: bibleBooks.abbreviation,
        })
        .from(bibleVerses)
        .innerJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
        .where(
          and(
            eq(bibleVerses.translationId, translationRecord[0].id),
            ilike(bibleVerses.text, `%${query}%`)
          )
        )
        .orderBy(bibleBooks.orderIndex, bibleVerses.chapter, bibleVerses.verse)
        .limit(resultLimit);

      const countResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(bibleVerses)
        .where(
          and(
            eq(bibleVerses.translationId, translationRecord[0].id),
            ilike(bibleVerses.text, `%${query}%`)
          )
        );

      const totalCount = Number(countResult[0]?.count ?? 0);

      return res.json({ results, total: totalCount, returned: results.length });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/search/reference", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) {
        return res.status(400).json({ error: "q (query) is required" });
      }

      const query = String(q).trim();

      const refMatch = query.match(/^(\d?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/);
      if (!refMatch) {
        return res.json({ isReference: false });
      }

      const [, bookPart, chapterStr, verseStr, verseEndStr] = refMatch;
      const bookName = bookPart.trim().toLowerCase();

      const allBooks = await db.select().from(bibleBooks).orderBy(bibleBooks.orderIndex);
      const matchedBook = allBooks.find((b) =>
        b.name.toLowerCase() === bookName ||
        b.abbreviation.toLowerCase() === bookName ||
        b.name.toLowerCase().startsWith(bookName) ||
        b.name.toLowerCase().replace(/\s+/g, "").startsWith(bookName.replace(/\s+/g, ""))
      );

      if (!matchedBook) {
        return res.json({ isReference: false });
      }

      return res.json({
        isReference: true,
        bookId: matchedBook.id,
        bookName: matchedBook.name,
        chapter: parseInt(chapterStr, 10),
        verse: verseStr ? parseInt(verseStr, 10) : null,
        verseEnd: verseEndStr ? parseInt(verseEndStr, 10) : null,
      });
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

  app.post("/api/context/generate", async (req, res) => {
    try {
      const { bookId, chapter } = req.body;
      if (!bookId || !chapter) {
        return res.status(400).json({ error: "bookId and chapter are required" });
      }

      const existing = await db
        .select()
        .from(contextCards)
        .where(
          and(
            eq(contextCards.bookId, Number(bookId)),
            eq(contextCards.chapter, Number(chapter))
          )
        );

      if (existing.length > 0) {
        return res.json(existing);
      }

      const bookRows = await db
        .select()
        .from(bibleBooks)
        .where(eq(bibleBooks.id, Number(bookId)));

      if (bookRows.length === 0) {
        return res.status(404).json({ error: "Book not found" });
      }

      const bookName = bookRows[0].name;

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a Bible scholar providing historical and cultural context for Scripture passages. Return valid JSON only, no markdown. Be scholarly, balanced, and respectful of all Christian traditions.`,
          },
          {
            role: "user",
            content: `Provide historical context for ${bookName} chapter ${chapter}. Return JSON with these fields:
{
  "title": "A descriptive title for this chapter's context",
  "content": "2-3 paragraph overview of what this chapter covers and its significance",
  "historicalBackground": "2-3 paragraphs on the historical setting, when/where events took place",
  "culturalNotes": "1-2 paragraphs on cultural practices, customs, or norms relevant to understanding this chapter",
  "authorInfo": "Brief note on the traditional author of this book",
  "dateWritten": "Approximate date or range when this book was written",
  "audience": "Who was the original audience for this text",
  "themes": ["theme1", "theme2", "theme3"]
}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1200,
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let parsed: any;
      try {
        const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        console.error("Failed to parse AI response:", raw.substring(0, 500));
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      const [inserted] = await db
        .insert(contextCards)
        .values({
          bookId: Number(bookId),
          chapter: Number(chapter),
          title: parsed.title || `${bookName} ${chapter}`,
          content: parsed.content || "",
          historicalBackground: parsed.historicalBackground || null,
          culturalNotes: parsed.culturalNotes || null,
          authorInfo: parsed.authorInfo || null,
          dateWritten: parsed.dateWritten || null,
          audience: parsed.audience || null,
          themes: Array.isArray(parsed.themes) ? parsed.themes : [],
        })
        .returning();

      return res.json([inserted]);
    } catch (err) {
      console.error("Context generation error:", err);
      return res.status(500).json({ error: "Failed to generate context" });
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

  app.get("/api/location/:id/verses", async (req, res) => {
    try {
      const rows = await db
        .select({
          verseId: locationVerseMaps.verseId,
          note: locationVerseMaps.note,
          bookId: bibleVerses.bookId,
          chapter: bibleVerses.chapter,
          verse: bibleVerses.verse,
          text: bibleVerses.text,
          bookName: bibleBooks.name,
        })
        .from(locationVerseMaps)
        .innerJoin(bibleVerses, eq(locationVerseMaps.verseId, bibleVerses.id))
        .innerJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
        .where(eq(locationVerseMaps.locationId, req.params.id));
      return res.json(rows);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/timeline/:id/verses", async (req, res) => {
    try {
      const rows = await db
        .select({
          verseId: eventVerseMaps.verseId,
          bookId: bibleVerses.bookId,
          chapter: bibleVerses.chapter,
          verse: bibleVerses.verse,
          text: bibleVerses.text,
          bookName: bibleBooks.name,
        })
        .from(eventVerseMaps)
        .innerJoin(bibleVerses, eq(eventVerseMaps.verseId, bibleVerses.id))
        .innerJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
        .where(eq(eventVerseMaps.eventId, req.params.id));
      return res.json(rows);
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

  app.get("/api/devotionals/plans/:planId/days", async (req, res) => {
    try {
      const days = await db
        .select()
        .from(devotionalDays)
        .where(eq(devotionalDays.planId, req.params.planId))
        .orderBy(devotionalDays.dayNumber);
      return res.json(days);
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

  // ─── TEXT-TO-SPEECH ──────────────────────────────────────────────────────────

  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voice = "alloy" } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "text is required" });
      }
      const selectedVoice = isValidVoice(voice) ? voice : "alloy";
      const audioBuffer = await textToSpeech(text, selectedVoice, "mp3");
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
        "Cache-Control": "public, max-age=86400",
      });
      return res.send(audioBuffer);
    } catch (err) {
      console.error("TTS error:", err);
      return res.status(500).json({ error: "Text-to-speech failed" });
    }
  });

  // ─── KIDS CLUB ───────────────────────────────────────────────────────────────

  app.get("/api/kids/collections", async (req, res) => {
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

  app.get("/api/kids/collections/:id/stories", async (req, res) => {
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

  app.get("/api/kids/stories/:id", async (req, res) => {
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

  app.get("/api/kids/stories/:id/quiz", async (req, res) => {
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

  app.post("/api/kids/progress/complete", async (req, res) => {
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

  app.post("/api/kids/progress/quiz", async (req, res) => {
    try {
      const { userId, storyId, score } = req.body;
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
      if (existing.length) {
        const updated = await db
          .update(kidsProgress)
          .set({ quizScore: score })
          .where(eq(kidsProgress.id, existing[0].id))
          .returning();
        return res.json(updated[0]);
      }
      const progress = await db
        .insert(kidsProgress)
        .values({ userId, storyId, quizScore: score })
        .returning();
      return res.json(progress[0]);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/kids/progress/memorize", async (req, res) => {
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

  app.get("/api/kids/progress/:userId", async (req, res) => {
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

  app.get("/api/kids/badges", async (_req, res) => {
    try {
      const badges = await db.select().from(kidsBadges);
      return res.json(badges);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/kids/badges/:userId", async (req, res) => {
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

  app.get("/api/kids/streak/:userId", async (req, res) => {
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

  app.post("/api/kids/streak/update", async (req, res) => {
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

  app.get("/api/kids/daily", async (req, res) => {
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

  const httpServer = createServer(app);
  return httpServer;
}
