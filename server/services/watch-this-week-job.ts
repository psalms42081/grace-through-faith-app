import { db } from "../db";
import { featuredVideos } from "../../shared/schema";
import {
  WATCH_THIS_WEEK_CRON,
  WATCH_THIS_WEEK_TIMEZONE,
  WATCH_WINDOW_MS,
  loadAllowListedPlaylistVideos,
  loadWatchFacts,
  nextSydneySaturdayMidnight,
  planWatchThisWeek,
  visibleFeaturedVideo,
  type FeaturedVideoRow,
  type VideoFacts,
} from "./watch-this-week";

export interface WatchJobResult {
  status: "already-featured" | "featured" | "kept-previous" | "empty";
  featuredWeek: string;
  youtubeId: string | null;
  title: string | null;
  channel: string | null;
  playlistId: string | null;
  publishedAt: string | null;
  durationSeconds: number | null;
}

function safeError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/postgres(?:ql)?:\/\/\S+/gi, "[database]");
}

function mapRow(row: typeof featuredVideos.$inferSelect): FeaturedVideoRow {
  const published =
    row.publishedAt instanceof Date
      ? row.publishedAt.toISOString()
      : new Date(row.publishedAt).toISOString();
  return {
    youtubeId: row.youtubeId,
    title: row.title,
    channel: row.channel,
    publishedAt: published,
    featuredWeek: row.featuredWeek,
    hidden: row.hidden,
  };
}

/**
 * Pick this Sydney week's video and store it.
 * If the week already has a visible row, this is a no-op.
 * If nothing in the last 30 days qualifies, or a fetch fails, the previous
 * visible row stays on the card. Older videos are not inserted as a fallback.
 */
export async function runWatchThisWeekJob(now = new Date()): Promise<WatchJobResult> {
  const history = (await db.select().from(featuredVideos)).map(mapRow);
  const preview = planWatchThisWeek({
    now,
    videos: [],
    factsById: new Map(),
    history,
  });
  if (preview.outcome === "already-featured") {
    const current = history.find((row) => row.youtubeId === preview.youtubeId);
    return {
      status: "already-featured",
      featuredWeek: preview.featuredWeek,
      youtubeId: preview.youtubeId,
      title: current?.title ?? null,
      channel: current?.channel ?? null,
      playlistId: null,
      publishedAt: current?.publishedAt ?? null,
      durationSeconds: null,
    };
  }

  try {
    const videos = await loadAllowListedPlaylistVideos();
    const blocked = new Set(history.map((row) => row.youtubeId));
    const cutoff = now.getTime() - WATCH_WINDOW_MS;
    const pending = videos
      .filter((video) => {
        const published = Date.parse(video.publishedAt);
        return (
          Number.isFinite(published) &&
          published <= now.getTime() &&
          published >= cutoff &&
          !blocked.has(video.youtubeId)
        );
      })
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));

    const factsById = new Map<string, VideoFacts>();
    for (const video of pending) {
      factsById.set(video.youtubeId, await loadWatchFacts(video.youtubeId));
    }

    const plan = planWatchThisWeek({ now, videos: pending, factsById, history });
    if (plan.outcome !== "feature" || !plan.video) {
      const previous = history.find((row) => row.youtubeId === plan.youtubeId);
      console.log(
        `[watch-this-week] ${plan.featuredWeek} ${plan.outcome}` +
          (plan.youtubeId ? `; keeping ${plan.youtubeId}` : "; card empty"),
      );
      return {
        status: plan.outcome === "empty" ? "empty" : "kept-previous",
        featuredWeek: plan.featuredWeek,
        youtubeId: plan.youtubeId,
        title: previous?.title ?? null,
        channel: previous?.channel ?? null,
        playlistId: null,
        publishedAt: previous?.publishedAt ?? null,
        durationSeconds: null,
      };
    }

    const facts = factsById.get(plan.video.youtubeId);
    await db
      .insert(featuredVideos)
      .values({
        youtubeId: plan.video.youtubeId,
        title: plan.video.title,
        channel: plan.video.channel,
        publishedAt: new Date(plan.video.publishedAt),
        featuredWeek: plan.featuredWeek,
        hidden: false,
      })
      .onConflictDoNothing();

    console.log(
      `[watch-this-week] featured ${plan.video.youtubeId} for ${plan.featuredWeek} ` +
        `(${plan.video.playlistId}, ${facts?.durationSeconds ?? "?"}s)`,
    );
    return {
      status: "featured",
      featuredWeek: plan.featuredWeek,
      youtubeId: plan.video.youtubeId,
      title: plan.video.title,
      channel: plan.video.channel,
      playlistId: plan.video.playlistId,
      publishedAt: plan.video.publishedAt,
      durationSeconds: facts?.durationSeconds ?? null,
    };
  } catch (error) {
    console.error(`[watch-this-week] job failed; keeping the previous video: ${safeError(error)}`);
    const kept = visibleFeaturedVideo(history);
    return {
      status: kept ? "kept-previous" : "empty",
      featuredWeek: preview.featuredWeek,
      youtubeId: kept?.youtubeId ?? null,
      title: kept?.title ?? null,
      channel: kept?.channel ?? null,
      playlistId: null,
      publishedAt: kept?.publishedAt ?? null,
      durationSeconds: null,
    };
  }
}

let schedulerStarted = false;

/**
 * Saturday 00:00 Australia/Sydney. Cron expression: `0 0 * * 6`
 * (minute hour day-of-month month day-of-week, Sunday = 0, Saturday = 6).
 * Timezone name Australia/Sydney — not a fixed UTC offset.
 * Also catches up once on startup when the current Sydney week has no visible row.
 */
export function startWatchThisWeekScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const run = () => {
    void runWatchThisWeekJob().catch((error) => {
      console.error(`[watch-this-week] scheduler run failed: ${safeError(error)}`);
    });
  };

  const arm = () => {
    const next = nextSydneySaturdayMidnight(new Date());
    const delay = Math.max(1000, next.getTime() - Date.now());
    console.log(
      `[watch-this-week] next run ${next.toISOString()} ` +
        `(cron ${WATCH_THIS_WEEK_CRON} ${WATCH_THIS_WEEK_TIMEZONE})`,
    );
    setTimeout(() => {
      run();
      arm();
    }, delay);
  };

  run();
  arm();
  console.log(
    `[watch-this-week] scheduled cron ${WATCH_THIS_WEEK_CRON} timezone ${WATCH_THIS_WEEK_TIMEZONE}`,
  );
}
