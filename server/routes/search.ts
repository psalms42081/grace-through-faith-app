import { Router } from "express";
import { db } from "../db";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import {
  bibleBooks,
  bibleVerses,
  bibleTranslations,
  bibleCache,
  bibleCacheStats,
  searchCache,
  userNotes,
  userHighlights,
  userBookmarks,
} from "../../shared/schema";
import { eq, and, sql, desc, or } from "drizzle-orm";
import * as crypto from "crypto";
import { extractUserId } from "../middleware/auth";
import { generateSemanticSearch } from "../services/ai-engine";
import { SDA_LENS_VERSION } from "../services/sda-lens";
import {
  normalizeTranslationParam,
  resolveReference,
  ScriptureError,
  type ChapterCacheHooks,
} from "../services/scripture-service";

const router = Router();

/**
 * Semantic search content version. Bump to invalidate any cache entries created
 * by an older resolver/schema. Combined with SDA_LENS_VERSION and the requested
 * translation in the cache hash, this guarantees no cross-version cache reuse.
 */
const SEMANTIC_SEARCH_CONTENT_VERSION = "canon-v1";

// ─── DB cache hooks (shared bible_cache path, keyed by translation) ────────────

async function checkBibleCache(
  translation: string,
  bookId: number,
  chapterNum: number,
): Promise<any[] | null> {
  try {
    const cached = await db
      .select()
      .from(bibleCache)
      .where(
        and(
          eq(bibleCache.translation, translation),
          eq(bibleCache.bookId, bookId),
          eq(bibleCache.chapter, chapterNum),
        ),
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
      return cached[0].versesJson as any[];
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
  verses: any[],
  sourceApi: string,
): Promise<void> {
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
    console.error(`[search-cache] Failed to store ${translation} ${bookName} ${chapterNum}:`, err?.message);
  }
}

const chapterCacheHooks: ChapterCacheHooks = {
  read: checkBibleCache,
  write: storeBibleCache,
};

/**
 * A single semantic verse result. The Scripture text is ALWAYS the exact
 * canonical text of the requested translation, resolved server-side. AI-produced
 * verse text is never used.
 */
interface SemanticVerse {
  reference: string;
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  text: string;
  relevance: string;
  translation: string;
  translationName: string;
  source: string;
  provider: string;
  providerEditionId?: string;
}

/**
 * Join the selected verses of a resolved reference into a single canonical text
 * string, ordered by verse number.
 */
export function joinVerseText(verses: Array<{ verse: number; text: string }>): string {
  return verses
    .slice()
    .sort((a, b) => a.verse - b.verse)
    .map((v) => (typeof v.text === "string" ? v.text.trim() : ""))
    .filter((t) => t.length > 0)
    .join(" ")
    .trim();
}

/**
 * Build the semantic-search cache hash. Isolates entries by content version +
 * SDA lens version + translation + normalized query so there is never any
 * cross-version or cross-translation cache reuse. Exported for testing.
 */
export function buildSemanticSearchCacheHash(
  translation: string,
  normalizedQuery: string,
): string {
  const hashInput = [
    SEMANTIC_SEARCH_CONTENT_VERSION,
    SDA_LENS_VERSION,
    translation,
    normalizedQuery,
  ].join("::");
  return crypto.createHash("sha256").update(hashInput).digest("hex");
}

/** Injectable resolver signature (matches resolveReference from scripture-service). */
type ReferenceResolver = typeof resolveReference;

/**
 * A single AI candidate — reference + relevance only, never Scripture text.
 */
export interface SemanticSearchCandidateInput {
  reference: string;
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  relevance: string;
}

/**
 * Resolve AI candidates to exact canonical Scripture in the requested
 * translation. AI-produced text is NEVER used. Any resolver/provider failure
 * propagates (no partial results, no fallback). De-duplicates by reference and
 * preserves order of first appearance. Exported and resolver-injectable so it
 * can be unit-tested with mocked canonical text (no network, no fixtures).
 */
export async function resolveCandidatesToVerses(
  candidates: SemanticSearchCandidateInput[],
  translation: string,
  resolve: ReferenceResolver,
  cache?: ChapterCacheHooks,
): Promise<SemanticVerse[]> {
  const resolvedVerses: SemanticVerse[] = [];
  const seenRefs = new Set<string>();

  for (const candidate of candidates) {
    const ref = (candidate.reference || "").trim();
    if (!ref || seenRefs.has(ref)) continue;
    seenRefs.add(ref);

    const resolved = await resolve({ reference: ref, translation, cache });

    const text = joinVerseText(resolved.verses as Array<{ verse: number; text: string }>);
    if (!text) {
      throw new ScriptureError("VERSE_NOT_FOUND", `No canonical text found for ${ref}`, 404);
    }

    const parsedVerses = (resolved.reference.verses || []).slice().sort((a, b) => a - b);
    const verseStart = parsedVerses.length > 0 ? parsedVerses[0] : candidate.verseStart;
    const verseEnd =
      parsedVerses.length > 1 ? parsedVerses[parsedVerses.length - 1] : candidate.verseEnd;

    resolvedVerses.push({
      reference: ref,
      bookId: resolved.book.id,
      chapter: resolved.chapter,
      verseStart,
      verseEnd,
      text,
      relevance: candidate.relevance || "",
      translation: resolved.meta.translation,
      translationName: resolved.meta.translationName,
      source: resolved.meta.source,
      provider: resolved.meta.provider,
      ...(resolved.meta.providerEditionId
        ? { providerEditionId: resolved.meta.providerEditionId }
        : {}),
    });
  }

  return resolvedVerses;
}

router.post("/api/search/semantic", aiGenerationLimiter, async (req, res) => {
  try {
    const userId = extractUserId(req);
    const { query, translation: rawTranslation } = req.body;

    if (!query || typeof query !== "string" || query.trim().length < 3) {
      return res.status(400).json({ error: "A search query of at least 3 characters is required" });
    }

    // A resolvable translation is required — no silent defaulting.
    if (!rawTranslation || typeof rawTranslation !== "string" || rawTranslation.trim() === "") {
      return res.status(400).json({ error: "A translation is required" });
    }
    const { abbreviation: translation } = normalizeTranslationParam(rawTranslation);

    const trimmedQuery = query.trim().toLowerCase();

    // Cache hash isolates by content version + lens version + translation +
    // normalized query so no cross-version or cross-translation reuse can occur.
    const queryHash = buildSemanticSearchCacheHash(translation, trimmedQuery);

    const cached = await db
      .select()
      .from(searchCache)
      .where(and(eq(searchCache.queryHash, queryHash), sql`${searchCache.expiresAt} > NOW()`))
      .limit(1);

    let verses: SemanticVerse[];
    if (cached.length > 0) {
      verses = cached[0].results as SemanticVerse[];
    } else {
      // Step 1: AI selects candidate references + relevance (no Scripture text).
      const candidates = await generateSemanticSearch(trimmedQuery, translation);

      // Step 2: Resolve each candidate to EXACT canonical text via the canonical
      // resolver. Any resolver/provider error fails the whole request — no
      // partial results, no fallback, never AI-produced text.
      verses = await resolveCandidatesToVerses(
        candidates,
        translation,
        resolveReference,
        chapterCacheHooks,
      );

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

      // Personal content is tied to its STORED verse id. Its verse text reflects
      // whatever translation that stored verse belongs to — we surface that
      // translation as metadata and never relabel it as the active translation.
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
          verseTranslation: bibleTranslations.abbreviation,
          verseTranslationName: bibleTranslations.name,
          bookName: bibleBooks.name,
        })
        .from(userNotes)
        .leftJoin(bibleVerses, eq(userNotes.verseId, bibleVerses.id))
        .leftJoin(bibleTranslations, eq(bibleVerses.translationId, bibleTranslations.id))
        .leftJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
        .where(
          and(
            eq(userNotes.userId, searchUserId),
            sql`LOWER(${userNotes.content}) LIKE ${searchTerm}`,
          ),
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
          verseTranslation: bibleTranslations.abbreviation,
          verseTranslationName: bibleTranslations.name,
          bookName: bibleBooks.name,
        })
        .from(userHighlights)
        .leftJoin(bibleVerses, eq(userHighlights.verseId, bibleVerses.id))
        .leftJoin(bibleTranslations, eq(bibleVerses.translationId, bibleTranslations.id))
        .leftJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
        .where(
          and(
            eq(userHighlights.userId, searchUserId),
            sql`LOWER(${bibleVerses.text}) LIKE ${searchTerm}`,
          ),
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
          verseTranslation: bibleTranslations.abbreviation,
          verseTranslationName: bibleTranslations.name,
          bookName: bibleBooks.name,
        })
        .from(userBookmarks)
        .leftJoin(bibleVerses, eq(userBookmarks.verseId, bibleVerses.id))
        .leftJoin(bibleTranslations, eq(bibleVerses.translationId, bibleTranslations.id))
        .leftJoin(bibleBooks, eq(bibleVerses.bookId, bibleBooks.id))
        .where(
          and(
            eq(userBookmarks.userId, searchUserId),
            or(
              sql`LOWER(${userBookmarks.label}) LIKE ${searchTerm}`,
              sql`LOWER(${bibleVerses.text}) LIKE ${searchTerm}`,
            ),
          ),
        )
        .orderBy(desc(userBookmarks.createdAt))
        .limit(10);
    }

    return res.json({
      translation,
      verses,
      notes,
      highlights,
      bookmarks,
      cached: cached.length > 0,
    });
  } catch (err) {
    if (err instanceof ScriptureError) {
      console.error("Semantic search scripture error:", err.code, err.message);
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
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
