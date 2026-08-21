import { Router } from "express";
import { withSdaLens } from "../services/sda-lens";
import { db } from "../db";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import { getErrorStatusCode } from "../services/ai-semaphore";
import {
  resolveChapter,
  resolveReference,
  normalizeTranslationParam,
  ScriptureError,
  type ChapterCacheHooks,
} from "../services/scripture-service";
import {
  buildPassageSectionsCacheKey,
  buildTopicReflectionCacheKey,
  buildExplainCacheKey,
  buildCrossRefCacheKey,
  hydrateCrossReferences,
  extractRawCrossReferences,
  joinResolvedVerseText,
  isCurrentHydrationVersion,
  HYDRATION_VERSION,
} from "../services/deep-study-helpers";
import {
  bibleBooks,
  bibleVerses,
  bibleCache,
  layerCompletions,
  studyJournalEntries,
  searchCache,
  studyGuideSessions,
  verseStrongMaps,
  readingHistory,
} from "../../shared/schema";
import { eq, and, sql, desc, asc, countDistinct } from "drizzle-orm";
import { extractUserId } from "../middleware/auth";

const router = Router();

// Cache hooks passed to the canonical Scripture resolver so provider chapters
// (NLT / API.Bible / discovered NKJV) are persisted through the shared
// bible_cache path, keeping resolved verse text authoritative + translation-safe.
const chapterCacheHooks: ChapterCacheHooks = {
  read: async (translation, bookId, chapterNum) => {
    try {
      const cached = await db
        .select()
        .from(bibleCache)
        .where(
          and(
            eq(bibleCache.translation, translation),
            eq(bibleCache.bookId, bookId),
            eq(bibleCache.chapter, chapterNum)
          )
        )
        .limit(1);
      return cached.length > 0 ? (cached[0].versesJson as any[]) : null;
    } catch {
      return null;
    }
  },
  write: async (translation, bookId, bookName, chapterNum, verses, sourceApi) => {
    try {
      await db
        .insert(bibleCache)
        .values({
          translation,
          bookId,
          bookName,
          chapter: chapterNum,
          versesJson: verses,
          verseCount: verses.length,
          sourceApi,
        } as any)
        .onConflictDoNothing();
    } catch (err: any) {
      console.error(
        `[deep-study bible-cache] Failed to store ${translation} ${bookName} ${chapterNum}:`,
        err?.message
      );
    }
  },
};

router.get("/api/layer-completions", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const bookId = req.query.bookId ? Number(req.query.bookId) : undefined;
    const chapter = req.query.chapter ? Number(req.query.chapter) : undefined;
    const verseStart = req.query.verseStart ? Number(req.query.verseStart) : 0;
    const verseEnd = req.query.verseEnd ? Number(req.query.verseEnd) : 0;

    let conditions = [eq(layerCompletions.userId, userId)];
    if (bookId !== undefined) conditions.push(eq(layerCompletions.bookId, bookId));
    if (chapter !== undefined) conditions.push(eq(layerCompletions.chapter, chapter));
    conditions.push(eq(layerCompletions.verseStart, verseStart));
    conditions.push(eq(layerCompletions.verseEnd, verseEnd));

    const rows = await db
      .select({
        bookId: layerCompletions.bookId,
        chapter: layerCompletions.chapter,
        layer: layerCompletions.layer,
        verseStart: layerCompletions.verseStart,
        verseEnd: layerCompletions.verseEnd,
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
    const userId = extractUserId(req);
    const { bookId, chapter, layer, verseStart, verseEnd } = req.body;
    if (bookId == null || chapter == null || !layer) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const validLayers = ["word", "context", "voices", "application"];
    if (!validLayers.includes(layer)) {
      return res.status(400).json({ error: "Invalid layer" });
    }

    await db
      .insert(layerCompletions)
      .values({
        userId,
        bookId: Number(bookId),
        chapter: Number(chapter),
        layer: String(layer),
        verseStart: verseStart != null ? Number(verseStart) : 0,
        verseEnd: verseEnd != null ? Number(verseEnd) : 0,
      })
      .onConflictDoNothing();

    return res.json({ success: true });
  } catch (err) {
    console.error("Layer completion save error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/layer-completions/book-summary", async (req, res) => {
  try {
    const userId = extractUserId(req);
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

router.get("/api/study-journal", async (req, res) => {
  try {
    const userId = extractUserId(req);
    const bookId = Number(req.query.bookId);
    const chapter = Number(req.query.chapter);
    const layer = req.query.layer ? String(req.query.layer) : undefined;
    const verseStart = req.query.verseStart ? Number(req.query.verseStart) : 0;
    const verseEnd = req.query.verseEnd ? Number(req.query.verseEnd) : 0;

    if (!bookId || !chapter) return res.status(400).json({ error: "bookId and chapter required" });

    let conditions = [
      eq(studyJournalEntries.userId, userId),
      eq(studyJournalEntries.bookId, bookId),
      eq(studyJournalEntries.chapter, chapter),
    ];
    if (layer) conditions.push(eq(studyJournalEntries.layer, layer));
    conditions.push(eq(studyJournalEntries.verseStart, verseStart));
    conditions.push(eq(studyJournalEntries.verseEnd, verseEnd));

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
    const userId = extractUserId(req);
    const { bookId, chapter, layer, sectionKey, content, verseStart, verseEnd } = req.body;
    if (bookId == null || chapter == null || !layer || !sectionKey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const vs = verseStart != null ? Number(verseStart) : 0;
    const ve = verseEnd != null ? Number(verseEnd) : 0;

    const matchConditions = [
      eq(studyJournalEntries.userId, userId),
      eq(studyJournalEntries.bookId, Number(bookId)),
      eq(studyJournalEntries.chapter, Number(chapter)),
      eq(studyJournalEntries.layer, String(layer)),
      eq(studyJournalEntries.sectionKey, String(sectionKey)),
      eq(studyJournalEntries.verseStart, vs),
      eq(studyJournalEntries.verseEnd, ve),
    ];

    if (!content || content.trim().length === 0) {
      await db
        .delete(studyJournalEntries)
        .where(and(...matchConditions));
      return res.json({ success: true, deleted: true });
    }

    const existing = await db
      .select({ id: studyJournalEntries.id })
      .from(studyJournalEntries)
      .where(and(...matchConditions));

    if (existing.length > 0) {
      await db
        .update(studyJournalEntries)
        .set({ content: String(content).trim(), updatedAt: new Date() })
        .where(eq(studyJournalEntries.id, existing[0].id));
    } else {
      await db
        .insert(studyJournalEntries)
        .values({
          userId,
          bookId: Number(bookId),
          chapter: Number(chapter),
          layer: String(layer),
          sectionKey: String(sectionKey),
          verseStart: vs,
          verseEnd: ve,
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
    const userId = extractUserId(req);
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

router.get("/api/topic-reflection/:topicId", aiGenerationLimiter, async (req, res) => {
  try {
    const topicId = String(req.params.topicId);

    // Translation is required and must be explicit — no implicit default.
    const rawTranslation = req.query.translation as string | undefined;
    if (!rawTranslation || String(rawTranslation).trim() === "") {
      return res.status(400).json({ error: "translation is required" });
    }
    const { abbreviation: translation } = normalizeTranslationParam(rawTranslation);

    const today = new Date().toISOString().split("T")[0] as string;
    const queryHash = buildTopicReflectionCacheKey(translation, topicId, today);

    const [cached] = await db.select().from(searchCache)
      .where(eq(searchCache.queryHash, queryHash))
      .limit(1);

    if (cached && cached.expiresAt > new Date()) {
      return res.json(cached.results);
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
          content: withSdaLens(`You are a Seventh-day Adventist Bible teacher. Generate a fresh daily reflection for the topic "${topicId}". Include:
1. A thought-provoking reflection (3-4 sentences) connecting the topic to daily life
2. A discussion question for small groups or personal journaling
3. A practical application challenge for today
4. A lesser-known Bible verse related to this topic (different from common ones)

CRITICAL: Provide ONLY the verse reference (e.g. "Zephaniah 3:17"). Do NOT quote or paraphrase the verse text — the exact wording is looked up canonically afterward. Choose a reference that exists as a single verse or a same-chapter range.
Return JSON: { "reflection": string, "question": string, "challenge": string, "verseReference": string }`),
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
    const parsedData = JSON.parse(cleaned);

    const verseReference =
      typeof parsedData.verseReference === "string" ? parsedData.verseReference.trim() : "";
    if (!verseReference) {
      throw new ScriptureError("INVALID_REFERENCE", "AI did not return a verse reference", 502);
    }

    // Resolve the reference canonically in the requested translation and attach
    // the EXACT verse text + provenance. AI-generated wording is never returned.
    const resolvedVerse = await resolveReference({
      reference: verseReference,
      translation,
      cache: chapterCacheHooks,
    });
    const verseText = joinResolvedVerseText(
      resolvedVerse.verses as Array<{ text?: unknown }>
    );
    if (!verseText) {
      throw new ScriptureError(
        "VERSE_NOT_FOUND",
        `No verse text resolved for ${verseReference}`,
        404
      );
    }

    const data = {
      reflection: parsedData.reflection,
      question: parsedData.question,
      challenge: parsedData.challenge,
      verseReference,
      verseText,
      translation: resolvedVerse.meta.translation,
      translationName: resolvedVerse.meta.translationName,
      source: resolvedVerse.meta.source,
      provider: resolvedVerse.meta.provider,
      ...(resolvedVerse.meta.providerEditionId
        ? { providerEditionId: resolvedVerse.meta.providerEditionId }
        : {}),
    };

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    if (cached) {
      await db.update(searchCache)
        .set({ results: data, expiresAt: tomorrow })
        .where(eq(searchCache.queryHash, queryHash));
    } else {
      await db.insert(searchCache).values({
        queryText: `topic-reflection:${translation}:${topicId}`,
        queryHash,
        results: data,
        expiresAt: tomorrow,
      }).onConflictDoUpdate({
        target: searchCache.queryHash,
        set: { results: data, expiresAt: tomorrow },
      });
    }

    return res.json(data);
  } catch (err) {
    if (err instanceof ScriptureError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Topic reflection error:", err);
    return res.status(500).json({ error: "Failed to generate reflection" });
  }
});

router.get("/api/passage-sections", aiGenerationLimiter, async (req, res) => {
  try {
    const bookId = Number(req.query.bookId);
    const chapter = Number(req.query.chapter);
    if (!bookId || !chapter) return res.status(400).json({ error: "bookId and chapter required" });

    // Translation is required and must be explicit — no implicit default.
    const rawTranslation = req.query.translation as string | undefined;
    if (!rawTranslation || String(rawTranslation).trim() === "") {
      return res.status(400).json({ error: "translation is required" });
    }
    const { abbreviation: translation } = normalizeTranslationParam(rawTranslation);

    // Translation-isolated, SDA-lens-versioned cache in searchCache.
    // Legacy chapterPassageSections is NOT read/written for generated content.
    const cacheKey = buildPassageSectionsCacheKey(translation, bookId, chapter);
    const [cached] = await db
      .select()
      .from(searchCache)
      .where(eq(searchCache.queryHash, cacheKey))
      .limit(1);

    if (cached && cached.expiresAt > new Date()) {
      return res.json(cached.results);
    }

    // Resolve the chapter canonically in the requested translation instead of a
    // translation-unfiltered bibleVerses query.
    const resolved = await resolveChapter({
      book: bookId,
      chapter,
      translation,
      cache: chapterCacheHooks,
    });

    const verses = (resolved.verses as Array<{ verse: number; text: string }>);
    if (verses.length === 0) return res.json([]);

    const bookName = resolved.book.name;
    const totalVerses = verses.length;
    const chapterText = verses.map((v) => `${v.verse} ${v.text}`).join(" ");

    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content: withSdaLens(`You divide Bible chapters into natural reading sections for inductive study. Return JSON only.

Rules:
- Sections must be contiguous and non-overlapping
- Together they must cover every verse (1 through ${totalVerses})
- Aim for 2-5 sections depending on chapter length
- Each section should be a coherent narrative or thematic unit
- Labels should be short descriptions (5-8 words max)
- For very short chapters (under 10 verses), return 1-2 sections`),
        },
        {
          role: "user",
          content: `Divide ${bookName} chapter ${chapter} (${totalVerses} verses, ${translation} translation) into natural study sections.

Chapter text (${translation}):
${chapterText.substring(0, 4000)}

Return JSON array: [{"verseStart": number, "verseEnd": number, "label": "short description"}]`,
        },
      ],
    });

    let sections: { verseStart: number; verseEnd: number; label: string }[] = [];
    try {
      const raw = completion.choices[0]?.message?.content ?? "[]";
      const cleaned = raw.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        sections = [{ verseStart: 1, verseEnd: totalVerses, label: "Full chapter" }];
      } else {
        const valid = parsed.every((s: any) =>
          typeof s.verseStart === "number" && typeof s.verseEnd === "number" &&
          s.verseStart >= 1 && s.verseEnd <= totalVerses && s.verseStart <= s.verseEnd &&
          typeof s.label === "string"
        );
        if (valid) {
          sections = parsed;
        } else {
          sections = [{ verseStart: 1, verseEnd: totalVerses, label: "Full chapter" }];
        }
      }
    } catch {
      sections = [{ verseStart: 1, verseEnd: totalVerses, label: "Full chapter" }];
    }

    // Cache generated sections under the translation-isolated searchCache key.
    const sectionsExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await db
      .insert(searchCache)
      .values({
        queryText: `passage-sections:${translation}:${bookName} ${chapter}`,
        queryHash: cacheKey,
        results: sections,
        expiresAt: sectionsExpiry,
      })
      .onConflictDoUpdate({
        target: searchCache.queryHash,
        set: { results: sections, expiresAt: sectionsExpiry },
      });

    // Preserve response array shape for client compatibility.
    return res.json(sections);
  } catch (err) {
    if (err instanceof ScriptureError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("Passage sections error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/analytics/growth", async (req, res) => {
  try {
    const userId = extractUserId(req);

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

router.get("/api/ai/explain", aiGenerationLimiter, async (req, res) => {
  try {
    const { bookName, chapter, verse, translation: rawTranslation } = req.query as Record<string, string>;
    if (!bookName || !chapter || !verse) {
      return res.status(400).json({ error: "bookName, chapter, and verse are required" });
    }

    // Translation is required and must be explicit — no implicit 'or KJV'.
    if (!rawTranslation || String(rawTranslation).trim() === "") {
      return res.status(400).json({ error: "translation is required" });
    }
    const { abbreviation: translation } = normalizeTranslationParam(rawTranslation);

    // Resolve the target verse canonically BEFORE cache lookup / generation so
    // the prompt receives the exact authoritative text in the requested edition.
    const reference = `${bookName} ${chapter}:${verse}`;
    const resolvedVerse = await resolveReference({
      reference,
      translation,
      cache: chapterCacheHooks,
    });
    const verseText = joinResolvedVerseText(
      resolvedVerse.verses as Array<{ text?: unknown }>
    );
    if (!verseText) {
      throw new ScriptureError(
        "VERSE_NOT_FOUND",
        `No verse text resolved for ${reference}`,
        404
      );
    }
    const canonicalTranslation = resolvedVerse.meta.translation;

    const cacheKey = buildExplainCacheKey(canonicalTranslation, bookName, chapter, verse);
    const [cached] = await db.select().from(searchCache)
      .where(eq(searchCache.queryHash, cacheKey))
      .limit(1);

    if (cached && cached.expiresAt > new Date()) {
      return res.json(cached.results);
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
          content: withSdaLens(`You are a faithful Bible teacher grounded in Scripture. Explain the given verse in a way that:
1. Clarifies its meaning in historical and literary context
2. Shows how it connects to God's larger plan of salvation
3. Points to Jesus Christ and the gospel
4. Offers a practical application for daily life
5. Cites 1-2 cross-references that illuminate the passage
Keep the explanation warm, clear, and between 150-250 words. Write in second person ("you") to make it personal.`),
        },
        {
          role: "user",
          content: `Explain ${reference} (${canonicalTranslation}).

Authoritative ${canonicalTranslation} text of the verse:
"${verseText}"`,
        },
      ],
      temperature: 0.7,
    });

    const explanation = response.choices[0]?.message?.content || "";
    const result = {
      explanation,
      reference,
      verseText,
      translation: resolvedVerse.meta.translation,
      translationName: resolvedVerse.meta.translationName,
      source: resolvedVerse.meta.source,
      provider: resolvedVerse.meta.provider,
      ...(resolvedVerse.meta.providerEditionId
        ? { providerEditionId: resolvedVerse.meta.providerEditionId }
        : {}),
    };

    await db.insert(searchCache).values({
      queryText: `${reference} (${canonicalTranslation})`,
      queryHash: cacheKey,
      results: result,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    }).onConflictDoUpdate({
      target: searchCache.queryHash,
      set: { results: result, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    });

    return res.json(result);
  } catch (err: any) {
    if (err instanceof ScriptureError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("AI explain error:", err);
    const status = getErrorStatusCode(err);
    return res.status(status || 500).json({ error: "Could not generate explanation" });
  }
});

router.get("/api/ai/cross-references", aiGenerationLimiter, async (req, res) => {
  try {
    const { bookName, chapter, verse, translation: rawTranslation } = req.query as Record<string, string>;
    if (!bookName || !chapter || !verse) {
      return res.status(400).json({ error: "bookName, chapter, and verse are required" });
    }

    // Translation is required and must be explicit — no implicit default.
    if (!rawTranslation || String(rawTranslation).trim() === "") {
      return res.status(400).json({ error: "translation is required" });
    }
    const { abbreviation: translation } = normalizeTranslationParam(rawTranslation);

    const cacheKey = buildCrossRefCacheKey(translation, bookName, chapter, verse);
    const [cached] = await db.select().from(searchCache)
      .where(eq(searchCache.queryHash, cacheKey))
      .limit(1);

    // Only serve cache written under the CURRENT hydrated shape (canonical
    // resolver text + provenance). Stale/legacy entries are regenerated.
    if (cached && cached.expiresAt > new Date() && isCurrentHydrationVersion(cached.results)) {
      return res.json(cached.results);
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
          content: withSdaLens(`You are a Bible scholar. Given a verse reference, provide 4-6 of the most relevant cross-references.
For each cross-reference, provide ONLY:
1. The exact reference (e.g., "John 3:16"). Use a single verse or a same-chapter range.
2. A brief explanation of how it connects to the original verse.

CRITICAL: Do NOT include or quote any verse text. The authoritative wording is looked up canonically afterward in the requested translation. Only supply the reference and the connection.

Return JSON format:
{
  "crossReferences": [
    { "ref": "John 3:16", "connection": "Both passages emphasize God's redemptive plan..." }
  ]
}

Focus on cross-references that:
- Share thematic connections
- Use similar language or imagery
- Illuminate the same doctrine or truth
- Point to Christ and the gospel`),
        },
        {
          role: "user",
          content: `Find cross-references for ${bookName} ${chapter}:${verse} (${translation}). Return references and connections only — no verse text.`,
        },
      ],
      temperature: 0.5,
      response_format: { type: "json_object" },
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{"crossReferences":[]}');
    const rawList = extractRawCrossReferences(parsed);

    // Resolve EXACT text for every reference through the canonical resolver in
    // the requested translation. Any resolver/provider/parse failure throws and
    // fails the whole request — no partial or fallback content.
    const hydrated = await hydrateCrossReferences(
      rawList,
      translation,
      (params) => resolveReference({ ...params, cache: chapterCacheHooks })
    );

    const result = {
      crossReferences: hydrated,
      translation,
      hydrationVersion: HYDRATION_VERSION,
    };

    await db.insert(searchCache).values({
      queryText: `Cross-ref: ${bookName} ${chapter}:${verse} (${translation})`,
      queryHash: cacheKey,
      results: result,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    }).onConflictDoUpdate({
      target: searchCache.queryHash,
      set: { results: result, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    });

    return res.json(result);
  } catch (err: any) {
    if (err instanceof ScriptureError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error("AI cross-references error:", err);
    const status = getErrorStatusCode(err);
    return res.status(status || 500).json({ error: "Could not generate cross-references" });
  }
});

export default router;
