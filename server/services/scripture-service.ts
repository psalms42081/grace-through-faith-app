/**
 * scripture-service.ts
 *
 * Canonical translation-aware Scripture service.
 * Handles DB-backed translations, NLT provider, and API.Bible provider.
 * Exports pure helpers for mocked unit tests, plus a reusable canonical
 * resolver (resolveChapter / resolveReference) that hits the DB + providers.
 */

import { createHash } from "node:crypto";
import { db } from "../db";
import { bibleBooks, bibleVerses, bibleTranslations } from "../../shared/schema";
import { eq, and, ilike } from "drizzle-orm";

// ─── Book maps ────────────────────────────────────────────────────────────────

export const NLT_BOOK_MAP: Record<string, string> = {
  "Genesis": "Gen", "Exodus": "Exod", "Leviticus": "Lev", "Numbers": "Num",
  "Deuteronomy": "Deut", "Joshua": "Josh", "Judges": "Judg", "Ruth": "Ruth",
  "1 Samuel": "1Sam", "2 Samuel": "2Sam", "1 Kings": "1Kgs", "2 Kings": "2Kgs",
  "1 Chronicles": "1Chr", "2 Chronicles": "2Chr", "Ezra": "Ezra", "Nehemiah": "Neh",
  "Esther": "Esth", "Job": "Job", "Psalms": "Ps", "Proverbs": "Prov",
  "Ecclesiastes": "Eccl", "Song of Solomon": "Song", "Isaiah": "Isa", "Jeremiah": "Jer",
  "Lamentations": "Lam", "Ezekiel": "Ezek", "Daniel": "Dan", "Hosea": "Hos",
  "Joel": "Joel", "Amos": "Amos", "Obadiah": "Obad", "Jonah": "Jonah",
  "Micah": "Mic", "Nahum": "Nah", "Habakkuk": "Hab", "Zephaniah": "Zeph",
  "Haggai": "Hag", "Zechariah": "Zech", "Malachi": "Mal",
  "Matthew": "Matt", "Mark": "Mark", "Luke": "Luke", "John": "John",
  "Acts": "Acts", "Romans": "Rom", "1 Corinthians": "1Cor", "2 Corinthians": "2Cor",
  "Galatians": "Gal", "Ephesians": "Eph", "Philippians": "Phil", "Colossians": "Col",
  "1 Thessalonians": "1Thess", "2 Thessalonians": "2Thess", "1 Timothy": "1Tim",
  "2 Timothy": "2Tim", "Titus": "Titus", "Philemon": "Phlm", "Hebrews": "Heb",
  "James": "Jas", "1 Peter": "1Pet", "2 Peter": "2Pet", "1 John": "1John",
  "2 John": "2John", "3 John": "3John", "Jude": "Jude", "Revelation": "Rev",
};

export const API_BIBLE_BOOK_MAP: Record<string, string> = {
  "Genesis": "GEN", "Exodus": "EXO", "Leviticus": "LEV", "Numbers": "NUM",
  "Deuteronomy": "DEU", "Joshua": "JOS", "Judges": "JDG", "Ruth": "RUT",
  "1 Samuel": "1SA", "2 Samuel": "2SA", "1 Kings": "1KI", "2 Kings": "2KI",
  "1 Chronicles": "1CH", "2 Chronicles": "2CH", "Ezra": "EZR", "Nehemiah": "NEH",
  "Esther": "EST", "Job": "JOB", "Psalms": "PSA", "Proverbs": "PRO",
  "Ecclesiastes": "ECC", "Song of Solomon": "SNG", "Isaiah": "ISA", "Jeremiah": "JER",
  "Lamentations": "LAM", "Ezekiel": "EZK", "Daniel": "DAN", "Hosea": "HOS",
  "Joel": "JOL", "Amos": "AMO", "Obadiah": "OBA", "Jonah": "JON",
  "Micah": "MIC", "Nahum": "NAM", "Habakkuk": "HAB", "Zephaniah": "ZEP",
  "Haggai": "HAG", "Zechariah": "ZEC", "Malachi": "MAL",
  "Matthew": "MAT", "Mark": "MRK", "Luke": "LUK", "John": "JHN",
  "Acts": "ACT", "Romans": "ROM", "1 Corinthians": "1CO", "2 Corinthians": "2CO",
  "Galatians": "GAL", "Ephesians": "EPH", "Philippians": "PHP", "Colossians": "COL",
  "1 Thessalonians": "1TH", "2 Thessalonians": "2TH", "1 Timothy": "1TI",
  "2 Timothy": "2TI", "Titus": "TIT", "Philemon": "PHM", "Hebrews": "HEB",
  "James": "JAS", "1 Peter": "1PE", "2 Peter": "2PE", "1 John": "1JN",
  "2 John": "2JN", "3 John": "3JN", "Jude": "JUD", "Revelation": "REV",
};

/**
 * Reverse map: API.Bible book code (e.g. "GEN", "PSA") → canonical book name.
 * Derived from API_BIBLE_BOOK_MAP so it stays in sync.
 */
export const API_BIBLE_CODE_TO_BOOK: Record<string, string> = Object.fromEntries(
  Object.entries(API_BIBLE_BOOK_MAP).map(([name, code]) => [code, name])
);

/**
 * Common provider naming aliases → our canonical book name.
 * API.Bible / provider catalogs vary in book display names; tolerate them.
 * Keys are lowercased/whitespace-normalized.
 */
export const BOOK_NAME_ALIASES: Record<string, string> = {
  "psalm": "Psalms",
  "psalms": "Psalms",
  "song of songs": "Song of Solomon",
  "song of solomon": "Song of Solomon",
  "canticles": "Song of Solomon",
  "revelation of john": "Revelation",
  "the revelation": "Revelation",
};

/** Normalize a book name for alias/comparison lookups. */
export function normalizeBookName(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Resolve a provider-supplied book identifier (code or display name) to a
 * canonical book name. Returns undefined when it cannot be identified.
 */
export function resolveCanonicalBookName(providerBook: {
  id?: string;
  name?: string;
}): string | undefined {
  // 1. Provider canonical code (e.g. "GEN")
  if (providerBook.id) {
    const byCode = API_BIBLE_CODE_TO_BOOK[providerBook.id.toUpperCase().trim()];
    if (byCode) return byCode;
  }

  // 2. Alias / direct name match
  if (providerBook.name) {
    const norm = normalizeBookName(providerBook.name);
    if (BOOK_NAME_ALIASES[norm]) return BOOK_NAME_ALIASES[norm];

    // 3. Direct canonical name match (case/space-insensitive)
    for (const canonical of Object.keys(API_BIBLE_BOOK_MAP)) {
      if (normalizeBookName(canonical) === norm) return canonical;
      if (normalizeBookName(canonical).replace(/\s+/g, "") === norm.replace(/\s+/g, "")) {
        return canonical;
      }
    }
  }

  return undefined;
}

// ─── Known API.Bible translations ────────────────────────────────────────────

export interface ApiBibleTranslationConfig {
  bibleId: string;
  name: string;
  license: string;
}

export const API_BIBLE_TRANSLATIONS: Record<string, ApiBibleTranslationConfig> = {
  "NIV": { bibleId: "78a9f6124f344018-01", name: "New International Version", license: "API.Bible" },
  "AMP": { bibleId: "a81b73293d3080c9-01", name: "Amplified Bible", license: "API.Bible" },
  "NASB": { bibleId: "b8ee27bcd1cae43a-01", name: "New American Standard Bible 1995", license: "API.Bible" },
};

// ─── Translation categories ───────────────────────────────────────────────────

export type TranslationSource = "db" | "nlt_provider" | "api_bible" | "unknown";

export interface TranslationMeta {
  abbreviation: string;
  name: string;
  source: TranslationSource;
  provider: string;
  license: string;
  /** bibleId for API.Bible translations; undefined otherwise */
  bibleId?: string;
}

export interface NormalizeResult {
  /** Normalized uppercase abbreviation */
  abbreviation: string;
  /** Whether the translation was explicitly provided (vs defaulted) */
  wasDefaulted: boolean;
}

/**
 * Normalize a translation query param.
 * - If omitted/empty → default to "KJV", wasDefaulted = true
 * - Otherwise uppercase and trim; wasDefaulted = false
 * Does NOT validate existence — caller does that.
 */
export function normalizeTranslationParam(raw: string | undefined | null): NormalizeResult {
  if (!raw || String(raw).trim() === "") {
    return { abbreviation: "KJV", wasDefaulted: true };
  }
  return { abbreviation: String(raw).trim().toUpperCase(), wasDefaulted: false };
}

/**
 * Build a cache key that is isolated by translation + provider edition
 * (prevents different editions that share the same abbreviation from colliding).
 */
export function buildApiBibleCacheKey(
  translationAbbr: string,
  bibleId: string,
  bookId: number,
  chapterNum: number
): string {
  return `apibible-${translationAbbr}-${bibleId}-${bookId}-${chapterNum}`;
}

export function buildNltCacheKey(bookId: number, chapterNum: number): string {
  return `nlt-${bookId}-${chapterNum}`;
}

/**
 * Stable persistent cache identity for the NLT provider.
 * The NLT API has a single edition so no edition-ID suffix is needed.
 * Kept at 3 chars — well within the varchar(10) DB column.
 */
export const NLT_PERSISTENT_CACHE_KEY = "NLT";

/**
 * Build a deterministic, persistent (DB) cache identity for an API.Bible
 * translation that includes the provider edition ID.
 *
 * Format: <ABBR_UP_TO_4_CHARS><6_HEX_CHARS_OF_SHA256(ABBR+bibleId)>
 * Length is always ≤ 10 characters — safe for the varchar(10) DB column.
 *
 * Guarantees:
 *  - Different bibleId values for the same abbreviation produce different keys,
 *    so stale entries written under a plain abbreviation (e.g. "NKJV") are NOT
 *    matched, effectively invalidating them.
 *  - Same inputs always produce the same output (deterministic).
 *  - No provider edition ID or hash leaks into response metadata / verse labels.
 *
 * @param translationAbbr  Public abbreviation, e.g. "NKJV", "NIV", "NASB"
 * @param bibleId          API.Bible provider edition ID, e.g. "de4e12af7f28f599-01"
 */
export function buildEditionCacheKey(translationAbbr: string, bibleId: string): string {
  const abbr = translationAbbr.toUpperCase().trim().slice(0, 4);
  const hash = createHash("sha256")
    .update(translationAbbr.toUpperCase().trim() + "|" + bibleId)
    .digest("hex")
    .slice(0, 6);
  return abbr + hash;
}

/**
 * Build standardised response metadata for passage/verse/search responses.
 */
export function buildTranslationResponseMeta(
  abbreviation: string,
  name: string,
  source: TranslationSource,
  provider: string,
  bibleId?: string
): Record<string, string | undefined> {
  return {
    translation: abbreviation,
    translationName: name,
    source,
    provider,
    ...(bibleId ? { providerEditionId: bibleId } : {}),
  };
}

// ─── Reference parsing (Touchpoint forms) ────────────────────────────────────

/**
 * A parsed scripture reference. Only same-chapter forms are supported
 * (single verse, same-chapter range, comma selectors). No cross-chapter forms.
 */
export interface ParsedReference {
  book: string;
  chapter: number;
  /** Explicit verse numbers to include; empty = whole chapter */
  verses: number[];
  /** True when no verse selector was present (whole chapter requested) */
  wholeChapter: boolean;
}

export class ScriptureError extends Error {
  code:
    | "INVALID_REFERENCE"
    | "BOOK_NOT_FOUND"
    | "TRANSLATION_NOT_FOUND"
    | "CHAPTER_NOT_FOUND"
    | "VERSE_NOT_FOUND"
    | "PROVIDER_ERROR"
    | "PROVIDER_UNAVAILABLE";
  statusCode: number;

  constructor(
    code: ScriptureError["code"],
    message: string,
    statusCode: number
  ) {
    super(message);
    this.name = "ScriptureError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Parse a Touchpoint-style reference string into { book, chapter, verses }.
 *
 * Supported forms (same-chapter only):
 *   "John 3:16"            → single verse
 *   "1 Corinthians 15:20-22" → same-chapter range
 *   "Acts 2:29, 34"        → comma selector
 *   "Ezekiel 28:15, 17"    → comma selector
 *   "Genesis 1"            → whole chapter (no verse selector)
 *
 * Cross-chapter forms (e.g. "John 3:16-4:2") are NOT supported and yield null.
 */
export function parseReference(raw: string): ParsedReference | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();

  // Book part: optional leading number + letters/spaces.
  // Chapter part: digits. Optional ":<verse selector>".
  const m = trimmed.match(
    /^(\d?\s*[A-Za-z][A-Za-z\s]*?)\s+(\d+)(?::([\d,\s-]+))?$/
  );
  if (!m) return null;

  const book = m[1].trim().replace(/\s+/g, " ");
  const chapter = parseInt(m[2], 10);
  if (!Number.isInteger(chapter) || chapter < 1) return null;

  const selector = m[3]?.trim();
  if (!selector) {
    return { book, chapter, verses: [], wholeChapter: true };
  }

  // Reject cross-chapter forms: a bare "-" range spanning chapters would have a
  // colon in the selector, which our regex already excludes. Parse comma parts.
  const verses = new Set<number>();
  for (const part of selector.split(",")) {
    const token = part.trim();
    if (!token) continue;

    const rangeMatch = token.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
        return null;
      }
      for (let v = start; v <= end; v++) verses.add(v);
      continue;
    }

    const single = token.match(/^\d+$/);
    if (single) {
      const v = parseInt(token, 10);
      if (v >= 1) verses.add(v);
      continue;
    }

    // Unrecognized token → invalid
    return null;
  }

  if (verses.size === 0) return null;

  return {
    book,
    chapter,
    verses: Array.from(verses).sort((a, b) => a - b),
    wholeChapter: false,
  };
}

/**
 * Given a chapter's verses and a parsed reference, return only the verses
 * selected by the reference (or all verses when wholeChapter).
 * Verse objects are matched via their `.verse` numeric field.
 */
export function filterVersesByReference<T extends { verse: number }>(
  chapterVerses: T[],
  ref: ParsedReference
): T[] {
  if (ref.wholeChapter || ref.verses.length === 0) return chapterVerses;
  const wanted = new Set(ref.verses);
  return chapterVerses.filter((v) => wanted.has(v.verse));
}

// ─── NKJV discovery via API.Bible catalog ────────────────────────────────────

/** Patterns that positively identify a New King James Version edition */
const NKJV_NAME_PATTERNS = [
  /\bnew\s+king\s+james\b/i,
  /\bnkjv\b/i,
];

export interface ApiBibleCatalogEntry {
  id: string;
  name: string;
  nameLocal?: string;
  abbreviation?: string;
  abbreviationLocal?: string;
  language?: { id: string; name: string };
}

/**
 * Pure helper: given a list of API.Bible catalog entries, find the first
 * one whose name or abbreviation actually identifies NKJV.
 * Does NOT rely on a hard-coded bibleId.
 */
export function findNkjvInCatalog(
  entries: ApiBibleCatalogEntry[]
): ApiBibleCatalogEntry | undefined {
  return entries.find((e) => {
    const fields = [e.name, e.nameLocal, e.abbreviation, e.abbreviationLocal].filter(Boolean);
    return fields.some((f) => NKJV_NAME_PATTERNS.some((p) => p.test(f!)));
  });
}

/** Expected chapter counts per canonical book (66 OT+NT) */
export const CANONICAL_CHAPTER_COUNTS: Record<string, number> = {
  Genesis: 50, Exodus: 40, Leviticus: 27, Numbers: 36, Deuteronomy: 34,
  Joshua: 24, Judges: 21, Ruth: 4, "1 Samuel": 31, "2 Samuel": 24,
  "1 Kings": 22, "2 Kings": 25, "1 Chronicles": 29, "2 Chronicles": 36,
  Ezra: 10, Nehemiah: 13, Esther: 10, Job: 42, Psalms: 150, Proverbs: 31,
  Ecclesiastes: 12, "Song of Solomon": 8, Isaiah: 66, Jeremiah: 52,
  Lamentations: 5, Ezekiel: 48, Daniel: 12, Hosea: 14, Joel: 3,
  Amos: 9, Obadiah: 1, Jonah: 4, Micah: 7, Nahum: 3, Habakkuk: 3,
  Zephaniah: 3, Haggai: 2, Zechariah: 14, Malachi: 4,
  Matthew: 28, Mark: 16, Luke: 24, John: 21, Acts: 28, Romans: 16,
  "1 Corinthians": 16, "2 Corinthians": 13, Galatians: 6, Ephesians: 6,
  Philippians: 4, Colossians: 4, "1 Thessalonians": 5, "2 Thessalonians": 3,
  "1 Timothy": 6, "2 Timothy": 4, Titus: 3, Philemon: 1, Hebrews: 13,
  James: 5, "1 Peter": 5, "2 Peter": 3, "1 John": 5, "2 John": 1,
  "3 John": 1, Jude: 1, Revelation: 22,
};

export const CANONICAL_BOOK_COUNT = Object.keys(CANONICAL_CHAPTER_COUNTS).length; // 66

/**
 * Validates that a set of provider books (from include-chapters=true response)
 * covers all 66 canonical books and has the expected chapter numbers.
 *
 * Books are matched by their provider canonical id/code (API_BIBLE_BOOK_MAP
 * reverse) first, then by name/alias (Psalm/Psalms, Song of Songs/Song of
 * Solomon, etc.). Chapter validation compares the set of UNIQUE numeric chapter
 * numbers (1..N) rather than raw array length, so introductions or duplicate
 * entries do not break the check.
 *
 * @param providerBooks - array of { id?, name, chapters: number[] } from provider
 * @param localBooks - array of { name, chapterCount } from local DB (bibleBooks)
 */
export interface CoverageValidationResult {
  ok: boolean;
  mappedBookCount: number;
  missing: string[];
  wrongChapterCount: Array<{ book: string; expected: number; got: number }>;
}

export function validateCanonicalCoverage(
  providerBooks: Array<{ id?: string; name: string; chapters: number[] }>,
  localBooks: Array<{ name: string; chapterCount: number }>
): CoverageValidationResult {
  const missing: string[] = [];
  const wrongChapterCount: Array<{ book: string; expected: number; got: number }> = [];

  // Build lookup: canonical book name → provider entry (via code/alias/name)
  const providerMap = new Map<string, { id?: string; name: string; chapters: number[] }>();
  for (const b of providerBooks) {
    const canonical = resolveCanonicalBookName({ id: b.id, name: b.name });
    if (canonical) {
      providerMap.set(canonical, b);
    }
  }

  let mappedBookCount = 0;

  for (const local of localBooks) {
    const provider = providerMap.get(local.name);

    if (!provider) {
      missing.push(local.name);
      continue;
    }

    mappedBookCount++;
    const expectedChapters = local.chapterCount;

    // Validate the set of unique numeric chapters: must be exactly {1..expected}
    const uniqueChapters = new Set(
      provider.chapters.filter((n) => Number.isInteger(n) && n >= 1)
    );
    let hasAllExpected = uniqueChapters.size === expectedChapters;
    if (hasAllExpected) {
      for (let ch = 1; ch <= expectedChapters; ch++) {
        if (!uniqueChapters.has(ch)) {
          hasAllExpected = false;
          break;
        }
      }
    }

    if (!hasAllExpected) {
      wrongChapterCount.push({
        book: local.name,
        expected: expectedChapters,
        got: uniqueChapters.size,
      });
    }
  }

  const ok =
    missing.length === 0 &&
    wrongChapterCount.length === 0 &&
    mappedBookCount === CANONICAL_BOOK_COUNT;

  return { ok, mappedBookCount, missing, wrongChapterCount };
}

// ─── NKJV capability cache ────────────────────────────────────────────────────

const NKJV_CACHE_TTL_MS = 5 * 60 * 1000;

interface NkjvCapabilityCache {
  available: boolean;
  config?: ApiBibleTranslationConfig;
  checkedAt: number;
  reason?: string;
}

const _nkjvCapabilityCache = new Map<string, NkjvCapabilityCache>();

/**
 * Account-scoped capability identity. The API key itself is never stored,
 * logged, or returned.
 */
export function buildNkjvCapabilityCacheKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex").slice(0, 24);
}

/** Reset for testing */
export function _resetNkjvCapabilityCache(): void {
  _nkjvCapabilityCache.clear();
}

export function invalidateNkjvCapabilityCache(apiKey: string): void {
  _nkjvCapabilityCache.delete(buildNkjvCapabilityCacheKey(apiKey));
}

/**
 * Discover NKJV from the API.Bible account catalog.
 * Returns undefined if unavailable, or config if found and coverage passes.
 * Results are cached for NKJV_CACHE_TTL_MS.
 */
export async function discoverNkjvCapability(
  apiKey: string,
  localBooks: Array<{ name: string; chapterCount: number }>,
  options: { forceRefresh?: boolean } = {}
): Promise<ApiBibleTranslationConfig | undefined> {
  const now = Date.now();
  const cacheKey = buildNkjvCapabilityCacheKey(apiKey);
  const cached = _nkjvCapabilityCache.get(cacheKey);
  if (
    !options.forceRefresh &&
    cached &&
    now - cached.checkedAt < NKJV_CACHE_TTL_MS
  ) {
    return cached.available ? cached.config : undefined;
  }

  try {
    // 1. Fetch the account's authorized Bible catalog
    const catalogRes = await fetch("https://rest.api.bible/v1/bibles?language=eng", {
      headers: { "api-key": apiKey },
    });

    if (!catalogRes.ok) {
      if (catalogRes.status === 401 || catalogRes.status === 403) {
        _nkjvCapabilityCache.delete(cacheKey);
      } else {
        _nkjvCapabilityCache.set(cacheKey, {
          available: false,
          checkedAt: now,
          reason: `catalog fetch failed: ${catalogRes.status}`,
        });
      }
      return undefined;
    }

    const catalogJson = (await catalogRes.json()) as { data: ApiBibleCatalogEntry[] };
    const nkjvEntry = findNkjvInCatalog(catalogJson.data ?? []);

    if (!nkjvEntry) {
      _nkjvCapabilityCache.set(cacheKey, {
        available: false,
        checkedAt: now,
        reason: "no NKJV entry in account catalog",
      });
      return undefined;
    }

    // 2. Validate coverage: fetch books with chapters for this bible
    const booksRes = await fetch(
      `https://rest.api.bible/v1/bibles/${nkjvEntry.id}/books?include-chapters=true`,
      { headers: { "api-key": apiKey } }
    );

    if (!booksRes.ok) {
      if (booksRes.status === 401 || booksRes.status === 403) {
        _nkjvCapabilityCache.delete(cacheKey);
      } else {
        _nkjvCapabilityCache.set(cacheKey, {
          available: false,
          checkedAt: now,
          reason: `books fetch failed: ${booksRes.status}`,
        });
      }
      return undefined;
    }

    const booksJson = (await booksRes.json()) as {
      data: Array<{ id: string; name: string; chapters: Array<{ id: string; number: string }> }>;
    };

    // Transform to providerBooks format (retain id/code for canonical mapping)
    const providerBooks = (booksJson.data ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      chapters: b.chapters.map((c) => parseInt(c.number, 10)).filter((n) => !isNaN(n)),
    }));

    const coverage = validateCanonicalCoverage(providerBooks, localBooks);

    if (!coverage.ok) {
      _nkjvCapabilityCache.set(cacheKey, {
        available: false,
        checkedAt: now,
        reason: `coverage check failed: missing=${coverage.missing.length}, wrongChapterCount=${coverage.wrongChapterCount.length}`,
      });
      return undefined;
    }

    // 3. All checks passed — register as available
    const config: ApiBibleTranslationConfig = {
      bibleId: nkjvEntry.id,
      name: nkjvEntry.name,
      license: "API.Bible",
    };

    _nkjvCapabilityCache.set(cacheKey, {
      available: true,
      config,
      checkedAt: now,
    });
    return config;
  } catch (err: any) {
    _nkjvCapabilityCache.set(cacheKey, {
      available: false,
      checkedAt: now,
      reason: `discovery error: ${err?.message}`,
    });
    return undefined;
  }
}

// ─── HTML/text parsers ────────────────────────────────────────────────────────

function stripNestedSpan(html: string, className: string): string {
  let result = "";
  let i = 0;
  const openTag = `<span class="${className}"`;
  while (i < html.length) {
    const idx = html.toLowerCase().indexOf(openTag.toLowerCase(), i);
    if (idx === -1) {
      result += html.slice(i);
      break;
    }
    result += html.slice(i, idx);
    let depth = 1;
    let j = html.indexOf(">", idx) + 1;
    while (j < html.length && depth > 0) {
      if (html.slice(j, j + 5).toLowerCase() === "<span") {
        depth++;
        j = html.indexOf(">", j) + 1;
      } else if (html.slice(j, j + 7).toLowerCase() === "</span>") {
        depth--;
        j += 7;
      } else {
        j++;
      }
    }
    i = j;
  }
  return result;
}

export function parseNltHtml(html: string, bookId: number, chapterNum: number): any[] {
  const verses: any[] = [];
  const verseRegex = /<verse_export[^>]*bk="[^"]*"[^>]*ch="(\d+)"[^>]*vn="(\d+)"[^>]*>([\s\S]*?)<\/verse_export>/gi;
  let match;
  while ((match = verseRegex.exec(html)) !== null) {
    const vn = parseInt(match[2], 10);
    let text = match[3];
    text = text.replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, "");
    text = text.replace(/<p class="psa-title"[^>]*>[\s\S]*?<\/p>/gi, "");
    text = text.replace(/<p class="subhead"[^>]*>[\s\S]*?<\/p>/gi, "");
    text = stripNestedSpan(text, "tn");
    text = text
      .replace(/<a class="a-tn"[^>]*>\*?<\/a>/gi, "")
      .replace(/<span class="vn">\d+<\/span>/gi, "")
      .replace(/<span class="s-heb">[^<]*<\/span>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (text) {
      verses.push({
        id: `nlt-${bookId}-${chapterNum}-${vn}`,
        translationId: "NLT",
        bookId,
        chapter: chapterNum,
        verse: vn,
        text,
        searchVector: null,
      });
    }
  }
  return verses;
}

export function parseApiBibleText(
  content: string,
  bookId: number,
  chapterNum: number,
  translationAbbr: string
): any[] {
  const verses: any[] = [];
  const lines = content.split(/\n/);
  let currentVerse = 0;
  let currentText = "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\[(\d+)\]/);
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i].trim();
      if (!part) continue;
      const num = parseInt(part, 10);
      if (!isNaN(num) && num > 0 && num <= 200 && parts[i - 1] !== undefined) {
        if (currentVerse > 0 && currentText.trim()) {
          verses.push({
            id: `${translationAbbr.toLowerCase()}-${bookId}-${chapterNum}-${currentVerse}`,
            translationId: translationAbbr,
            bookId,
            chapter: chapterNum,
            verse: currentVerse,
            text: currentText.trim(),
            searchVector: null,
          });
        }
        currentVerse = num;
        currentText = "";
      } else if (currentVerse > 0) {
        currentText += " " + part;
      } else if (i === 0 && parts.length > 1) {
        continue;
      }
    }
  }

  if (currentVerse > 0 && currentText.trim()) {
    verses.push({
      id: `${translationAbbr.toLowerCase()}-${bookId}-${chapterNum}-${currentVerse}`,
      translationId: translationAbbr,
      bookId,
      chapter: chapterNum,
      verse: currentVerse,
      text: currentText.trim(),
      searchVector: null,
    });
  }

  return verses;
}

// ─── In-process caches (translation-isolated) ─────────────────────────────────

const apiBibleCache = new Map<string, { data: any; expires: number }>();
const nltPassageCache = new Map<string, { data: any; expires: number }>();

function evictOldest(cache: Map<string, { data: any; expires: number }>, maxSize: number, evictCount: number) {
  if (cache.size > maxSize) {
    const oldest = Array.from(cache.entries()).sort((a, b) => a[1].expires - b[1].expires);
    for (let i = 0; i < evictCount; i++) cache.delete(oldest[i][0]);
  }
}

// ─── Chapter fetchers ─────────────────────────────────────────────────────────

export async function fetchNltChapter(
  bookName: string,
  bookId: number,
  chapterNum: number
): Promise<{ verses: any[] }> {
  const cacheKey = buildNltCacheKey(bookId, chapterNum);
  const cached = nltPassageCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const apiKey = process.env.NLT_API_KEY;
  if (!apiKey) throw new Error("NLT_API_KEY not configured");

  const nltBook = NLT_BOOK_MAP[bookName] || bookName;
  const url = `https://api.nlt.to/api/passages?ref=${encodeURIComponent(nltBook)}.${chapterNum}&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`NLT API returned ${response.status}`);
  const html = await response.text();
  const verses = parseNltHtml(html, bookId, chapterNum);
  const result = { verses };

  nltPassageCache.set(cacheKey, { data: result, expires: Date.now() + 3600_000 });
  evictOldest(nltPassageCache, 500, 100);

  return result;
}

/**
 * Fetch a chapter from API.Bible.
 * Cache key includes bibleId to ensure translation isolation.
 */
export async function fetchApiBibleChapter(
  bookName: string,
  bookId: number,
  chapterNum: number,
  translationAbbr: string,
  config: ApiBibleTranslationConfig
): Promise<{ verses: any[] }> {
  const cacheKey = buildApiBibleCacheKey(translationAbbr, config.bibleId, bookId, chapterNum);
  const cached = apiBibleCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  const apiKey = process.env.API_BIBLE_KEY;
  if (!apiKey) throw new Error("API_BIBLE_KEY not configured");

  const apiBibleBookCode = API_BIBLE_BOOK_MAP[bookName];
  if (!apiBibleBookCode) throw new Error(`No API.Bible book mapping for: ${bookName}`);

  const chapterId = `${apiBibleBookCode}.${chapterNum}`;
  const url = `https://rest.api.bible/v1/bibles/${config.bibleId}/chapters/${chapterId}?content-type=text&include-verse-numbers=true&include-titles=false&include-chapter-numbers=false`;

  const response = await fetch(url, {
    headers: { "api-key": apiKey },
  });

  if (!response.ok) {
    const status = response.status;
    if (
      translationAbbr.toUpperCase() === "NKJV" &&
      (status === 401 || status === 403 || status === 404)
    ) {
      invalidateNkjvCapabilityCache(apiKey);
    }
    if (status === 401 || status === 403) {
      throw new ScriptureError(
        "PROVIDER_UNAVAILABLE",
        `API.Bible authorization error (${status}) for ${translationAbbr}`,
        503
      );
    }
    throw new ScriptureError(
      "PROVIDER_ERROR",
      `API.Bible returned ${status} for ${translationAbbr}`,
      502
    );
  }

  const json = (await response.json()) as any;
  const content = json.data?.content || "";
  const verses = parseApiBibleText(content, bookId, chapterNum, translationAbbr);
  const result = { verses };

  apiBibleCache.set(cacheKey, { data: result, expires: Date.now() + 3600_000 });
  evictOldest(apiBibleCache, 1000, 200);

  return result;
}

/**
 * A local book record used to map provider book codes back to numeric ids.
 */
export interface LocalBookRef {
  id: number;
  name: string;
  abbreviation: string;
}

/**
 * A canonical (frontend-navigable) search result. bookId is the LOCAL numeric
 * id; chapter/verse are canonical numbers.
 */
export interface CanonicalSearchResult {
  bookId: number;
  bookName: string;
  bookAbbreviation: string;
  chapter: number;
  verse: number;
  text: string;
}

export interface CanonicalSearchResponse {
  results: CanonicalSearchResult[];
  total: number;
}

const NLT_SEARCH_CODE_TO_BOOK: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(NLT_BOOK_MAP).map(([name, code]) => [code.toLowerCase(), name])
  ),
  // Search result links use a few shorter aliases than the passages endpoint.
  ps: "Psalms",
  pr: "Proverbs",
  prov: "Proverbs",
  song: "Song of Solomon",
  sos: "Song of Solomon",
};

function decodeProviderHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_match, decimal) =>
      String.fromCodePoint(Number.parseInt(decimal, 10))
    )
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex) =>
      String.fromCodePoint(Number.parseInt(hex, 16))
    )
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function providerHtmlToText(fragment: string): string {
  return decodeProviderHtml(
    fragment
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

function resolveNltSearchBook(
  providerCode: string,
  referenceLabel: string,
  localBooks: LocalBookRef[]
): LocalBookRef | undefined {
  const canonicalFromCode = NLT_SEARCH_CODE_TO_BOOK[providerCode.toLowerCase()];
  const labelBook = referenceLabel.replace(/\s+\d+(?::\d+.*)?$/, "").trim();
  const candidates = [canonicalFromCode, labelBook, providerCode]
    .filter((candidate): candidate is string => !!candidate)
    .map(normalizeBookName);

  return localBooks.find((book) => {
    const names = [normalizeBookName(book.name), normalizeBookName(book.abbreviation)];
    return candidates.some((candidate) => names.includes(candidate));
  });
}

/**
 * Parse the official NLT provider's HTML search response into frontend-navigable
 * results. Only provider-returned text is used; no local or generated wording is
 * substituted. Exported for provider-mocked tests.
 */
export function parseNltSearchHtml(
  html: string,
  localBooks: LocalBookRef[],
  limit: number
): CanonicalSearchResponse {
  const results: CanonicalSearchResult[] = [];
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(html)) !== null && results.length < limit) {
    const cells = Array.from(
      rowMatch[1].matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)
    );
    if (cells.length < 2) continue;

    const linkMatch = cells[0][1].match(
      /<a\b[^>]*href=["'][^"']*nlt\.to\/([^/"'?#]+)\/?[^"']*["'][^>]*>([\s\S]*?)<\/a>/i
    );
    if (!linkMatch) continue;

    const referenceId = decodeURIComponent(linkMatch[1]);
    const referenceParts = referenceId.split(".");
    const providerCode = referenceParts[0] ?? "";
    const chapter = Number.parseInt(referenceParts[1] ?? "", 10);
    const verse = Number.parseInt(referenceParts[2] ?? "", 10);
    if (!Number.isInteger(chapter) || !Number.isInteger(verse)) continue;

    const referenceLabel = providerHtmlToText(linkMatch[2]);
    const localBook = resolveNltSearchBook(providerCode, referenceLabel, localBooks);
    const text = providerHtmlToText(cells[1][1]);
    if (!localBook || !text) continue;

    results.push({
      bookId: localBook.id,
      bookName: localBook.name,
      bookAbbreviation: localBook.abbreviation,
      chapter,
      verse,
      text,
    });
  }

  const countMatch = html.match(
    /<span\b[^>]*class=["'][^"']*\bcount\b[^"']*["'][^>]*>([\s\S]*?)<\/span>/i
  );
  const parsedTotal = Number.parseInt(
    providerHtmlToText(countMatch?.[1] ?? "").replace(/[^\d]/g, ""),
    10
  );

  return {
    results,
    total: Number.isFinite(parsedTotal) ? parsedTotal : results.length,
  };
}

/**
 * Search NLT through the licensed official provider. NLT is never searched in
 * the local KJV/DB corpus and failures never fall back to another translation.
 */
export async function searchNlt(
  query: string,
  limit: number,
  localBooks: LocalBookRef[],
  options: {
    apiKey?: string;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<CanonicalSearchResponse> {
  const apiKey = options.apiKey ?? process.env.NLT_API_KEY;
  if (!apiKey) {
    throw new ScriptureError(
      "TRANSLATION_NOT_FOUND",
      "NLT translation is not configured",
      404
    );
  }

  const url = new URL("https://api.nlt.to/api/search");
  url.searchParams.set("text", query);
  url.searchParams.set("version", "NLT");
  url.searchParams.set("key", apiKey);

  const response = await (options.fetchImpl ?? fetch)(url);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new ScriptureError(
        "PROVIDER_UNAVAILABLE",
        `NLT provider authorization error (${response.status})`,
        503
      );
    }
    throw new ScriptureError(
      "PROVIDER_ERROR",
      `NLT search provider returned ${response.status}`,
      502
    );
  }

  return parseNltSearchHtml(await response.text(), localBooks, limit);
}

/**
 * Pure helper: map a raw API.Bible search result (verse id like "GEN.1.1")
 * to a canonical result using local book records. Returns null when the
 * provider book code cannot be mapped to a local book.
 */
export function mapApiBibleSearchResult(
  raw: { id?: string; bookId?: string; text: string },
  localBooksByName: Map<string, LocalBookRef>
): CanonicalSearchResult | null {
  const parts = (raw.id ?? "").split(".");
  const providerCode = (parts[0] ?? raw.bookId ?? "").toUpperCase().trim();
  const chapter = parseInt(parts[1] ?? "", 10);
  const verse = parseInt(parts[2] ?? "", 10);

  const canonicalName = resolveCanonicalBookName({ id: providerCode });
  if (!canonicalName) return null;

  const local = localBooksByName.get(normalizeBookName(canonicalName));
  if (!local) return null;
  if (!Number.isInteger(chapter) || !Number.isInteger(verse)) return null;

  return {
    bookId: local.id,
    bookName: local.name,
    bookAbbreviation: local.abbreviation,
    chapter,
    verse,
    text: raw.text,
  };
}

/**
 * Perform a search against the API.Bible provider search endpoint and map
 * results back to LOCAL numeric bookId / bookName / bookAbbreviation plus
 * canonical numeric chapter/verse (for frontend navigation).
 */
export async function searchApiBible(
  query: string,
  translationAbbr: string,
  config: ApiBibleTranslationConfig,
  limit: number,
  localBooks: LocalBookRef[]
): Promise<CanonicalSearchResult[]> {
  const apiKey = process.env.API_BIBLE_KEY;
  if (!apiKey) throw new Error("API_BIBLE_KEY not configured");

  const url = `https://rest.api.bible/v1/bibles/${config.bibleId}/search?query=${encodeURIComponent(query)}&limit=${limit}&sort=relevance`;

  const response = await fetch(url, {
    headers: { "api-key": apiKey },
  });

  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) {
      throw new ScriptureError(
        "PROVIDER_UNAVAILABLE",
        `API.Bible authorization error (${status}) for ${translationAbbr} search`,
        503
      );
    }
    throw new ScriptureError(
      "PROVIDER_ERROR",
      `API.Bible search returned ${status} for ${translationAbbr}`,
      502
    );
  }

  const json = (await response.json()) as any;
  const verses = (json.data?.verses ?? []) as Array<{
    id: string;
    bookId?: string;
    text: string;
  }>;

  const localByName = new Map<string, LocalBookRef>(
    localBooks.map((b) => [normalizeBookName(b.name), b])
  );

  const results: CanonicalSearchResult[] = [];
  for (const v of verses) {
    const mapped = mapApiBibleSearchResult({ id: v.id, bookId: v.bookId, text: v.text }, localByName);
    if (mapped) results.push(mapped);
  }
  return results;
}

// ─── Canonical resolver ───────────────────────────────────────────────────────

export interface ResolvedBook {
  id: number;
  name: string;
  abbreviation: string;
  testament: string;
  chapterCount: number;
  orderIndex: number;
}

export interface ResolvedScripture {
  book: ResolvedBook;
  chapter: number;
  verses: any[];
  /** True when the verses came from the DB/provider cache */
  cached: boolean;
  meta: {
    translation: string;
    translationName: string;
    source: TranslationSource;
    provider: string;
    providerEditionId?: string;
  };
}

/** Runtime API.Bible translation map (includes dynamically discovered NKJV). */
async function getRuntimeApiBibleTranslations(
  localBooks: Array<{ name: string; chapterCount: number }>
): Promise<Record<string, ApiBibleTranslationConfig>> {
  const translations: Record<string, ApiBibleTranslationConfig> = { ...API_BIBLE_TRANSLATIONS };
  const apiKey = process.env.API_BIBLE_KEY;
  if (apiKey) {
    try {
      const nkjvConfig = await discoverNkjvCapability(apiKey, localBooks);
      if (nkjvConfig) translations["NKJV"] = nkjvConfig;
    } catch {
      // discovery failure must not affect other translations
    }
  }
  return translations;
}

/** Resolve a book by numeric id or name via the DB. */
async function resolveBookRecord(book: string | number): Promise<ResolvedBook | null> {
  const bookNum = Number(book);
  let rows;
  if (!isNaN(bookNum) && String(book).trim() !== "") {
    rows = await db.select().from(bibleBooks).where(eq(bibleBooks.id, bookNum)).limit(1);
  } else {
    // Try exact/alias canonical name first, then case-insensitive DB match.
    const canonical = resolveCanonicalBookName({ name: String(book) }) ?? String(book);
    rows = await db.select().from(bibleBooks).where(ilike(bibleBooks.name, canonical)).limit(1);
    if (!rows.length) {
      rows = await db.select().from(bibleBooks).where(ilike(bibleBooks.name, String(book))).limit(1);
    }
  }
  return rows.length ? (rows[0] as ResolvedBook) : null;
}

/**
 * Cache accessor hooks (DB cache read/write) injected by the caller so this
 * service stays free of the bible_cache stats bookkeeping specifics.
 */
export interface ChapterCacheHooks {
  read: (translation: string, bookId: number, chapterNum: number) => Promise<any[] | null>;
  write: (
    translation: string,
    bookId: number,
    bookName: string,
    chapterNum: number,
    verses: any[],
    sourceApi: string
  ) => Promise<void> | void;
}

export interface ResolveChapterParams {
  book: string | number;
  chapter: number;
  translation: string | undefined;
  cache?: ChapterCacheHooks;
}

/**
 * Canonical chapter resolver. Handles DB translations, NLT provider, and
 * API.Bible provider translations (including discovered NKJV). Throws
 * ScriptureError on any failure.
 */
export async function resolveChapter(params: ResolveChapterParams): Promise<ResolvedScripture> {
  const { abbreviation: translationAbbr, wasDefaulted } = normalizeTranslationParam(params.translation);

  const chapterNum = Number(params.chapter);
  if (!Number.isInteger(chapterNum) || chapterNum < 1) {
    throw new ScriptureError("INVALID_REFERENCE", "chapter must be a positive number", 400);
  }

  const bookRecord = await resolveBookRecord(params.book);
  if (!bookRecord) {
    throw new ScriptureError("BOOK_NOT_FOUND", `Book not found: ${params.book}`, 404);
  }
  const bookId = bookRecord.id;
  const bookName = bookRecord.name;

  // NLT provider — uses a stable persistent cache identity (no edition churn)
  if (translationAbbr === "NLT") {
    const meta = {
      translation: "NLT",
      translationName: "New Living Translation",
      source: "nlt_provider" as TranslationSource,
      provider: "NLT API",
    };
    if (params.cache) {
      const cachedVerses = await params.cache.read(NLT_PERSISTENT_CACHE_KEY, bookId, chapterNum);
      if (cachedVerses) {
        return { book: bookRecord, chapter: chapterNum, verses: cachedVerses, cached: true, meta };
      }
    }
    try {
      const nltData = await fetchNltChapter(bookName, bookId, chapterNum);
      if (params.cache && nltData.verses.length > 0) {
        await params.cache.write(NLT_PERSISTENT_CACHE_KEY, bookId, bookName, chapterNum, nltData.verses, "nlt_api");
      }
      return { book: bookRecord, chapter: chapterNum, verses: nltData.verses, cached: false, meta };
    } catch (err: any) {
      if (err instanceof ScriptureError) throw err;
      throw new ScriptureError("PROVIDER_ERROR", `Could not fetch NLT translation: ${err?.message}`, 502);
    }
  }

  // API.Bible provider translations (includes discovered NKJV)
  const allBooks = await db.select().from(bibleBooks).orderBy(bibleBooks.orderIndex);
  const apiBibleTranslations = await getRuntimeApiBibleTranslations(allBooks);

  if (apiBibleTranslations[translationAbbr]) {
    const config = apiBibleTranslations[translationAbbr];
    // Edition-aware persistent cache identity: encodes abbreviation + provider
    // edition ID so that different editions never collide in the DB cache, and
    // plain-abbreviation ("NKJV") entries written before this change are never
    // read under the new key (automatic invalidation).
    const editionCacheKey = buildEditionCacheKey(translationAbbr, config.bibleId);
    const meta = {
      translation: translationAbbr,
      translationName: config.name,
      source: "api_bible" as TranslationSource,
      provider: "API.Bible",
      providerEditionId: config.bibleId,
    };
    if (params.cache) {
      const cachedVerses = await params.cache.read(editionCacheKey, bookId, chapterNum);
      if (cachedVerses) {
        return { book: bookRecord, chapter: chapterNum, verses: cachedVerses, cached: true, meta };
      }
    }
    try {
      const abData = await fetchApiBibleChapter(bookName, bookId, chapterNum, translationAbbr, config);
      if (!abData.verses.length) {
        throw new ScriptureError("PROVIDER_ERROR", `Could not parse ${translationAbbr} content`, 502);
      }
      if (params.cache) {
        await params.cache.write(editionCacheKey, bookId, bookName, chapterNum, abData.verses, "api_bible");
      }
      return { book: bookRecord, chapter: chapterNum, verses: abData.verses, cached: false, meta };
    } catch (err: any) {
      if (err instanceof ScriptureError) throw err;
      throw new ScriptureError("PROVIDER_ERROR", `Could not fetch ${translationAbbr} translation: ${err?.message}`, 502);
    }
  }

  // DB-backed translation
  const translationRecord = await db
    .select()
    .from(bibleTranslations)
    .where(eq(bibleTranslations.abbreviation, translationAbbr))
    .limit(1);

  if (!translationRecord.length) {
    const msg = wasDefaulted
      ? "Default translation (KJV) not found in database"
      : `Translation not found: ${translationAbbr}`;
    throw new ScriptureError("TRANSLATION_NOT_FOUND", msg, 404);
  }

  const verses = await db
    .select()
    .from(bibleVerses)
    .where(
      and(
        eq(bibleVerses.bookId, bookId),
        eq(bibleVerses.chapter, chapterNum),
        eq(bibleVerses.translationId, translationRecord[0].id)
      )
    )
    .orderBy(bibleVerses.verse);

  return {
    book: bookRecord,
    chapter: chapterNum,
    verses,
    cached: false,
    meta: {
      translation: translationRecord[0].abbreviation,
      translationName: translationRecord[0].name,
      source: "db",
      provider: "local",
    },
  };
}

export interface ResolveReferenceParams {
  reference: string;
  translation: string | undefined;
  cache?: ChapterCacheHooks;
}

/**
 * Canonical reference resolver. Parses a Touchpoint-style reference (single
 * verse, same-chapter range, comma selectors), resolves the chapter via the
 * same path as resolveChapter, and filters to the selected verses.
 */
export async function resolveReference(params: ResolveReferenceParams): Promise<ResolvedScripture & { reference: ParsedReference }> {
  const parsed = parseReference(params.reference);
  if (!parsed) {
    throw new ScriptureError("INVALID_REFERENCE", `Could not parse reference: ${params.reference}`, 400);
  }

  const resolved = await resolveChapter({
    book: parsed.book,
    chapter: parsed.chapter,
    translation: params.translation,
    cache: params.cache,
  });

  const filtered = filterVersesByReference(resolved.verses as Array<{ verse: number }>, parsed);

  if (!parsed.wholeChapter && filtered.length === 0) {
    throw new ScriptureError(
      "VERSE_NOT_FOUND",
      `No verses found for ${params.reference}`,
      404
    );
  }

  return { ...resolved, verses: filtered, reference: parsed };
}
