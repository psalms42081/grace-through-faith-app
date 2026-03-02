import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { textToSpeech, isValidVoice } from "./openai-tts";
import {
  generateStrongWordStudy,
  generateContextCards,
  generateApplicationStudy,
  generateStudyGuideStart,
  generateStudyGuideResponse,
  generateVerseMap,
  generateChapterContext,
  generateConversationStarter,
  generatePauseAndWonder,
  generateDinnerTableTopic,
  generateStoryScenes,
  generateScripturalEncouragement,
} from "./services/ai-engine";
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
  prayerRequests,
  readingHistory,
  readingStreaks,
  studyGuideSessions,
  verseMapCache,
  chapterContextCache,
  childProfiles,
  kidsWonderCache,
  kidsStoryScenes,
  dinnerTableTopics,
} from "../shared/schema";
import { eq, and, ilike, sql, desc, asc, countDistinct, count } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {

  db.select().from(users).where(eq(users.id, "guest")).then((rows) => {
    if (rows.length === 0) {
      db.insert(users).values({ id: "guest", username: "guest", password: "guest" }).then(() => {
        console.log("Guest user created");
      });
    }
  });

  async function checkProStatus(
    req: import("express").Request,
    res: import("express").Response,
    next: import("express").NextFunction
  ) {
    try {
      const userId = String(req.query.userId || req.body?.userId || "guest");
      const [user] = await db.select({ isPro: users.isPro }).from(users).where(eq(users.id, userId));
      if (!user || !user.isPro) {
        return res.status(403).json({ error: "Upgrade to Pro to unlock Deep Study layers." });
      }
      next();
    } catch (err) {
      console.error("Pro check error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  app.get("/api/user/pro-status", async (req, res) => {
    try {
      const userId = String(req.query.userId || "guest");
      const [user] = await db.select({ isPro: users.isPro }).from(users).where(eq(users.id, userId));
      return res.json({ isPro: user?.isPro ?? false });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/user/start-trial", async (req, res) => {
    try {
      const userId = String(req.body?.userId || "guest");
      await db.update(users).set({ isPro: true }).where(eq(users.id, userId));
      return res.json({ success: true, isPro: true });
    } catch (err) {
      return res.status(500).json({ error: "Internal server error" });
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

  app.get("/api/strong/search", async (req, res) => {
    try {
      const { q, language } = req.query;
      if (!q || String(q).trim().length < 2) {
        return res.json([]);
      }
      const searchTerm = `%${String(q).trim().toLowerCase()}%`;
      const conditions = [
        sql`(LOWER(${strongEntries.definition}) LIKE ${searchTerm} OR LOWER(${strongEntries.lemma}) LIKE ${searchTerm} OR LOWER(${strongEntries.transliteration}) LIKE ${searchTerm} OR LOWER(${strongEntries.kjvUsage}) LIKE ${searchTerm} OR LOWER(${strongEntries.id}) LIKE ${searchTerm})`,
      ];
      if (language && (language === "he" || language === "gr")) {
        conditions.push(eq(strongEntries.language, String(language)));
      }
      const results = await db
        .select()
        .from(strongEntries)
        .where(and(...conditions))
        .limit(50);
      return res.json(results);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

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

  app.post("/api/strong/generate", async (req, res) => {
    try {
      const { verseId, bookName, chapter, verse, verseText } = req.body;
      if (!verseId || !verseText) {
        return res.status(400).json({ error: "verseId and verseText are required" });
      }

      const existing = await db
        .select({ map: verseStrongMaps, entry: strongEntries })
        .from(verseStrongMaps)
        .leftJoin(strongEntries, eq(verseStrongMaps.strongId, strongEntries.id))
        .where(eq(verseStrongMaps.verseId, verseId))
        .orderBy(verseStrongMaps.wordPosition);

      if (existing.length > 0) {
        return res.json(existing);
      }

      let parsed: any[];
      try {
        parsed = await generateStrongWordStudy({ verseText, bookName, chapter, verse });
      } catch {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      const langCode = (bookName && ["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"].includes(bookName)) ? "gr" : "he";

      const results: any[] = [];

      for (let i = 0; i < parsed.length; i++) {
        const w = parsed[i];
        const sid = w.strongId || `${langCode === "he" ? "H" : "G"}${9000 + i}`;

        const existingEntry = await db.select().from(strongEntries).where(eq(strongEntries.id, sid)).limit(1);

        if (existingEntry.length === 0) {
          await db.insert(strongEntries).values({
            id: sid,
            language: langCode,
            lemma: w.lemma || w.originalWord || "",
            transliteration: w.transliteration || null,
            pronunciation: w.pronunciation || null,
            definition: w.definition || "",
            kjvUsage: w.kjvUsage || null,
          }).onConflictDoNothing();
        }

        const [mapEntry] = await db.insert(verseStrongMaps).values({
          verseId,
          strongId: sid,
          wordPosition: i + 1,
          originalWord: w.originalWord || w.lemma || "",
          translatedWord: w.translatedWord || null,
        }).returning();

        const entry = existingEntry.length > 0 ? existingEntry[0] : (await db.select().from(strongEntries).where(eq(strongEntries.id, sid)).limit(1))[0];

        results.push({ map: mapEntry, entry });
      }

      return res.json(results);
    } catch (err) {
      console.error("Word study generation error:", err);
      return res.status(500).json({ error: "Failed to generate word study" });
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

      let parsed;
      try {
        parsed = await generateContextCards({ bookId: Number(bookId), chapter: Number(chapter), bookName });
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

  const BOOK_ID_TO_API: Record<number, string> = {
    1:"GEN",2:"EXO",3:"LEV",4:"NUM",5:"DEU",6:"JOS",7:"JDG",8:"RUT",
    9:"1SA",10:"2SA",11:"1KI",12:"2KI",13:"1CH",14:"2CH",15:"EZR",16:"NEH",
    17:"EST",18:"JOB",19:"PSA",20:"PRO",21:"ECC",22:"SNG",23:"ISA",24:"JER",
    25:"LAM",26:"EZK",27:"DAN",28:"HOS",29:"JOL",30:"AMO",31:"OBA",32:"JON",
    33:"MIC",34:"NAM",35:"HAB",36:"ZEP",37:"HAG",38:"ZEC",39:"MAL",
    40:"MAT",41:"MRK",42:"LUK",43:"JHN",44:"ACT",45:"ROM",46:"1CO",47:"2CO",
    48:"GAL",49:"EPH",50:"PHP",51:"COL",52:"1TH",53:"2TH",54:"1TI",55:"2TI",
    56:"TIT",57:"PHM",58:"HEB",59:"JAS",60:"1PE",61:"2PE",62:"1JN",63:"2JN",
    64:"3JN",65:"JUD",66:"REV",
  };

  const COMMENTARY_SOURCES = [
    { apiId: "matthew-henry", dbId: "matthew-henry", name: "Matthew Henry", dates: "1662–1714", tradition: "Reformed" },
    { apiId: "jamieson-fausset-brown", dbId: "jfb", name: "Jamieson, Fausset & Brown", dates: "1871", tradition: "Presbyterian" },
    { apiId: "adam-clarke", dbId: "adam-clarke", name: "Adam Clarke", dates: "1762–1832", tradition: "Wesleyan" },
    { apiId: "john-gill", dbId: "john-gill", name: "John Gill", dates: "1697–1771", tradition: "Baptist" },
  ];

  async function fetchRealCommentary(apiId: string, bookCode: string, ch: number): Promise<{ verses: { number: number; content: string }[] } | null> {
    try {
      const resp = await fetch(`https://bible.helloao.org/api/c/${apiId}/${bookCode}/${ch}.json`);
      if (!resp.ok) return null;
      const data = await resp.json() as any;
      const items = data?.chapter?.content;
      if (!Array.isArray(items) || items.length === 0) return null;
      return {
        verses: items
          .map((v: any) => {
            const raw = v.content;
            const text = Array.isArray(raw) ? raw.join("\n") : (typeof raw === "string" ? raw : "");
            return { number: v.number, content: text };
          })
          .filter((v: any) => v.content && v.content.trim()),
      };
    } catch {
      return null;
    }
  }

  app.post("/api/commentary/generate", async (req, res) => {
    try {
      const { bookId, chapter } = req.body;
      if (!bookId || !chapter) {
        return res.status(400).json({ error: "bookId and chapter are required" });
      }

      const existing = await db
        .select({ entry: commentaryEntries, commentator: commentators })
        .from(commentaryEntries)
        .leftJoin(commentators, eq(commentaryEntries.commentatorId, commentators.id))
        .where(
          and(
            eq(commentaryEntries.bookId, Number(bookId)),
            eq(commentaryEntries.chapter, Number(chapter))
          )
        );

      if (existing.length > 0) {
        return res.json(existing);
      }

      const bookCode = BOOK_ID_TO_API[Number(bookId)];
      if (!bookCode) {
        return res.status(400).json({ error: "Invalid book ID" });
      }

      const bookRows = await db
        .select()
        .from(bibleBooks)
        .where(eq(bibleBooks.id, Number(bookId)));

      if (bookRows.length === 0) {
        return res.status(404).json({ error: "Book not found" });
      }
      const bookName = bookRows[0].name;

      const existingCommentators = await db.select().from(commentators);
      const commentatorMap: Record<string, string> = {};
      for (const c of existingCommentators) {
        commentatorMap[c.id] = c.id;
      }

      for (const src of COMMENTARY_SOURCES) {
        if (!commentatorMap[src.dbId]) {
          await db.insert(commentators).values({ id: src.dbId, name: src.name, dates: src.dates, tradition: src.tradition }).onConflictDoNothing();
          commentatorMap[src.dbId] = src.dbId;
        }
      }

      const results: any[] = [];

      for (const src of COMMENTARY_SOURCES) {
        const data = await fetchRealCommentary(src.apiId, bookCode, Number(chapter));
        if (!data || data.verses.length === 0) continue;

        const fullText = data.verses
          .map(v => v.content.trim())
          .join("\n\n");

        const trimmed = fullText.length > 3000 ? fullText.substring(0, 3000) + "..." : fullText;

        const [inserted] = await db
          .insert(commentaryEntries)
          .values({
            commentatorId: src.dbId,
            bookId: Number(bookId),
            chapter: Number(chapter),
            content: trimmed,
            title: `${bookName} ${chapter} — ${src.name}`,
          })
          .returning();

        const cRow = await db.select().from(commentators).where(eq(commentators.id, src.dbId)).limit(1);
        results.push({ entry: inserted, commentator: cRow[0] || null });
      }

      return res.json(results);
    } catch (err) {
      console.error("Commentary fetch error:", err);
      return res.status(500).json({ error: "Failed to fetch commentary" });
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

  app.post("/api/application/generate", async (req, res) => {
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

      let parsed;
      try {
        parsed = await generateApplicationStudy({ bookId: Number(bookId), chapter: Number(chapter), bookName });
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
      const { text, voice = "nova" } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "text is required" });
      }
      const selectedVoice = isValidVoice(voice) ? voice : "nova";
      console.log(`[TTS Route] voice param="${voice}" → selected="${selectedVoice}"`);
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

  app.post("/api/kids/progress/quiz", async (req, res) => {
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

  // ─── KIDS INTERACTIVE STORYTELLER (Pause & Wonder) ─────────────────────────

  app.get("/api/kids/stories/:id/wonder", async (req, res) => {
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

  app.post("/api/kids/wonder/answer", async (req, res) => {
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

  app.get("/api/kids/story/:id/scenes", async (req, res) => {
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

  app.post("/api/kids/story/:id/generate", async (req, res) => {
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

  app.get("/api/kids/audio-assets", (_req, res) => {
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

  app.post("/api/kids/story/award-points", async (req, res) => {
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

  app.get("/api/prayers", async (req, res) => {
    try {
      const userId = String(req.query.userId || "guest");
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

  app.post("/api/prayers", async (req, res) => {
    try {
      const { userId = "guest", title, content, category = "personal" } = req.body;
      if (!title) return res.status(400).json({ error: "Title is required" });
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

  app.patch("/api/prayers/:id", async (req, res) => {
    try {
      const { id } = req.params;
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

  app.delete("/api/prayers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await db.delete(prayerRequests).where(eq(prayerRequests.id, id));
      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── READING HISTORY & STREAKS ─────────────────────────────────────────────

  app.post("/api/reading-history", async (req, res) => {
    try {
      const { userId = "guest", bookId, bookName, chapter, translation = "KJV" } = req.body;
      if (!bookId || !chapter || !bookName) {
        return res.status(400).json({ error: "bookId, bookName, and chapter are required" });
      }

      const [entry] = await db
        .insert(readingHistory)
        .values({ userId, bookId: Number(bookId), bookName, chapter: Number(chapter), translation })
        .returning();

      const today = new Date().toISOString().split("T")[0];
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
          // already read today
        } else {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split("T")[0];
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

  app.get("/api/reading-history/recent", async (req, res) => {
    try {
      const userId = String(req.query.userId || "guest");
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

  app.get("/api/reading-streaks", async (req, res) => {
    try {
      const userId = String(req.query.userId || "guest");
      const [streak] = await db
        .select()
        .from(readingStreaks)
        .where(eq(readingStreaks.userId, userId));
      if (!streak) {
        return res.json({ currentStreak: 0, longestStreak: 0, lastReadDate: null });
      }
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
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

  app.get("/api/reading-streaks/weekly", async (req, res) => {
    try {
      const userId = String(req.query.userId || "guest");
      const now = new Date();
      const dayOfWeek = now.getDay();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - dayOfWeek);
      startOfWeek.setHours(0, 0, 0, 0);

      const reads = await db
        .select({ readAt: readingHistory.readAt })
        .from(readingHistory)
        .where(
          and(
            eq(readingHistory.userId, userId),
            sql`${readingHistory.readAt} >= ${startOfWeek.toISOString()}::timestamp`
          )
        );

      const daysRead: boolean[] = [false, false, false, false, false, false, false];
      for (const r of reads) {
        const d = new Date(r.readAt).getDay();
        daysRead[d] = true;
      }

      const perfectWeekResult = await db.execute(sql`
        SELECT COUNT(*) as count FROM (
          SELECT date_trunc('week', ${readingHistory.readAt}) as week_start
          FROM ${readingHistory}
          WHERE ${readingHistory.userId} = ${userId}
          GROUP BY week_start
          HAVING COUNT(DISTINCT EXTRACT(DOW FROM ${readingHistory.readAt})) = 7
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

  // ─── SOCRATIC AI STUDY GUIDE ──────────────────────────────────────────────

  app.get("/api/study-guide/active", async (req, res) => {
    try {
      const userId = String(req.query.userId || "guest");
      const verseReference = String(req.query.verseReference || "");
      if (!verseReference) {
        return res.status(400).json({ error: "verseReference is required" });
      }

      const [activeSession] = await db
        .select()
        .from(studyGuideSessions)
        .where(
          and(
            eq(studyGuideSessions.userId, userId),
            eq(studyGuideSessions.verseReference, verseReference),
            sql`${studyGuideSessions.completedAt} IS NULL`
          )
        )
        .orderBy(desc(studyGuideSessions.createdAt))
        .limit(1);

      if (!activeSession) {
        return res.json({ found: false });
      }

      return res.json({
        found: true,
        session: {
          ...activeSession,
          messages: JSON.parse(activeSession.messages),
        },
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/study-guide/start", checkProStatus, async (req, res) => {
    try {
      const { verseReference, verseText, bookName, chapter, verse, userId = "guest", forceNew = false, persona = "scholarly" } = req.body;
      if (!verseReference || !verseText) {
        return res.status(400).json({ error: "verseReference and verseText are required" });
      }

      const validPersonas = ["scholarly", "pastoral", "ancient"];
      const resolvedPersona = validPersonas.includes(persona) ? persona : "scholarly";

      if (!forceNew) {
        const [existingActive] = await db
          .select()
          .from(studyGuideSessions)
          .where(
            and(
              eq(studyGuideSessions.userId, userId),
              eq(studyGuideSessions.verseReference, verseReference),
              sql`${studyGuideSessions.completedAt} IS NULL`
            )
          )
          .orderBy(desc(studyGuideSessions.createdAt))
          .limit(1);

        if (existingActive) {
          const messages = JSON.parse(existingActive.messages);
          return res.json({
            session: { ...existingActive, messages },
            aiMessage: messages[messages.length - 1]?.content || "",
            resumed: true,
          });
        }
      }

      const aiMessage = await generateStudyGuideStart({ verseReference, verseText, persona: resolvedPersona });

      const messages = [
        { role: "assistant", content: aiMessage, phase: "observe", timestamp: new Date().toISOString() },
      ];

      const [session] = await db.insert(studyGuideSessions).values({
        userId,
        verseReference,
        verseText,
        bookName: bookName || "",
        chapter: chapter || 0,
        verse: verse || 0,
        phase: "observe",
        persona: resolvedPersona,
        messages: JSON.stringify(messages),
      }).returning();

      return res.json({ session: { ...session, messages }, aiMessage });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/study-guide/respond", checkProStatus, async (req, res) => {
    try {
      const { sessionId, userResponse, userId = "guest" } = req.body;
      if (!sessionId || !userResponse) {
        return res.status(400).json({ error: "sessionId and userResponse are required" });
      }

      const [session] = await db.select().from(studyGuideSessions).where(eq(studyGuideSessions.id, sessionId)).limit(1);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const existingMessages = JSON.parse(session.messages);
      existingMessages.push({ role: "user", content: userResponse, phase: session.phase, timestamp: new Date().toISOString() });

      const userMsgCount = existingMessages.filter((m: any) => m.role === "user").length;
      const currentPhase = session.phase;
      let shouldAdvance = false;
      let nextPhase = currentPhase;

      if (currentPhase === "observe" && userMsgCount >= 3) shouldAdvance = true;
      if (currentPhase === "interpret" && userMsgCount >= 5) shouldAdvance = true;
      if (currentPhase === "apply" && userMsgCount >= 7) shouldAdvance = true;

      if (shouldAdvance) {
        if (currentPhase === "observe") nextPhase = "interpret";
        else if (currentPhase === "interpret") nextPhase = "apply";
        else if (currentPhase === "apply") nextPhase = "complete";
      }

      const targetPhase = shouldAdvance ? nextPhase : currentPhase;

      const chatMessages = existingMessages.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const aiMessage = await generateStudyGuideResponse({
        verseText: session.verseText,
        verseReference: session.verseReference,
        chatMessages,
        targetPhase,
        currentPhase,
        persona: session.persona,
      });

      existingMessages.push({ role: "assistant", content: aiMessage, phase: targetPhase, timestamp: new Date().toISOString() });

      await db.update(studyGuideSessions)
        .set({
          messages: JSON.stringify(existingMessages),
          phase: targetPhase,
          ...(targetPhase === "complete" ? { completedAt: new Date() } : {}),
        })
        .where(eq(studyGuideSessions.id, sessionId));

      return res.json({
        aiMessage,
        phase: targetPhase,
        isComplete: targetPhase === "complete",
        messages: existingMessages,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/study-guide/sessions", async (req, res) => {
    try {
      const userId = String(req.query.userId || "guest");
      const sessions = await db.select().from(studyGuideSessions)
        .where(eq(studyGuideSessions.userId, userId))
        .orderBy(desc(studyGuideSessions.createdAt))
        .limit(20);
      return res.json(sessions);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/study-guide/complete/:id", async (req, res) => {
    try {
      await db
        .update(studyGuideSessions)
        .set({ completedAt: new Date(), phase: "complete" })
        .where(eq(studyGuideSessions.id, req.params.id));
      return res.json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/study-guide/session/:id", async (req, res) => {
    try {
      const [session] = await db.select().from(studyGuideSessions)
        .where(eq(studyGuideSessions.id, req.params.id))
        .limit(1);
      if (!session) return res.status(404).json({ error: "Session not found" });
      return res.json({ ...session, messages: JSON.parse(session.messages) });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── VISUAL VERSE MAPPER ──────────────────────────────────────────────────

  app.get("/api/verse-map/:verseId", checkProStatus, async (req, res) => {
    try {
      const { verseId } = req.params;

      const words = await db
        .select({
          map: verseStrongMaps,
          entry: strongEntries,
        })
        .from(verseStrongMaps)
        .leftJoin(strongEntries, eq(verseStrongMaps.strongId, strongEntries.id))
        .where(eq(verseStrongMaps.verseId, verseId));

      const [cached] = await db.select().from(verseMapCache)
        .where(eq(verseMapCache.verseId, verseId)).limit(1);

      const crossReferences = cached ? JSON.parse(cached.crossReferences) : [];
      const contextSnippet = cached?.contextSnippet || null;

      return res.json({ words, crossReferences, contextSnippet, hasCachedData: !!cached });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/verse-map/generate", checkProStatus, async (req, res) => {
    try {
      const { verseId, verseText, verseReference, bookName, chapter, verse } = req.body;
      if (!verseId || !verseText || !verseReference) {
        return res.status(400).json({ error: "verseId, verseText, and verseReference are required" });
      }

      const [existing] = await db.select().from(verseMapCache)
        .where(eq(verseMapCache.verseId, verseId)).limit(1);
      if (existing) {
        return res.json({ crossReferences: JSON.parse(existing.crossReferences), contextSnippet: existing.contextSnippet });
      }

      const result = await generateVerseMap({ verseText, verseReference });

      await db.insert(verseMapCache).values({
        verseId,
        crossReferences: JSON.stringify(result.crossReferences),
        contextSnippet: result.contextSnippet,
      }).onConflictDoUpdate({
        target: verseMapCache.verseId,
        set: {
          crossReferences: JSON.stringify(result.crossReferences),
          contextSnippet: result.contextSnippet,
        },
      });

      return res.json(result);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── 4D SCRIPTURE — CHAPTER CONTEXT ────────────────────────────────────────

  app.get("/api/chapter-context/:bookId/:chapter", checkProStatus, async (req, res) => {
    try {
      const bookId = parseInt(req.params.bookId);
      const chapter = parseInt(req.params.chapter);

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
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/analytics/growth", async (req, res) => {
    try {
      const userId = String(req.query.userId || "guest");

      const sessions = await db
        .select({
          createdAt: studyGuideSessions.createdAt,
          completedAt: studyGuideSessions.completedAt,
        })
        .from(studyGuideSessions)
        .where(eq(studyGuideSessions.userId, userId));

      let deepStudyMinutes = 0;
      for (const s of sessions) {
        if (s.completedAt && s.createdAt) {
          const mins = (new Date(s.completedAt).getTime() - new Date(s.createdAt).getTime()) / 60000;
          if (mins > 0 && mins < 480) deepStudyMinutes += mins;
        } else if (s.createdAt) {
          deepStudyMinutes += 5;
        }
      }
      deepStudyMinutes = Math.round(deepStudyMinutes);

      const userChapters = await db
        .select({
          bookId: readingHistory.bookId,
          chapter: readingHistory.chapter,
        })
        .from(readingHistory)
        .where(eq(readingHistory.userId, userId))
        .groupBy(readingHistory.bookId, readingHistory.chapter);

      let wordsLearned = 0;
      if (userChapters.length > 0) {
        const conditions = userChapters.map(
          (ch) => sql`(${bibleVerses.bookId} = ${ch.bookId} AND ${bibleVerses.chapter} = ${ch.chapter})`
        );
        const [wordsResult] = await db
          .select({ total: countDistinct(verseStrongMaps.strongId) })
          .from(verseStrongMaps)
          .innerJoin(bibleVerses, eq(verseStrongMaps.verseId, bibleVerses.id))
          .where(sql`(${sql.join(conditions, sql` OR `)})`);
        wordsLearned = wordsResult?.total ?? 0;
      }

      const booksRead = await db
        .select({ bookId: readingHistory.bookId })
        .from(readingHistory)
        .where(eq(readingHistory.userId, userId))
        .groupBy(readingHistory.bookId);

      const exploredBookIds = booksRead.map((r) => r.bookId);

      const allBooks = await db
        .select({
          id: bibleBooks.id,
          name: bibleBooks.name,
          abbreviation: bibleBooks.abbreviation,
          testament: bibleBooks.testament,
          chapterCount: bibleBooks.chapterCount,
          orderIndex: bibleBooks.orderIndex,
        })
        .from(bibleBooks)
        .orderBy(asc(bibleBooks.orderIndex));

      const chaptersPerBook = await db
        .select({
          bookId: readingHistory.bookId,
          chaptersRead: countDistinct(readingHistory.chapter),
        })
        .from(readingHistory)
        .where(eq(readingHistory.userId, userId))
        .groupBy(readingHistory.bookId);

      const chaptersMap = new Map(
        chaptersPerBook.map((r) => [r.bookId, Number(r.chaptersRead)])
      );

      const bibleMap = allBooks.map((book) => ({
        id: book.id,
        name: book.name,
        abbreviation: book.abbreviation,
        testament: book.testament,
        chapterCount: book.chapterCount,
        chaptersRead: chaptersMap.get(book.id) ?? 0,
        explored: exploredBookIds.includes(book.id),
      }));

      return res.json({
        deepStudyMinutes,
        totalSessions: sessions.length,
        wordsLearned,
        bibleMap,
        booksExplored: exploredBookIds.length,
        totalBooks: allBooks.length,
      });
    } catch (err) {
      console.error("Growth analytics error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── FAMILY DASHBOARD ─────────────────────────────────────────────────────

  app.get("/api/family/children", checkProStatus, async (req, res) => {
    try {
      const parentId = String(req.query.userId || req.query.parentId || "guest");
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

  app.post("/api/family/children", checkProStatus, async (req, res) => {
    try {
      const userId = String(req.body?.userId || "guest");
      const { name, avatarUrl } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Child name is required" });
      }
      const [child] = await db
        .insert(childProfiles)
        .values({ parentId: userId, name, avatarUrl: avatarUrl || null })
        .returning();
      return res.json(child);
    } catch (err) {
      console.error("Add child error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/family/children/:id", checkProStatus, async (req, res) => {
    try {
      const userId = String(req.query.userId || "guest");
      const [child] = await db
        .select()
        .from(childProfiles)
        .where(and(eq(childProfiles.id, req.params.id), eq(childProfiles.parentId, userId)));
      if (!child) {
        return res.status(404).json({ error: "Child profile not found" });
      }
      await db.delete(childProfiles).where(eq(childProfiles.id, req.params.id));
      return res.json({ success: true });
    } catch (err) {
      console.error("Delete child error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/family/stats", checkProStatus, async (req, res) => {
    try {
      const parentId = String(req.query.parentId || req.query.userId || "guest");

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

  app.get("/api/family/conversation-starter/:childId", checkProStatus, async (req, res) => {
    try {
      const { childId } = req.params;
      const userId = String(req.query.userId || "guest");

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

  app.get("/api/family/heatmap", checkProStatus, async (req, res) => {
    try {
      const parentId = String(req.query.userId || req.query.parentId || "guest");

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

  app.get("/api/family/prayers", checkProStatus, async (req, res) => {
    try {
      const familyId = String(req.query.userId || req.query.familyId || "guest");
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

  app.post("/api/family/prayers", checkProStatus, async (req, res) => {
    try {
      const { userId, familyId, title, content, category, authorName } = req.body;
      if (!title || !title.trim()) {
        return res.status(400).json({ error: "Prayer title is required" });
      }

      const fId = familyId || userId || "guest";
      const uId = userId || "guest";

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

  app.post("/api/family/prayers/:id/support", checkProStatus, async (req, res) => {
    try {
      const { id } = req.params;
      const memberName = String(req.body.memberName || req.body.userId || "guest");

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

  app.post("/api/family/prayers/:id/answered", checkProStatus, async (req, res) => {
    try {
      const { id } = req.params;
      const answered = req.body.answered !== false;

      const [updated] = await db
        .update(prayerRequests)
        .set({
          answered,
          answeredAt: answered ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(prayerRequests.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Prayer not found" });
      }

      return res.json(updated);
    } catch (err) {
      console.error("Prayer answered error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ─── DINNER TABLE TOPICS (Parent Bridge) ─────────────────────────────────

  app.get("/api/family/dinner-topics", checkProStatus, async (req, res) => {
    try {
      const parentId = String(req.query.userId || req.query.parentId || "guest");
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

  app.post("/api/family/dinner-topics/:id/discussed", checkProStatus, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = String(req.body.userId || "guest");

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

  const httpServer = createServer(app);
  return httpServer;
}
