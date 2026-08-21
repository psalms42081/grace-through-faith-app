/**
 * verse-map-helpers.ts
 *
 * Translation-safe helpers for the verse-map endpoints. These are pure,
 * resolver-injectable functions so they can be unit-tested with mocked
 * canonical text (no DB, no network, no OpenAI, no copyrighted fixtures).
 *
 * Key guarantees:
 *  - The verse-map cache is isolated by content version + SDA lens version +
 *    normalized translation + verseId, so entries never leak across
 *    translations or content versions.
 *  - AI produces ONLY cross-reference candidates (reference + connection). The
 *    exact Scripture text is resolved server-side via the canonical resolver in
 *    the requested translation. AI-produced verse text is never used.
 *  - Any resolver/provider failure fails the whole request — no partial
 *    results, no fallback.
 */

import * as crypto from "crypto";
import { SDA_LENS_VERSION } from "../services/sda-lens";
import {
  ScriptureError,
  type resolveReference as ResolveReferenceFn,
  type ChapterCacheHooks,
} from "../services/scripture-service";
import { joinVerseText } from "./search";

/**
 * Verse-map content version. Bump to invalidate any cache entries created by an
 * older resolver/schema/prompt. Combined with SDA_LENS_VERSION + normalized
 * translation + verseId in the cache hash, this guarantees no cross-version or
 * cross-translation cache reuse. Also serves as the "explicit content version"
 * that separates hydrated searchCache entries from the abandoned legacy
 * translation-blind verse_map_cache generated content.
 */
export const VERSE_MAP_CONTENT_VERSION = "verse-map-canon-v2";

/**
 * Build the verse-map cache hash. Isolates entries by content version + SDA
 * lens version + normalized translation + verseId so there is never any
 * cross-version or cross-translation cache reuse. Exported for testing.
 */
export function buildVerseMapCacheHash(translation: string, verseId: string): string {
  const hashInput = [
    VERSE_MAP_CONTENT_VERSION,
    SDA_LENS_VERSION,
    translation,
    verseId,
  ].join("::");
  return crypto.createHash("sha256").update(hashInput).digest("hex");
}

/** An AI-produced cross-reference candidate — reference + connection only. */
export interface VerseMapCandidateInput {
  reference: string;
  connection: string;
}

/** Injectable resolver signature (matches resolveReference). */
type ReferenceResolver = typeof ResolveReferenceFn;

/**
 * The canonical source of a verse-map request: the resolved first-verse id,
 * exact Scripture text, and translation metadata. Produced ONLY from the
 * canonical resolver in the requested translation — client-supplied text and
 * (implicitly) client verse identity are never trusted here.
 */
export interface VerseMapSource {
  verseId: string;
  text: string;
  translation: string;
  translationName: string;
}

/**
 * Resolve the SOURCE reference through the canonical resolver in the requested
 * translation and verify the client-supplied verseId EXACTLY matches the
 * canonical first-verse id.
 *
 * This is deliberately an extractable helper so tests can prove:
 *  - Source resolution happens (and therefore any resolver/provider/entitlement
 *    failure surfaces) BEFORE any generated-cache reuse in the route.
 *  - A client verseId that does not match the canonical first-verse id is
 *    rejected (throws ScriptureError) — preventing cache poisoning where a
 *    caller pairs one verse's id with another verse's reference.
 *  - Client-supplied verse text is never consulted; only resolver output is
 *    used for text/metadata.
 *
 * Any resolver/provider failure propagates (ScriptureError) — no fallback.
 */
export async function resolveVerseMapSource(params: {
  reference: string;
  clientVerseId: string;
  translation: string;
  resolve: ReferenceResolver;
  cache?: ChapterCacheHooks;
}): Promise<VerseMapSource> {
  const reference = (params.reference || "").trim();
  const clientVerseId = (params.clientVerseId || "").trim();

  const resolved = await params.resolve({
    reference,
    translation: params.translation,
    cache: params.cache,
  });

  const text = joinVerseText(resolved.verses as Array<{ verse: number; text: string }>);
  if (!text) {
    throw new ScriptureError("VERSE_NOT_FOUND", `No canonical text found for ${reference}`, 404);
  }

  const canonicalVerses = resolved.verses as Array<{ id?: unknown }>;
  const canonicalVerseId =
    canonicalVerses.length > 0 && typeof canonicalVerses[0]?.id === "string"
      ? (canonicalVerses[0].id as string)
      : "";

  if (!canonicalVerseId) {
    throw new ScriptureError(
      "VERSE_NOT_FOUND",
      `No canonical verse id resolved for ${reference}`,
      404,
    );
  }

  // Reject any mismatch between the client-supplied verseId and the canonical
  // first-verse id. This prevents cache poisoning: the generated cache is keyed
  // by (translation, verseId), so a caller must not be able to pair one verse's
  // id with a different verse's reference/text.
  if (clientVerseId !== canonicalVerseId) {
    throw new ScriptureError(
      "INVALID_REFERENCE",
      `verseId ${clientVerseId || "(empty)"} does not match canonical verse id ${canonicalVerseId}`,
      400,
    );
  }

  return {
    verseId: canonicalVerseId,
    text,
    translation: resolved.meta.translation,
    translationName: resolved.meta.translationName,
  };
}

/**
 * A hydrated cross-reference: the AI-selected reference + connection note, with
 * the EXACT canonical Scripture text resolved server-side in the requested
 * translation, plus source/provider metadata.
 */
export interface HydratedCrossReference {
  reference: string;
  connection: string;
  text: string;
  bookId: number;
  chapter: number;
  verseStart: number;
  verseEnd: number | null;
  translation: string;
  translationName: string;
  source: string;
  provider: string;
  providerEditionId?: string;
}

/**
 * Resolve AI cross-reference candidates to EXACT canonical Scripture in the
 * requested translation. AI-produced text is NEVER used. Any resolver/provider
 * failure propagates (no partial results, no fallback). De-duplicates by
 * reference, preserving order of first appearance.
 */
export async function hydrateCrossReferences(
  candidates: VerseMapCandidateInput[],
  translation: string,
  resolve: ReferenceResolver,
  cache?: ChapterCacheHooks,
): Promise<HydratedCrossReference[]> {
  const hydrated: HydratedCrossReference[] = [];
  const seenRefs = new Set<string>();

  for (const candidate of candidates) {
    const ref = (candidate?.reference || "").trim();
    if (!ref || seenRefs.has(ref)) continue;
    seenRefs.add(ref);

    const resolved = await resolve({ reference: ref, translation, cache });

    const text = joinVerseText(resolved.verses as Array<{ verse: number; text: string }>);
    if (!text) {
      throw new ScriptureError("VERSE_NOT_FOUND", `No canonical text found for ${ref}`, 404);
    }

    const parsedVerses = (resolved.reference.verses || []).slice().sort((a, b) => a - b);
    const verseStart = parsedVerses.length > 0 ? parsedVerses[0] : resolved.chapter;
    const verseEnd = parsedVerses.length > 1 ? parsedVerses[parsedVerses.length - 1] : null;

    hydrated.push({
      reference: ref,
      connection: typeof candidate.connection === "string" ? candidate.connection : "",
      text,
      bookId: resolved.book.id,
      chapter: resolved.chapter,
      verseStart,
      verseEnd,
      translation: resolved.meta.translation,
      translationName: resolved.meta.translationName,
      source: resolved.meta.source,
      provider: resolved.meta.provider,
      ...(resolved.meta.providerEditionId
        ? { providerEditionId: resolved.meta.providerEditionId }
        : {}),
    });
  }

  return hydrated;
}
