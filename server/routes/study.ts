import { Router } from "express";
import { db } from "../db";
import { aiGenerationLimiter } from "../middleware/rate-limit";
  import {
    bibleBooks,
    bibleVerses,
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
    studyGuideSessions,
    verseMapCache,
    chapterContextCache,
    chapterSummaries,
    layerCompletions,
    studyJournalEntries,
    readingHistory,
    userPlanProgress,
    searchCache,
    userNotes,
    userHighlights,
    userBookmarks,
  } from "../../shared/schema";
  import { eq, and, sql, desc, asc, countDistinct, count, ilike, or } from "drizzle-orm";
  import * as crypto from "crypto";
  import { extractUserId, checkProStatus } from "../middleware/auth";
  import {
    generateStrongWordStudy,
    generateContextCards,
    generateApplicationStudy,
    generateStudyGuideStart,
    generateStudyGuideResponse,
    parseEvaluationTag,
    inferObserveCategory,
    generateStudySummary,
    generateVerseMap,
    generateChapterContext,
    generateScripturalEncouragement,
    generateSemanticSearch,
    generateQuickInsight,
  } from "../services/ai-engine";
  import type { StudyDepth } from "../services/ai-engine";

  const router = Router();

  router.get("/api/strong/search", async (req, res) => {
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

router.get("/api/strong/:id", async (req, res) => {
  try {
    const entry = await db
      .select()
      .from(strongEntries)
      .where(eq(strongEntries.id, String(req.params.id)))
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

router.get("/api/strong/verse/:verseId", async (req, res) => {
  try {
    const maps = await db
      .select({
        map: verseStrongMaps,
        entry: strongEntries,
      })
      .from(verseStrongMaps)
      .leftJoin(strongEntries, eq(verseStrongMaps.strongId, strongEntries.id))
      .where(eq(verseStrongMaps.verseId, String(req.params.verseId)))
      .orderBy(verseStrongMaps.wordPosition);

    const seen = new Set<string>();
    const deduped = maps.filter((row) => {
      const key = `${row.map.strongId}-${row.map.wordPosition}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.json(deduped);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/strong/generate", aiGenerationLimiter, async (req, res) => {
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
      const seen = new Set<string>();
      const deduped = existing.filter((row) => {
        const key = `${row.map.strongId}-${row.map.wordPosition}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return res.json(deduped);
    }

    let parsed: any[];
    try {
      parsed = await generateStrongWordStudy({ verseText, bookName, chapter, verse });
    } catch {
      return res.status(500).json({ error: "Failed to parse AI response" });
    }

    const langCode = (bookName && ["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"].includes(bookName)) ? "gr" : "he";

    const results: any[] = [];
    const insertedKeys = new Set<string>();

    for (let i = 0; i < parsed.length; i++) {
      const w = parsed[i];
      const sid = w.strongId || `${langCode === "he" ? "H" : "G"}${9000 + i}`;
      const mapKey = `${verseId}-${sid}-${i + 1}`;

      if (insertedKeys.has(mapKey)) continue;
      insertedKeys.add(mapKey);

      await db.insert(strongEntries).values({
        id: sid,
        language: langCode,
        lemma: w.lemma || w.originalWord || "",
        transliteration: w.transliteration || null,
        pronunciation: w.pronunciation || null,
        definition: w.definition || "",
        kjvUsage: w.kjvUsage || null,
      }).onConflictDoNothing();

      const [mapEntry] = await db.insert(verseStrongMaps).values({
        verseId,
        strongId: sid,
        wordPosition: i + 1,
        originalWord: w.originalWord || w.lemma || "",
        translatedWord: w.translatedWord || null,
      }).returning();

      const entry = (await db.select().from(strongEntries).where(eq(strongEntries.id, sid)).limit(1))[0];

      results.push({ map: mapEntry, entry });
    }

    return res.json(results);
  } catch (err) {
    console.error("Word study generation error:", err);
    return res.status(500).json({ error: "Failed to generate word study" });
  }
});

// ─── CONTEXT ─────────────────────────────────────────────────────────────────

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

    return res.json(cards);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
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

// ─── COMMENTARY ──────────────────────────────────────────────────────────────

router.get("/api/commentary", async (req, res) => {
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

const EGW_COMMENTATOR = {
  dbId: "egw",
  name: "Ellen G. White",
  dates: "1827–1915",
  tradition: "Adventist",
};

async function generateEgwInsight(bookName: string, chapter: number): Promise<string | null> {
  try {
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: `You are an Adventist Bible study assistant. Provide a brief Adventist perspective on the given Bible chapter, drawing on themes commonly found in Ellen G. White's writings. Focus on the Great Controversy theme, character of God, practical Christian living, and the Sabbath where relevant. Do NOT fabricate specific EGW quotes — instead summarize thematic insights she emphasized. Keep the tone reverent and educational. Write in third person ("White emphasized..." not "I wrote..."). Limit to 2-3 paragraphs.`,
        },
        {
          role: "user",
          content: `Provide an Adventist perspective on ${bookName} chapter ${chapter}, highlighting themes Ellen G. White commonly addressed regarding this passage.`,
        },
      ],
    });
    return resp.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[EGW Insight] Generation failed:", err);
    return null;
  }
}

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

router.post("/api/commentary/generate", aiGenerationLimiter, async (req, res) => {
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

    if (!commentatorMap[EGW_COMMENTATOR.dbId]) {
      await db.insert(commentators).values({
        id: EGW_COMMENTATOR.dbId,
        name: EGW_COMMENTATOR.name,
        dates: EGW_COMMENTATOR.dates,
        tradition: EGW_COMMENTATOR.tradition,
      }).onConflictDoNothing();
    }

    const existingEgw = await db.select()
      .from(commentaryEntries)
      .where(and(
        eq(commentaryEntries.commentatorId, EGW_COMMENTATOR.dbId),
        eq(commentaryEntries.bookId, Number(bookId)),
        eq(commentaryEntries.chapter, Number(chapter))
      ))
      .limit(1);

    if (existingEgw.length > 0) {
      const egwRow = await db.select().from(commentators).where(eq(commentators.id, EGW_COMMENTATOR.dbId)).limit(1);
      results.unshift({ entry: existingEgw[0], commentator: egwRow[0] || null });
    } else {
      const egwContent = await generateEgwInsight(bookName, Number(chapter));
      if (egwContent) {
        const [egwInserted] = await db
          .insert(commentaryEntries)
          .values({
            commentatorId: EGW_COMMENTATOR.dbId,
            bookId: Number(bookId),
            chapter: Number(chapter),
            content: egwContent,
            title: `${bookName} ${chapter} — ${EGW_COMMENTATOR.name}`,
          })
          .returning();

        const egwRow = await db.select().from(commentators).where(eq(commentators.id, EGW_COMMENTATOR.dbId)).limit(1);
        results.unshift({ entry: egwInserted, commentator: egwRow[0] || null });
      }
    }

    return res.json(results);
  } catch (err) {
    console.error("Commentary fetch error:", err);
    return res.status(500).json({ error: "Failed to fetch commentary" });
  }
});

// ─── APPLICATION ─────────────────────────────────────────────────────────────

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
    return res.status(500).json({ error: "Internal server error" });
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

// ─── LOCATIONS ────────────────────────────────────────────────────────────────

router.get("/api/location", async (req, res) => {
  try {
    const allLocations = await db.select().from(locations);
    return res.json(allLocations);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/location/:id", async (req, res) => {
  try {
    const location = await db
      .select()
      .from(locations)
      .where(eq(locations.id, String(req.params.id)))
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

router.get("/api/timeline", async (req, res) => {
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

router.get("/api/location/:id/verses", async (req, res) => {
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
      .where(eq(locationVerseMaps.locationId, String(req.params.id)));
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/timeline/:id/verses", async (req, res) => {
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
      .where(eq(eventVerseMaps.eventId, String(req.params.id)));
    return res.json(rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

  router.post("/api/verses/explain", async (req, res) => {
  try {
    const { reference, lessonContext } = req.body;
    if (!reference || typeof reference !== "string" || reference.trim().length < 3) {
      return res.status(400).json({ error: "A valid Scripture reference is required" });
    }
    const { generateVerseExplanation } = await import("../services/ai-engine");
    const explanation = await generateVerseExplanation({
      reference: reference.trim(),
      lessonContext: lessonContext?.trim(),
    });
    return res.json({ explanation });
  } catch (err) {
    console.error("Verse explanation error:", err);
    return res.json({
      explanation: "Unable to generate an explanation at this time. Please try again later.",
    });
  }
});

router.post("/api/quick-insight", aiGenerationLimiter, async (req, res) => {
  try {
    const { passage, theme } = req.body;
    if (!passage || typeof passage !== "string" || passage.trim().length < 3) {
      return res.status(400).json({ error: "A valid passage reference is required" });
    }

    const insight = await generateQuickInsight({
      passage: passage.trim(),
      theme: theme?.trim(),
    });

    return res.json(insight);
  } catch (err) {
    console.error("Quick insight generation error:", err);
    return res.status(500).json({ error: "Failed to generate quick insight" });
  }
});

router.post("/api/devotionals/complete", async (req, res) => {
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


  router.get("/api/study-guide/active", async (req, res) => {
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

    const parsedProgression = JSON.parse(activeSession.progression || "{}");
    return res.json({
      found: true,
      session: {
        ...activeSession,
        messages: JSON.parse(activeSession.messages),
        progression: parsedProgression,
        summary: activeSession.summary || null,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/study-guide/start", aiGenerationLimiter, async (req, res) => {
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
        const prog = JSON.parse(existingActive.progression || "{}");
        return res.json({
          session: { ...existingActive, messages, progression: prog },
          aiMessage: messages[messages.length - 1]?.content || "",
          resumed: true,
        });
      }
    }

    const aiMessage = await generateStudyGuideStart({ verseReference, verseText, persona: resolvedPersona });

    const messages = [
      { role: "assistant", content: aiMessage, phase: "observe", timestamp: new Date().toISOString() },
    ];

    const initialProgression = {
      observe: { completed: false, responses: [] as string[], meaningfulCount: 0, completedAt: null, categories: [] as string[] },
      interpret: { completed: false, responses: [] as string[], meaningfulCount: 0, completedAt: null, categories: [] as string[] },
      apply: { completed: false, responses: [] as string[], meaningfulCount: 0, completedAt: null, categories: [] as string[] },
    };

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
      progression: JSON.stringify(initialProgression),
    }).returning();

    return res.json({
      session: { ...session, messages, progression: initialProgression },
      aiMessage,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const STAGE_THRESHOLDS: Record<string, number> = { observe: 2, interpret: 2, apply: 1 };
const STAGE_ORDER = ["observe", "interpret", "apply"];

router.post("/api/study-guide/respond", aiGenerationLimiter, async (req, res) => {
  try {
    const { sessionId, userResponse, userId = "guest" } = req.body;
    if (!sessionId || !userResponse) {
      return res.status(400).json({ error: "sessionId and userResponse are required" });
    }

    const [session] = await db.select().from(studyGuideSessions).where(eq(studyGuideSessions.id, sessionId)).limit(1);
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.phase === "complete" || session.completedAt) {
      const msgs = JSON.parse(session.messages);
      const prog = JSON.parse(session.progression || "{}");
      return res.json({
        aiMessage: "",
        phase: "complete",
        isComplete: true,
        messages: msgs,
        progression: prog,
        summary: session.summary,
      });
    }

    const existingMessages = JSON.parse(session.messages);
    const currentPhase = session.phase;
    const progression = JSON.parse(session.progression || "{}");

    const defaultStage = { completed: false, responses: [] as string[], meaningfulCount: 0, completedAt: null, categories: [] as string[] };
    if (!progression.observe) progression.observe = { ...defaultStage };
    if (!progression.interpret) progression.interpret = { ...defaultStage };
    if (!progression.apply) progression.apply = { ...defaultStage };
    if (!progression.observe.categories) progression.observe.categories = [];
    if (!progression.interpret.categories) progression.interpret.categories = [];
    if (!progression.apply.categories) progression.apply.categories = [];

    existingMessages.push({ role: "user", content: userResponse, phase: currentPhase, timestamp: new Date().toISOString() });

    const stageData = progression[currentPhase as keyof typeof progression];
    if (stageData) {
      stageData.responses.push(userResponse);
    }

    const chatMessages = existingMessages.map((m: any) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const rawAiMessage = await generateStudyGuideResponse({
      verseText: session.verseText,
      verseReference: session.verseReference,
      chatMessages,
      targetPhase: currentPhase,
      currentPhase,
      persona: session.persona,
    });

    const { text: aiText, quality, category } = parseEvaluationTag(rawAiMessage, userResponse, session.verseText, currentPhase);

    if (stageData && quality === "meaningful") {
      if (currentPhase === "observe") {
        const resolvedCat = category && category !== "other" ? category : inferObserveCategory(userResponse);
        if (!stageData.categories.includes(resolvedCat)) {
          stageData.categories.push(resolvedCat);
          stageData.meaningfulCount++;
        }
      } else {
        stageData.meaningfulCount++;
      }
    }

    const threshold = STAGE_THRESHOLDS[currentPhase] || 2;
    let shouldAdvance = false;
    let nextPhase = currentPhase;

    const meetsThreshold = currentPhase === "observe"
      ? stageData && stageData.categories && stageData.categories.length >= threshold
      : stageData && stageData.meaningfulCount >= threshold;

    if (meetsThreshold && stageData && !stageData.completed) {
      stageData.completed = true;
      stageData.completedAt = new Date().toISOString();
      shouldAdvance = true;

      const currentIdx = STAGE_ORDER.indexOf(currentPhase);
      if (currentIdx < STAGE_ORDER.length - 1) {
        nextPhase = STAGE_ORDER[currentIdx + 1];
      } else {
        nextPhase = "complete";
      }
    }

    let finalAiText = aiText;
    let summary: string | null = null;

    if (shouldAdvance && nextPhase !== "complete") {
      const transitionAi = await generateStudyGuideResponse({
        verseText: session.verseText,
        verseReference: session.verseReference,
        chatMessages: [...chatMessages, { role: "assistant", content: aiText }],
        targetPhase: nextPhase,
        currentPhase,
        persona: session.persona,
      });
      const { text: transitionText } = parseEvaluationTag(transitionAi);
      finalAiText = aiText + "\n\n" + transitionText;
    }

    if (shouldAdvance && nextPhase === "complete") {
      const userAnswers = {
        observe: progression.observe.responses || [],
        interpret: progression.interpret.responses || [],
        apply: progression.apply.responses || [],
      };
      summary = await generateStudySummary({
        verseReference: session.verseReference,
        verseText: session.verseText,
        userAnswers,
      });
      finalAiText = aiText + (summary ? "\n\n" + summary : "");
    }

    const resolvedPhase = shouldAdvance ? nextPhase : currentPhase;

    existingMessages.push({ role: "assistant", content: finalAiText, phase: resolvedPhase, timestamp: new Date().toISOString() });

    await db.update(studyGuideSessions)
      .set({
        messages: JSON.stringify(existingMessages),
        phase: resolvedPhase,
        progression: JSON.stringify(progression),
        ...(resolvedPhase === "complete" ? { completedAt: new Date(), summary } : {}),
      })
      .where(eq(studyGuideSessions.id, sessionId));

    return res.json({
      aiMessage: finalAiText,
      phase: resolvedPhase,
      isComplete: resolvedPhase === "complete",
      messages: existingMessages,
      progression,
      summary,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/study-guide/sessions", async (req, res) => {
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

router.post("/api/study-guide/complete/:id", async (req, res) => {
  try {
    await db
      .update(studyGuideSessions)
      .set({ completedAt: new Date(), phase: "complete" })
      .where(eq(studyGuideSessions.id, String(req.params.id)));
    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/study-guide/session/:id", async (req, res) => {
  try {
    const [session] = await db.select().from(studyGuideSessions)
      .where(eq(studyGuideSessions.id, String(req.params.id)))
      .limit(1);
    if (!session) return res.status(404).json({ error: "Session not found" });
    return res.json({ ...session, messages: JSON.parse(session.messages) });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── VISUAL VERSE MAPPER ──────────────────────────────────────────────────

router.get("/api/verse-map/:verseId", async (req, res) => {
  try {
    const verseId = String(req.params.verseId);

    const rawWords = await db
      .select({
        map: verseStrongMaps,
        entry: strongEntries,
      })
      .from(verseStrongMaps)
      .leftJoin(strongEntries, eq(verseStrongMaps.strongId, strongEntries.id))
      .where(eq(verseStrongMaps.verseId, verseId))
      .orderBy(verseStrongMaps.wordPosition);

    const seen = new Set<string>();
    const words = rawWords.filter((row) => {
      const key = `${row.map.strongId}-${row.map.wordPosition}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const [cached] = await db.select().from(verseMapCache)
      .where(eq(verseMapCache.verseId, String(verseId))).limit(1);

    const crossReferences = cached ? JSON.parse(cached.crossReferences) : [];
    const contextSnippet = cached?.contextSnippet || null;

    return res.json({ words, crossReferences, contextSnippet, hasCachedData: !!cached });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/verse-map/generate", aiGenerationLimiter, async (req, res) => {
  try {
    const { verseId, verseText, verseReference, bookName, chapter, verse } = req.body;
    if (!verseId || !verseText || !verseReference) {
      return res.status(400).json({ error: "verseId, verseText, and verseReference are required" });
    }

    const [existing] = await db.select().from(verseMapCache)
      .where(eq(verseMapCache.verseId, String(verseId))).limit(1);
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

router.get("/api/chapter-context/:bookId/:chapter", async (req, res) => {
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
    return res.status(500).json({ error: "Internal server error" });
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
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/analytics/growth", async (req, res) => {
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

// ─── LAYER COMPLETION TRACKING ──────────────────────────────────────────────

router.get("/api/layer-completions", async (req, res) => {
  try {
    const userId = String(req.query.userId || "guest");
    const bookId = req.query.bookId ? Number(req.query.bookId) : undefined;
    const chapter = req.query.chapter ? Number(req.query.chapter) : undefined;

    let conditions = [eq(layerCompletions.userId, userId)];
    if (bookId !== undefined) conditions.push(eq(layerCompletions.bookId, bookId));
    if (chapter !== undefined) conditions.push(eq(layerCompletions.chapter, chapter));

    const rows = await db
      .select({
        bookId: layerCompletions.bookId,
        chapter: layerCompletions.chapter,
        layer: layerCompletions.layer,
        completedAt: layerCompletions.completedAt,
      })
      .from(layerCompletions)
      .where(and(...conditions));

    return res.json(rows);
  } catch (err) {
    console.error("Layer completions fetch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/layer-completions", async (req, res) => {
  try {
    const { userId, bookId, chapter, layer } = req.body;
    if (!userId || bookId == null || chapter == null || !layer) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const validLayers = ["word", "context", "voices", "application"];
    if (!validLayers.includes(layer)) {
      return res.status(400).json({ error: "Invalid layer" });
    }

    await db
      .insert(layerCompletions)
      .values({ userId: String(userId), bookId: Number(bookId), chapter: Number(chapter), layer: String(layer) })
      .onConflictDoNothing();

    return res.json({ success: true });
  } catch (err) {
    console.error("Layer completion save error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/layer-completions/book-summary", async (req, res) => {
  try {
    const userId = String(req.query.userId || "guest");
    const bookId = Number(req.query.bookId);
    if (!bookId) return res.status(400).json({ error: "bookId required" });

    const [bookInfo] = await db
      .select({ chapterCount: bibleBooks.chapterCount })
      .from(bibleBooks)
      .where(eq(bibleBooks.id, bookId));

    if (!bookInfo) return res.json({ word: 0, context: 0, voices: 0, application: 0 });

    const totalChapters = bookInfo.chapterCount;
    const completions = await db
      .select({ layer: layerCompletions.layer, chapters: countDistinct(layerCompletions.chapter) })
      .from(layerCompletions)
      .where(and(eq(layerCompletions.userId, userId), eq(layerCompletions.bookId, bookId)))
      .groupBy(layerCompletions.layer);

    const summary: Record<string, number> = { word: 0, context: 0, voices: 0, application: 0 };
    for (const row of completions) {
      const pct = Math.round((Number(row.chapters) / totalChapters) * 100);
      summary[row.layer] = Math.min(pct, 100);
    }

    return res.json(summary);
  } catch (err) {
    console.error("Book layer summary error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── STUDY JOURNAL ENTRIES ──────────────────────────────────────────────────

router.get("/api/study-journal", async (req, res) => {
  try {
    const userId = String(req.query.userId || "guest");
    const bookId = Number(req.query.bookId);
    const chapter = Number(req.query.chapter);
    const layer = req.query.layer ? String(req.query.layer) : undefined;

    if (!bookId || !chapter) return res.status(400).json({ error: "bookId and chapter required" });

    let conditions = [
      eq(studyJournalEntries.userId, userId),
      eq(studyJournalEntries.bookId, bookId),
      eq(studyJournalEntries.chapter, chapter),
    ];
    if (layer) conditions.push(eq(studyJournalEntries.layer, layer));

    const rows = await db
      .select({
        id: studyJournalEntries.id,
        sectionKey: studyJournalEntries.sectionKey,
        layer: studyJournalEntries.layer,
        content: studyJournalEntries.content,
        updatedAt: studyJournalEntries.updatedAt,
      })
      .from(studyJournalEntries)
      .where(and(...conditions));

    return res.json(rows);
  } catch (err) {
    console.error("Study journal fetch error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/api/study-journal", async (req, res) => {
  try {
    const { userId, bookId, chapter, layer, sectionKey, content } = req.body;
    if (!userId || bookId == null || chapter == null || !layer || !sectionKey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!content || content.trim().length === 0) {
      await db
        .delete(studyJournalEntries)
        .where(
          and(
            eq(studyJournalEntries.userId, String(userId)),
            eq(studyJournalEntries.bookId, Number(bookId)),
            eq(studyJournalEntries.chapter, Number(chapter)),
            eq(studyJournalEntries.layer, String(layer)),
            eq(studyJournalEntries.sectionKey, String(sectionKey))
          )
        );
      return res.json({ success: true, deleted: true });
    }

    const existing = await db
      .select({ id: studyJournalEntries.id })
      .from(studyJournalEntries)
      .where(
        and(
          eq(studyJournalEntries.userId, String(userId)),
          eq(studyJournalEntries.bookId, Number(bookId)),
          eq(studyJournalEntries.chapter, Number(chapter)),
          eq(studyJournalEntries.layer, String(layer)),
          eq(studyJournalEntries.sectionKey, String(sectionKey))
        )
      );

    if (existing.length > 0) {
      await db
        .update(studyJournalEntries)
        .set({ content: String(content).trim(), updatedAt: new Date() })
        .where(eq(studyJournalEntries.id, existing[0].id));
    } else {
      await db
        .insert(studyJournalEntries)
        .values({
          userId: String(userId),
          bookId: Number(bookId),
          chapter: Number(chapter),
          layer: String(layer),
          sectionKey: String(sectionKey),
          content: String(content).trim(),
        });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Study journal save error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/study-journal/revisit", async (req, res) => {
  try {
    const userId = String(req.query.userId || "guest");
    const limit = Math.min(Number(req.query.limit) || 10, 20);

    const entries = await db
      .select({
        bookId: studyJournalEntries.bookId,
        chapter: studyJournalEntries.chapter,
        layer: studyJournalEntries.layer,
        sectionKey: studyJournalEntries.sectionKey,
        content: studyJournalEntries.content,
        updatedAt: studyJournalEntries.updatedAt,
      })
      .from(studyJournalEntries)
      .where(eq(studyJournalEntries.userId, userId))
      .orderBy(desc(studyJournalEntries.updatedAt))
      .limit(limit * 2);

    const bookIds = [...new Set(entries.map(e => e.bookId))];
    const bookNames = new Map<number, string>();
    if (bookIds.length > 0) {
      const books = await db
        .select({ id: bibleBooks.id, name: bibleBooks.name })
        .from(bibleBooks)
        .where(sql`${bibleBooks.id} IN ${bookIds}`);
      books.forEach(b => bookNames.set(b.id, b.name));
    }

    const seen = new Set<string>();
    const grouped: {
      bookId: number;
      chapter: number;
      bookName: string;
      lastEdited: string;
      excerpt: string;
      layer: string;
      sectionKey: string;
    }[] = [];

    for (const entry of entries) {
      const key = `${entry.bookId}-${entry.chapter}`;
      if (seen.has(key)) continue;
      seen.add(key);

      grouped.push({
        bookId: entry.bookId,
        chapter: entry.chapter,
        bookName: bookNames.get(entry.bookId) || `Book ${entry.bookId}`,
        lastEdited: entry.updatedAt?.toISOString() || new Date().toISOString(),
        excerpt: (entry.content || "").substring(0, 120),
        layer: entry.layer,
        sectionKey: entry.sectionKey,
      });

      if (grouped.length >= limit) break;
    }

    return res.json(grouped);
  } catch (err) {
    console.error("Revisit entries error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

const topicReflectionCache = new Map<string, { data: unknown; date: string }>();

router.get("/api/topic-reflection/:topicId", aiGenerationLimiter, async (req, res) => {
  try {
    const { topicId } = req.params;
    const today = new Date().toISOString().split("T")[0];
    const cacheKey = `${topicId}-${today}`;

    const cached = topicReflectionCache.get(cacheKey);
    if (cached && cached.date === today) {
      return res.json(cached.data);
    }

    const client = new (await import("openai")).default({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a Seventh-day Adventist Bible teacher. Generate a fresh daily reflection for the topic "${topicId}". Include:
1. A thought-provoking reflection (3-4 sentences) connecting the topic to daily life
2. A discussion question for small groups or personal journaling
3. A practical application challenge for today
4. A lesser-known Bible verse related to this topic (different from common ones)
Return JSON: { "reflection": string, "question": string, "challenge": string, "verseReference": string, "verseText": string }`,
        },
        {
          role: "user",
          content: `Generate today's reflection for the topic: ${topicId}. Today is ${today}. Make it unique and fresh.`,
        },
      ],
      temperature: 0.9,
    });

    const raw = response.choices[0]?.message?.content || "{}";
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    const data = JSON.parse(cleaned);

    topicReflectionCache.set(cacheKey, { data, date: today });

    return res.json(data);
  } catch (err) {
    console.error("Topic reflection error:", err);
    return res.status(500).json({ error: "Failed to generate reflection" });
  }
});

// ─── SEMANTIC SEARCH ──────────────────────────────────────────────────────

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
    const recent = await db
      .select({
        queryText: searchCache.queryText,
        createdAt: searchCache.createdAt,
      })
      .from(searchCache)
      .orderBy(desc(searchCache.createdAt))
      .limit(10);

    return res.json(recent);
  } catch (err) {
    console.error("Recent searches error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

  export default router;
  