import { Router } from "express";
import { openaiClientOptions } from "../openai-env";
import { getCalendarDayIndex } from "../../shared/calendar-date";
import { SDA_LENS_VERSION } from "../services/sda-lens";
import {
  appendPastoralCareNote,
  buildTouchpointBibleStudyRequest,
  hasUnsafeGriefReunionLanguage,
} from "../services/sensitive-ai-prompts";
import { TOUCHPOINTS_DATA, TOUCHPOINT_CATEGORIES, searchTouchpoints } from "../data/touchpoints";
import { BIBLE_PROJECT_VIDEOS } from "../data/bibleProjectVideos";
import { db } from "../db";
import { searchCache, bibleCache, bibleCacheStats } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import { getErrorStatusCode } from "../services/ai-semaphore";
import { ScriptureError, normalizeTranslationParam, type ChapterCacheHooks } from "../services/scripture-service";
import {
  hydrateQuestions,
  resolveGeneratedSelection,
  buildSuppliedScriptureBlock,
  suppliedReferenceStrings,
} from "../services/touchpoint-scripture";
import {
  attachCanonicalScripture,
  buildTouchpointStudyCacheKey,
  GeneratedStudyValidationError,
  parseCachedTouchpointStudy,
  parseGeneratedStudyDraft,
} from "../services/touchpoint-study";
import {
  TOUCHPOINT_STUDY_SCHEMA_VERSION,
  TOUCHPOINT_STUDY_TRANSLATION_CONTRACT_VERSION,
} from "../../shared/touchpoint-study";

const router = Router();

// ─── Chapter cache hooks (shared bible_cache path) ───────────────────────────
// Provider chapters resolved during hydration are persisted through the same
// bible_cache table used by the /api/bible routes.

async function checkBibleCache(
  translation: string,
  bookId: number,
  chapterNum: number
): Promise<any[] | null> {
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
  sourceApi: string
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
    console.error(`[touchpoint-cache] Failed to store ${translation} ${bookName} ${chapterNum}:`, err?.message);
  }
}

const chapterCacheHooks: ChapterCacheHooks = {
  read: checkBibleCache,
  write: storeBibleCache,
};

/** Map a ScriptureError (or unknown) to an explicit HTTP response. Never
 *  returns partial/paraphrased content. */
function sendScriptureFailure(res: any, err: unknown, contextLabel: string) {
  if (err instanceof ScriptureError) {
    return res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      details: { context: contextLabel },
    });
  }
  console.error(`[${contextLabel}]`, err);
  return res.status(500).json({ error: "Internal server error" });
}

router.get("/api/signposts/daily", async (req, res) => {
  try {
    const dayOfYear = getCalendarDayIndex(new Date(), req.query.timeZone);
    const topic = TOUCHPOINTS_DATA[dayOfYear % TOUCHPOINTS_DATA.length];
    if (!topic) {
      return res.status(404).json({ error: "No signpost available" });
    }

    const hydrated = await hydrateQuestions(
      topic.questions,
      req.query.translation as string | undefined,
      chapterCacheHooks
    );

    return res.json({
      id: topic.id,
      title: topic.title,
      description: topic.overview,
      ...hydrated.translationMeta,
      questions: hydrated.questions.map((q) => ({
        question: q.question,
        verses: q.verses,
        commentary: q.commentary,
      })),
    });
  } catch (err) {
    return sendScriptureFailure(res, err, "signposts/daily");
  }
});

router.get("/api/touchpoints", (req, res) => {
  const { search } = req.query;
  const topics = search
    ? searchTouchpoints(search as string)
    : TOUCHPOINTS_DATA;

  const summary = topics.map(t => ({
    id: t.id,
    title: t.title,
    category: t.category,
    questionCount: t.questions.length,
  }));

  res.json({ categories: TOUCHPOINT_CATEGORIES, topics: summary });
});

router.get("/api/touchpoints/:topicId", async (req, res) => {
  try {
    const topic = TOUCHPOINTS_DATA.find(t => t.id === req.params.topicId);
    if (!topic) return res.status(404).json({ error: "Topic not found" });

    const hydrated = await hydrateQuestions(
      topic.questions,
      req.query.translation as string | undefined,
      chapterCacheHooks
    );

    const videos = BIBLE_PROJECT_VIDEOS[topic.id] || [];
    return res.json({
      id: topic.id,
      title: topic.title,
      category: topic.category,
      overview: topic.overview,
      ...hydrated.translationMeta,
      questions: hydrated.questions.map((q) => ({
        ...(q.id ? { id: q.id } : {}),
        question: q.question,
        verses: q.verses,
        commentary: q.commentary,
      })),
      bibleProjectVideos: videos,
    });
  } catch (err) {
    return sendScriptureFailure(res, err, `touchpoints/${req.params.topicId}`);
  }
});

router.post("/api/touchpoints/:topicId/bible-study", aiGenerationLimiter, async (req, res) => {
  try {
    const topic = TOUCHPOINTS_DATA.find(t => t.id === req.params.topicId);
    if (!topic) return res.status(404).json({ error: "Topic not found" });

    // Translation is required and normalized. 400 when absent.
    const rawTranslation = req.body?.translation;
    if (rawTranslation === undefined || rawTranslation === null || String(rawTranslation).trim() === "") {
      return res.status(400).json({ error: "translation is required" });
    }
    const { abbreviation: translation } = normalizeTranslationParam(String(rawTranslation));

    // Resolve ALL topic references in the requested translation BEFORE any cache
    // lookup so entitlement/provider/translation failures can never be masked by
    // an old cache. Failure here fails the whole request explicitly.
    let hydrated;
    try {
      hydrated = await hydrateQuestions(topic.questions, translation, chapterCacheHooks);
    } catch (err) {
      return sendScriptureFailure(res, err, `bible-study/${topic.id}/resolve`);
    }

    const suppliedVerses = Array.from(hydrated.byRef.values());
    const suppliedRefs = suppliedReferenceStrings(suppliedVerses);
    const suppliedBlock = buildSuppliedScriptureBlock(suppliedVerses);
    const promptRequest = buildTouchpointBibleStudyRequest({
      topicId: topic.id,
      topicTitle: topic.title,
      suppliedBlock,
      suppliedRefs,
      careGuidance: topic.careGuidance,
      studyCareNote: topic.studyCareNote,
    });

    // Fingerprint every generation input. Changes to the topic, prompt, SDA
    // lens, resolved translation edition, or translation contract all miss.
    const cacheKey = buildTouchpointStudyCacheKey({
      topic,
      translationMeta: hydrated.translationMeta,
      promptRequest,
      sdaLensVersion: SDA_LENS_VERSION,
      translationContractVersion: TOUCHPOINT_STUDY_TRANSLATION_CONTRACT_VERSION,
    });
    const [cached] = await db.select().from(searchCache)
      .where(eq(searchCache.queryHash, cacheKey))
      .limit(1);

    if (cached && cached.expiresAt > new Date()) {
      const validatedCache = parseCachedTouchpointStudy(cached.results);
      if (
        validatedCache &&
        !(topic.id === "grief" && hasUnsafeGriefReunionLanguage(validatedCache, topic.studyCareNote))
      ) {
        return res.json(validatedCache);
      }
      console.warn(`[touchpoint-study] Ignoring invalid cache entry ${cacheKey}`);
    }

    const client = new (await import("openai")).default({
      ...openaiClientOptions(),
    });

    let studyContent: ReturnType<typeof attachCanonicalScripture> | undefined;
    const maxAttempts = topic.id === "grief" ? 3 : 1;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await client.chat.completions.create(promptRequest);
        const draft = parseGeneratedStudyDraft(
          response.choices[0]?.message?.content || ""
        );
        const candidate = attachCanonicalScripture({
          draft,
          byRef: hydrated.byRef,
          translationMeta: hydrated.translationMeta,
          resolveSelection: resolveGeneratedSelection,
        });
        candidate.conclusion = appendPastoralCareNote(
          candidate.conclusion,
          topic.studyCareNote,
        );
        if (
          topic.id === "grief" &&
          hasUnsafeGriefReunionLanguage(candidate, topic.studyCareNote)
        ) {
          console.warn(`[touchpoint-study] Rejected unsafe grief draft (${attempt}/${maxAttempts})`);
          continue;
        }
        studyContent = candidate;
        break;
      } catch (err) {
        if (err instanceof GeneratedStudyValidationError && attempt < maxAttempts) {
          console.warn(`[touchpoint-study] Rejected malformed grief draft (${attempt}/${maxAttempts})`);
          continue;
        }
        throw err;
      }
    }
    if (!studyContent) {
      return res.status(502).json({
        error: "Could not generate a grief study consistent with the approved pastoral guidance",
      });
    }

    await db.insert(searchCache).values({
      queryText: `Bible Study: ${topic.title} (${translation}; ${TOUCHPOINT_STUDY_SCHEMA_VERSION})`,
      queryHash: cacheKey,
      results: studyContent,
      expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    }).onConflictDoUpdate({
      target: searchCache.queryHash,
      set: { results: studyContent, expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    });

    return res.json(studyContent);
  } catch (err: any) {
    if (err instanceof ScriptureError) {
      return sendScriptureFailure(res, err, `bible-study/${req.params.topicId}`);
    }
    console.error("Signpost Bible study error:", err);
    const status = getErrorStatusCode(err);
    return res.status(status || 500).json({ error: "Could not generate Bible study" });
  }
});

export default router;
