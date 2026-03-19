import { Router } from "express";
import { db } from "../db";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import { getErrorStatusCode } from "../services/ai-semaphore";
import {
  bibleBooks,
  contextCards,
  applicationTemplates,
  chapterContextCache,
  chapterSummaries,
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";
import { checkProStatus } from "../middleware/auth";
import { generateContextCards, generateApplicationStudy, generateChapterContext } from "../services/ai-engine";
import type { StudyDepth } from "../services/ai-engine";

const router = Router();

router.get("/api/context", async (req, res) => {
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

    const seen = new Set<string>();
    const deduped = cards.filter((c) => {
      const key = `${c.bookId}_${c.chapter}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.json(deduped);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.post("/api/context/generate", aiGenerationLimiter, async (req, res) => {
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

    const depth = (req.body.depth || req.query.depth || "standard") as StudyDepth;
    let parsed;
    try {
      parsed = await generateContextCards({ bookId: Number(bookId), chapter: Number(chapter), bookName, depth });
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    const [inserted] = await db
      .insert(contextCards)
      .values({
        bookId: Number(bookId),
        chapter: Number(chapter),
        title: parsed.title,
        content: parsed.content,
        historicalBackground: parsed.historicalBackground,
        culturalNotes: parsed.culturalNotes,
        authorInfo: parsed.authorInfo,
        dateWritten: parsed.dateWritten,
        audience: parsed.audience,
        themes: parsed.themes,
      })
      .returning();

    return res.json([inserted]);
  } catch (err) {
    console.error("Context generation error:", err);
    return res.status(500).json({ error: "Failed to generate context" });
  }
});

router.get("/api/chapter-context/:bookId/:chapter", checkProStatus, async (req, res) => {
  try {
    const bookId = parseInt(String(req.params.bookId));
    const chapter = parseInt(String(req.params.chapter));

    const [cached] = await db.select().from(chapterContextCache)
      .where(and(
        eq(chapterContextCache.bookId, bookId),
        eq(chapterContextCache.chapter, chapter),
      ))
      .limit(1);

    if (cached) {
      return res.json({
        locations: JSON.parse(cached.locations),
        timelineEvents: JSON.parse(cached.timelineEvents),
        keyFigures: JSON.parse(cached.keyFigures),
        culturalInsights: cached.culturalInsights,
        geographicalNotes: cached.geographicalNotes,
      });
    }

    const [book] = await db.select().from(bibleBooks).where(eq(bibleBooks.id, bookId)).limit(1);
    const bookName = book?.name || "Unknown";

    const result = await generateChapterContext({ bookId, chapter, bookName });

    await db.insert(chapterContextCache).values({
      bookId,
      chapter,
      locations: JSON.stringify(result.locations || []),
      timelineEvents: JSON.stringify(result.timelineEvents || []),
      keyFigures: JSON.stringify(result.keyFigures || []),
      culturalInsights: result.culturalInsights || null,
      geographicalNotes: result.geographicalNotes || null,
    });

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/chapter-summary", async (req, res) => {
  try {
    const bookId = parseInt(String(req.query.bookId));
    const chapter = parseInt(String(req.query.chapter));
    if (!bookId || !chapter) {
      return res.status(400).json({ error: "bookId and chapter are required" });
    }
    const [summary] = await db
      .select()
      .from(chapterSummaries)
      .where(
        and(
          eq(chapterSummaries.bookId, bookId),
          eq(chapterSummaries.chapter, chapter)
        )
      )
      .limit(1);
    if (!summary) {
      return res.json(null);
    }
    return res.json({
      id: summary.id,
      bookId: summary.bookId,
      chapter: summary.chapter,
      bigIdea: summary.bigIdea,
      narrativeRole: summary.narrativeRole,
      focusThemes: JSON.parse(summary.focusThemes),
      pastoralFrame: summary.pastoralFrame,
      thesisStatement: summary.thesisStatement || null,
      doctrinalAnchor: summary.doctrinalAnchor || null,
      narrativePlacement: summary.narrativePlacement || null,
      version: summary.version,
    });
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/application", async (req, res) => {
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
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.post("/api/application/generate", aiGenerationLimiter, async (req, res) => {
  try {
    const { bookId, chapter } = req.body;
    if (!bookId || !chapter) {
      return res.status(400).json({ error: "bookId and chapter are required" });
    }

    const existing = await db
      .select()
      .from(applicationTemplates)
      .where(
        and(
          eq(applicationTemplates.bookId, Number(bookId)),
          eq(applicationTemplates.chapter, Number(chapter))
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

    const depth = (req.body.depth || req.query.depth || "standard") as StudyDepth;
    let parsed;
    try {
      parsed = await generateApplicationStudy({ bookId: Number(bookId), chapter: Number(chapter), bookName, depth });
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    const [inserted] = await db
      .insert(applicationTemplates)
      .values({
        bookId: Number(bookId),
        chapter: Number(chapter),
        thenContext: parsed.thenContext,
        nowApplication: parsed.nowApplication,
        reflectionQuestions: parsed.reflectionQuestions,
        prayerPrompt: parsed.prayerPrompt,
        keyTheme: parsed.keyTheme,
      })
      .returning();

    return res.json([inserted]);
  } catch (err) {
    console.error("Application generation error:", err);
    return res.status(500).json({ error: "Failed to generate application data" });
  }
});

export default router;
