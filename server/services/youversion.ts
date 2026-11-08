/**
 * YouVersion Platform provider. The app key stays on the server; clients only
 * ever see "YV<bibleId>" codes, verse text and the attribution each version requires.
 *
 * Only the reader routes (server/routes/bible.ts) may import the text fetchers in
 * this module. AI features resolve Scripture through scripture-service, which maps
 * every YouVersion code to the local KJV.
 */
import { youVersionBibleId, youVersionCode } from "../../shared/youversion";
import { parseYouVersionChapterHtml, type YouVersionChapter } from "./youversion-html";
import {
  API_BIBLE_BOOK_MAP,
  ScriptureError,
  type ResolvedBook,
} from "./scripture-service";

export { parseYouVersionChapterHtml, type YouVersionChapter, type YouVersionFootnote } from "./youversion-html";

const API_BASE = "https://api.youversion.com/v1";
/** The Platform serves Scripture with Cache-Control: public, max-age=3600. */
const TEXT_TTL_MS = 60 * 60 * 1000;
const LANGUAGE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CACHED_CHAPTERS = 400;

/** Licensed versions the app does not offer, with the reason reported to the owner. */
export const YOUVERSION_EXCLUDED_BIBLES: ReadonlyMap<number, string> = new Map([
  [1849, "The Passion Translation — left out by request"],
  [111, "NIV 2011 — served from API.Bible"],
  [1588, "Amplified Bible — served from API.Bible"],
  [100, "NASB 1995 — served from API.Bible"],
  [12, "ASV — identical local public-domain text"],
  [93, "Louis Segond 1910 — identical local public-domain text"],
  [147, "Reina-Valera 1909 — identical local public-domain text (RV1909)"],
  [177, "Ang Biblia — identical local public-domain text (TAGV)"],
]);

interface YouVersionBible {
  id: number;
  abbreviation: string;
  localized_abbreviation?: string | null;
  title?: string | null;
  localized_title?: string | null;
  language_tag: string;
  books?: string[] | null;
  copyright?: string | null;
  promotional_content?: string | null;
  info?: string | null;
  publisher_name?: string | null;
  publisher_url?: string | null;
}

export interface YouVersionCatalogEntry {
  id: string;
  /** The app-wide translation code, e.g. "YV2692". */
  abbreviation: string;
  /** What readers see, e.g. "NASB2020". */
  displayAbbreviation: string;
  name: string;
  language: string;
  languageName: string;
  source: "youversion";
  provider: "YouVersion";
  license: "YouVersion Platform";
  available: true;
  providerEditionId: string;
}

export interface YouVersionAttribution {
  text: string;
  info: string | null;
  publisherName: string | null;
  publisherUrl: string | null;
  versionName: string;
}

export function hasYouVersionKey(): boolean {
  return !!process.env.YOUVERSION_APP_KEY?.trim();
}

async function youVersionGet<T>(path: string, params?: URLSearchParams): Promise<T> {
  const key = process.env.YOUVERSION_APP_KEY?.trim();
  if (!key) {
    throw new ScriptureError("PROVIDER_UNAVAILABLE", "YouVersion is not configured", 503);
  }
  const url = `${API_BASE}${path}${params ? `?${params.toString()}` : ""}`;
  const response = await fetch(url, { headers: { "X-YVP-App-Key": key, Accept: "application/json" } });
  if (response.status === 404) {
    throw new ScriptureError("CHAPTER_NOT_FOUND", "This passage isn't in this version.", 404);
  }
  if (response.status === 401 || response.status === 403) {
    throw new ScriptureError("PROVIDER_UNAVAILABLE", `YouVersion authorization error (${response.status})`, 503);
  }
  if (!response.ok) {
    throw new ScriptureError("PROVIDER_ERROR", `YouVersion returned ${response.status}`, 502);
  }
  return (await response.json()) as T;
}

function memo<T>(ttlMs: number, load: () => Promise<T>) {
  let value: { data: T; expires: number } | null = null;
  let pending: Promise<T> | null = null;
  return async (): Promise<T> => {
    if (value && value.expires > Date.now()) return value.data;
    if (!pending) {
      pending = load()
        .then((data) => {
          value = { data, expires: Date.now() + ttlMs };
          return data;
        })
        .finally(() => {
          pending = null;
        });
    }
    return pending;
  };
}

const loadLicensedBibles = memo(TEXT_TTL_MS, async () => {
  const bibles: YouVersionBible[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({ "language_ranges[]": "*", page_size: "99" });
    if (pageToken) params.set("page_token", pageToken);
    const page = await youVersionGet<{ data: YouVersionBible[]; next_page_token?: string | null }>("/bibles", params);
    bibles.push(...(page.data ?? []));
    pageToken = page.next_page_token ?? undefined;
  } while (pageToken);
  return bibles;
});

const loadLanguageNames = memo(LANGUAGE_TTL_MS, async () => {
  const params = new URLSearchParams();
  params.append("fields[]", "id");
  params.append("fields[]", "localized_name");
  params.set("page_size", "*");
  const page = await youVersionGet<{ data: Array<{ id: string; localized_name?: string | null }> }>("/languages", params);
  return new Map((page.data ?? []).filter((row) => row.localized_name).map((row) => [row.id, row.localized_name as string]));
});

const intlLanguageNames = (() => {
  try {
    return new Intl.DisplayNames(["en"], { type: "language", fallback: "none" });
  } catch {
    return null;
  }
})();

/** English display name for a BCP 47 tag, falling back to its base language and then the tag. */
export function languageNameForTag(tag: string, platformNames?: Map<string, string>): string {
  const base = tag.split("-")[0];
  const fromIntl = (value: string) => {
    try {
      return intlLanguageNames?.of(value) ?? undefined;
    } catch {
      return undefined;
    }
  };
  return platformNames?.get(tag) ?? fromIntl(tag) ?? platformNames?.get(base) ?? fromIntl(base) ?? tag;
}

export async function getLanguageNames(): Promise<Map<string, string>> {
  if (!hasYouVersionKey()) return new Map();
  try {
    return await loadLanguageNames();
  } catch (err: any) {
    console.warn("[youversion] language names unavailable:", err?.message);
    return new Map();
  }
}

export function toCatalogEntry(bible: YouVersionBible, languageNames?: Map<string, string>): YouVersionCatalogEntry {
  const code = youVersionCode(bible.id);
  return {
    id: code,
    abbreviation: code,
    displayAbbreviation: (bible.localized_abbreviation || bible.abbreviation || code).trim(),
    name: (bible.localized_title || bible.title || bible.abbreviation || code).trim(),
    language: bible.language_tag,
    languageName: languageNameForTag(bible.language_tag, languageNames),
    source: "youversion",
    provider: "YouVersion",
    license: "YouVersion Platform",
    available: true,
    providerEditionId: String(bible.id),
  };
}

/** Every licensed version the app offers. Empty when the key is not configured. */
export async function getYouVersionCatalog(): Promise<YouVersionCatalogEntry[]> {
  if (!hasYouVersionKey()) return [];
  const [bibles, languageNames] = await Promise.all([loadLicensedBibles(), getLanguageNames()]);
  return bibles
    .filter((bible) => !YOUVERSION_EXCLUDED_BIBLES.has(bible.id))
    .map((bible) => toCatalogEntry(bible, languageNames));
}

const bibleDetailCache = new Map<number, { data: YouVersionBible; expires: number }>();

async function getBibleDetail(bibleId: number): Promise<YouVersionBible> {
  const cached = bibleDetailCache.get(bibleId);
  if (cached && cached.expires > Date.now()) return cached.data;
  const data = await youVersionGet<YouVersionBible>(`/bibles/${bibleId}`).catch((err) => {
    if (err instanceof ScriptureError && err.code === "CHAPTER_NOT_FOUND") {
      throw new ScriptureError("TRANSLATION_NOT_FOUND", "This version isn't available.", 404);
    }
    throw err;
  });
  bibleDetailCache.set(bibleId, { data, expires: Date.now() + TEXT_TTL_MS });
  return data;
}

export function youVersionAttribution(bible: YouVersionBible): YouVersionAttribution | null {
  const text = bible.copyright?.trim() || bible.promotional_content?.trim();
  if (!text) return null;
  return {
    text,
    info: bible.info?.trim() || null,
    publisherName: bible.publisher_name?.trim() || null,
    publisherUrl: bible.publisher_url?.trim() || null,
    versionName: (bible.localized_title || bible.title || bible.abbreviation).trim(),
  };
}

// ─── Read-time chapter fetch ──────────────────────────────────────────────────

const chapterCache = new Map<string, { data: YouVersionChapter; expires: number }>();

export interface ResolvedYouVersionChapter extends YouVersionChapter {
  book: ResolvedBook;
  chapter: number;
  attribution: YouVersionAttribution;
  cached: boolean;
  meta: {
    translation: string;
    translationName: string;
    displayAbbreviation: string;
    source: "youversion";
    provider: "YouVersion";
    providerEditionId: string;
  };
}

/** Reader-only: fetch a chapter at read time. Never call this from an AI feature. */
export async function resolveYouVersionChapter(
  code: string,
  book: ResolvedBook,
  chapter: number,
): Promise<ResolvedYouVersionChapter> {
  const bibleId = youVersionBibleId(code);
  if (bibleId === null || YOUVERSION_EXCLUDED_BIBLES.has(bibleId)) {
    throw new ScriptureError("TRANSLATION_NOT_FOUND", `Translation not found: ${code}`, 404);
  }
  if (!Number.isInteger(chapter) || chapter < 1 || chapter > book.chapterCount) {
    throw new ScriptureError("INVALID_REFERENCE", "chapter is out of range", 400);
  }
  const bible = await getBibleDetail(bibleId);
  const attribution = youVersionAttribution(bible);
  if (!attribution) {
    throw new ScriptureError("PROVIDER_ERROR", "This version has no display attribution", 502);
  }
  const displayAbbreviation = (bible.localized_abbreviation || bible.abbreviation).trim();
  const usfmBook = API_BIBLE_BOOK_MAP[book.name];
  if (!usfmBook || (bible.books && !bible.books.includes(usfmBook))) {
    throw new ScriptureError("CHAPTER_NOT_FOUND", `${displayAbbreviation} doesn't include ${book.name}.`, 404);
  }

  const canonicalCode = youVersionCode(bibleId);
  const cacheKey = `${bibleId}:${usfmBook}.${chapter}`;
  const cached = chapterCache.get(cacheKey);
  let data: YouVersionChapter;
  if (cached && cached.expires > Date.now()) {
    data = cached.data;
  } else {
    const params = new URLSearchParams({ format: "html", include_headings: "true", include_notes: "true" });
    const passage = await youVersionGet<{ content?: string }>(`/bibles/${bibleId}/passages/${usfmBook}.${chapter}`, params)
      .catch((err) => {
        if (err instanceof ScriptureError && err.code === "CHAPTER_NOT_FOUND") {
          throw new ScriptureError("CHAPTER_NOT_FOUND", `${displayAbbreviation} doesn't include ${book.name} ${chapter}.`, 404);
        }
        throw err;
      });
    data = parseYouVersionChapterHtml(passage.content ?? "", { code: canonicalCode, bookId: book.id, chapter });
    if (!data.verses.length) {
      throw new ScriptureError("PROVIDER_ERROR", `Could not read ${displayAbbreviation} ${book.name} ${chapter}`, 502);
    }
    chapterCache.set(cacheKey, { data, expires: Date.now() + TEXT_TTL_MS });
    if (chapterCache.size > MAX_CACHED_CHAPTERS) {
      const oldest = chapterCache.keys().next().value;
      if (oldest !== undefined) chapterCache.delete(oldest);
    }
  }

  return {
    ...data,
    book,
    chapter,
    attribution,
    cached: !!cached && cached.expires > Date.now(),
    meta: {
      translation: canonicalCode,
      translationName: attribution.versionName,
      displayAbbreviation,
      source: "youversion",
      provider: "YouVersion",
      providerEditionId: String(bibleId),
    },
  };
}
