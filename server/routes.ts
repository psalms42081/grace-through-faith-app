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
  prayerRequests,
  readingHistory,
  readingStreaks,
  studyGuideSessions,
  verseMapCache,
  chapterContextCache,
} from "../shared/schema";
import { eq, and, ilike, sql, desc, asc } from "drizzle-orm";

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

      const testament = (bookName && ["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"].includes(bookName)) ? "NT" : "OT";
      const lang = testament === "NT" ? "Greek" : "Hebrew";
      const langCode = testament === "NT" ? "gr" : "he";

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a ${lang} Bible lexicographer. Analyze key words from Bible verses and provide Strong's Concordance-style data. Return valid JSON only, no markdown.`,
          },
          {
            role: "user",
            content: `Analyze ${bookName} ${chapter}:${verse} (KJV): "${verseText}"

Pick the 4-6 most theologically significant words. For each, return Strong's-style data. Return a JSON array:
[
  {
    "strongId": "${langCode === "he" ? "H" : "G"}XXXX",
    "originalWord": "the ${lang} word",
    "translatedWord": "the English word in KJV",
    "lemma": "dictionary form in ${lang} script",
    "transliteration": "romanized form",
    "pronunciation": "how to pronounce it",
    "definition": "concise definition (1-2 sentences)",
    "kjvUsage": "common KJV translations separated by commas"
  }
]

Use real Strong's numbers when you know them. If unsure, use a plausible number with the correct prefix (H for Hebrew, G for Greek).`,
          },
        ],
        temperature: 0.5,
        max_tokens: 1200,
      });

      const raw = completion.choices[0]?.message?.content ?? "[]";
      let parsed: any[];
      try {
        const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        parsed = JSON.parse(cleaned);
        if (!Array.isArray(parsed)) parsed = [parsed];
      } catch {
        console.error("Failed to parse word study AI response:", raw.substring(0, 500));
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

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

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a pastoral Bible teacher skilled at bridging ancient Scripture to modern life. Return valid JSON only, no markdown. Be warm, practical, and applicable across all Christian traditions.`,
          },
          {
            role: "user",
            content: `Create a "Then & Now" application study for ${bookName} chapter ${chapter}. Return JSON:
{
  "thenContext": "2-3 paragraphs explaining what this passage meant to its original audience — their situation, challenges, and how they would have understood it",
  "nowApplication": "2-3 paragraphs on how this passage applies to believers today — practical, real-world applications for daily life",
  "reflectionQuestions": ["Question 1 for personal reflection", "Question 2", "Question 3", "Question 4"],
  "prayerPrompt": "A brief prayer prompt that helps the reader respond to this passage in prayer",
  "keyTheme": "One word or short phrase capturing the main theme"
}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      let parsed: any;
      try {
        const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        parsed = JSON.parse(cleaned);
      } catch {
        console.error("Failed to parse application AI response:", raw.substring(0, 500));
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      const [inserted] = await db
        .insert(applicationTemplates)
        .values({
          bookId: Number(bookId),
          chapter: Number(chapter),
          thenContext: parsed.thenContext || "",
          nowApplication: parsed.nowApplication || "",
          reflectionQuestions: Array.isArray(parsed.reflectionQuestions) ? parsed.reflectionQuestions : [],
          prayerPrompt: parsed.prayerPrompt || null,
          keyTheme: parsed.keyTheme || null,
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

  app.post("/api/study-guide/start", async (req, res) => {
    try {
      const { verseReference, verseText, bookName, chapter, verse, userId = "guest", forceNew = false } = req.body;
      if (!verseReference || !verseText) {
        return res.status(400).json({ error: "verseReference and verseText are required" });
      }

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

      const systemPrompt = `You are a wise, patient seminary tutor guiding a student through the Inductive Bible Study Method. You NEVER give the answer directly. Instead, you ask probing questions that lead the student to discover truth themselves.

You guide through three phases:
1. OBSERVE - Help them see what the text actually says. Ask about: Who is speaking? Who is the audience? What action words are used? What is repeated? What contrasts exist? What seems surprising?
2. INTERPRET - Help them understand what it means. Ask about: Why did the author write this? What would the original audience understand? How does this connect to the broader biblical narrative? What theological truths emerge?
3. APPLY - Help them connect it to their life. Ask about: What does this reveal about God's character? How does this challenge your current thinking? What specific action could you take this week?

Rules:
- Ask ONE focused question at a time
- Affirm good observations warmly but briefly
- If the student is off-track, gently redirect without being condescending
- Use a warm, encouraging tone — like a mentor who believes in their student
- Keep responses concise (2-4 sentences max)
- You are starting in the OBSERVE phase now`;

      const userPrompt = `The student wants to study this verse:\n\n"${verseText}" — ${verseReference}\n\nBegin the OBSERVE phase. Ask your first observation question about this specific verse. Remember: ask ONE question only, be specific to this text.`;

      const client = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 300,
      });

      const aiMessage = completion.choices[0]?.message?.content || "Let's begin by reading the verse carefully. What is the first thing you notice about this text?";

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
        messages: JSON.stringify(messages),
      }).returning();

      return res.json({ session: { ...session, messages }, aiMessage });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/study-guide/respond", async (req, res) => {
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

      const phaseInstructions: Record<string, string> = {
        observe: "Continue in the OBSERVE phase. Ask another observation question about what they can see in the text. Affirm their previous answer briefly first.",
        interpret: nextPhase === "interpret" && currentPhase === "observe"
          ? "The student has made good observations. Now TRANSITION to the INTERPRET phase. Briefly affirm their work, then say something like 'Now let\\'s dig deeper into what this means...' and ask your first interpretation question."
          : "Continue in the INTERPRET phase. Ask about meaning, context, or theology. Affirm their answer briefly first.",
        apply: nextPhase === "apply" && currentPhase === "interpret"
          ? "The student has interpreted well. Now TRANSITION to the APPLY phase. Briefly affirm their insight, then say something like 'Now let\\'s bring this into your daily life...' and ask your first application question."
          : "Continue in the APPLY phase. Ask about personal application, specific actions, or life changes. Affirm their answer briefly first.",
        complete: "The student has completed all three phases. Give a warm, encouraging summary of what they discovered. Mention 1-2 key insights from their observations, interpretation, and application. End with a brief prayer prompt or blessing. Keep it to 3-4 sentences.",
      };

      const targetPhase = shouldAdvance ? nextPhase : currentPhase;

      const systemPrompt = `You are a wise seminary tutor using the Inductive Bible Study Method. The student is studying: "${session.verseText}" — ${session.verseReference}

${phaseInstructions[targetPhase] || phaseInstructions[currentPhase]}

Rules: Ask ONE question at a time. Be concise (2-4 sentences). Be warm and encouraging. Never give the answer directly.`;

      const chatMessages = existingMessages.map((m: any) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const client = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...chatMessages,
        ],
        max_tokens: 400,
      });

      const aiMessage = completion.choices[0]?.message?.content || "That's a thoughtful response. Let's continue exploring this passage.";

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

  app.get("/api/verse-map/:verseId", async (req, res) => {
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

  app.post("/api/verse-map/generate", async (req, res) => {
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

      const client = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a Bible scholar providing cross-references and context for specific verses. Return valid JSON only, no markdown. Be scholarly and accurate.",
          },
          {
            role: "user",
            content: `For the verse "${verseText}" (${verseReference}), provide:
1. Cross-references: 8-10 related verses from across the Bible that illuminate this verse's meaning
2. A brief historical/cultural context snippet (2-3 sentences)

Return JSON:
{
  "crossReferences": [
    { "reference": "John 3:16", "text": "For God so loved...", "connection": "Both passages speak of God's redemptive love", "bookId": 43, "chapter": 3, "verse": 16 }
  ],
  "contextSnippet": "Brief historical and cultural context..."
}

Use KJV text for verse quotations. Book IDs: Genesis=1, Exodus=2, Leviticus=3, Numbers=4, Deuteronomy=5, Joshua=6, Judges=7, Ruth=8, 1Samuel=9, 2Samuel=10, 1Kings=11, 2Kings=12, 1Chronicles=13, 2Chronicles=14, Ezra=15, Nehemiah=16, Esther=17, Job=18, Psalms=19, Proverbs=20, Ecclesiastes=21, SongOfSolomon=22, Isaiah=23, Jeremiah=24, Lamentations=25, Ezekiel=26, Daniel=27, Hosea=28, Joel=29, Amos=30, Obadiah=31, Jonah=32, Micah=33, Nahum=34, Habakkuk=35, Zephaniah=36, Haggai=37, Zechariah=38, Malachi=39, Matthew=40, Mark=41, Luke=42, John=43, Acts=44, Romans=45, 1Corinthians=46, 2Corinthians=47, Galatians=48, Ephesians=49, Philippians=50, Colossians=51, 1Thessalonians=52, 2Thessalonians=53, 1Timothy=54, 2Timothy=55, Titus=56, Philemon=57, Hebrews=58, James=59, 1Peter=60, 2Peter=61, 1John=62, 2John=63, 3John=64, Jude=65, Revelation=66`,
          },
        ],
        max_tokens: 1500,
      });

      let result = { crossReferences: [] as any[], contextSnippet: "" };
      try {
        const raw = completion.choices[0]?.message?.content || "{}";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        result = JSON.parse(cleaned);
      } catch {
        result = { crossReferences: [], contextSnippet: "Context information unavailable." };
      }

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

  app.get("/api/chapter-context/:bookId/:chapter", async (req, res) => {
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

      const client = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a Bible scholar providing immersive contextual data for Bible chapters. Return valid JSON only, no markdown. Be historically accurate and engaging.",
          },
          {
            role: "user",
            content: `Provide immersive contextual data for ${bookName} chapter ${chapter}. Return JSON:
{
  "locations": [
    { "name": "Jerusalem", "modernName": "Jerusalem, Israel", "latitude": 31.7683, "longitude": 35.2137, "significance": "Brief note on why this location matters in this chapter", "type": "city" }
  ],
  "timelineEvents": [
    { "title": "Event name", "yearLabel": "c. 30 AD", "description": "Brief description", "period": "New Testament" }
  ],
  "keyFigures": [
    { "name": "Person name", "role": "apostle/prophet/king/etc", "significance": "Why they matter in this chapter" }
  ],
  "culturalInsights": "1-2 paragraphs on cultural practices, customs, and social norms relevant to understanding this chapter",
  "geographicalNotes": "1-2 sentences on the geography and terrain relevant to the events"
}
Include 2-5 locations, 1-3 timeline events, and 2-5 key figures. Be specific to this chapter.`,
          },
        ],
        max_tokens: 1200,
      });

      let result = {
        locations: [] as any[],
        timelineEvents: [] as any[],
        keyFigures: [] as any[],
        culturalInsights: "",
        geographicalNotes: "",
      };
      try {
        const raw = completion.choices[0]?.message?.content || "{}";
        const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        result = JSON.parse(cleaned);
      } catch {
        /* parse failed, use defaults */
      }

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

  const httpServer = createServer(app);
  return httpServer;
}
