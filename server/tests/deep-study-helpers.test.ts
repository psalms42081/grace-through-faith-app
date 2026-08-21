/**
 * deep-study-helpers.test.ts
 *
 * Pure unit tests for the deep-study translation-safe helpers.
 * No DB, no real network, no real AI/Scripture provider — the resolver is
 * mocked. No copyrighted verse fixtures are used (placeholder text only).
 * Run with: npx tsx server/tests/deep-study-helpers.test.ts
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

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
  type ReferenceResolver,
} from "../services/deep-study-helpers";
import { SDA_LENS_VERSION } from "../services/sda-lens";
import { ScriptureError } from "../services/scripture-service";

// ─── Mock resolver ──────────────────────────────────────────────────────────

/**
 * Build a mocked resolveReference. It records the translation it was called
 * with and returns placeholder (non-copyrighted) verse text tagged with that
 * translation so tests can prove translation isolation and hydration.
 */
function makeResolver(opts?: {
  failOn?: string;
  emptyOn?: string;
}): { resolver: ReferenceResolver; calls: Array<{ reference: string; translation: string | undefined }> } {
  const calls: Array<{ reference: string; translation: string | undefined }> = [];
  const resolver: ReferenceResolver = async ({ reference, translation }) => {
    calls.push({ reference, translation });
    if (opts?.failOn && reference === opts.failOn) {
      throw new ScriptureError("PROVIDER_ERROR", `provider down for ${reference}`, 502);
    }
    const verses =
      opts?.emptyOn && reference === opts.emptyOn
        ? []
        : [{ verse: 1, text: `PLACEHOLDER TEXT for ${reference} in ${translation}` }];
    return {
      book: {
        id: 1,
        name: "MockBook",
        abbreviation: "MB",
        testament: "NT",
        chapterCount: 1,
        orderIndex: 1,
      },
      chapter: 1,
      verses,
      cached: false,
      meta: {
        translation: String(translation),
        translationName: `${translation} Name`,
        source: "db",
        provider: "local",
      },
      reference: { book: "MockBook", chapter: 1, verses: [1], wholeChapter: false },
    } as any;
  };
  return { resolver, calls };
}

// ─── Cache-key isolation ────────────────────────────────────────────────────

describe("cache keys: translation isolation + SDA lens version", () => {
  it("passage-sections key differs by translation and includes lens version", () => {
    const kjv = buildPassageSectionsCacheKey("KJV", 1, 2);
    const niv = buildPassageSectionsCacheKey("NIV", 1, 2);
    assert.notEqual(kjv, niv);
    assert.ok(kjv.includes(SDA_LENS_VERSION));
    assert.ok(kjv.includes("KJV"));
    assert.ok(niv.includes("NIV"));
  });

  it("normalizes translation casing so kjv and KJV share a key", () => {
    assert.equal(
      buildPassageSectionsCacheKey("kjv", 1, 2),
      buildPassageSectionsCacheKey("KJV", 1, 2)
    );
  });

  it("topic-reflection key isolates by translation", () => {
    assert.notEqual(
      buildTopicReflectionCacheKey("KJV", "grief", "2024-01-01"),
      buildTopicReflectionCacheKey("NLT", "grief", "2024-01-01")
    );
  });

  it("explain key isolates by translation and versioned by lens", () => {
    const a = buildExplainCacheKey("KJV", "John", 3, 16);
    const b = buildExplainCacheKey("NKJV", "John", 3, 16);
    assert.notEqual(a, b);
    assert.ok(a.includes(SDA_LENS_VERSION));
  });

  it("cross-ref key isolates by translation and versioned by lens", () => {
    const a = buildCrossRefCacheKey("KJV", "John", 3, 16);
    const b = buildCrossRefCacheKey("NIV", "John", 3, 16);
    assert.notEqual(a, b);
    assert.ok(a.includes(SDA_LENS_VERSION));
    assert.ok(a.includes("KJV"));
  });
});

// ─── Hydration version guard ────────────────────────────────────────────────

describe("hydration version guard", () => {
  it("accepts only current hydration marker", () => {
    assert.equal(isCurrentHydrationVersion({ hydrationVersion: HYDRATION_VERSION }), true);
    assert.equal(isCurrentHydrationVersion({ hydrationVersion: "old-shape" }), false);
    assert.equal(isCurrentHydrationVersion({ crossReferences: [] }), false);
    assert.equal(isCurrentHydrationVersion(null), false);
    assert.equal(isCurrentHydrationVersion(undefined), false);
  });
});

// ─── extractRawCrossReferences ──────────────────────────────────────────────

describe("extractRawCrossReferences", () => {
  it("reads crossReferences array from object payload", () => {
    const list = extractRawCrossReferences({ crossReferences: [{ ref: "John 3:16" }] });
    assert.equal(list.length, 1);
  });
  it("accepts a bare array", () => {
    assert.equal(extractRawCrossReferences([{ ref: "John 3:16" }]).length, 1);
  });
  it("returns empty for malformed payload", () => {
    assert.deepEqual(extractRawCrossReferences({ nope: true }), []);
    assert.deepEqual(extractRawCrossReferences(null), []);
  });
});

// ─── joinResolvedVerseText ──────────────────────────────────────────────────

describe("joinResolvedVerseText", () => {
  it("joins trimmed verse texts, skipping empties", () => {
    const out = joinResolvedVerseText([{ text: " a " }, { text: "b" }, { text: "" }, {}]);
    assert.equal(out, "a b");
  });
});

// ─── Cross-reference hydration ──────────────────────────────────────────────

describe("hydrateCrossReferences", () => {
  it("resolves exact text through the resolver, discarding AI-supplied text", async () => {
    const { resolver } = makeResolver();
    const raw = [
      { ref: "John 3:16", text: "AI FABRICATED WORDING", connection: "loves the world" },
    ];
    const out = await hydrateCrossReferences(raw, "KJV", resolver);
    assert.equal(out.length, 1);
    assert.equal(out[0].ref, "John 3:16");
    // Text comes from the resolver, NOT the AI-supplied field.
    assert.ok(out[0].text.startsWith("PLACEHOLDER TEXT for John 3:16"));
    assert.ok(!out[0].text.includes("FABRICATED"));
    assert.equal(out[0].connection, "loves the world");
    assert.equal(out[0].translation, "KJV");
    assert.equal(out[0].source, "db");
  });

  it("passes the requested translation to the resolver (translation isolation)", async () => {
    const { resolver, calls } = makeResolver();
    const nlt = await hydrateCrossReferences([{ ref: "Romans 8:28" }], "NLT", resolver);
    assert.equal(calls[0].translation, "NLT");
    assert.equal(nlt[0].translation, "NLT");
    assert.ok(nlt[0].text.includes("NLT"));
  });

  it("throws (no partial results) when the resolver fails for any reference", async () => {
    const { resolver } = makeResolver({ failOn: "Acts 2:38" });
    const raw = [{ ref: "John 3:16" }, { ref: "Acts 2:38" }, { ref: "Romans 8:28" }];
    await assert.rejects(
      () => hydrateCrossReferences(raw, "KJV", resolver),
      (err: any) => err instanceof ScriptureError && err.code === "PROVIDER_ERROR"
    );
  });

  it("throws on an unparseable reference before any partial output", async () => {
    const { resolver, calls } = makeResolver();
    await assert.rejects(
      () => hydrateCrossReferences([{ ref: "not a reference !!" }], "KJV", resolver),
      (err: any) => err instanceof ScriptureError && err.code === "INVALID_REFERENCE"
    );
    // Resolver should never be called for an invalid reference.
    assert.equal(calls.length, 0);
  });

  it("throws on a missing reference string", async () => {
    const { resolver } = makeResolver();
    await assert.rejects(
      () => hydrateCrossReferences([{ connection: "no ref here" } as any], "KJV", resolver),
      (err: any) => err instanceof ScriptureError && err.code === "INVALID_REFERENCE"
    );
  });

  it("throws when resolver returns no verse text", async () => {
    const { resolver } = makeResolver({ emptyOn: "John 3:16" });
    await assert.rejects(
      () => hydrateCrossReferences([{ ref: "John 3:16" }], "KJV", resolver),
      (err: any) => err instanceof ScriptureError && err.code === "VERSE_NOT_FOUND"
    );
  });
});

console.log("\n✅ Deep-study helper unit tests complete\n");
