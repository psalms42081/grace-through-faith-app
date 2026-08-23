/**
 * touchpoints-scripture.test.ts
 *
 * Pure, fully-mocked tests for canonical Touchpoint/Signpost Scripture
 * hydration. NO real provider network, NO DB, NO copyrighted verse fixtures.
 *
 * All "verse text" here is fabricated placeholder wording used only to prove
 * that hydration attaches canonical text/metadata, isolates by translation,
 * and never falls back to paraphrase.
 *
 * Run with: npx tsx server/tests/touchpoints-scripture.test.ts
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  hydrateReferences,
  hydrateQuestions,
  deriveTranslationMeta,
  resolveGeneratedSelection,
  buildSuppliedScriptureBlock,
  suppliedReferenceStrings,
  type HydratedVerse,
  type ReferenceResolver,
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
import { SDA_LENS_VERSION } from "../services/sda-lens";

import {
  ScriptureError,
  type ResolvedScripture,
  type ParsedReference,
} from "../services/scripture-service";

// ─── Fabricated (NON-copyrighted) verse corpus, keyed by translation ──────────
// Placeholder strings only — deliberately not real KJV/NKJV/etc. wording.

const MOCK_CORPUS: Record<string, Record<string, string>> = {
  KJV: {
    "Psalm 27:10": "[[KJV-MOCK]] alpha bravo charlie",
    "Isaiah 49:15": "[[KJV-MOCK]] delta echo",
    "Isaiah 49:16": "[[KJV-MOCK]] foxtrot golf",
  },
  NKJV: {
    "Psalm 27:10": "[[NKJV-MOCK]] hotel india juliet",
    "Isaiah 49:15": "[[NKJV-MOCK]] kilo lima",
    "Isaiah 49:16": "[[NKJV-MOCK]] mike november",
  },
};

const TRANSLATION_NAMES: Record<string, string> = {
  KJV: "King James Version",
  NKJV: "New King James Version",
};

/** Parse "Book Chapter:VerseOrRange" into individual verse keys. */
function expandRefToVerseKeys(reference: string): { book: string; chapter: number; verses: number[] } {
  const m = reference.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
  if (!m) throw new Error(`test mock cannot parse ref: ${reference}`);
  const book = m[1];
  const chapter = Number(m[2]);
  const start = Number(m[3]);
  const end = m[4] ? Number(m[4]) : start;
  const verses: number[] = [];
  for (let v = start; v <= end; v++) verses.push(v);
  return { book, chapter, verses };
}

/**
 * Build a mocked ReferenceResolver over a fabricated corpus.
 * Throws ScriptureError exactly like the real resolver on unknown
 * translation / reference / verse — so failure paths are exercised.
 */
function makeMockResolver(): ReferenceResolver {
  return async ({ reference, translation }) => {
    const abbr = (translation ?? "KJV").toUpperCase();
    const table = MOCK_CORPUS[abbr];
    if (!table) {
      throw new ScriptureError("TRANSLATION_NOT_FOUND", `Translation not found: ${abbr}`, 404);
    }

    const { book, chapter, verses: verseNums } = expandRefToVerseKeys(reference);

    const verses = verseNums.map((n) => {
      const key = `${book} ${chapter}:${n}`;
      const text = table[key];
      if (text === undefined) {
        throw new ScriptureError("VERSE_NOT_FOUND", `No verses found for ${reference}`, 404);
      }
      return { verse: n, text };
    });

    const providerEditionId = abbr === "NKJV" ? "nkjv-edition-mock" : undefined;

    const resolved = {
      book: {
        id: 1,
        name: book,
        abbreviation: book,
        testament: "OT",
        chapterCount: 150,
        orderIndex: 1,
      },
      chapter,
      verses,
      cached: false,
      meta: {
        translation: abbr,
        translationName: TRANSLATION_NAMES[abbr] ?? abbr,
        source: (abbr === "NKJV" ? "api_bible" : "db") as ResolvedScripture["meta"]["source"],
        provider: abbr === "NKJV" ? "API.Bible" : "local",
        ...(providerEditionId ? { providerEditionId } : {}),
      },
      reference: { book, chapter, verses: verseNums, wholeChapter: false } as ParsedReference,
    };
    return resolved as ResolvedScripture & { reference: ParsedReference };
  };
}

const SAMPLE_QUESTIONS = [
  {
    id: "q1",
    question: "Am I abandoned?",
    verses: [{ ref: "Psalm 27:10" }, { ref: "Isaiah 49:15-16" }],
    commentary: "commentary one",
  },
  {
    id: "q2",
    question: "Where is God?",
    verses: [{ ref: "Psalm 27:10" }],
    commentary: "commentary two",
  },
];

// ─── Hydration metadata ───────────────────────────────────────────────────────

describe("hydration metadata", () => {
  it("attaches exact canonical text + full metadata to each verse", async () => {
    const resolver = makeMockResolver();
    const hydrated = await hydrateReferences(["Psalm 27:10"], "KJV", undefined, resolver);
    assert.equal(hydrated.length, 1);
    const v = hydrated[0];
    assert.equal(v.ref, "Psalm 27:10");
    assert.equal(v.text, MOCK_CORPUS.KJV["Psalm 27:10"]);
    assert.equal(v.translation, "KJV");
    assert.equal(v.translationName, "King James Version");
    assert.equal(v.source, "db");
    assert.equal(v.provider, "local");
    assert.equal(v.providerEditionId, undefined);
    assert.equal(v.resolved, true);
  });

  it("joins a same-chapter range into one canonical text string", async () => {
    const resolver = makeMockResolver();
    const [v] = await hydrateReferences(["Isaiah 49:15-16"], "KJV", undefined, resolver);
    assert.equal(
      v.text,
      `${MOCK_CORPUS.KJV["Isaiah 49:15"]} ${MOCK_CORPUS.KJV["Isaiah 49:16"]}`
    );
  });

  it("carries providerEditionId for provider translations", async () => {
    const resolver = makeMockResolver();
    const [v] = await hydrateReferences(["Psalm 27:10"], "NKJV", undefined, resolver);
    assert.equal(v.source, "api_bible");
    assert.equal(v.provider, "API.Bible");
    assert.equal(v.providerEditionId, "nkjv-edition-mock");
  });

  it("deriveTranslationMeta reflects the resolved translation identity", async () => {
    const resolver = makeMockResolver();
    const hydrated = await hydrateReferences(["Psalm 27:10"], "NKJV", undefined, resolver);
    const meta = deriveTranslationMeta(hydrated);
    assert.ok(meta);
    assert.equal(meta!.translation, "NKJV");
    assert.equal(meta!.translationName, "New King James Version");
    assert.equal(meta!.providerEditionId, "nkjv-edition-mock");
    assert.equal(meta!.scriptureResolution, "resolved");
  });

  it("defaults to KJV when translation omitted (backward compatibility)", async () => {
    const resolver = makeMockResolver();
    const [v] = await hydrateReferences(["Psalm 27:10"], undefined, undefined, resolver);
    assert.equal(v.translation, "KJV");
  });
});

// ─── Explicit resolver failure / no partial response ──────────────────────────

describe("explicit failure, never partial or paraphrased", () => {
  it("propagates ScriptureError when any ref fails (no partial result)", async () => {
    const resolver = makeMockResolver();
    await assert.rejects(
      () => hydrateReferences(["Psalm 27:10", "Genesis 99:99"], "KJV", undefined, resolver),
      (err: unknown) => {
        assert.ok(err instanceof ScriptureError);
        assert.equal((err as ScriptureError).code, "VERSE_NOT_FOUND");
        return true;
      }
    );
  });

  it("propagates ScriptureError for an unentitled/unknown translation", async () => {
    const resolver = makeMockResolver();
    await assert.rejects(
      () => hydrateQuestions(SAMPLE_QUESTIONS, "ESV", undefined, resolver),
      (err: unknown) => {
        assert.ok(err instanceof ScriptureError);
        assert.equal((err as ScriptureError).statusCode, 404);
        assert.equal((err as ScriptureError).code, "TRANSLATION_NOT_FOUND");
        return true;
      }
    );
  });

  it("never emits fallback/prose text — failure throws instead of substituting", async () => {
    // A resolver that "loses" text must surface as an error, not empty/paraphrase.
    const emptyResolver: ReferenceResolver = async ({ reference, translation }) => ({
      book: { id: 1, name: "Psalm", abbreviation: "Ps", testament: "OT", chapterCount: 150, orderIndex: 1 },
      chapter: 27,
      verses: [{ verse: 10, text: "   " }],
      cached: false,
      meta: {
        translation: (translation ?? "KJV").toUpperCase(),
        translationName: "King James Version",
        source: "db",
        provider: "local",
      },
      reference: { book: "Psalm", chapter: 27, verses: [10], wholeChapter: false },
    } as ResolvedScripture & { reference: ParsedReference });

    await assert.rejects(
      () => hydrateReferences(["Psalm 27:10"], "KJV", undefined, emptyResolver),
      (err: unknown) => err instanceof ScriptureError && (err as ScriptureError).code === "VERSE_NOT_FOUND"
    );
  });
});

// ─── Generated-study runtime schema ───────────────────────────────────────────

const VALID_DRAFT = {
  title: "Bible Study: Abandonment",
  introduction: "A complete introduction.",
  sections: [1, 2, 3].map((n) => ({
    heading: `Section ${n}`,
    scripture: "Psalm 27:10",
    teaching: `Teaching ${n}`,
    reflection: `Reflection ${n}?`,
  })),
  conclusion: "A complete conclusion.",
  prayerPrompt: "A complete prayer prompt.",
  groupDiscussion: ["Question one?", "Question two?", "Question three?"],
};

describe("generated-study runtime schema", () => {
  it("rejects malformed or incomplete model output before hydration", () => {
    assert.throws(
      () => parseGeneratedStudyDraft(JSON.stringify({ ...VALID_DRAFT, sections: [] })),
      (err: unknown) => err instanceof GeneratedStudyValidationError && err.statusCode === 502
    );
    assert.throws(
      () => parseGeneratedStudyDraft("{not-json"),
      (err: unknown) => err instanceof GeneratedStudyValidationError
    );
  });

  it("rejects model-authored Scripture text and unknown fields", () => {
    const unsafe = {
      ...VALID_DRAFT,
      sections: VALID_DRAFT.sections.map((section) => ({
        ...section,
        scriptureText: "Model-authored wording",
      })),
    };
    assert.throws(
      () => parseGeneratedStudyDraft(JSON.stringify(unsafe)),
      (err: unknown) => err instanceof GeneratedStudyValidationError
    );
  });

  it("requires explicit resolved state on every cached Scripture section", async () => {
    const hydrated = await hydrateQuestions(
      SAMPLE_QUESTIONS,
      "KJV",
      undefined,
      makeMockResolver()
    );
    const study = attachCanonicalScripture({
      draft: parseGeneratedStudyDraft(JSON.stringify(VALID_DRAFT)),
      byRef: hydrated.byRef,
      translationMeta: hydrated.translationMeta,
      resolveSelection: resolveGeneratedSelection,
    });

    assert.equal(study.scriptureResolution, "resolved");
    assert.ok(study.sections.every((section) => section.resolved === true));
    assert.ok(parseCachedTouchpointStudy(study));

    const unresolved = {
      ...study,
      sections: study.sections.map((section, index) =>
        index === 0 ? { ...section, resolved: false } : section
      ),
    };
    assert.equal(parseCachedTouchpointStudy(unresolved), null);
  });
});

// ─── Study-cache invalidation ─────────────────────────────────────────────────

const CACHE_TOPIC = {
  id: "abandonment",
  title: "Abandonment",
  category: "Emotions & Struggles",
  overview: "Original overview",
  questions: SAMPLE_QUESTIONS,
};
const CACHE_TRANSLATION = {
  translation: "KJV",
  translationName: "King James Version",
  source: "db" as const,
  provider: "local",
  scriptureResolution: "resolved" as const,
};
const CACHE_PROMPT = {
  model: "gpt-4o-mini",
  messages: [{ role: "system", content: "prompt-v1" }],
};
const cacheKey = (overrides: Partial<Parameters<typeof buildTouchpointStudyCacheKey>[0]> = {}) =>
  buildTouchpointStudyCacheKey({
    topic: CACHE_TOPIC,
    translationMeta: CACHE_TRANSLATION,
    promptRequest: CACHE_PROMPT,
    sdaLensVersion: SDA_LENS_VERSION,
    translationContractVersion: TOUCHPOINT_STUDY_TRANSLATION_CONTRACT_VERSION,
    ...overrides,
  });

describe("study cache invalidation", () => {
  it("is stable for identical inputs and fits the database key limit", () => {
    assert.equal(cacheKey(), cacheKey());
    assert.equal(cacheKey().length, 64);
  });

  it("busts when the topic, prompt, or SDA lens changes", () => {
    assert.notEqual(
      cacheKey(),
      cacheKey({ topic: { ...CACHE_TOPIC, overview: "Updated overview" } })
    );
    assert.notEqual(
      cacheKey(),
      cacheKey({ promptRequest: { ...CACHE_PROMPT, model: "updated-model" } })
    );
    assert.notEqual(cacheKey(), cacheKey({ sdaLensVersion: `${SDA_LENS_VERSION}-next` }));
  });

  it("busts for translation, provider-edition, and contract changes", () => {
    assert.notEqual(
      cacheKey(),
      cacheKey({
        translationMeta: {
          ...CACHE_TRANSLATION,
          translation: "NKJV",
          translationName: "New King James Version",
          source: "api_bible",
          provider: "API.Bible",
          providerEditionId: "edition-a",
        },
      })
    );
    assert.notEqual(
      cacheKey(),
      cacheKey({
        translationMeta: {
          ...CACHE_TRANSLATION,
          source: "api_bible",
          provider: "API.Bible",
          providerEditionId: "edition-b",
        },
      })
    );
    assert.notEqual(
      cacheKey(),
      cacheKey({ translationContractVersion: `${TOUCHPOINT_STUDY_TRANSLATION_CONTRACT_VERSION}-next` })
    );
  });

  it("uses the current generated-study schema version", async () => {
    const hydrated = await hydrateQuestions(
      SAMPLE_QUESTIONS,
      "KJV",
      undefined,
      makeMockResolver()
    );
    const study = attachCanonicalScripture({
      draft: parseGeneratedStudyDraft(JSON.stringify(VALID_DRAFT)),
      byRef: hydrated.byRef,
      translationMeta: hydrated.translationMeta,
      resolveSelection: resolveGeneratedSelection,
    });
    assert.equal(study.contentVersion, TOUCHPOINT_STUDY_SCHEMA_VERSION);
  });
});

// ─── Generated section hydration ──────────────────────────────────────────────

describe("generated section hydration", () => {
  it("hydrates an AI-selected ref with canonical text/metadata from supplied set", async () => {
    const resolver = makeMockResolver();
    const result = await hydrateQuestions(SAMPLE_QUESTIONS, "KJV", undefined, resolver);

    const supplied: HydratedVerse[] = Array.from(result.byRef.values());
    const refs = suppliedReferenceStrings(supplied);
    assert.ok(refs.includes("Psalm 27:10"));

    // Simulate AI selecting a valid ref.
    const canonical = resolveGeneratedSelection("Psalm 27:10", result.byRef);
    assert.equal(canonical.text, MOCK_CORPUS.KJV["Psalm 27:10"]);
    assert.equal(canonical.translation, "KJV");
  });

  it("tolerates internal-whitespace variation in the AI selection", async () => {
    const resolver = makeMockResolver();
    const result = await hydrateQuestions(SAMPLE_QUESTIONS, "KJV", undefined, resolver);
    const canonical = resolveGeneratedSelection("Psalm  27:10", result.byRef);
    assert.equal(canonical.ref, "Psalm 27:10");
  });

  it("fails explicitly when the AI selects a ref not in the supplied set", async () => {
    const resolver = makeMockResolver();
    const result = await hydrateQuestions(SAMPLE_QUESTIONS, "KJV", undefined, resolver);
    assert.throws(
      () => resolveGeneratedSelection("John 3:16", result.byRef),
      (err: unknown) => err instanceof ScriptureError && (err as ScriptureError).code === "INVALID_REFERENCE"
    );
  });

  it("supplied scripture block never leaks copyrighted wording (fabricated only)", async () => {
    const resolver = makeMockResolver();
    const result = await hydrateQuestions(SAMPLE_QUESTIONS, "NKJV", undefined, resolver);
    const block = buildSuppliedScriptureBlock(Array.from(result.byRef.values()));
    assert.ok(block.includes("[[NKJV-MOCK]]"));
    assert.ok(!/whosoever|begotten|everlasting/i.test(block));
  });

  it("byRef supplied set is de-duplicated across questions", async () => {
    const resolver = makeMockResolver();
    const result = await hydrateQuestions(SAMPLE_QUESTIONS, "KJV", undefined, resolver);
    // Psalm 27:10 appears in both questions but only once in byRef.
    assert.equal(result.byRef.size, 2); // Psalm 27:10 + Isaiah 49:15-16
  });
});
