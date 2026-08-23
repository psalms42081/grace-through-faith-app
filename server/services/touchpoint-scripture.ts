/**
 * touchpoint-scripture.ts
 *
 * Canonical Scripture hydration for Touchpoints / Signposts.
 *
 * Every verse reference in a Touchpoint topic (or the daily signpost) is
 * resolved to its EXACT canonical text via `resolveReference` from the
 * scripture-service. There is NO embedded/prose/paraphrased fallback: if any
 * reference, provider, translation, or entitlement resolution fails, the
 * failure propagates as a `ScriptureError` and the caller must fail the whole
 * request. Partial or paraphrased content must never be returned.
 *
 * AI never generates Scripture wording. This module produces the canonical
 * set of references + text that the AI selects from, and re-attaches canonical
 * text/metadata to whatever reference the AI picks.
 */

import {
  resolveReference as defaultResolveReference,
  ScriptureError,
  type ChapterCacheHooks,
  type TranslationSource,
  type ResolvedScripture,
  type ParsedReference,
} from "./scripture-service";

/**
 * Resolver signature matching `resolveReference` from scripture-service.
 * Injectable so tests can supply mocked canonical text without any real
 * provider network or copyrighted fixtures.
 */
export type ReferenceResolver = (params: {
  reference: string;
  translation: string | undefined;
  cache?: ChapterCacheHooks;
}) => Promise<ResolvedScripture & { reference: ParsedReference }>;

/** A single hydrated verse — exact canonical text, no fallback. */
export interface HydratedVerse {
  ref: string;
  text: string;
  translation: string;
  translationName: string;
  source: TranslationSource;
  provider: string;
  providerEditionId?: string;
  resolved: true;
}

/** Top-level translation metadata attached to hydrated responses. */
export interface TranslationMetaBlock {
  translation: string;
  translationName: string;
  source: TranslationSource;
  provider: string;
  providerEditionId?: string;
  scriptureResolution: "resolved";
}

interface RefBearingVerse {
  ref: string;
}

interface RefBearingQuestion {
  id?: string;
  question: string;
  verses: RefBearingVerse[];
  commentary: string;
}

/**
 * Join the selected verses of a resolved reference into a single canonical
 * text string. Verse objects carry a numeric `verse` and a `text` field.
 */
function joinVerseText(verses: Array<{ verse: number; text: string }>): string {
  return verses
    .slice()
    .sort((a, b) => a.verse - b.verse)
    .map((v) => (typeof v.text === "string" ? v.text.trim() : ""))
    .filter((t) => t.length > 0)
    .join(" ")
    .trim();
}

/**
 * Resolve a single reference to a HydratedVerse with exact canonical text.
 * Throws ScriptureError on any failure — never returns fallback text.
 */
export async function hydrateReference(
  ref: string,
  translation: string | undefined,
  cache?: ChapterCacheHooks,
  resolveReference: ReferenceResolver = defaultResolveReference
): Promise<HydratedVerse> {
  const resolved = await resolveReference({ reference: ref, translation, cache });

  const text = joinVerseText(resolved.verses as Array<{ verse: number; text: string }>);
  if (!text) {
    throw new ScriptureError(
      "VERSE_NOT_FOUND",
      `No canonical text found for ${ref}`,
      404
    );
  }

  return {
    ref,
    text,
    translation: resolved.meta.translation,
    translationName: resolved.meta.translationName,
    source: resolved.meta.source,
    provider: resolved.meta.provider,
    ...(resolved.meta.providerEditionId
      ? { providerEditionId: resolved.meta.providerEditionId }
      : {}),
    resolved: true,
  };
}

/**
 * Resolve a distinct set of references, all in the same translation.
 * Preserves order of first appearance and de-duplicates by ref string.
 * Any single failure aborts the whole batch (no partial result).
 */
export async function hydrateReferences(
  refs: string[],
  translation: string | undefined,
  cache?: ChapterCacheHooks,
  resolveReference: ReferenceResolver = defaultResolveReference
): Promise<HydratedVerse[]> {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const r of refs) {
    const key = r.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ordered.push(key);
  }

  const out: HydratedVerse[] = [];
  for (const ref of ordered) {
    // Sequential so a failure fails fast and never yields partial content.
    out.push(await hydrateReference(ref, translation, cache, resolveReference));
  }
  return out;
}

/**
 * Derive the top-level translation metadata block from a set of hydrated
 * verses. All verses are resolved in the same requested translation, so the
 * first hydrated verse defines the canonical translation identity.
 */
export function deriveTranslationMeta(
  hydrated: HydratedVerse[]
): TranslationMetaBlock | null {
  if (hydrated.length === 0) return null;
  const first = hydrated[0];
  return {
    translation: first.translation,
    translationName: first.translationName,
    source: first.source,
    provider: first.provider,
    ...(first.providerEditionId
      ? { providerEditionId: first.providerEditionId }
      : {}),
    scriptureResolution: "resolved",
  };
}

/**
 * Hydrate every question's verses for a set of questions, returning both the
 * per-question hydrated verses and a flat lookup keyed by ref. Fails the whole
 * operation on any resolution error.
 */
export interface HydratedQuestion {
  id?: string;
  question: string;
  commentary: string;
  verses: HydratedVerse[];
}

export interface HydratedQuestionsResult {
  questions: HydratedQuestion[];
  /** All hydrated verses de-duplicated by ref (the canonical supplied set). */
  byRef: Map<string, HydratedVerse>;
  translationMeta: TranslationMetaBlock;
}

export async function hydrateQuestions(
  questions: RefBearingQuestion[],
  translation: string | undefined,
  cache?: ChapterCacheHooks,
  resolveReference: ReferenceResolver = defaultResolveReference
): Promise<HydratedQuestionsResult> {
  // Resolve the full distinct ref set first so entitlement/provider/translation
  // failures surface before we assemble any response.
  const allRefs = questions.flatMap((q) => q.verses.map((v) => v.ref));
  const hydrated = await hydrateReferences(allRefs, translation, cache, resolveReference);

  const byRef = new Map<string, HydratedVerse>();
  for (const h of hydrated) byRef.set(h.ref, h);

  const translationMeta = deriveTranslationMeta(hydrated);
  if (!translationMeta) {
    throw new ScriptureError(
      "VERSE_NOT_FOUND",
      "No verses to hydrate for topic",
      404
    );
  }

  const hydratedQuestions: HydratedQuestion[] = questions.map((q) => ({
    ...(q.id ? { id: q.id } : {}),
    question: q.question,
    commentary: q.commentary,
    verses: q.verses.map((v) => {
      const h = byRef.get(v.ref.trim());
      if (!h) {
        // Should never happen: every ref was in the resolved batch.
        throw new ScriptureError(
          "VERSE_NOT_FOUND",
          `Missing hydrated verse for ${v.ref}`,
          500
        );
      }
      return h;
    }),
  }));

  return { questions: hydratedQuestions, byRef, translationMeta };
}

/**
 * Given the canonical supplied set and a ref selected by the AI, return the
 * hydrated verse (exact canonical text + metadata). If the AI selected a ref
 * NOT in the supplied set, throw — AI must never introduce verse text.
 */
export function resolveGeneratedSelection(
  selectedRef: string,
  byRef: Map<string, HydratedVerse>
): HydratedVerse {
  const key = (selectedRef ?? "").trim();
  const hit = byRef.get(key);
  if (hit) return hit;

  // Tolerant match: normalize internal whitespace before rejecting.
  const normalized = key.replace(/\s+/g, " ");
  for (const [ref, verse] of byRef) {
    if (ref.replace(/\s+/g, " ") === normalized) return verse;
  }

  throw new ScriptureError(
    "INVALID_REFERENCE",
    `AI selected a reference not in the supplied canonical set: ${selectedRef}`,
    502
  );
}

/**
 * Build the exact reference + text list handed to the AI for understanding.
 * The AI is instructed to select ONLY from these reference strings and must
 * never emit verse wording of its own.
 */
export function buildSuppliedScriptureBlock(hydrated: HydratedVerse[]): string {
  return hydrated
    .map((h) => `${h.ref}: ${h.text}`)
    .join("\n");
}

/** The list of valid reference strings the AI may select from. */
export function suppliedReferenceStrings(hydrated: HydratedVerse[]): string[] {
  return hydrated.map((h) => h.ref);
}
