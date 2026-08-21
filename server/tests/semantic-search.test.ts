/**
 * semantic-search.test.ts
 *
 * Pure unit tests for translation-safe semantic search helpers.
 * No DB access, no real network, no OpenAI calls — the reference resolver is
 * mocked with invented (non-copyrighted) placeholder text so we can prove:
 *   - AI-produced text is never used; only resolver text survives.
 *   - The requested translation metadata is attached to every verse.
 *   - Any resolver failure aborts the whole batch (no partial results).
 *   - The cache hash isolates by translation + lens/content version.
 *
 * Run with: npx tsx server/tests/semantic-search.test.ts
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  resolveCandidatesToVerses,
  buildSemanticSearchCacheHash,
  joinVerseText,
  type SemanticSearchCandidateInput,
} from "../routes/search";
import { ScriptureError } from "../services/scripture-service";

// ─── Invented mock text (NO copyrighted scripture wording) ────────────────────

const KJV_MOCK = "[[KJV-MOCK]] alpha bravo charlie";
const NKJV_MOCK = "[[NKJV-MOCK]] delta echo foxtrot";

/** Build a fake resolveReference that returns invented text for the translation. */
function makeMockResolver(textByTranslation: Record<string, string>) {
  return (async (params: { reference: string; translation: string | undefined }) => {
    const abbr = (params.translation ?? "KJV").toUpperCase();
    const text = textByTranslation[abbr];
    if (!text) {
      throw new ScriptureError(
        "TRANSLATION_NOT_FOUND",
        `no mock text for ${abbr}`,
        404,
      );
    }
    return {
      book: {
        id: 43,
        name: "John",
        abbreviation: "Jn",
        testament: "NT",
        chapterCount: 21,
        orderIndex: 43,
      },
      chapter: 3,
      verses: [{ verse: 16, text }],
      cached: false,
      reference: { book: "John", chapter: 3, verses: [16], wholeChapter: false },
      meta: {
        translation: abbr,
        translationName: abbr === "NKJV" ? "New King James Version" : "King James Version",
        source: "db" as const,
        provider: "local",
      },
    };
  }) as any;
}

const CANDIDATES: SemanticSearchCandidateInput[] = [
  { reference: "John 3:16", bookId: 43, chapter: 3, verseStart: 16, verseEnd: null, relevance: "God's love" },
];

describe("joinVerseText", () => {
  it("orders by verse number and joins", () => {
    const joined = joinVerseText([
      { verse: 2, text: "second" },
      { verse: 1, text: "first" },
    ]);
    assert.equal(joined, "first second");
  });
});

describe("resolveCandidatesToVerses — translation safety", () => {
  it("attaches EXACT resolver text and requested translation metadata", async () => {
    const resolver = makeMockResolver({ KJV: KJV_MOCK });
    const verses = await resolveCandidatesToVerses(CANDIDATES, "KJV", resolver);
    assert.equal(verses.length, 1);
    assert.equal(verses[0].text, KJV_MOCK);
    assert.equal(verses[0].translation, "KJV");
    assert.equal(verses[0].reference, "John 3:16");
    assert.equal(verses[0].relevance, "God's love");
  });

  it("uses NKJV text when NKJV is requested (no cross-translation leak)", async () => {
    const resolver = makeMockResolver({ KJV: KJV_MOCK, NKJV: NKJV_MOCK });
    const verses = await resolveCandidatesToVerses(CANDIDATES, "NKJV", resolver);
    assert.equal(verses[0].text, NKJV_MOCK);
    assert.equal(verses[0].translation, "NKJV");
    assert.notEqual(verses[0].text, KJV_MOCK);
  });

  it("never uses AI-supplied text (candidate carries no text field)", async () => {
    // Even if an AI response tried to sneak text via an untyped property, the
    // resolver output is the only source of `text`.
    const dirty = [{ ...CANDIDATES[0], text: "FAKE AI TEXT" } as any];
    const resolver = makeMockResolver({ KJV: KJV_MOCK });
    const verses = await resolveCandidatesToVerses(dirty, "KJV", resolver);
    assert.equal(verses[0].text, KJV_MOCK);
    assert.notEqual(verses[0].text, "FAKE AI TEXT");
  });

  it("de-duplicates by reference preserving order", async () => {
    const resolver = makeMockResolver({ KJV: KJV_MOCK });
    const verses = await resolveCandidatesToVerses(
      [CANDIDATES[0], { ...CANDIDATES[0] }, CANDIDATES[0]],
      "KJV",
      resolver,
    );
    assert.equal(verses.length, 1);
  });

  it("fails the whole batch on any resolver error (no partial results)", async () => {
    // Requesting a translation the mock cannot resolve throws for every ref.
    const resolver = makeMockResolver({ KJV: KJV_MOCK });
    await assert.rejects(
      () => resolveCandidatesToVerses(CANDIDATES, "NKJV", resolver),
      (err: any) => err instanceof ScriptureError,
    );
  });

  it("throws when resolver yields empty text (never silently drops)", async () => {
    const resolver = makeMockResolver({ KJV: "   " });
    await assert.rejects(
      () => resolveCandidatesToVerses(CANDIDATES, "KJV", resolver),
      (err: any) => err instanceof ScriptureError && err.code === "VERSE_NOT_FOUND",
    );
  });
});

describe("buildSemanticSearchCacheHash — no cross-version/translation reuse", () => {
  it("differs by translation", () => {
    const a = buildSemanticSearchCacheHash("KJV", "peace");
    const b = buildSemanticSearchCacheHash("NKJV", "peace");
    assert.notEqual(a, b);
  });

  it("differs by normalized query", () => {
    const a = buildSemanticSearchCacheHash("KJV", "peace");
    const b = buildSemanticSearchCacheHash("KJV", "joy");
    assert.notEqual(a, b);
  });

  it("is stable for identical inputs", () => {
    assert.equal(
      buildSemanticSearchCacheHash("KJV", "peace"),
      buildSemanticSearchCacheHash("KJV", "peace"),
    );
  });
});
