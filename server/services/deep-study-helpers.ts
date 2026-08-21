/**
 * deep-study-helpers.ts
 *
 * Pure, translation-safe helpers for the deep-study AI routes.
 *
 * These functions contain the non-IO logic that the routes rely on so it can be
 * unit-tested without a DB or a real AI/Scripture provider:
 *   - translation-isolated cache keys (versioned by the SDA lens)
 *   - cross-reference hydration that resolves EXACT verse text through the
 *     canonical Scripture resolver, never trusting AI-generated verse wording.
 *
 * The AI is only ever allowed to supply a reference string + a connection
 * explanation. The authoritative verse text is always looked up canonically in
 * the requested translation. Any resolver/provider failure is surfaced
 * explicitly — there is no partial or fallback content.
 */

import { SDA_LENS_VERSION } from "./sda-lens";
import {
  normalizeTranslationParam,
  parseReference,
  ScriptureError,
  type ResolvedScripture,
  type ParsedReference,
} from "./scripture-service";

// ─── Cache keys (translation-isolated, SDA-lens-versioned) ──────────────────

/**
 * Passage sections cache key. Isolated by SDA lens version + normalized
 * translation + book/chapter so a different translation can never read another
 * translation's cached, generated sections.
 */
export function buildPassageSectionsCacheKey(
  translation: string | undefined,
  bookId: number,
  chapter: number
): string {
  const { abbreviation } = normalizeTranslationParam(translation);
  return `passage-sections-${SDA_LENS_VERSION}-${abbreviation}-${bookId}-${chapter}`;
}

/**
 * Topic reflection cache key. Isolated by SDA lens version + normalized
 * translation + topic + day.
 */
export function buildTopicReflectionCacheKey(
  translation: string | undefined,
  topicId: string,
  day: string
): string {
  const { abbreviation } = normalizeTranslationParam(translation);
  return `topic-reflection-${SDA_LENS_VERSION}-${abbreviation}-${topicId}-${day}`;
}

/**
 * Verse explanation cache key. Isolated by SDA lens version + normalized
 * translation + canonical reference.
 */
export function buildExplainCacheKey(
  translation: string | undefined,
  bookName: string,
  chapter: string | number,
  verse: string | number
): string {
  const { abbreviation } = normalizeTranslationParam(translation);
  return `explain-${SDA_LENS_VERSION}-${abbreviation}-${bookName}-${chapter}-${verse}`;
}

/**
 * Cross-references cache key. Isolated by SDA lens version + normalized
 * translation + canonical reference.
 */
export function buildCrossRefCacheKey(
  translation: string | undefined,
  bookName: string,
  chapter: string | number,
  verse: string | number
): string {
  const { abbreviation } = normalizeTranslationParam(translation);
  return `crossref-${SDA_LENS_VERSION}-${abbreviation}-${bookName}-${chapter}-${verse}`;
}

/**
 * Marker embedded into cached cross-reference / hydrated payloads so a stale
 * cache entry written under an older shape (AI-supplied verse text, unversioned
 * key) is never returned. Only cache entries carrying the CURRENT marker are
 * considered "new version" and served directly.
 */
export const HYDRATION_VERSION = `${SDA_LENS_VERSION}-hydrated-v1`;

export function isCurrentHydrationVersion(cached: unknown): boolean {
  return (
    !!cached &&
    typeof cached === "object" &&
    (cached as { hydrationVersion?: string }).hydrationVersion === HYDRATION_VERSION
  );
}

// ─── Cross-reference hydration ──────────────────────────────────────────────

/** What the AI is permitted to return per cross-reference: reference + why. */
export interface RawCrossReference {
  ref?: unknown;
  reference?: unknown;
  connection?: unknown;
}

/** A fully hydrated cross-reference with authoritative text + provenance. */
export interface HydratedCrossReference {
  ref: string;
  text: string;
  connection: string;
  translation: string;
  translationName: string;
  source: string;
  provider: string;
  providerEditionId?: string;
}

/** Signature of the canonical reference resolver (resolveReference). */
export type ReferenceResolver = (params: {
  reference: string;
  translation: string | undefined;
}) => Promise<ResolvedScripture & { reference: ParsedReference }>;

/** Join an array of resolved verse objects into a single canonical text block. */
export function joinResolvedVerseText(verses: Array<{ text?: unknown }>): string {
  return verses
    .map((v) => (typeof v.text === "string" ? v.text.trim() : ""))
    .filter(Boolean)
    .join(" ")
    .trim();
}

/** Normalize the AI-supplied reference field to a trimmed string, or null. */
function coerceRefString(raw: RawCrossReference): string | null {
  const candidate = raw.ref ?? raw.reference;
  if (typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Hydrate AI-supplied cross-references into authoritative results.
 *
 * For every raw entry the reference string is parsed/validated and resolved
 * through the canonical resolver in the requested translation. The AI-supplied
 * verse text (if any) is discarded — only resolver text is used. Any parse,
 * resolver, or provider failure throws (ScriptureError preserved) so the caller
 * can fail the whole request. There is NEVER a partial result.
 */
export async function hydrateCrossReferences(
  rawList: RawCrossReference[],
  translation: string | undefined,
  resolveReferenceFn: ReferenceResolver
): Promise<HydratedCrossReference[]> {
  const out: HydratedCrossReference[] = [];

  for (const raw of rawList) {
    const refString = coerceRefString(raw);
    if (!refString) {
      throw new ScriptureError(
        "INVALID_REFERENCE",
        "Cross-reference is missing a valid reference string",
        400
      );
    }

    // Validate/parse the reference shape before hitting the resolver.
    const parsed = parseReference(refString);
    if (!parsed) {
      throw new ScriptureError(
        "INVALID_REFERENCE",
        `Could not parse cross-reference: ${refString}`,
        400
      );
    }

    // Resolve the EXACT text in the requested translation. Any failure throws
    // and aborts the whole hydration — no partial/fallback content.
    const resolved = await resolveReferenceFn({
      reference: refString,
      translation,
    });

    const text = joinResolvedVerseText(resolved.verses as Array<{ text?: unknown }>);
    if (!text) {
      throw new ScriptureError(
        "VERSE_NOT_FOUND",
        `No verse text resolved for cross-reference: ${refString}`,
        404
      );
    }

    out.push({
      ref: refString,
      text,
      connection: typeof raw.connection === "string" ? raw.connection.trim() : "",
      translation: resolved.meta.translation,
      translationName: resolved.meta.translationName,
      source: resolved.meta.source,
      provider: resolved.meta.provider,
      ...(resolved.meta.providerEditionId
        ? { providerEditionId: resolved.meta.providerEditionId }
        : {}),
    });
  }

  return out;
}

/** Extract the raw cross-reference array from an AI JSON payload. */
export function extractRawCrossReferences(parsed: unknown): RawCrossReference[] {
  if (
    parsed &&
    typeof parsed === "object" &&
    Array.isArray((parsed as { crossReferences?: unknown }).crossReferences)
  ) {
    return (parsed as { crossReferences: RawCrossReference[] }).crossReferences;
  }
  if (Array.isArray(parsed)) return parsed as RawCrossReference[];
  return [];
}
