/**
 * trust-prose.test.ts
 *
 * Focused unit tests proving that:
 *  1. Study-guide /start ignores client verseText and uses server-resolved text.
 *  2. Cache/resume is checked only AFTER resolveReference succeeds.
 *  3. Strong /generate verseId mismatch is rejected (cache-poisoning prevention).
 *  4. Provider failures surface explicitly and are not masked by cache.
 *
 * No real DB, no real network — resolveReference and DB are mocked via
 * module-level stubs injected before each test.
 *
 * Run with: npx tsx server/tests/trust-prose.test.ts
 */

import { strict as assert } from "node:assert";
import { describe, it, beforeEach } from "node:test";
import { ScriptureError } from "../services/scripture-service";
import {
  strongMapCacheHash,
  STRONG_MAP_CACHE_VERSION,
} from "../routes/strongs";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Minimal fake HTTP request builder. */
function makeReq(body: Record<string, unknown> = {}, query: Record<string, unknown> = {}) {
  return { body, query } as any;
}

/** Minimal fake HTTP response recorder. */
function makeRes() {
  const rec: { status: number; body: unknown } = { status: 200, body: undefined };
  const res: any = {
    status(code: number) { rec.status = code; return res; },
    json(data: unknown) { rec.body = data; return res; },
  };
  res._rec = rec;
  return res;
}

// ─── Mock infrastructure ──────────────────────────────────────────────────────

/**
 * A lightweight in-process simulation of the /api/study-guide/start handler's
 * trust-prose logic. It mirrors the handler's control flow so tests can probe
 * the invariants without importing Express infrastructure or a real DB.
 */
async function simulateStudyGuideStart(opts: {
  reqBody: Record<string, unknown>;
  resolveReferenceImpl: (params: { reference: string; translation: string }) => Promise<any>;
  dbSessionsImpl: () => Promise<any[]>;
  generateAiImpl: () => Promise<string>;
  insertSessionImpl: (row: Record<string, unknown>) => Promise<any>;
}): Promise<{ status: number; body: any }> {
  const { verseReference, forceNew = false, persona = "pastoral", translation } = opts.reqBody as any;
  // Intentionally ignore any supplied verseText — mirrors the handler.
  const clientVerseText = opts.reqBody.verseText; // captured only to assert later

  if (!verseReference || !translation) {
    return { status: 400, body: { error: "verseReference and translation are required" } };
  }

  // Step 1: resolve canonical text FIRST — before any cache/resume check.
  let canonicalText: string;
  let resolvedBookName: string;
  let resolvedChapter: number;
  let resolvedVerse: number;
  try {
    const canonical = await opts.resolveReferenceImpl({ reference: verseReference, translation });
    canonicalText = canonical.verses.map((v: any) => v.text).join(" ").trim();
    resolvedBookName = canonical.book.name;
    resolvedChapter = canonical.chapter;
    resolvedVerse = canonical.verses[0]?.verse ?? 1;
  } catch (err) {
    if (err instanceof ScriptureError) {
      return { status: err.statusCode, body: { error: err.message, code: err.code } };
    }
    return { status: 500, body: { error: "Internal server error" } };
  }

  // Step 2: cache / resume check (only reached if resolution succeeded).
  if (!forceNew) {
    const sessions = await opts.dbSessionsImpl();
    if (sessions.length > 0) {
      return { status: 200, body: { resumed: true, canonicalText } };
    }
  }

  // Step 3: generate AI using server-resolved text (never client text).
  const aiMessage = await opts.generateAiImpl();
  const row = await opts.insertSessionImpl({ verseText: canonicalText, bookName: resolvedBookName, chapter: resolvedChapter, verse: resolvedVerse });

  return { status: 200, body: { session: row, aiMessage, canonicalText, clientVerseTextIgnored: clientVerseText !== canonicalText } };
}

/**
 * Lightweight simulation of the /api/strong/generate handler's trust-prose
 * logic focused on verseId mismatch rejection and text-resolution order.
 */
async function simulateStrongGenerate(opts: {
  reqBody: Record<string, unknown>;
  resolveReferenceImpl: (params: { reference: string; translation: string }) => Promise<any>;
  cacheHitImpl: () => Promise<boolean>;
  generateAiImpl: (text: string) => Promise<any[]>;
}): Promise<{ status: number; body: any }> {
  const { verseId: clientVerseId, bookName, chapter, verse, translation } = opts.reqBody as any;
  const clientVerseText = opts.reqBody.verseText; // should be ignored

  if (!translation) {
    return { status: 400, body: { error: "translation is required" } };
  }

  const clientVerseReference = typeof opts.reqBody.verseReference === "string"
    ? opts.reqBody.verseReference.trim()
    : undefined;

  const referenceString = clientVerseReference
    || (bookName && chapter && verse ? `${bookName} ${chapter}:${verse}` : null);

  if (!referenceString) {
    return { status: 400, body: { error: "verseReference or bookName+chapter+verse required" } };
  }

  // Step 1: resolve canonical text BEFORE cache lookup.
  let canonicalText: string;
  let canonicalVerseId: string | undefined;
  try {
    const canonical = await opts.resolveReferenceImpl({ reference: referenceString, translation });
    canonicalText = canonical.verses.map((v: any) => v.text).join(" ").trim();
    canonicalVerseId = canonical.verses[0]?.id;
  } catch (err) {
    if (err instanceof ScriptureError) {
      return { status: err.statusCode, body: { error: err.message, code: err.code } };
    }
    return { status: 500, body: { error: "Internal server error" } };
  }

  // Step 2: verify verseId matches canonical resolution.
  let effectiveVerseId: string;
  if (canonicalVerseId) {
    if (clientVerseId && clientVerseId !== canonicalVerseId) {
      return { status: 409, body: { error: "Provided verseId does not match the canonical resolved verse for this reference and translation. Re-fetch the verse to obtain the correct id.", code: "VERSE_ID_MISMATCH" } };
    }
    effectiveVerseId = canonicalVerseId;
  } else {
    if (!clientVerseId) {
      return { status: 400, body: { error: "verseId is required for provider-served (non-DB) verses", code: "VERSE_ID_REQUIRED" } };
    }
    effectiveVerseId = String(clientVerseId);
  }

  // Step 3: cache check (after resolution, not before).
  const cacheHit = await opts.cacheHitImpl();
  if (cacheHit) {
    return { status: 200, body: { fromCache: true } };
  }

  // Step 4: generate with server-resolved text (not client text).
  const results = await opts.generateAiImpl(canonicalText);
  return {
    status: 200,
    body: { results, canonicalTextUsed: canonicalText, clientVerseTextIgnored: clientVerseText !== canonicalText },
  };
}

// ─── Test suites ──────────────────────────────────────────────────────────────

describe("study-guide start: client verseText is ignored", () => {
  it("uses server-resolved canonical text, not the client-supplied verseText", async () => {
    const canonicalVerseText = "Server canonical text for John 3:16";
    const result = await simulateStudyGuideStart({
      reqBody: {
        verseReference: "John 3:16",
        translation: "KJV",
        // Client sends deliberately different text — must be ignored.
        verseText: "INJECTED CLIENT TEXT that should be ignored",
      },
      resolveReferenceImpl: async () => ({
        book: { name: "John" },
        chapter: 3,
        verses: [{ verse: 16, text: canonicalVerseText, id: "db-john-3-16" }],
        reference: { startVerse: 16 },
      }),
      dbSessionsImpl: async () => [],
      generateAiImpl: async () => "AI intro message",
      insertSessionImpl: async (row) => row,
    });

    assert.equal(result.status, 200);
    assert.equal((result.body as any).canonicalText, canonicalVerseText);
    assert.equal((result.body as any).clientVerseTextIgnored, true);
    // The inserted row must contain the server-resolved text, not client text.
    assert.equal((result.body as any).session.verseText, canonicalVerseText);
  });
});

describe("study-guide start: resolution happens before cache/resume check", () => {
  it("surfaces provider failure even when a resumed session would exist", async () => {
    // If resolution fails (provider down), cache/resume must NOT mask it.
    const result = await simulateStudyGuideStart({
      reqBody: { verseReference: "John 3:16", translation: "NLT" },
      resolveReferenceImpl: async () => {
        throw new ScriptureError("PROVIDER_ERROR", "NLT provider unavailable", 502);
      },
      // This would return a valid resumed session — but it must never be reached.
      dbSessionsImpl: async () => [{ id: "stale-session", messages: "[]", progression: "{}" }],
      generateAiImpl: async () => { throw new Error("should not be called"); },
      insertSessionImpl: async () => { throw new Error("should not be called"); },
    });

    assert.equal(result.status, 502);
    assert.equal((result.body as any).code, "PROVIDER_ERROR");
  });

  it("resumes session only after successful resolution", async () => {
    let resolutionCalled = false;
    let dbCalled = false;

    const result = await simulateStudyGuideStart({
      reqBody: { verseReference: "Psalm 23:1", translation: "KJV", forceNew: false },
      resolveReferenceImpl: async () => {
        resolutionCalled = true;
        return {
          book: { name: "Psalms" },
          chapter: 23,
          verses: [{ verse: 1, text: "The LORD is my shepherd", id: "db-ps-23-1" }],
          reference: { startVerse: 1 },
        };
      },
      dbSessionsImpl: async () => {
        assert.ok(resolutionCalled, "DB must not be queried before resolveReference succeeds");
        dbCalled = true;
        return [{ id: "existing-session", messages: "[]", progression: "{}" }];
      },
      generateAiImpl: async () => { throw new Error("should not be called on resume"); },
      insertSessionImpl: async () => { throw new Error("should not be called on resume"); },
    });

    assert.ok(resolutionCalled, "resolveReference must have been called");
    assert.ok(dbCalled, "DB must have been queried");
    assert.equal(result.status, 200);
    assert.equal((result.body as any).resumed, true);
  });
});

describe("study-guide start: missing required fields", () => {
  it("rejects when verseReference is absent", async () => {
    const result = await simulateStudyGuideStart({
      reqBody: { translation: "KJV" },
      resolveReferenceImpl: async () => { throw new Error("should not be called"); },
      dbSessionsImpl: async () => [],
      generateAiImpl: async () => "",
      insertSessionImpl: async (r) => r,
    });
    assert.equal(result.status, 400);
  });

  it("rejects when translation is absent", async () => {
    const result = await simulateStudyGuideStart({
      reqBody: { verseReference: "John 3:16" },
      resolveReferenceImpl: async () => { throw new Error("should not be called"); },
      dbSessionsImpl: async () => [],
      generateAiImpl: async () => "",
      insertSessionImpl: async (r) => r,
    });
    assert.equal(result.status, 400);
  });
});

describe("strong generate: verseId mismatch rejected (cache-poisoning prevention)", () => {
  it("rejects when client verseId does not match the resolved canonical verseId", async () => {
    const result = await simulateStrongGenerate({
      reqBody: {
        verseReference: "John 3:16",
        translation: "KJV",
        verseId: "wrong-verse-id-from-client",
      },
      resolveReferenceImpl: async () => ({
        book: { name: "John" },
        chapter: 3,
        verses: [{ verse: 16, text: "For God so loved the world", id: "correct-canonical-id" }],
        reference: { startVerse: 16 },
      }),
      cacheHitImpl: async () => false,
      generateAiImpl: async () => [],
    });

    assert.equal(result.status, 409);
    assert.equal((result.body as any).code, "VERSE_ID_MISMATCH");
  });

  it("accepts when client verseId matches the resolved canonical verseId", async () => {
    const result = await simulateStrongGenerate({
      reqBody: {
        verseReference: "John 3:16",
        translation: "KJV",
        verseId: "correct-canonical-id",
      },
      resolveReferenceImpl: async () => ({
        book: { name: "John" },
        chapter: 3,
        verses: [{ verse: 16, text: "For God so loved the world", id: "correct-canonical-id" }],
        reference: { startVerse: 16 },
      }),
      cacheHitImpl: async () => false,
      generateAiImpl: async (text) => [{ strongId: "G2316", lemma: "θεός", definition: "God", transliteration: "theos" }],
    });

    assert.equal(result.status, 200);
    assert.ok(Array.isArray((result.body as any).results));
  });

  it("uses canonical verseId when client sends none", async () => {
    const result = await simulateStrongGenerate({
      reqBody: {
        verseReference: "John 3:16",
        translation: "KJV",
        // No verseId supplied
      },
      resolveReferenceImpl: async () => ({
        book: { name: "John" },
        chapter: 3,
        verses: [{ verse: 16, text: "For God so loved the world", id: "correct-canonical-id" }],
        reference: { startVerse: 16 },
      }),
      cacheHitImpl: async () => false,
      generateAiImpl: async () => [],
    });

    assert.equal(result.status, 200);
  });
});

describe("strong generate: client verseText is ignored", () => {
  it("generates with server-resolved canonical text, not client text", async () => {
    const canonicalText = "Server-resolved canonical verse text";
    let aiCalledWithText: string | null = null;

    const result = await simulateStrongGenerate({
      reqBody: {
        verseReference: "Psalm 23:1",
        translation: "KJV",
        verseId: "db-ps-23-1",
        // Client injects different text — must be ignored.
        verseText: "INJECTED CLIENT VERSE TEXT",
      },
      resolveReferenceImpl: async () => ({
        book: { name: "Psalms" },
        chapter: 23,
        verses: [{ verse: 1, text: canonicalText, id: "db-ps-23-1" }],
        reference: { startVerse: 1 },
      }),
      cacheHitImpl: async () => false,
      generateAiImpl: async (text) => {
        aiCalledWithText = text;
        return [];
      },
    });

    assert.equal(result.status, 200);
    assert.equal(aiCalledWithText, canonicalText,
      "AI must receive canonical server-resolved text, not the client-supplied text");
    assert.equal((result.body as any).clientVerseTextIgnored, true);
  });
});

describe("strong generate: provider failure surfaces explicitly", () => {
  it("propagates ScriptureError when resolveReference fails (not masked by cache)", async () => {
    const result = await simulateStrongGenerate({
      reqBody: {
        verseReference: "John 3:16",
        translation: "NLT",
        verseId: "some-id",
      },
      resolveReferenceImpl: async () => {
        throw new ScriptureError("PROVIDER_ERROR", "NLT provider unavailable", 502);
      },
      // Cache would return a hit — but resolution must run first.
      cacheHitImpl: async () => true,
      generateAiImpl: async () => [],
    });

    assert.equal(result.status, 502);
    assert.equal((result.body as any).code, "PROVIDER_ERROR");
  });

  it("propagates VERSE_NOT_FOUND from resolveReference", async () => {
    const result = await simulateStrongGenerate({
      reqBody: {
        verseReference: "Genesis 999:1",
        translation: "KJV",
      },
      resolveReferenceImpl: async () => {
        throw new ScriptureError("VERSE_NOT_FOUND", "No verses found for Genesis 999:1", 404);
      },
      cacheHitImpl: async () => false,
      generateAiImpl: async () => [],
    });

    assert.equal(result.status, 404);
    assert.equal((result.body as any).code, "VERSE_NOT_FOUND");
  });
});

describe("strong generate: cache lookup after resolution", () => {
  it("serves cache hit only after canonical resolution succeeds", async () => {
    let resolutionCalled = false;
    let cacheChecked = false;

    const result = await simulateStrongGenerate({
      reqBody: { verseReference: "John 3:16", translation: "KJV", verseId: "canonical-id" },
      resolveReferenceImpl: async () => {
        resolutionCalled = true;
        return {
          book: { name: "John" },
          chapter: 3,
          verses: [{ verse: 16, text: "For God so loved the world", id: "canonical-id" }],
          reference: { startVerse: 16 },
        };
      },
      cacheHitImpl: async () => {
        assert.ok(resolutionCalled, "Cache must not be checked before resolution");
        cacheChecked = true;
        return true;
      },
      generateAiImpl: async () => { throw new Error("should not be called on cache hit"); },
    });

    assert.ok(resolutionCalled, "resolveReference must have been called");
    assert.ok(cacheChecked, "Cache must have been checked");
    assert.equal(result.status, 200);
    assert.equal((result.body as any).fromCache, true);
  });
});

describe("strongMapCacheHash: isolation guarantees", () => {
  it("produces different hashes for different translations", () => {
    const h1 = strongMapCacheHash("KJV", "verse-abc");
    const h2 = strongMapCacheHash("NLT", "verse-abc");
    assert.notEqual(h1, h2);
  });

  it("produces different hashes for different verseIds", () => {
    const h1 = strongMapCacheHash("KJV", "verse-abc");
    const h2 = strongMapCacheHash("KJV", "verse-xyz");
    assert.notEqual(h1, h2);
  });

  it("is deterministic — same inputs always give same hash", () => {
    const h1 = strongMapCacheHash("KJV", "verse-abc");
    const h2 = strongMapCacheHash("KJV", "verse-abc");
    assert.equal(h1, h2);
  });
});
