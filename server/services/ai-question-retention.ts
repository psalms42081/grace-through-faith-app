import { and, lt, ne } from "drizzle-orm";
import { searchCache } from "../../shared/schema";
import { db } from "../db";

/** Ask the Bible and other search_cache AI rows older than this are deleted. */
export const AI_QUESTION_RETENTION_DAYS = 30;

/**
 * Must match `SDA_LENS_MARKER_HASH` in cache-warmup.ts. That marker is not a
 * question log and must survive the daily purge.
 */
export const SEARCH_CACHE_LENS_MARKER_HASH = "sda-lens-cache-version";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function aiQuestionCutoff(now = new Date()): Date {
  return new Date(now.getTime() - AI_QUESTION_RETENTION_DAYS * ONE_DAY_MS);
}

export async function purgeExpiredAiQuestionRows(
  now = new Date(),
): Promise<number> {
  const cutoff = aiQuestionCutoff(now);
  const deleted = await db
    .delete(searchCache)
    .where(
      and(
        lt(searchCache.createdAt, cutoff),
        ne(searchCache.queryHash, SEARCH_CACHE_LENS_MARKER_HASH),
      ),
    )
    .returning({ id: searchCache.id });
  return deleted.length;
}

let schedulerStarted = false;

export function startAiQuestionRetentionScheduler(
  intervalMs = ONE_DAY_MS,
): void {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const run = () => {
    void purgeExpiredAiQuestionRows()
      .then((removed) => {
        if (removed > 0) {
          console.log(`[ai-retention] deleted ${removed} search_cache rows older than ${AI_QUESTION_RETENTION_DAYS} days`);
        }
      })
      .catch((err) => {
        console.error("[ai-retention] purge failed:", err);
      });
  };

  run();
  setInterval(run, intervalMs);
  console.log(
    `[ai-retention] daily purge of search_cache rows older than ${AI_QUESTION_RETENTION_DAYS} days`,
  );
}
