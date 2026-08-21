import { Router } from "express";
import { db } from "../db";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import { getErrorStatusCode } from "../services/ai-semaphore";
import {
  strongEntries,
  verseStrongMaps,
  bibleVerses,
  bibleTranslations,
  bibleCache,
  searchCache,
  devotionalDays,
  userPlanEnrollments,
  userPlanProgress,
} from "../../shared/schema";
import { and, eq, sql } from "drizzle-orm";
import { getEffectiveUserId, optionalAuth } from "../middleware/auth";
import { generateVerseMap, generateQuickInsight } from "../services/ai-engine";
import {
  normalizeTranslationParam,
  resolveReference,
  ScriptureError,
  type ChapterCacheHooks,
} from "../services/scripture-service";
import { joinVerseText } from "./search";
import {
  buildVerseMapCacheHash,
  hydrateCrossReferences,
  resolveVerseMapSource,
  type HydratedCrossReference,
} from "./verse-map-helpers";

const router = Router();

// ─── DB chapter cache hooks (shared bible_cache path, keyed by translation) ────

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
            eq(bibleCache.chapter, chapterNum),
          ),
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
      console.error(`[verse-map-cache] Failed to store ${translation} ${bookName} ${chapterNum}:`, err?.message);
    }
  },
};

/**
 * The shape stored in the translation-versioned searchCache for a verse map.
 * Contains ONLY hydrated (canonical) cross-references + a non-Scripture context
 * snippet + translation metadata. Never AI-produced Scripture text.
 */
interface VerseMapCachedPayload {
  crossReferences: HydratedCrossReference[];
  contextSnippet: string | null;
  translation: string;
  translationName: string;
}

router.get("/api/verse-map/:verseId", async (req, res) => {
  try {
    const verseId = String(req.params.verseId);

    // A resolvable translation is required — no silent defaulting.
    const rawTranslation = req.query.translation;
    if (!rawTranslation || typeof rawTranslation !== "string" || rawTranslation.trim() === "") {
      return res.status(400).json({ error: "A translation query parameter is required" });
    }
    const { abbreviation: translation } = normalizeTranslationParam(rawTranslation);

    // Strong's words are returned ONLY when the verseId belongs to a
    // bible_verse row whose translation matches the requested translation.
    // Provider/synthetic verseIds (not in bible_verse, or a different
    // translation) resolve to [] instead of causing FK/join surprises.
    const [ownerRow] = await db
      .select({ abbreviation: bibleTranslations.abbreviation })
      .from(bibleVerses)
      .leftJoin(bibleTranslations, eq(bibleVerses.translationId, bibleTranslations.id))
      .where(eq(bibleVerses.id, verseId))
      .limit(1);

    const verseMatchesTranslation =
      !!ownerRow &&
      typeof ownerRow.abbreviation === "string" &&
      ownerRow.abbreviation.toUpperCase() === translation;

    let words: Array<{ map: any; entry: any }> = [];
    if (verseMatchesTranslation) {
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
      words = rawWords.filter((row) => {
        const key = `${row.map.strongId}-${row.map.wordPosition}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // Generated cross-reference/context comes ONLY from the
    // translation-versioned searchCache (content version + lens version +
    // translation + verseId). The legacy translation-blind verse_map_cache
    // generated content is no longer read.
    const queryHash = buildVerseMapCacheHash(translation, verseId);
    const cachedRows = await db
      .select()
      .from(searchCache)
      .where(and(eq(searchCache.queryHash, queryHash), sql`${searchCache.expiresAt} > NOW()`))
      .limit(1);

    const cachedPayload = cachedRows.length > 0
      ? (cachedRows[0].results as VerseMapCachedPayload)
      : null;

    return res.json({
      words,
      crossReferences: cachedPayload?.crossReferences ?? [],
      contextSnippet: cachedPayload?.contextSnippet ?? null,
      translation,
      translationName: cachedPayload?.translationName ?? null,
      hasCachedData: !!cachedPayload,
    });
  } catch (err) {
    if (err instanceof ScriptureError) {
      console.error("Verse map GET scripture error:", err.code, err.message);
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.post("/api/verse-map/generate", aiGenerationLimiter, async (req, res) => {
  try {
    const { verseId, verseReference, reference } = req.body;
    const rawReference = typeof verseReference === "string" && verseReference.trim()
      ? verseReference
      : reference;

    // Require a translation and a reference/verseId. Client verseText is NEVER
    // trusted — the source text is resolved canonically below.
    if (!verseId || typeof verseId !== "string" || verseId.trim() === "") {
      return res.status(400).json({ error: "verseId is required" });
    }
    if (!rawReference || typeof rawReference !== "string" || rawReference.trim().length < 3) {
      return res.status(400).json({ error: "A valid verseReference is required" });
    }
    const rawTranslation = req.body.translation;
    if (!rawTranslation || typeof rawTranslation !== "string" || rawTranslation.trim() === "") {
      return res.status(400).json({ error: "A translation is required" });
    }
    const { abbreviation: translation } = normalizeTranslationParam(rawTranslation);

    // Resolve the SOURCE reference through the canonical resolver in the
    // requested translation BEFORE any generated-cache lookup. This guarantees:
    //  - A provider/entitlement/resolver failure surfaces (ScriptureError →
    //    mapped status/code) and can never be masked by a cached response.
    //  - The client-supplied verseId is verified to EXACTLY match the canonical
    //    first-verse id, so a caller cannot pair one verse's id with a different
    //    verse's reference to poison the (translation, verseId)-keyed cache.
    // Client-supplied verse text is never trusted or used.
    const source = await resolveVerseMapSource({
      reference: rawReference.trim(),
      clientVerseId: verseId,
      translation,
      resolve: resolveReference,
      cache: chapterCacheHooks,
    });

    // Translation-versioned cache lookup (content version + lens + translation
    // + verseId). Only after the source resolves + the id is verified do we
    // reuse a cached hydrated payload, preserving canonical source metadata.
    const queryHash = buildVerseMapCacheHash(translation, verseId);
    const existingRows = await db
      .select()
      .from(searchCache)
      .where(and(eq(searchCache.queryHash, queryHash), sql`${searchCache.expiresAt} > NOW()`))
      .limit(1);
    if (existingRows.length > 0) {
      const payload = existingRows[0].results as VerseMapCachedPayload;
      return res.json({
        ...payload,
        translation: source.translation,
        translationName: source.translationName,
        hasCachedData: true,
        cached: true,
      });
    }

    // AI returns ONLY cross-reference candidates {reference, connection} plus a
    // non-Scripture contextSnippet. It never returns Scripture text.
    const aiResult = await generateVerseMap({
      verseText: source.text,
      verseReference: rawReference.trim(),
      translation,
    });

    // Resolve every candidate reference to EXACT canonical text in the requested
    // translation. Any resolver failure fails the WHOLE request — no partial
    // results, no fallback, never AI-produced text.
    const crossReferences = await hydrateCrossReferences(
      aiResult.crossReferences,
      translation,
      resolveReference,
      chapterCacheHooks,
    );

    const payload: VerseMapCachedPayload = {
      crossReferences,
      contextSnippet: aiResult.contextSnippet || null,
      translation: source.translation,
      translationName: source.translationName,
    };

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await db
      .insert(searchCache)
      .values({
        queryText: `verse-map:${translation}:${verseId}`,
        queryHash,
        userId: null,
        results: payload as any,
        expiresAt,
      })
      .onConflictDoNothing();

    return res.json({ ...payload, hasCachedData: true, cached: false });
  } catch (err) {
    if (err instanceof ScriptureError) {
      console.error("Verse map generate scripture error:", err.code, err.message);
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.post("/api/verses/explain", async (req, res) => {
  try {
    const { reference, lessonContext } = req.body;
    if (!reference || typeof reference !== "string" || reference.trim().length < 3) {
      return res.status(400).json({ error: "A valid Scripture reference is required" });
    }
    const rawTranslation = req.body.translation;
    if (!rawTranslation || typeof rawTranslation !== "string" || rawTranslation.trim() === "") {
      return res.status(400).json({ error: "A translation is required" });
    }
    const { abbreviation: translation } = normalizeTranslationParam(rawTranslation);

    // Resolve the reference canonically in the requested translation. Any
    // resolver/provider failure is explicit — no static fallback labeled as
    // Scripture. Client-supplied verse text is never trusted.
    const resolved = await resolveReference({
      reference: reference.trim(),
      translation,
      cache: chapterCacheHooks,
    });
    const verseText = joinVerseText(resolved.verses as Array<{ verse: number; text: string }>);
    if (!verseText) {
      throw new ScriptureError(
        "VERSE_NOT_FOUND",
        `No canonical text found for ${reference.trim()}`,
        404,
      );
    }

    const { generateVerseExplanation } = await import("../services/ai-engine");
    const explanation = await generateVerseExplanation({
      reference: reference.trim(),
      verseText,
      translation: resolved.meta.translation,
      lessonContext: lessonContext?.trim(),
    });
    return res.json({
      explanation,
      translation: resolved.meta.translation,
      translationName: resolved.meta.translationName,
      source: resolved.meta.source,
      provider: resolved.meta.provider,
      ...(resolved.meta.providerEditionId
        ? { providerEditionId: resolved.meta.providerEditionId }
        : {}),
    });
  } catch (err) {
    if (err instanceof ScriptureError) {
      console.error("Verse explanation scripture error:", err.code, err.message);
      return res.status(err.statusCode).json({ error: err.message, code: err.code });
    }
    console.error("Verse explanation error:", err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
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

router.post("/api/devotionals/complete", optionalAuth, async (req, res) => {
  try {
    const { enrollmentId, dayId, journalEntry } = req.body;
    if (!enrollmentId || !dayId) {
      return res.status(400).json({ error: "enrollmentId and dayId are required" });
    }

    const userId = getEffectiveUserId(req);
    const [enrollment] = await db
      .select({
        id: userPlanEnrollments.id,
        planId: userPlanEnrollments.planId,
      })
      .from(userPlanEnrollments)
      .where(
        and(
          eq(userPlanEnrollments.id, String(enrollmentId)),
          eq(userPlanEnrollments.userId, userId)
        )
      )
      .limit(1);

    if (!enrollment) {
      return res.status(404).json({ error: "Enrollment not found" });
    }

    const [day] = await db
      .select({ id: devotionalDays.id })
      .from(devotionalDays)
      .where(
        and(
          eq(devotionalDays.id, String(dayId)),
          eq(devotionalDays.planId, enrollment.planId)
        )
      )
      .limit(1);

    if (!day) {
      return res.status(400).json({ error: "Day does not belong to this devotional plan" });
    }

    const progress = await db
      .insert(userPlanProgress)
      .values({
        enrollmentId: enrollment.id,
        dayId: day.id,
        journalEntry,
      })
      .onConflictDoNothing()
      .returning();

    const [allDays, completedDays] = await Promise.all([
      db
        .select({ id: devotionalDays.id })
        .from(devotionalDays)
        .where(eq(devotionalDays.planId, enrollment.planId)),
      db
        .select({ dayId: userPlanProgress.dayId })
        .from(userPlanProgress)
        .where(eq(userPlanProgress.enrollmentId, enrollment.id)),
    ]);
    const completedDayIds = new Set(completedDays.map((item) => item.dayId));
    const planComplete = allDays.length > 0 && allDays.every((item) => completedDayIds.has(item.id));

    if (planComplete) {
      await db
        .update(userPlanEnrollments)
        .set({ isActive: false })
        .where(eq(userPlanEnrollments.id, enrollment.id));
    }

    return res.json({ progress: progress[0] ?? null, planComplete });
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

export default router;
