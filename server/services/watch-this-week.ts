/**
 * Weekly Discover video from three public Seventh-day Adventist Church playlists.
 *
 * Schedule: cron `0 0 * * 6` in Australia/Sydney.
 * That is Saturday 00:00 in the Sydney civil timezone (5-field cron, Sunday = 0).
 * The clock is resolved with Intl and the timezone name, so AEDT (UTC+11) and
 * AEST (UTC+10) both fire at local Saturday midnight. Do not hardcode +11.
 *
 * featured_week is the Saturday (YYYY-MM-DD) that opened the current Sydney week.
 * The Saturday 00:00 job writes that Saturday's date.
 */

export const WATCH_THIS_WEEK_CRON = "0 0 * * 6";
export const WATCH_THIS_WEEK_TIMEZONE = "Australia/Sydney";
export const OFFICIAL_CHANNEL_ID = "UCu5mxn89NdGYSJC3kbHzmDw";
export const OFFICIAL_CHANNEL_NAME = "Seventh-day Adventist Church";

/** Newest qualifying upload must be at least this long. Under 5 minutes is skipped. */
export const MIN_DURATION_SECONDS = 5 * 60;
/** Uploads older than this are not eligible. There is no older-video fallback. */
export const WATCH_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export const WATCH_PLAYLISTS = [
  {
    id: "PLOkz7KYTpY7g",
    title: "The Book of Daniel (1–6) with Dr. Artur A. Stele",
  },
  {
    id: "PLDTnZhgYdEBQ",
    title: "Unlocking Bible Answers",
  },
  {
    id: "PL-k2Gb-DBYo_veuio-fKkSQT3Cy2I8kRd",
    title: "From the Heart",
  },
] as const;

export const WATCH_PLAYLIST_IDS: ReadonlySet<string> = new Set(
  WATCH_PLAYLISTS.map((playlist) => playlist.id),
);

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export interface PlaylistCandidate {
  youtubeId: string;
  title: string;
  channel: string;
  channelId: string;
  playlistId: string;
  publishedAt: string;
}

export interface VideoFacts {
  durationSeconds: number | null;
  isShort: boolean;
  isLive: boolean;
  isPremiere: boolean;
}

export interface FeaturedVideoRow {
  youtubeId: string;
  title: string;
  channel: string;
  publishedAt: string;
  featuredWeek: string;
  hidden: boolean;
}

export type WatchPlanOutcome =
  | "already-featured"
  | "feature"
  | "keep-previous"
  | "empty";

export interface WatchPlan {
  outcome: WatchPlanOutcome;
  featuredWeek: string;
  youtubeId: string | null;
  video: PlaylistCandidate | null;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
}

export function zonedParts(instant: Date, timeZone: string): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const bag: Record<string, string> = {};
  for (const part of fmt.formatToParts(instant)) {
    if (part.type !== "literal") bag[part.type] = part.value;
  }
  let hour = Number(bag.hour);
  if (hour === 24) hour = 0;
  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour,
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday: bag.weekday,
  };
}

function isoDate(parts: { year: number; month: number; day: number }): string {
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

function addCalendarDays(
  year: number,
  month: number,
  day: number,
  delta: number,
): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + delta);
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

/** Milliseconds to add to a UTC instant to get the timezone's wall clock as UTC. */
export function timeZoneOffsetMs(instant: Date, timeZone: string): number {
  const parts = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  return asUtc - instant.getTime();
}

export function zonedTimeToUtc(
  parts: { year: number; month: number; day: number; hour: number; minute: number; second?: number },
  timeZone: string,
): Date {
  const guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second ?? 0,
  );
  const offset = timeZoneOffsetMs(new Date(guess), timeZone);
  let utc = guess - offset;
  const offsetAtResult = timeZoneOffsetMs(new Date(utc), timeZone);
  if (offsetAtResult !== offset) utc = guess - offsetAtResult;
  return new Date(utc);
}

/** Saturday YYYY-MM-DD that opened the Australia/Sydney week containing `now`. */
export function sydneyWeekSaturday(now: Date): string {
  const parts = zonedParts(now, WATCH_THIS_WEEK_TIMEZONE);
  const weekdayIndex = WEEKDAYS.indexOf(parts.weekday as (typeof WEEKDAYS)[number]);
  if (weekdayIndex < 0) {
    throw new Error(`Could not read the Sydney weekday for ${now.toISOString()}`);
  }
  const daysSinceSaturday = (weekdayIndex + 1) % 7;
  return isoDate(addCalendarDays(parts.year, parts.month, parts.day, -daysSinceSaturday));
}

/**
 * The next Saturday 00:00:00 in Australia/Sydney, strictly after `now`.
 * An instant that is already Saturday 00:00 schedules the following week so a
 * timer cannot tight-loop. The startup catch-up covers that exact minute.
 */
export function nextSydneySaturdayMidnight(now: Date): Date {
  const parts = zonedParts(now, WATCH_THIS_WEEK_TIMEZONE);
  const weekdayIndex = WEEKDAYS.indexOf(parts.weekday as (typeof WEEKDAYS)[number]);
  if (weekdayIndex < 0) {
    throw new Error(`Could not read the Sydney weekday for ${now.toISOString()}`);
  }
  let daysUntilSaturday = (6 - weekdayIndex + 7) % 7;
  const midnight =
    parts.hour === 0 && parts.minute === 0 && parts.second === 0;
  if (daysUntilSaturday === 0 && midnight) daysUntilSaturday = 7;
  if (daysUntilSaturday === 0) daysUntilSaturday = 7;
  const target = addCalendarDays(parts.year, parts.month, parts.day, daysUntilSaturday);
  return zonedTimeToUtc(
    { ...target, hour: 0, minute: 0, second: 0 },
    WATCH_THIS_WEEK_TIMEZONE,
  );
}

export function classifyVideoFacts(facts: VideoFacts): {
  eligible: boolean;
  reason: string;
} {
  if (facts.isShort) return { eligible: false, reason: "short" };
  if (facts.isLive) return { eligible: false, reason: "live" };
  if (facts.isPremiere) return { eligible: false, reason: "premiere" };
  if (facts.durationSeconds == null) {
    return { eligible: false, reason: "duration-unknown" };
  }
  if (!Number.isFinite(facts.durationSeconds) || facts.durationSeconds < 0) {
    return { eligible: false, reason: "duration-unknown" };
  }
  if (facts.durationSeconds < MIN_DURATION_SECONDS) {
    return { eligible: false, reason: "under-5-minutes" };
  }
  return { eligible: true, reason: "eligible" };
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

export function parsePlaylistRss(xml: string, expectedPlaylistId: string): PlaylistCandidate[] {
  if (!WATCH_PLAYLIST_IDS.has(expectedPlaylistId)) {
    throw new Error(`Playlist ${expectedPlaylistId} is not on the Watch allow-list`);
  }
  const head = xml.split("<entry>")[0] ?? xml;
  const playlistId = tagText(head, "playlistId");
  const channelId = tagText(head, "channelId");
  if (playlistId !== expectedPlaylistId) {
    throw new Error(
      `Playlist RSS id ${playlistId || "(missing)"} did not match ${expectedPlaylistId}`,
    );
  }
  if (channelId !== OFFICIAL_CHANNEL_ID) {
    throw new Error(
      `Playlist ${expectedPlaylistId} is not from the official church channel`,
    );
  }

  const chunks = xml.split("<entry>").slice(1);
  const videos: PlaylistCandidate[] = [];
  for (const chunk of chunks) {
    const body = chunk.split("</entry>")[0] ?? chunk;
    const youtubeId = tagText(body, "videoId");
    const publishedAt = tagText(body, "published");
    const title = tagText(body, "title");
    const channel = tagText(body, "name") || OFFICIAL_CHANNEL_NAME;
    if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId) || !publishedAt || !title) continue;
    videos.push({
      youtubeId,
      title,
      channel,
      channelId,
      playlistId,
      publishedAt,
    });
  }
  return videos;
}

function extractJsonObject(html: string, marker: string): Record<string, unknown> | null {
  const markerAt = html.indexOf(marker);
  if (markerAt < 0) return null;
  const brace = html.indexOf("{", markerAt);
  if (brace < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = brace; i < html.length; i++) {
    const char = html[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(html.slice(brace, i + 1)) as unknown;
          if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
        } catch {
          return null;
        }
        return null;
      }
    }
  }
  return null;
}

interface PlayerResponse {
  playabilityStatus?: { status?: string; reason?: string };
  videoDetails?: {
    videoId?: string;
    lengthSeconds?: string;
    isLiveContent?: boolean;
    isShort?: boolean;
  };
  microformat?: {
    playerMicroformatRenderer?: {
      liveBroadcastDetails?: {
        isLiveNow?: boolean;
        startTimestamp?: string;
        endTimestamp?: string;
      };
    };
  };
}

function readPlayer(html: string): PlayerResponse | null {
  return (
    (extractJsonObject(html, "ytInitialPlayerResponse =") as PlayerResponse | null) ??
    (extractJsonObject(html, '"ytInitialPlayerResponse":') as PlayerResponse | null)
  );
}

/**
 * Classify a public watch-page HTML document. No YouTube Data API key.
 * Missing lengthSeconds stays unknown and is therefore not eligible.
 */
export function parseWatchPage(html: string, youtubeId: string, finalUrl = ""): VideoFacts {
  const player = readPlayer(html);
  const details = player?.videoDetails?.videoId === youtubeId ? player.videoDetails : undefined;
  const live = player?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails;
  const status = player?.playabilityStatus?.status ?? "";
  const reason = player?.playabilityStatus?.reason ?? "";

  let durationSeconds: number | null = null;
  if (details?.lengthSeconds && /^\d+$/.test(details.lengthSeconds)) {
    durationSeconds = Number(details.lengthSeconds);
  } else {
    const marker = `"videoDetails":{"videoId":"${youtubeId}"`;
    const at = html.indexOf(marker);
    const slice = at >= 0 ? html.slice(at, at + 4000) : "";
    const match = slice.match(/"lengthSeconds":"(\d+)"/);
    if (match) durationSeconds = Number(match[1]);
  }

  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] ?? "";
  const isShort =
    details?.isShort === true ||
    finalUrl.includes("/shorts/") ||
    canonical.includes("/shorts/") ||
    html.includes("WEB_PAGE_TYPE_SHORTS");

  const isLive = live?.isLiveNow === true || (details?.isLiveContent === true && status !== "OK");
  const isPremiere =
    status === "LIVE_STREAM_OFFLINE" ||
    /premiere/i.test(reason) ||
    (live != null && live.isLiveNow !== true && !live.endTimestamp);

  return { durationSeconds, isShort, isLive, isPremiere };
}

export function chooseFeaturedVideo(args: {
  now: Date;
  videos: readonly PlaylistCandidate[];
  factsById: ReadonlyMap<string, VideoFacts>;
  blockedIds: ReadonlySet<string>;
}): PlaylistCandidate | null {
  const cutoff = args.now.getTime() - WATCH_WINDOW_MS;
  const eligible = args.videos.filter((video) => {
    if (!WATCH_PLAYLIST_IDS.has(video.playlistId)) return false;
    if (video.channelId !== OFFICIAL_CHANNEL_ID) return false;
    if (!/^[A-Za-z0-9_-]{11}$/.test(video.youtubeId)) return false;
    const published = Date.parse(video.publishedAt);
    if (!Number.isFinite(published) || published > args.now.getTime() || published < cutoff) {
      return false;
    }
    if (args.blockedIds.has(video.youtubeId)) return false;
    const facts = args.factsById.get(video.youtubeId);
    if (!facts) return false;
    return classifyVideoFacts(facts).eligible;
  });
  eligible.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  return eligible[0] ?? null;
}

/** Latest non-hidden featured row. Hidden current week falls back to the previous visible week. */
export function visibleFeaturedVideo(rows: readonly FeaturedVideoRow[]): FeaturedVideoRow | null {
  const visible = rows.filter((row) => row.hidden !== true && row.youtubeId);
  visible.sort((a, b) => {
    if (a.featuredWeek !== b.featuredWeek) return a.featuredWeek < b.featuredWeek ? 1 : -1;
    return Date.parse(b.publishedAt) - Date.parse(a.publishedAt);
  });
  return visible[0] ?? null;
}

/**
 * Decide this week's row without writing. A failed or empty qualification
 * keeps the previous visible feature. It never reaches outside the 30-day window.
 */
export function planWatchThisWeek(args: {
  now: Date;
  videos: readonly PlaylistCandidate[];
  factsById: ReadonlyMap<string, VideoFacts>;
  history: readonly FeaturedVideoRow[];
}): WatchPlan {
  const featuredWeek = sydneyWeekSaturday(args.now);
  const already = args.history.find(
    (row) => row.featuredWeek === featuredWeek && row.hidden !== true,
  );
  if (already) {
    return {
      outcome: "already-featured",
      featuredWeek,
      youtubeId: already.youtubeId,
      video: null,
    };
  }
  const blockedIds = new Set(args.history.map((row) => row.youtubeId));
  const video = chooseFeaturedVideo({
    now: args.now,
    videos: args.videos,
    factsById: args.factsById,
    blockedIds,
  });
  if (video) {
    return { outcome: "feature", featuredWeek, youtubeId: video.youtubeId, video };
  }
  const previous = visibleFeaturedVideo(args.history);
  if (previous) {
    return {
      outcome: "keep-previous",
      featuredWeek,
      youtubeId: previous.youtubeId,
      video: null,
    };
  }
  return { outcome: "empty", featuredWeek, youtubeId: null, video: null };
}

const WATCH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

async function fetchText(url: string, fetchImpl: typeof fetch): Promise<{ text: string; finalUrl: string }> {
  const response = await fetchImpl(url, {
    headers: {
      "User-Agent": WATCH_USER_AGENT,
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`YouTube request failed (${response.status}) for ${url}`);
  }
  return { text: await response.text(), finalUrl: response.url };
}

export async function loadAllowListedPlaylistVideos(
  fetchImpl: typeof fetch = fetch,
): Promise<PlaylistCandidate[]> {
  const collected: PlaylistCandidate[] = [];
  for (const playlist of WATCH_PLAYLISTS) {
    const url = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlist.id)}`;
    const { text } = await fetchText(url, fetchImpl);
    collected.push(...parsePlaylistRss(text, playlist.id));
  }
  return collected;
}

export async function loadWatchFacts(
  youtubeId: string,
  fetchImpl: typeof fetch = fetch,
): Promise<VideoFacts> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) {
    throw new Error("Invalid YouTube video id");
  }
  const url = `https://www.youtube.com/watch?v=${youtubeId}&hl=en`;
  const { text, finalUrl } = await fetchText(url, fetchImpl);
  return parseWatchPage(text, youtubeId, finalUrl);
}
