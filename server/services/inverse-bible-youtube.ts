/**
 * InVerse lesson episodes from the public @inVerseBible uploads feed.
 *
 * The feed is the only YouTube request. Watch pages and player documents
 * answer HTTP 429 from Render, so duration is not used for this channel.
 * A lesson episode has a title matching /^\d{1,2}\s+\S/, lesson number 1–14,
 * and a normal /watch link. Shorts links are skipped. The list is cached for
 * 24 hours. A database store keeps episodes that have aged off the 15-item
 * uploads feed across a server restart. An empty result is not kept for the
 * day. Opening a lesson screen does not refetch.
 *
 * Titles look like "7 Now Hear This!" or "6 The Prophetic Writings". The
 * leading number is the lesson. The row title is "Lesson 6 · The Prophetic
 * Writings". The thumbnail URL is the RSS media:thumbnail, unchanged.
 *
 * A video belongs to the quarterly whose start and end dates contain its
 * upload day (UTC). InVerse 2026-04-cq is 27/09/2026–26/12/2026, so
 * "1 The Creator Speaks" (2026-09-27) is this quarter and
 * "13 Earth’s Closing Scenes" (2026-09-20) stays with the previous one.
 */

export const INVERSE_BIBLE_CHANNEL_ID = "UCgHAzKGx-UWZwKhltWQc1lQ";
export const INVERSE_BIBLE_UPLOADS_PLAYLIST_ID = "UUgHAzKGx-UWZwKhltWQc1lQ";
export const INVERSE_EPISODE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
/** An empty qualification is retried, not kept for the day. */
export const INVERSE_EMPTY_LIST_RETRY_MS = 15 * 60 * 1000;
const LESSON_NUMBER_MAX = 14;

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export interface InverseUpload {
  youtubeId: string;
  youtubeTitle: string;
  lessonNumber: number;
  lessonTitle: string;
  rowTitle: string;
  thumbnail: string;
  channel: string;
  publishedAt: string;
}

export type InverseEpisode = InverseUpload;

export interface InverseQuarterWindow {
  curriculumType?: string | null;
  startDate?: string | null;
  endDate?: string | null;
}

export interface InverseEpisodeCacheEntry {
  fetchedAt: number;
  episodes: InverseEpisode[];
}

export interface InverseEpisodeStore {
  read(): Promise<InverseEpisodeCacheEntry | null>;
  write(entry: InverseEpisodeCacheEntry): Promise<void>;
}

const memoryStore: InverseEpisodeStore = {
  async read() {
    return null;
  },
  async write() {},
};

let cache: InverseEpisodeCacheEntry | null = null;
let inflight: Promise<InverseEpisode[]> | null = null;
let failedFetchAt: number | null = null;
let episodeStore: InverseEpisodeStore = memoryStore;

export function setInverseEpisodeStore(store: InverseEpisodeStore): void {
  episodeStore = store;
}

export function resetInverseEpisodeCacheForTests(): void {
  cache = null;
  inflight = null;
  failedFetchAt = null;
  episodeStore = memoryStore;
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function tagText(xml: string, name: string): string {
  const match = xml.match(
    new RegExp(`<(?:[\\w-]+:)?${name}[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${name}>`),
  );
  return match ? decodeXml(match[1].trim()) : "";
}

/** "6 The Prophetic Writings" → lesson 6, row "Lesson 6 · The Prophetic Writings". */
export function parseInverseEpisodeTitle(title: string): {
  lessonNumber: number;
  lessonTitle: string;
  rowTitle: string;
} | null {
  const match = /^(\d{1,2})\s+(\S.*)$/.exec(title.trim());
  if (!match) return null;
  const lessonNumber = Number(match[1]);
  const lessonTitle = match[2].trim();
  if (!Number.isInteger(lessonNumber) || lessonNumber < 1 || lessonNumber > LESSON_NUMBER_MAX) return null;
  if (!lessonTitle) return null;
  return {
    lessonNumber,
    lessonTitle,
    rowTitle: `Lesson ${lessonNumber} · ${lessonTitle}`,
  };
}

function isNormalWatchLink(href: string, youtubeId: string): boolean {
  try {
    const url = new URL(href);
    if (url.pathname.toLowerCase().includes("/shorts/")) return false;
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtube.com" || host === "m.youtube.com") {
      return url.pathname === "/watch" && url.searchParams.get("v") === youtubeId;
    }
  } catch {
    return false;
  }
  return false;
}

/** A /shorts/ link disqualifies the entry. A normal /watch link for this id is required. */
function entryHasWatchLink(body: string, youtubeId: string): boolean {
  const hrefs = [...body.matchAll(/\bhref="([^"]+)"/gi)].map((match) => decodeXml(match[1]));
  if (hrefs.some((href) => /\/shorts\//i.test(href))) return false;
  return hrefs.some((href) => isNormalWatchLink(href, youtubeId));
}

/** Calendar day of an upload, from the UTC date in the timestamp. */
export function uploadDayKey(publishedAt: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(publishedAt.trim());
  if (!match) return null;
  const day = match[1];
  const parsed = Date.parse(`${day}T00:00:00Z`);
  if (!Number.isFinite(parsed)) return null;
  return day;
}

/** Adventech stores quarter bounds as DD/MM/YYYY. ISO dates are accepted too. */
export function quarterDayKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (dmy) {
    const day = dmy[1].padStart(2, "0");
    const month = dmy[2].padStart(2, "0");
    const key = `${dmy[3]}-${month}-${day}`;
    return uploadDayKey(key);
  }
  return uploadDayKey(trimmed);
}

export function uploadFallsInQuarter(
  publishedAt: string,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): boolean {
  const published = uploadDayKey(publishedAt);
  const start = quarterDayKey(startDate);
  const end = quarterDayKey(endDate);
  if (!published || !start || !end) return false;
  return published >= start && published <= end;
}

export function parseInverseUploadsRss(xml: string): InverseUpload[] {
  const head = xml.split("<entry>")[0] ?? xml;
  const playlistId = tagText(head, "playlistId");
  const channelId = tagText(head, "channelId");
  if (playlistId !== INVERSE_BIBLE_UPLOADS_PLAYLIST_ID) {
    throw new Error(
      `InVerse uploads RSS id ${playlistId || "(missing)"} did not match the channel uploads playlist`,
    );
  }
  if (channelId !== INVERSE_BIBLE_CHANNEL_ID) {
    throw new Error("InVerse uploads RSS is not from @inVerseBible");
  }

  const uploads: InverseUpload[] = [];
  for (const chunk of xml.split("<entry>").slice(1)) {
    const body = chunk.split("</entry>")[0] ?? chunk;
    const youtubeId = tagText(body, "videoId");
    const publishedAt = tagText(body, "published");
    const youtubeTitle = tagText(body, "title");
    const channel = tagText(body, "name") || "inVerse Bible";
    const thumbnail = body.match(/<media:thumbnail\b[^>]*\burl="([^"]+)"/i)?.[1] ?? "";
    const parsed = parseInverseEpisodeTitle(youtubeTitle);
    if (!parsed) continue;
    if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) continue;
    if (!entryHasWatchLink(body, youtubeId)) continue;
    if (!uploadDayKey(publishedAt)) continue;
    if (!thumbnail.startsWith("https://")) continue;
    uploads.push({
      youtubeId,
      youtubeTitle,
      lessonNumber: parsed.lessonNumber,
      lessonTitle: parsed.lessonTitle,
      rowTitle: parsed.rowTitle,
      thumbnail,
      channel,
      publishedAt,
    });
  }
  return uploads;
}

export function matchInverseEpisode(
  episodes: readonly InverseEpisode[],
  query: {
    lessonNumber: number;
    startDate?: string | null;
    endDate?: string | null;
  },
): InverseEpisode | null {
  const matches = episodes.filter(
    (episode) =>
      episode.lessonNumber === query.lessonNumber &&
      uploadFallsInQuarter(episode.publishedAt, query.startDate, query.endDate),
  );
  matches.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return matches[0] ?? null;
}

/** Other episodes from this quarter, newest upload first. The current lesson is left out. */
export function earlierInverseEpisodes(
  episodes: readonly InverseEpisode[],
  query: {
    lessonNumber: number;
    startDate?: string | null;
    endDate?: string | null;
  },
): InverseEpisode[] {
  return episodes
    .filter(
      (episode) =>
        episode.lessonNumber < query.lessonNumber &&
        uploadFallsInQuarter(episode.publishedAt, query.startDate, query.endDate),
    )
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

export function earlierInverseLessonClips(
  episodes: readonly InverseEpisode[],
  query: {
    lessonNumber: number;
    startDate?: string | null;
    endDate?: string | null;
  },
) {
  return earlierInverseEpisodes(episodes, query).map((episode) => ({
    ...inverseEpisodeArtistGroup(episode).clips[0],
    artist: episode.channel,
  }));
}

export async function loadEarlierInverseLessonClips(
  quarterly: InverseQuarterWindow,
  lessonNumber: number,
) {
  try {
    const episodes = await getInverseEpisodes();
    return earlierInverseLessonClips(episodes, {
      lessonNumber,
      startDate: quarterly.startDate,
      endDate: quarterly.endDate,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "episode list failed";
    console.error(`[inverse-bible] earlier episodes unavailable: ${message}`);
    return [];
  }
}

export function inverseEpisodeArtistGroup(episode: InverseEpisode): {
  artist: string;
  clips: Array<{
    src: string;
    title: string;
    thumbnail: string;
    target: string;
    youtubeId: string;
  }>;
} {
  return {
    artist: episode.channel,
    clips: [
      {
        src: `https://www.youtube.com/watch?v=${episode.youtubeId}`,
        title: episode.rowTitle,
        thumbnail: episode.thumbnail,
        target: episode.youtubeId,
        youtubeId: episode.youtubeId,
      },
    ],
  };
}

export function withInverseYouTubeLesson<T extends { lessonNumber: number; videoByArtist?: unknown }>(
  lesson: T,
  quarterly: InverseQuarterWindow,
  episodes: readonly InverseEpisode[],
): T {
  if (quarterly.curriculumType !== "inverse") return lesson;
  const episode = matchInverseEpisode(episodes, {
    lessonNumber: lesson.lessonNumber,
    startDate: quarterly.startDate,
    endDate: quarterly.endDate,
  });
  if (!episode) return lesson;
  return { ...lesson, videoByArtist: [inverseEpisodeArtistGroup(episode)] };
}

function countLessonTitles(xml: string): number {
  let count = 0;
  for (const chunk of xml.split("<entry>").slice(1)) {
    const body = chunk.split("</entry>")[0] ?? chunk;
    if (parseInverseEpisodeTitle(tagText(body, "title"))) count += 1;
  }
  return count;
}

export async function loadInverseEpisodes(
  fetchImpl: typeof fetch = fetch,
): Promise<InverseEpisode[]> {
  const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(INVERSE_BIBLE_UPLOADS_PLAYLIST_ID)}`;
  const response = await fetchImpl(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  const xml = await response.text();
  const entryCount = Math.max(0, xml.split("<entry>").length - 1);
  if (!response.ok) {
    console.log(`[inverse-bible] uploads feed HTTP ${response.status}, ${entryCount} entries`);
    throw new Error(`YouTube request failed (${response.status})`);
  }
  const episodes = parseInverseUploadsRss(xml);
  console.log(
    `[inverse-bible] uploads feed HTTP ${response.status}, ${entryCount} entries, ${countLessonTitles(xml)} lesson titles, qualified ${episodes.length}`,
  );
  return episodes;
}

/** Keep episodes that have aged off the 15-item uploads feed, for about two quarters. */
const REMEMBERED_EPISODE_MS = 200 * 24 * 60 * 60 * 1000;

export function mergeInverseEpisodes(
  previous: readonly InverseEpisode[],
  latest: readonly InverseEpisode[],
  now: number,
): InverseEpisode[] {
  const byId = new Map<string, InverseEpisode>();
  for (const episode of previous) byId.set(episode.youtubeId, episode);
  for (const episode of latest) byId.set(episode.youtubeId, episode);
  const cutoff = now - REMEMBERED_EPISODE_MS;
  return [...byId.values()]
    .filter((episode) => {
      const published = Date.parse(episode.publishedAt);
      return Number.isFinite(published) && published >= cutoff;
    })
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}

function cacheIsFresh(entry: InverseEpisodeCacheEntry, now: number): boolean {
  if (entry.episodes.length === 0) return false;
  return now >= entry.fetchedAt && now - entry.fetchedAt < INVERSE_EPISODE_CACHE_TTL_MS;
}

async function rememberedEpisodes(): Promise<InverseEpisodeCacheEntry | null> {
  if (cache) return cache;
  try {
    const saved = await episodeStore.read();
    if (saved) cache = saved;
    return saved;
  } catch (error) {
    const message = error instanceof Error ? error.message : "cache read failed";
    console.error(`[inverse-bible] kept the in-memory list: ${message}`);
    return null;
  }
}

/**
 * Qualified episodes, refreshed at most once a day. A failed refresh keeps
 * the previous list and lets the next caller try again.
 */
export async function getInverseEpisodes(options?: {
  now?: number;
  fetchImpl?: typeof fetch;
}): Promise<InverseEpisode[]> {
  const now = options?.now ?? Date.now();
  const remembered = await rememberedEpisodes();
  if (remembered && cacheIsFresh(remembered, now)) {
    return remembered.episodes;
  }
  if (
    failedFetchAt != null &&
    now >= failedFetchAt &&
    now - failedFetchAt < INVERSE_EMPTY_LIST_RETRY_MS
  ) {
    return remembered?.episodes.length ? remembered.episodes : [];
  }
  if (!inflight) {
    const fetchImpl = options?.fetchImpl ?? fetch;
    const startedAt = now;
    const previous = remembered?.episodes ?? [];
    inflight = loadInverseEpisodes(fetchImpl)
      .then(async (latest) => {
        const episodes = mergeInverseEpisodes(previous, latest, startedAt);
        if (episodes.length === 0) {
          failedFetchAt = startedAt;
          console.error("[inverse-bible] qualified 0 episodes; the stored lesson videos stay in place");
          return episodes;
        }
        failedFetchAt = null;
        const entry = { fetchedAt: startedAt, episodes };
        cache = entry;
        try {
          await episodeStore.write(entry);
        } catch (error) {
          const message = error instanceof Error ? error.message : "cache write failed";
          console.error(`[inverse-bible] list kept in memory: ${message}`);
        }
        return episodes;
      })
      .catch((error: unknown) => {
        failedFetchAt = startedAt;
        const message = error instanceof Error ? error.message : "feed failed";
        console.error(`[inverse-bible] feed refresh failed: ${message}`);
        return previous;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export async function lessonWithInverseEpisode<
  T extends { lessonNumber: number; videoByArtist?: unknown },
>(lesson: T, quarterly: InverseQuarterWindow): Promise<T> {
  if (quarterly.curriculumType !== "inverse") return lesson;
  try {
    const episodes = await getInverseEpisodes();
    return withInverseYouTubeLesson(lesson, quarterly, episodes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "episode list failed";
    console.error(`[inverse-bible] using the stored lesson video: ${message}`);
    return lesson;
  }
}
