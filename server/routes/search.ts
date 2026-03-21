import { Router } from "express";
import { db } from "../db";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import {
  bibleBooks,
  bibleVerses,
  searchCache,
  userNotes,
  userHighlights,
  userBookmarks,
} from "../../shared/schema";
import { eq, and, sql, desc, or } from "drizzle-orm";
import * as crypto from "crypto";
import { extractUserId } from "../middleware/auth";
import { generateSemanticSearch } from "../services/ai-engine";

const router = Router();

router.post("/api/search/semantic", aiGenerationLimiter, async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { query } = req.body;
    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return res.status(400).json({ error: "A search query of at least 3 characters is required" });
    }

    const trimmedQuery = query.trim().toLowerCase();
    const queryHash = crypto.createHash("sha256").update(trimmedQuery).digest("hex");

    const cached = await db
      .select()
      .from(searchCache)
      .where(and(eq(searchCache.queryHash, queryHash), sql`${searchCache.expiresAt} > NOW()`))
      .limit(1);

    let verses: any[];
    if (cached.length > 0) {
      verses = cached[0].results as any[];
    } else {
      verses = await generateSemanticSearch(trimmedQuery);

      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db
        .insert(searchCache)
        .values({
          queryText: trimmedQuery,
          queryHash,
          userId: userId !== "guest" ? userId : null,
          results: verses,
          expiresAt,
        })
        .onConflictDoNothing();
    }

    let notes: any[] = [];
    let highlights: any[] = [];
    let bookmarks: any[] = [];

    const searchUserId = userId;
    if (searchUserId !== "guest") {
      const searchTerm = `%${trimmedQuery}%`;

      notes = await db
        .select({
          id: userNotes.id,
          content: userNotes.content,
          verseId: userNotes.verseId,
          createdAt: userNotes.createdAt,
          bookId: bibleVerses.bookId,
          chapter: bibleVerses.chapter,
          verse: bibleVerses.verse,
          verseText: bibleVerses.text,
          bookName: bibleBooks.name,
        })
        .from(userNotes)
        .leftJoin(bibleVerses, eq(userNotes.verseId, bibleVerses.id))
        .leftJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
        .where(
          and(
            eq(userNotes.userId, searchUserId),
            sql`LOWER(${userNotes.content}) LIKE ${searchTerm}`
          )
        )
        .orderBy(desc(userNotes.updatedAt))
        .limit(10);

      highlights = await db
        .select({
          id: userHighlights.id,
          color: userHighlights.color,
          verseId: userHighlights.verseId,
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
        .where(
          and(
            eq(userHighlights.userId, searchUserId),
            sql`LOWER(${bibleVerses.text}) LIKE ${searchTerm}`
          )
        )
        .orderBy(desc(userHighlights.createdAt))
        .limit(10);

      bookmarks = await db
        .select({
          id: userBookmarks.id,
          label: userBookmarks.label,
          verseId: userBookmarks.verseId,
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
        .where(
          and(
            eq(userBookmarks.userId, searchUserId),
            or(
              sql`LOWER(${userBookmarks.label}) LIKE ${searchTerm}`,
              sql`LOWER(${bibleVerses.text}) LIKE ${searchTerm}`
            )
          )
        )
        .orderBy(desc(userBookmarks.createdAt))
        .limit(10);
    }

    return res.json({
      verses,
      notes,
      highlights,
      bookmarks,
      cached: cached.length > 0,
    });
  } catch (err) {
    console.error("Semantic search error:", err);
    return res.status(500).json({ error: "Failed to perform semantic search" });
  }
});

router.get("/api/search/recent", async (req, res) => {
  try {
    const userId = extractUserId(req);
    if (userId === "guest") {
      return res.json([]);
    }

    const recent = await db
      .select({
        queryText: searchCache.queryText,
        createdAt: searchCache.createdAt,
      })
      .from(searchCache)
      .where(eq(searchCache.userId, userId))
      .orderBy(desc(searchCache.createdAt))
      .limit(10);

    return res.json(recent);
  } catch (err) {
    console.error("Recent searches error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
