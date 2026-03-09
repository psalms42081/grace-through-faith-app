import { Router } from "express";
  import { db } from "../db";
  import {
    bibleBooks,
    bibleVerses,
    bibleTranslations,
  } from "../../shared/schema";
  import { eq, and, ilike, sql } from "drizzle-orm";
  import { cachedResponse } from "../middleware/response-cache";

  const router = Router();

  router.get("/api/passage", async (req, res) => {
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

router.get("/api/books", cachedResponse(300), async (_req, res) => {
  try {
    const books = await db.select().from(bibleBooks).orderBy(bibleBooks.orderIndex);
    return res.json(books);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── VERSE ──────────────────────────────────────────────────────────────────

router.get("/api/verse", async (req, res) => {
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

router.get("/api/search", async (req, res) => {
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

router.get("/api/search/reference", async (req, res) => {
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

  export default router;
  