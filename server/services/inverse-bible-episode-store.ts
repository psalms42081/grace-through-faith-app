import { sql } from "drizzle-orm";
import { db } from "../db";
import type {
  InverseEpisode,
  InverseEpisodeCacheEntry,
  InverseEpisodeStore,
} from "./inverse-bible-youtube";

const ROW_ID = "current";

function isMissingRelation(error: unknown): boolean {
  const coded = error as { code?: string; cause?: { code?: string } };
  return coded.code === "42P01" || coded.cause?.code === "42P01";
}

function isInverseEpisode(value: unknown): value is InverseEpisode {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<InverseEpisode>;
  return (
    typeof row.youtubeId === "string" &&
    /^[A-Za-z0-9_-]{11}$/.test(row.youtubeId) &&
    typeof row.youtubeTitle === "string" &&
    typeof row.lessonNumber === "number" &&
    typeof row.lessonTitle === "string" &&
    typeof row.rowTitle === "string" &&
    typeof row.thumbnail === "string" &&
    typeof row.channel === "string" &&
    typeof row.publishedAt === "string"
  );
}

function readEpisodes(value: unknown): InverseEpisode[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isInverseEpisode);
}

export const inverseEpisodeDbStore: InverseEpisodeStore = {
  async read() {
    try {
      const result = await db.execute(sql`
        SELECT fetched_at, episodes
          FROM inverse_bible_episode_cache
         WHERE id = ${ROW_ID}
      `);
      const row = (result.rows as Array<{ fetched_at: Date | string; episodes: unknown }>)[0];
      if (!row) return null;
      const fetchedAt = new Date(row.fetched_at).getTime();
      if (!Number.isFinite(fetchedAt)) return null;
      return { fetchedAt, episodes: readEpisodes(row.episodes) };
    } catch (error) {
      if (isMissingRelation(error)) return null;
      throw error;
    }
  },

  async write(entry: InverseEpisodeCacheEntry) {
    const fetchedAt = new Date(entry.fetchedAt).toISOString();
    const episodes = JSON.stringify(entry.episodes);
    try {
      await db.execute(sql`
        INSERT INTO inverse_bible_episode_cache (id, fetched_at, episodes)
        VALUES (${ROW_ID}, ${fetchedAt}::timestamptz, ${episodes}::jsonb)
        ON CONFLICT (id) DO UPDATE
          SET fetched_at = EXCLUDED.fetched_at,
              episodes = EXCLUDED.episodes
      `);
    } catch (error) {
      if (isMissingRelation(error)) return;
      throw error;
    }
  },
};
