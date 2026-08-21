import { Router } from "express";
import { withSdaLens, SDA_LENS_VERSION } from "../services/sda-lens";
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
  TOUCHPOINT_STUDY_CONTENT_VERSION,
} from "../services/touchpoint-scripture";

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
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
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

    // Cache key includes explicit content version + SDA lens version + normalized
    // translation + topic id. This invalidates old paraphrase caches and prevents
    // any cross-version / cross-translation cache reuse.
    const cacheKey = `touchpoint-study-${TOUCHPOINT_STUDY_CONTENT_VERSION}-${SDA_LENS_VERSION}-${translation}-${topic.id}`;
    const [cached] = await db.select().from(searchCache)
      .where(eq(searchCache.queryHash, cacheKey))
      .limit(1);

    if (cached && cached.expiresAt > new Date()) {
      return res.json(cached.results);
    }

    const suppliedBlock = buildSuppliedScriptureBlock(suppliedVerses);

    const client = new (await import("openai")).default({
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    });

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: withSdaLens(`You are a faithful Bible teacher creating a structured Bible study. Generate a complete Bible study on the topic of "${topic.title}" that:
1. Points to Jesus Christ and the gospel
2. Grounds every point in Scripture
3. Encourages fellowship and church community
4. Provides practical application

CRITICAL SCRIPTURE RULE:
- You MUST NOT write, quote, paraphrase, or invent any Bible verse text.
- Each section's "scripture" field MUST be EXACTLY one of the supplied reference strings, copied verbatim.
- Do NOT output verse text anywhere. The verse wording is attached by the system from a canonical source.

The ONLY valid scripture references you may select from are (each line is "Reference: text" for your UNDERSTANDING only — never reproduce the text):
${suppliedBlock}

Format as JSON:
{
  "title": "Bible Study: ${topic.title}",
  "introduction": "2-3 paragraph introduction connecting the topic to faith",
  "sections": [
    {
      "heading": "Section title",
      "scripture": "One reference string copied EXACTLY from the supplied list",
      "teaching": "2-3 paragraphs of teaching",
      "reflection": "A reflection question"
    }
  ],
  "conclusion": "Closing paragraph pointing to Christ",
  "prayerPrompt": "A suggested prayer",
  "groupDiscussion": ["3-4 discussion questions for small groups"]
}

Use 3-5 sections. Each section's "scripture" must be one of these exact strings: ${JSON.stringify(suppliedRefs)}. Do NOT include a scriptureText field. Keep it warm, personal, and Christ-centered.`),
        },
        {
          role: "user",
          content: `Create a Bible study on "${topic.title}". Select section scriptures ONLY from the supplied reference list. Do not write any verse text yourself.`,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const studyContent = JSON.parse(response.choices[0]?.message?.content || "{}");

    // Hydrate each generated section with canonical text/metadata. AI never
    // supplies verse wording; we attach it from the canonical resolver result.
    // An invalid AI selection fails the request explicitly.
    if (Array.isArray(studyContent.sections)) {
      studyContent.sections = studyContent.sections.map((section: any) => {
        const canonical = resolveGeneratedSelection(String(section?.scripture ?? ""), hydrated.byRef);
        return {
          ...section,
          scripture: canonical.ref,
          scriptureText: canonical.text,
          translation: canonical.translation,
          translationName: canonical.translationName,
          source: canonical.source,
          provider: canonical.provider,
          ...(canonical.providerEditionId ? { providerEditionId: canonical.providerEditionId } : {}),
        };
      });
    }

    // Top-level translation identity so cached responses self-identify.
    studyContent.translation = hydrated.translationMeta.translation;
    studyContent.translationName = hydrated.translationMeta.translationName;
    studyContent.source = hydrated.translationMeta.source;
    studyContent.provider = hydrated.translationMeta.provider;
    if (hydrated.translationMeta.providerEditionId) {
      studyContent.providerEditionId = hydrated.translationMeta.providerEditionId;
    }
    studyContent.contentVersion = TOUCHPOINT_STUDY_CONTENT_VERSION;

    await db.insert(searchCache).values({
      queryText: `Bible Study: ${topic.title} (${translation})`,
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
