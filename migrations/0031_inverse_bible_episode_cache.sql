BEGIN;
-- Daily @inVerseBible episode list. One row so a restart still has lessons
-- that have aged off YouTube's 15-item uploads feed.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."inverse_bible_episode_cache" (
  "id" varchar(16) PRIMARY KEY NOT NULL DEFAULT 'current',
  "fetched_at" timestamptz NOT NULL,
  "episodes" jsonb NOT NULL
);
--> statement-breakpoint
COMMIT;
