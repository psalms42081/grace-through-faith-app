import { Router } from "express";
import { db } from "../db";
import {
  bibleBooks,
  bibleVerses,
  bibleTranslations,
  bibleCache,
  bibleCacheStats,
} from "../../shared/schema";
import { eq, and, ilike, sql } from "drizzle-orm";
import { cachedResponse } from "../middleware/response-cache";
import { getTranslationId } from "../services/languageAwareContent";
import {
  normalizeTranslationParam,
  buildTranslationResponseMeta,
  API_BIBLE_TRANSLATIONS,
  searchApiBible,
  searchNlt,
  discoverNkjvCapability,
  resolveChapter,
  ScriptureError,
  type ApiBibleTranslationConfig,
  type ChapterCacheHooks,
  type LocalBookRef,
} from "../services/scripture-service";

const router = Router();

// ─── DB cache helpers ─────────────────────────────────────────────────────────

async function checkBibleCache(
  translation: string,
  bookId: number,
  chapterNum: number
): Promise<any | null> {
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

    if (cached.length > 0) {
      await db
        .insert(bibleCacheStats)
        .values({ translation, cacheHits: 1, cacheMisses: 0, lastHitAt: new Date() } as any)
        .onConflictDoUpdate({
          target: [bibleCacheStats.translation],
          set: {
            cacheHits: sql`${bibleCacheStats.cacheHits} + 1`,
            lastHitAt: new Date(),
          } as any,
        })
        .catch(() => {});
      return cached[0].versesJson as any;
    }

    await db
      .insert(bibleCacheStats)
      .values({ translation, cacheHits: 0, cacheMisses: 1, lastMissAt: new Date() } as any)
      .onConflictDoUpdate({
        target: [bibleCacheStats.translation],
        set: {
          cacheMisses: sql`${bibleCacheStats.cacheMisses} + 1`,
          lastMissAt: new Date(),
        } as any,
      })
      .catch(() => {});
    return null;
  } catch {
    return null;
  }
}

async function storeBibleCache(
  translation: string,
  bookId: number,
  bookName: string,
  chapterNum: number,
  verses: any,
  sourceApi: string
): Promise<void> {
  try {
    const verseList = Array.isArray(verses) ? verses : verses?.verses ?? [];
    await db
      .insert(bibleCache)
      .values({
        translation,
        bookId,
        bookName,
        chapter: chapterNum,
        versesJson: verses,
        verseCount: verseList.length,
        sourceApi,
      } as any)
      .onConflictDoNothing();
  } catch (err: any) {
    console.error(`[bible-cache] Failed to store ${translation} ${bookName} ${chapterNum}:`, err?.message);
  }
}

// Cache hooks passed to the canonical resolver so provider chapters are
// persisted through the same bible_cache path as before.
const chapterCacheHooks: ChapterCacheHooks = {
  read: checkBibleCache,
  write: storeBibleCache,
};

// ─── Resolve runtime API.Bible translation config ─────────────────────────────

async function getApiBibleTranslations(
  localBooks: Array<{ name: string; chapterCount: number }>
): Promise<Record<string, ApiBibleTranslationConfig>> {
  const translations: Record<string, ApiBibleTranslationConfig> = { ...API_BIBLE_TRANSLATIONS };

  const apiKey = process.env.API_BIBLE_KEY;
  if (apiKey) {
    try {
      const nkjvConfig = await discoverNkjvCapability(apiKey, localBooks);
      if (nkjvConfig) {
        translations["NKJV"] = nkjvConfig;
      }
    } catch {
      // NKJV discovery failure must not affect other translations
    }
  }

  return translations;
}

// ─── PASSAGE ─────────────────────────────────────────────────────────────────

router.get("/api/passage", async (req, res) => {
  try {
    const { book, chapter } = req.query;

    if (!book || !chapter) {
      return res.status(400).json({ error: "book and chapter are required" });
    }

    const resolved = await resolveChapter({
      book: String(book),
      chapter: Number(chapter),
      translation: req.query.translation as string | undefined,
      cache: chapterCacheHooks,
    });

    return res.json({
      book: resolved.book,
      chapter: resolved.chapter,
      verses: resolved.verses,
      ...(resolved.providerContent ? { providerContent: resolved.providerContent } : {}),
      cached: resolved.cached,
      ...resolved.meta,
    });
  } catch (err) {
    if (err instanceof ScriptureError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── BOOKS ───────────────────────────────────────────────────────────────────

router.get("/api/books", cachedResponse(300), async (_req, res) => {
  try {
    const books = await db.select().from(bibleBooks).orderBy(bibleBooks.orderIndex);
    return res.json(books);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────

router.get("/api/translations", async (_req, res) => {
  try {
    const dbTranslations = await db.select().from(bibleTranslations);

    const result: Array<{
      id: string;
      name: string;
      abbreviation: string;
      language: string;
      source: string;
      provider: string;
      license: string;
      available: boolean;
      providerEditionId?: string;
    }> = dbTranslations.map((t) => ({
      id: t.id,
      name: t.name,
      abbreviation: t.abbreviation,
      language: t.language,
      source: "db",
      provider: "local",
      license: "public_domain",
      available: true,
    }));

    if (process.env.NLT_API_KEY) {
      result.push({
        id: "NLT",
        name: "New Living Translation",
        abbreviation: "NLT",
        language: "en",
        source: "nlt_provider",
        provider: "NLT API",
        license: "NLT",
        available: true,
      });
    }

    if (process.env.API_BIBLE_KEY) {
      for (const [abbr, config] of Object.entries(API_BIBLE_TRANSLATIONS)) {
        result.push({
          id: abbr,
          name: config.name,
          abbreviation: abbr,
          language: "en",
          source: "api_bible",
          provider: "API.Bible",
          license: config.license,
          available: true,
          providerEditionId: config.bibleId,
        });
      }

      // NKJV: only list if account catalog confirms entitlement + full coverage
      try {
        const allBooks = await db.select().from(bibleBooks).orderBy(bibleBooks.orderIndex);
        const nkjvConfig = await discoverNkjvCapability(
          process.env.API_BIBLE_KEY,
          allBooks,
          { forceRefresh: true },
        );
        if (nkjvConfig) {
          result.push({
            id: "NKJV",
            name: nkjvConfig.name,
            abbreviation: "NKJV",
            language: "en",
            source: "api_bible",
            provider: "API.Bible",
            license: nkjvConfig.license,
            available: true,
            providerEditionId: nkjvConfig.bibleId,
          });
        }
      } catch {
        // NKJV discovery failure must not break the translations list
      }
    }

    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/api/translation-for-language", async (req, res) => {
  try {
    const { lang = "en" } = req.query;
    const translationAbbr = getTranslationId(String(lang));
    const record = await db
      .select()
      .from(bibleTranslations)
      .where(eq(bibleTranslations.abbreviation, translationAbbr))
      .limit(1);

    if (!record.length) {
      const fallback = await db
        .select()
        .from(bibleTranslations)
        .where(eq(bibleTranslations.abbreviation, "KJV"))
        .limit(1);
      return res.json(fallback[0] || { abbreviation: "KJV" });
    }

    return res.json(record[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── VERSE ────────────────────────────────────────────────────────────────────

router.get("/api/verse", async (req, res) => {
  try {
    const { book, chapter, verse } = req.query;

    if (!book || !chapter || !verse) {
      return res.status(400).json({ error: "book, chapter, and verse are required" });
    }

    const verseNum = Number(verse);
    if (isNaN(verseNum) || verseNum < 1) {
      return res.status(400).json({ error: "verse must be a positive number" });
    }

    // Resolve the whole chapter (works for DB, NLT, and API.Bible translations),
    // then pick the requested verse. Preserves flat verse-field compatibility.
    const resolved = await resolveChapter({
      book: String(book),
      chapter: Number(chapter),
      translation: req.query.translation as string | undefined,
      cache: chapterCacheHooks,
    });

    const verseRecord = (resolved.verses as Array<{ verse: number }>).find(
      (v) => v.verse === verseNum
    );

    if (!verseRecord) {
      return res.status(404).json({ error: "Verse not found" });
    }

    return res.json({ ...verseRecord, ...resolved.meta });
  } catch (err) {
    if (err instanceof ScriptureError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── SEARCH ───────────────────────────────────────────────────────────────────

router.get("/api/search", async (req, res) => {
  try {
    const { q } = req.query;
    const { abbreviation: translationAbbr, wasDefaulted } = normalizeTranslationParam(
      req.query.translation as string | undefined
    );
    const limitStr = String(req.query.limit ?? "50");

    if (!q) {
      return res.status(400).json({ error: "q (query) is required" });
    }

    const query = String(q).trim();
    const resultLimit = Math.min(Number(limitStr) || 50, 100);

    if (translationAbbr === "NLT") {
      const allBooks = await db.select().from(bibleBooks).orderBy(bibleBooks.orderIndex);
      const localBookRefs: LocalBookRef[] = allBooks.map((book) => ({
        id: book.id,
        name: book.name,
        abbreviation: book.abbreviation,
      }));

      try {
        const providerResponse = await searchNlt(query, resultLimit, localBookRefs);
        const meta = buildTranslationResponseMeta(
          "NLT",
          "New Living Translation",
          "nlt_provider",
          "NLT API"
        );
        return res.json({
          results: providerResponse.results,
          total: providerResponse.total,
          returned: providerResponse.results.length,
          ...meta,
        });
      } catch (err: any) {
        console.error("NLT search provider error:", err?.message);
        const statusCode =
          err instanceof ScriptureError ? err.statusCode : (err?.statusCode ?? 502);
        return res.status(statusCode).json({
          error:
            err instanceof ScriptureError
              ? err.message
              : "Could not search NLT translation",
          code: err instanceof ScriptureError ? err.code : "PROVIDER_ERROR",
          translation: "NLT",
        });
      }
    }

    // API.Bible provider: use provider search API
    {
      const allBooks = await db.select().from(bibleBooks).orderBy(bibleBooks.orderIndex);
      const apiBibleTranslations = await getApiBibleTranslations(allBooks);

      if (apiBibleTranslations[translationAbbr]) {
        const config = apiBibleTranslations[translationAbbr];
        try {
          const localBookRefs: LocalBookRef[] = allBooks.map((b) => ({
            id: b.id,
            name: b.name,
            abbreviation: b.abbreviation,
          }));
          const providerResults = await searchApiBible(
            query,
            translationAbbr,
            config,
            resultLimit,
            localBookRefs
          );
          const meta = buildTranslationResponseMeta(translationAbbr, config.name, "api_bible", "API.Bible", config.bibleId);
          return res.json({
            results: providerResults,
            total: providerResults.length,
            returned: providerResults.length,
            ...meta,
          });
        } catch (err: any) {
          console.error(`API.Bible search (${translationAbbr}) error:`, err?.message);
          const statusCode = err instanceof ScriptureError ? err.statusCode : (err?.statusCode ?? 502);
          return res.status(statusCode).json({
            error: `Could not search ${translationAbbr} translation`,
            translation: translationAbbr,
          });
        }
      }
    }

    // DB-backed search for corpus-backed translations.
    const translationRecord = await db
      .select()
      .from(bibleTranslations)
      .where(eq(bibleTranslations.abbreviation, translationAbbr))
      .limit(1);

    if (!translationRecord.length) {
      if (!wasDefaulted) {
        return res.status(404).json({ error: `Translation not found: ${translationAbbr}` });
      }
      return res.status(404).json({ error: "Default translation (KJV) not found in database" });
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

    const meta = buildTranslationResponseMeta(
      translationRecord[0].abbreviation,
      translationRecord[0].name,
      "db",
      "local"
    );
    return res.json({ results, total: totalCount, returned: results.length, ...meta });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── SEARCH / REFERENCE ───────────────────────────────────────────────────────

router.get("/api/search/reference", async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: "q (query) is required" });
    }

    const query = String(q).trim();

    const refMatch = query.match(
      /^(\d?\s*[A-Za-z]+(?:\s+[A-Za-z]+)*)\s+(\d+)(?::(\d+)(?:\s*-\s*(\d+))?)?$/
    );
    if (!refMatch) {
      return res.json({ isReference: false });
    }

    const [, bookPart, chapterStr, verseStr, verseEndStr] = refMatch;
    const bookName = bookPart.trim().toLowerCase();

    const allBooks = await db.select().from(bibleBooks).orderBy(bibleBooks.orderIndex);
    const matchedBook = allBooks.find(
      (b) =>
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

// ─── CACHE STATS ──────────────────────────────────────────────────────────────

router.get("/api/bible-cache/stats", async (_req, res) => {
  try {
    const stats = await db.select().from(bibleCacheStats);
    const cacheRows = await db
      .select({
        translation: bibleCache.translation,
        cachedChapters: sql<number>`count(*)`,
        totalVerses: sql<number>`sum(${bibleCache.verseCount})`,
        oldestFetch: sql<string>`min(${bibleCache.fetchedAt})`,
        newestFetch: sql<string>`max(${bibleCache.fetchedAt})`,
      })
      .from(bibleCache)
      .groupBy(bibleCache.translation);

    const totalChapters = 1189;
    const apiTranslations = ["NLT", "NIV", "AMP", "NASB"];

    const summary = apiTranslations.map((t) => {
      const stat = stats.find((s) => s.translation === t);
      const cache = cacheRows.find((c) => c.translation === t);
      const hits = stat?.cacheHits ?? 0;
      const misses = stat?.cacheMisses ?? 0;
      const total = hits + misses;
      return {
        translation: t,
        cachedChapters: Number(cache?.cachedChapters ?? 0),
        totalPossibleChapters: totalChapters,
        cacheWarmthPct: Number(((Number(cache?.cachedChapters ?? 0) / totalChapters) * 100).toFixed(1)),
        totalVersesCached: Number(cache?.totalVerses ?? 0),
        cacheHits: hits,
        cacheMisses: misses,
        hitRatePct: total > 0 ? Number(((hits / total) * 100).toFixed(1)) : 0,
        lastHitAt: stat?.lastHitAt,
        lastMissAt: stat?.lastMissAt,
        oldestFetch: cache?.oldestFetch,
        newestFetch: cache?.newestFetch,
      };
    });

    return res.json({
      translations: summary,
      totalCachedRows: cacheRows.reduce((sum, r) => sum + Number(r.cachedChapters), 0),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
