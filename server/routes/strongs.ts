import { Router } from "express";
import { db } from "../db";
import { aiGenerationLimiter } from "../middleware/rate-limit";
import { getErrorStatusCode } from "../services/ai-semaphore";
import { strongEntries, verseStrongMaps, bibleVerses, searchCache } from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import * as crypto from "crypto";
import { generateStrongWordStudy } from "../services/ai-engine";
import {
  resolveReference,
  ScriptureError,
  parseReference,
} from "../services/scripture-service";

const router = Router();

// ─── STRONG-MAP CACHE VERSION ────────────────────────────────────────────────
// Bumping this value invalidates every previously cached Strong word-study
// mapping. Old `verseStrongMaps` rows predate translation-aware caching, so we
// treat the versioned `searchCache` entry as authoritative; stale legacy
// mappings can only be served for a canonical DB verse whose stored translation
// matches the request, and are never relabeled or reused across translations or
// provider verse IDs.
export const STRONG_MAP_CACHE_VERSION = "strong-map-canon-v3";

const STRONG_MAP_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function normalizeTranslation(value: unknown): string {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw ? raw.toUpperCase() : "";
}

/**
 * Deterministic cache identity for a Strong word-study mapping. Isolated by
 * cache version + normalized translation + verseId so no cross-version or
 * cross-translation reuse can occur, and provider/synthetic verse IDs get their
 * own distinct entry.
 */
export function strongMapCacheHash(translation: string, verseId: string): string {
  const hashInput = [STRONG_MAP_CACHE_VERSION, translation, verseId].join("::");
  return crypto.createHash("sha256").update(hashInput).digest("hex");
}

/**
 * A DB-backed verse ID is one that exists as a `bible_verse` row AND whose
 * stored translation matches the requested translation. Only such verses may
 * persist `verseStrongMaps` (its FK targets `bible_verse.id`) or serve legacy
 * mappings. Everything else (provider/licensed/synthetic IDs) is cache-only.
 */
export async function resolveDbVerseTranslation(
  verseId: string,
): Promise<string | null> {
  const [row] = await db
    .select({ translationId: bibleVerses.translationId })
    .from(bibleVerses)
    .where(eq(bibleVerses.id, verseId))
    .limit(1);
  return row ? row.translationId : null;
}

export function canPersistVerseStrongMaps(
  requestedTranslation: string,
  dbVerseTranslation: string | null,
): boolean {
  if (!dbVerseTranslation) return false;
  return normalizeTranslation(dbVerseTranslation) === normalizeTranslation(requestedTranslation);
}

/**
 * Build a canonical verseReference string from bookName + chapter + verse when
 * a direct `verseReference` is not supplied by the client.
 */
function buildVerseReference(bookName: unknown, chapter: unknown, verse: unknown): string | null {
  const b = typeof bookName === "string" ? bookName.trim() : "";
  const c = Number(chapter);
  const v = Number(verse);
  if (!b || !Number.isFinite(c) || !Number.isFinite(v) || c < 1 || v < 1) return null;
  return `${b} ${c}:${v}`;
}

router.get("/api/strong/search", async (req, res) => {
  try {
    const { q, language } = req.query;
    if (!q || String(q).trim().length < 2) {
      return res.json([]);
    }
    const searchTerm = `%${String(q).trim().toLowerCase()}%`;
    const conditions = [
      sql`(LOWER(${strongEntries.definition}) LIKE ${searchTerm} OR LOWER(${strongEntries.lemma}) LIKE ${searchTerm} OR LOWER(${strongEntries.transliteration}) LIKE ${searchTerm} OR LOWER(${strongEntries.kjvUsage}) LIKE ${searchTerm} OR LOWER(${strongEntries.id}) LIKE ${searchTerm})`,
    ];
    if (language && (language === "he" || language === "gr")) {
      conditions.push(eq(strongEntries.language, String(language)));
    }
    const results = await db
      .select()
      .from(strongEntries)
      .where(and(...conditions))
      .limit(50);
    return res.json(results);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/strong/:id", async (req, res) => {
  try {
    const [entry] = await db
      .select()
      .from(strongEntries)
      .where(eq(strongEntries.id, String(req.params.id)))
      .limit(1);
    if (!entry) return res.status(404).json({ error: "Strong's entry not found" });
    return res.json(entry);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.get("/api/strong/verse/:verseId", async (req, res) => {
  try {
    const verseId = String(req.params.verseId);
    const translation = normalizeTranslation(req.query.translation);
    if (!translation) {
      return res.status(400).json({ error: "translation is required" });
    }

    // 1) Cache is authoritative: a versioned translation+verseId entry wins and
    //    guarantees stale legacy mappings are invalidated by the new version.
    const cacheHash = strongMapCacheHash(translation, verseId);
    const cached = await db
      .select({ results: searchCache.results })
      .from(searchCache)
      .where(and(eq(searchCache.queryHash, cacheHash), sql`${searchCache.expiresAt} > NOW()`))
      .limit(1);

    if (cached.length > 0) {
      return res.json(cached[0].results ?? []);
    }

    // 2) Legacy fallback: only for a canonical DB verse whose stored translation
    //    matches the requested translation. Never relabel or reuse legacy rows
    //    across translations or provider verse IDs.
    const dbVerseTranslation = await resolveDbVerseTranslation(verseId);
    if (!canPersistVerseStrongMaps(translation, dbVerseTranslation)) {
      return res.json([]);
    }

    const maps = await db
      .select({
        map: verseStrongMaps,
        entry: strongEntries,
      })
      .from(verseStrongMaps)
      .leftJoin(strongEntries, eq(verseStrongMaps.strongId, strongEntries.id))
      .where(eq(verseStrongMaps.verseId, verseId))
      .orderBy(verseStrongMaps.wordPosition);

    const seen = new Set<string>();
    const unique = maps.filter((row) => {
      const key = `${row.map.strongId}-${row.map.wordPosition}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return res.json(unique);
  } catch (err) {
    console.error(err);
    return res.status(getErrorStatusCode(err)).json({ error: "Internal server error" });
  }
});

router.post("/api/strong/generate", aiGenerationLimiter, async (req, res) => {
  try {
    // Client-supplied verseText is IGNORED. We resolve canonical text
    // server-side to prevent cache-poisoning via injected text.
    const { verseId, bookName: clientBookName, chapter: clientChapter, verse: clientVerse } = req.body;
    const translation = normalizeTranslation(req.body.translation);
    if (!translation) {
      return res.status(400).json({ error: "translation is required" });
    }

    // ── 1. Build a reference string ───────────────────────────────────────────
    // Prefer an explicit verseReference from the client; fall back to
    // constructing one from bookName + chapter + verse.
    const clientVerseReference: string | undefined = typeof req.body.verseReference === "string"
      ? req.body.verseReference.trim()
      : undefined;

    const referenceString = clientVerseReference
      || buildVerseReference(clientBookName, clientChapter, clientVerse);

    if (!referenceString) {
      return res.status(400).json({
        error: "verseReference (or bookName + chapter + verse) and translation are required",
      });
    }

    // ── 2. Resolve canonical text BEFORE cache lookup ─────────────────────────
    // Provider/entitlement failures throw ScriptureError and are surfaced
    // explicitly; they cannot be masked by a cache hit.
    let canonicalVerseText: string;
    let canonicalVerseId: string | undefined;
    let resolvedBookName: string;
    let resolvedChapter: number;
    let resolvedVerse: number;

    try {
      const canonical = await resolveReference({ reference: referenceString, translation });
      canonicalVerseText = canonical.verses.map((v: any) => v.text).join(" ").trim();
      canonicalVerseId = (canonical.verses[0] as any)?.id as string | undefined;
      resolvedBookName = canonical.book.name;
      resolvedChapter = canonical.chapter;
      resolvedVerse =
        (canonical.verses[0] as any)?.verse ??
        canonical.reference.verses[0] ??
        1;
    } catch (err) {
      if (err instanceof ScriptureError) {
        return res.status(err.statusCode).json({ error: err.message, code: err.code });
      }
      throw err;
    }

    // ── 3. Verify provided verseId against canonical resolution ───────────────
    // If the client supplied a verseId, it must match the DB-resolved canonical
    // ID to prevent cache-poisoning (a mismatched ID would key the cache under
    // a verse ID that belongs to different content).
    const effectiveVerseId: string = (() => {
      if (canonicalVerseId) {
        // A canonical DB-backed ID is available from resolution.
        if (verseId && verseId !== canonicalVerseId) {
          // Explicit mismatch: reject to prevent poisoning the cache under the
          // wrong ID. The client must re-fetch the correct verse ID.
          return "MISMATCH";
        }
        return canonicalVerseId;
      }
      // Provider/synthetic verse: no DB ID available, fall back to whatever
      // the client supplied (it will be cache-only anyway).
      if (!verseId) {
        return "MISSING";
      }
      return String(verseId);
    })();

    if (effectiveVerseId === "MISMATCH") {
      return res.status(409).json({
        error: "Provided verseId does not match the canonical resolved verse for this reference and translation. Re-fetch the verse to obtain the correct id.",
        code: "VERSE_ID_MISMATCH",
      });
    }
    if (effectiveVerseId === "MISSING") {
      return res.status(400).json({
        error: "verseId is required for provider-served (non-DB) verses",
        code: "VERSE_ID_REQUIRED",
      });
    }

    // Cache is authoritative and keyed on cache version + translation + verseId
    // so provider/synthetic verses each get a distinct entry and stale legacy
    // mappings are invalidated by the new version.
    const cacheHash = strongMapCacheHash(translation, effectiveVerseId);
    const cached = await db
      .select({ results: searchCache.results })
      .from(searchCache)
      .where(and(eq(searchCache.queryHash, cacheHash), sql`${searchCache.expiresAt} > NOW()`))
      .limit(1);

    if (cached.length > 0) {
      return res.json(cached[0].results ?? []);
    }

    // A DB-backed verse is one that exists in bible_verse AND whose stored
    // translation matches the request. Only then may we persist verseStrongMaps
    // (whose FK targets bible_verse.id) — provider/synthetic IDs are cache-only.
    const dbVerseTranslation = await resolveDbVerseTranslation(effectiveVerseId);
    const persistMaps = canPersistVerseStrongMaps(translation, dbVerseTranslation);

    // ── 4. Generate word study using canonical (server-resolved) text ─────────
    let parsed: any[];
    try {
      parsed = await generateStrongWordStudy({
        verseText: canonicalVerseText,
        bookName: resolvedBookName,
        chapter: resolvedChapter,
        verse: resolvedVerse,
        translation,
      });
    } catch (genErr) {
      console.error("Word study generation error (AI):", genErr);
      return res.status(500).json({ error: "Failed to generate word study" });
    }

    const langCode = (["Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians","Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians","1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter","1 John","2 John","3 John","Jude","Revelation"].includes(resolvedBookName)) ? "gr" : "he";

    const results: any[] = [];
    const seenKeys = new Set<string>();
    let position = 0;

    for (let i = 0; i < parsed.length; i++) {
      const w = parsed[i];
      // Never fabricate Strong's IDs: if the AI could not supply a valid,
      // well-formed Strong's number, omit this word rather than inventing one.
      const sid = typeof w.strongId === "string" && /^[HG]\d+$/i.test(w.strongId.trim())
        ? w.strongId.trim().toUpperCase()
        : null;
      if (!sid) continue;

      position += 1;
      const dedupeKey = `${sid}-${position}`;
      if (seenKeys.has(dedupeKey)) continue;
      seenKeys.add(dedupeKey);

      // Strong entries are canonical reference data and may always be upserted.
      await db.insert(strongEntries).values({
        id: sid,
        language: langCode,
        lemma: w.lemma || w.originalWord || "",
        transliteration: w.transliteration || null,
        pronunciation: w.pronunciation || null,
        definition: w.definition || "",
        kjvUsage: w.kjvUsage || null,
      }).onConflictDoNothing();

      const entry = (await db.select().from(strongEntries).where(eq(strongEntries.id, sid)).limit(1))[0];

      let mapEntry: typeof verseStrongMaps.$inferSelect | Record<string, unknown>;
      if (persistMaps) {
        // DB-backed verse: safe to persist the FK-bound mapping row.
        const [inserted] = await db.insert(verseStrongMaps).values({
          verseId: effectiveVerseId,
          strongId: sid,
          wordPosition: position,
          originalWord: w.originalWord || w.lemma || "",
          translatedWord: w.translatedWord || null,
        }).returning();
        mapEntry = inserted;
      } else {
        // Provider/synthetic verse: build the map object WITHOUT inserting so we
        // never violate the verseStrongMaps FK against bible_verse.id.
        mapEntry = {
          verseId: effectiveVerseId,
          strongId: sid,
          wordPosition: position,
          originalWord: w.originalWord || w.lemma || "",
          translatedWord: w.translatedWord || null,
        };
      }

      results.push({ map: mapEntry, entry });
    }

    // Store the full mapping response in the versioned translation+verseId cache
    // so subsequent GET/POST requests are served without regeneration or FK risk.
    const expiresAt = new Date(Date.now() + STRONG_MAP_CACHE_TTL_MS);
    await db
      .insert(searchCache)
      .values({
        queryText: `strong-map:${translation}:${effectiveVerseId}`,
        queryHash: cacheHash,
        userId: null,
        results,
        expiresAt,
      })
      .onConflictDoNothing();

    return res.json(results);
  } catch (err) {
    console.error("Word study generation error:", err);
    return res.status(500).json({ error: "Failed to generate word study" });
  }
});

export default router;
