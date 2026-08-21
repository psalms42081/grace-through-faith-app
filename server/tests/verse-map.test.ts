/**
 * verse-map.test.ts
 *
 * Pure unit tests for translation-safe verse-map helpers.
 * No DB access, no real network, no OpenAI calls — the reference resolver is
 * mocked with invented (non-copyrighted) placeholder text so we can prove:
 *   - AI-produced text is never used; only resolver text survives.
 *   - The requested translation metadata is attached to every cross-reference.
 *   - Any resolver failure aborts the whole batch (no partial results).
 *   - The verse-map cache hash isolates by translation + lens/content version
 *     + verseId (no cross-translation / cross-verse / cross-version reuse).
 *
 * Run with: npx tsx server/tests/verse-map.test.ts
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  hydrateCrossReferences,
  buildVerseMapCacheHash,
  resolveVerseMapSource,
  VERSE_MAP_CONTENT_VERSION,
  type VerseMapCandidateInput,
} from "../routes/verse-map-helpers";
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
      verses: [{ id: `${abbr.toLowerCase()}-43-3-16`, verse: 16, text }],
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

const CANDIDATES: VerseMapCandidateInput[] = [
  { reference: "John 3:16", connection: "Both passages speak of redemptive love." },
];

describe("hydrateCrossReferences — canonical hydration + translation safety", () => {
  it("attaches EXACT resolver text and requested translation metadata", async () => {
    const resolver = makeMockResolver({ KJV: KJV_MOCK });
    const refs = await hydrateCrossReferences(CANDIDATES, "KJV", resolver);
    assert.equal(refs.length, 1);
    assert.equal(refs[0].text, KJV_MOCK);
    assert.equal(refs[0].translation, "KJV");
    assert.equal(refs[0].reference, "John 3:16");
    assert.equal(refs[0].connection, "Both passages speak of redemptive love.");
    assert.equal(refs[0].bookId, 43);
    assert.equal(refs[0].verseStart, 16);
  });

  it("uses NKJV text when NKJV is requested (no cross-translation leak)", async () => {
    const resolver = makeMockResolver({ KJV: KJV_MOCK, NKJV: NKJV_MOCK });
    const refs = await hydrateCrossReferences(CANDIDATES, "NKJV", resolver);
    assert.equal(refs[0].text, NKJV_MOCK);
    assert.equal(refs[0].translation, "NKJV");
    assert.notEqual(refs[0].text, KJV_MOCK);
  });

  it("never uses AI-supplied text (candidate carries no text field)", async () => {
    // Even if an AI response tried to sneak text via an untyped property, the
    // resolver output is the only source of `text`.
    const dirty = [{ ...CANDIDATES[0], text: "FAKE AI TEXT" } as any];
    const resolver = makeMockResolver({ KJV: KJV_MOCK });
    const refs = await hydrateCrossReferences(dirty, "KJV", resolver);
    assert.equal(refs[0].text, KJV_MOCK);
    assert.notEqual(refs[0].text, "FAKE AI TEXT");
  });

  it("de-duplicates by reference preserving order", async () => {
    const resolver = makeMockResolver({ KJV: KJV_MOCK });
    const refs = await hydrateCrossReferences(
      [CANDIDATES[0], { ...CANDIDATES[0] }, CANDIDATES[0]],
      "KJV",
      resolver,
    );
    assert.equal(refs.length, 1);
  });

  it("fails the whole batch on any resolver error (no partial results)", async () => {
    const resolver = makeMockResolver({ KJV: KJV_MOCK });
    await assert.rejects(
      () => hydrateCrossReferences(CANDIDATES, "NKJV", resolver),
      (err: any) => err instanceof ScriptureError,
    );
  });

  it("throws when resolver yields empty text (never silently drops)", async () => {
    const resolver = makeMockResolver({ KJV: "   " });
    await assert.rejects(
      () => hydrateCrossReferences(CANDIDATES, "KJV", resolver),
      (err: any) => err instanceof ScriptureError && err.code === "VERSE_NOT_FOUND",
    );
  });

  it("aborts the whole batch when a LATER candidate fails (no partial cache)", async () => {
    // First candidate resolves, second does not → whole call rejects, nothing
    // is returned, so nothing partial can ever be cached.
    const resolver = (async (params: { reference: string; translation?: string }) => {
      if (params.reference === "Genesis 1:1") {
        return {
          book: { id: 1, name: "Genesis", abbreviation: "Gn", testament: "OT", chapterCount: 50, orderIndex: 1 },
          chapter: 1,
          verses: [{ verse: 1, text: KJV_MOCK }],
          cached: false,
          reference: { book: "Genesis", chapter: 1, verses: [1], wholeChapter: false },
          meta: { translation: "KJV", translationName: "King James Version", source: "db" as const, provider: "local" },
        };
      }
      throw new ScriptureError("VERSE_NOT_FOUND", `bad ref ${params.reference}`, 404);
    }) as any;

    await assert.rejects(
      () =>
        hydrateCrossReferences(
          [
            { reference: "Genesis 1:1", connection: "ok" },
            { reference: "Nowhere 9:9", connection: "fails" },
          ],
          "KJV",
          resolver,
        ),
      (err: any) => err instanceof ScriptureError && err.code === "VERSE_NOT_FOUND",
    );
  });
});

describe("resolveVerseMapSource — canonical source precedes cache reuse", () => {
  it("returns canonical id/text/metadata for a matching client verseId", async () => {
    const resolver = makeMockResolver({ KJV: KJV_MOCK });
    const source = await resolveVerseMapSource({
      reference: "John 3:16",
      clientVerseId: "kjv-43-3-16",
      translation: "KJV",
      resolve: resolver,
    });
    assert.equal(source.verseId, "kjv-43-3-16");
    assert.equal(source.text, KJV_MOCK);
    assert.equal(source.translation, "KJV");
    assert.equal(source.translationName, "King James Version");
  });

  it("never uses client-supplied verse text (only resolver output)", async () => {
    const resolver = makeMockResolver({ KJV: KJV_MOCK });
    const source = await resolveVerseMapSource({
      // No text field is accepted by the helper at all; even the reference text
      // is resolved canonically. Prove the returned text is resolver output.
      reference: "John 3:16",
      clientVerseId: "kjv-43-3-16",
      translation: "KJV",
      resolve: resolver,
    });
    assert.equal(source.text, KJV_MOCK);
    assert.notEqual(source.text, "FAKE AI TEXT");
  });

  it("rejects a client verseId that does not match the canonical first-verse id", async () => {
    const resolver = makeMockResolver({ KJV: KJV_MOCK });
    await assert.rejects(
      () =>
        resolveVerseMapSource({
          reference: "John 3:16",
          clientVerseId: "kjv-1-1-1", // deliberately mismatched id → cache poisoning attempt
          translation: "KJV",
          resolve: resolver,
        }),
      (err: any) => err instanceof ScriptureError && err.code === "INVALID_REFERENCE",
    );
  });

  it("rejects an empty client verseId (cannot be paired with any cache key)", async () => {
    const resolver = makeMockResolver({ KJV: KJV_MOCK });
    await assert.rejects(
      () =>
        resolveVerseMapSource({
          reference: "John 3:16",
          clientVerseId: "",
          translation: "KJV",
          resolve: resolver,
        }),
      (err: any) => err instanceof ScriptureError && err.code === "INVALID_REFERENCE",
    );
  });

  it("propagates a provider/resolver failure so cache can never mask it", async () => {
    // The route resolves the source (this helper) BEFORE any generated-cache
    // lookup. A provider failure here therefore aborts the whole request; there
    // is no code path that could return a stale/cached/partial response.
    let resolverCalls = 0;
    const failingResolver = (async (_params: { reference: string; translation?: string }) => {
      resolverCalls += 1;
      throw new ScriptureError("PROVIDER_ERROR", "provider down", 502);
    }) as any;
    await assert.rejects(
      () =>
        resolveVerseMapSource({
          reference: "John 3:16",
          clientVerseId: "kjv-43-3-16",
          translation: "KJV",
          resolve: failingResolver,
        }),
      (err: any) => err instanceof ScriptureError && err.code === "PROVIDER_ERROR",
    );
    // The resolver was actually consulted — resolution is not skippable.
    assert.equal(resolverCalls, 1);
  });

  it("throws when the resolver yields no canonical text (never silent)", async () => {
    const resolver = makeMockResolver({ KJV: "   " });
    await assert.rejects(
      () =>
        resolveVerseMapSource({
          reference: "John 3:16",
          clientVerseId: "kjv-43-3-16",
          translation: "KJV",
          resolve: resolver,
        }),
      (err: any) => err instanceof ScriptureError && err.code === "VERSE_NOT_FOUND",
    );
  });

  it("is translation-isolated: NKJV request resolves NKJV id + text", async () => {
    const resolver = makeMockResolver({ KJV: KJV_MOCK, NKJV: NKJV_MOCK });
    const source = await resolveVerseMapSource({
      reference: "John 3:16",
      clientVerseId: "nkjv-43-3-16",
      translation: "NKJV",
      resolve: resolver,
    });
    assert.equal(source.verseId, "nkjv-43-3-16");
    assert.equal(source.text, NKJV_MOCK);
    assert.equal(source.translation, "NKJV");
    assert.notEqual(source.text, KJV_MOCK);
  });
});

describe("buildVerseMapCacheHash — cache isolation", () => {
  it("differs by translation", () => {
    const a = buildVerseMapCacheHash("KJV", "verse-123");
    const b = buildVerseMapCacheHash("NKJV", "verse-123");
    assert.notEqual(a, b);
  });

  it("differs by verseId", () => {
    const a = buildVerseMapCacheHash("KJV", "verse-123");
    const b = buildVerseMapCacheHash("KJV", "verse-456");
    assert.notEqual(a, b);
  });

  it("is stable for identical inputs", () => {
    assert.equal(
      buildVerseMapCacheHash("KJV", "verse-123"),
      buildVerseMapCacheHash("KJV", "verse-123"),
    );
  });

  it("uses the bumped content version so pre-reorder entries cannot survive", () => {
    // The content version was bumped when source resolution was moved ahead of
    // the cache lookup. Any hash computed under the previous version differs, so
    // stale cache rows from the old ordering can never be read.
    assert.equal(VERSE_MAP_CONTENT_VERSION, "verse-map-canon-v2");
    assert.notEqual(VERSE_MAP_CONTENT_VERSION, "verse-map-canon-v1");
  });

  it("incorporates the content version into the hash (version isolation)", () => {
    const crypto = require("node:crypto");
    const { SDA_LENS_VERSION } = require("../services/sda-lens");
    const currentHash = buildVerseMapCacheHash("KJV", "verse-123");
    const oldVersionHash = crypto
      .createHash("sha256")
      .update(["verse-map-canon-v1", SDA_LENS_VERSION, "KJV", "verse-123"].join("::"))
      .digest("hex");
    assert.notEqual(currentHash, oldVersionHash);
  });
});
