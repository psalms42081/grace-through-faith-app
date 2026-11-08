/**
 * YouVersion Platform provider. The app key stays on the server; clients only
 * ever see "YV<bibleId>" codes, verse text and the attribution each version requires.
 *
 * Only the reader routes (server/routes/bible.ts) may import the text fetchers in
 * this module. AI features resolve Scripture through scripture-service, which maps
 * every YouVersion code to the local KJV.
 */
import {
  ApiClient,
  BibleClient,
  getHttpStatus,
  getPassageAttribution,
  type BibleVersion,
} from "@youversion/platform-core";
import { youVersionBibleId, youVersionCode } from "../../shared/youversion";
import { parseYouVersionChapterHtml, type YouVersionChapter } from "./youversion-html";
import {
  API_BIBLE_BOOK_MAP,
  ScriptureError,
  type ResolvedBook,
} from "./scripture-service";

export { parseYouVersionChapterHtml, type YouVersionChapter, type YouVersionFootnote } from "./youversion-html";

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

type YouVersionBible = BibleVersion & { publisher_name?: string | null };

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

let clients: { key: string; api: ApiClient; bible: BibleClient } | null = null;

/** The YouVersion JavaScript SDK, configured with the server-side app key. */
function sdk(): { api: ApiClient; bible: BibleClient } {
  const key = process.env.YOUVERSION_APP_KEY?.trim();
  if (!key) {
    throw new ScriptureError("PROVIDER_UNAVAILABLE", "YouVersion is not configured", 503);
  }
  if (clients?.key !== key) {
    const api = new ApiClient({ appKey: key });
    clients = { key, api, bible: new BibleClient(api) };
  }
  return clients;
}

/** After a 429 every YouVersion call waits this long; the Platform sends Retry-After: 300. */
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;
let throttledUntil = 0;

/** Map SDK failures onto the reader's ScriptureError codes. */
async function youVersionCall<T>(load: () => Promise<T>): Promise<T> {
  if (throttledUntil > Date.now()) {
    throw new ScriptureError("PROVIDER_UNAVAILABLE", "YouVersion is busy. Try again in a few minutes.", 503);
  }
  try {
    return await load();
  } catch (err) {
    if (err instanceof ScriptureError) throw err;
    const status = getHttpStatus(err);
    if (status === 404) {
      throw new ScriptureError("CHAPTER_NOT_FOUND", "This passage isn't in this version.", 404);
    }
    if (status === 401 || status === 403) {
      throw new ScriptureError("PROVIDER_UNAVAILABLE", `YouVersion authorization error (${status})`, 503);
    }
    if (status === 429) {
      throttledUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      throw new ScriptureError("PROVIDER_UNAVAILABLE", "YouVersion is busy. Try again in a few minutes.", 503);
    }
    throw new ScriptureError(
      "PROVIDER_ERROR",
      status ? `YouVersion returned ${status}` : `YouVersion request failed: ${(err as Error)?.message ?? err}`,
      502,
    );
  }
}

/** How long a failed refresh keeps serving the last good copy before trying again. */
const RETRY_AFTER_FAILURE_MS = 5 * 60 * 1000;

function memo<T>(ttlMs: number, load: () => Promise<T>) {
  let value: { data: T; expires: number } | null = null;
  let failure: { error: unknown; until: number } | null = null;
  let pending: Promise<T> | null = null;
  return async (): Promise<T> => {
    if (value && value.expires > Date.now()) return value.data;
    if (!value && failure && failure.until > Date.now()) throw failure.error;
    if (!pending) {
      pending = load()
        .then((data) => {
          value = { data, expires: Date.now() + ttlMs };
          failure = null;
          return data;
        })
        .catch((err) => {
          if (!value) {
            failure = { error: err, until: Date.now() + RETRY_AFTER_FAILURE_MS };
            throw err;
          }
          value = { data: value.data, expires: Date.now() + RETRY_AFTER_FAILURE_MS };
          return value.data;
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
  const { bible } = sdk();
  let pageToken: string | undefined;
  let pages = 0;
  do {
    const page = await youVersionCall(async () => {
      try {
        return await bible.getVersions("*", undefined, { page_size: 99, ...(pageToken ? { page_token: pageToken } : {}) });
      } catch (err) {
        console.warn(`[youversion] versions call HTTP ${getHttpStatus(err) ?? "error"} on page ${pages + 1}`);
        throw err;
      }
    });
    bibles.push(...(page.data as YouVersionBible[]));
    pageToken = page.next_page_token ?? undefined;
    pages += 1;
  } while (pageToken);
  console.log(`[youversion] versions call HTTP 200: ${bibles.length} versions in ${pages} pages`);
  return bibles;
});

/** English names for every language tag, in one request through the SDK's API client. */
const loadLanguageNames = memo(LANGUAGE_TTL_MS, async () => {
  const { api } = sdk();
  const page = await youVersionCall(() =>
    api.get<{ data?: Array<{ id: string; localized_name?: string | null }> }>("/v1/languages", {
      "fields[]": ["id", "localized_name"],
      page_size: "*",
    }),
  );
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
let reportedMissingKey = false;

export async function getYouVersionCatalog(): Promise<YouVersionCatalogEntry[]> {
  if (!hasYouVersionKey()) {
    if (!reportedMissingKey) console.warn("[youversion] YOUVERSION_APP_KEY is not set; no YouVersion versions listed");
    reportedMissingKey = true;
    return [];
  }
  const [bibles, languageNames] = await Promise.all([loadLicensedBibles(), getLanguageNames()]);
  return bibles
    .filter((bible) => !YOUVERSION_EXCLUDED_BIBLES.has(bible.id))
    .map((bible) => toCatalogEntry(bible, languageNames));
}

const bibleDetailCache = new Map<number, { data: YouVersionBible; expires: number }>();

async function getBibleDetail(bibleId: number): Promise<YouVersionBible> {
  const cached = bibleDetailCache.get(bibleId);
  if (cached && cached.expires > Date.now()) return cached.data;
  const { bible } = sdk();
  let data: YouVersionBible;
  try {
    data = await youVersionCall(() => bible.getVersion(bibleId) as Promise<YouVersionBible>);
  } catch (err) {
    if (err instanceof ScriptureError && err.code === "CHAPTER_NOT_FOUND") {
      throw new ScriptureError("TRANSLATION_NOT_FOUND", "This version isn't available.", 404);
    }
    if (!cached) throw err;
    cached.expires = Date.now() + RETRY_AFTER_FAILURE_MS;
    return cached.data;
  }
  bibleDetailCache.set(bibleId, { data, expires: Date.now() + TEXT_TTL_MS });
  return data;
}

export function youVersionAttribution(bible: YouVersionBible): YouVersionAttribution | null {
  const text = getPassageAttribution(bible)?.text.trim();
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
    const { bible: bibleClient } = sdk();
    const passage = await youVersionCall(() =>
      bibleClient.getPassage(bibleId, `${usfmBook}.${chapter}`, "html", true, true, false),
    )
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
