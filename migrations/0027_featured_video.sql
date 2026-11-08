BEGIN;
-- Weekly "Watch this week" history. hidden = true tells the Saturday job to skip that video.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."featured_video" (
  "youtube_id" varchar(11) PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "channel" text NOT NULL,
  "published_at" timestamptz NOT NULL,
  "featured_week" date NOT NULL,
  "hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "featured_video_week_idx"
  ON "public"."featured_video" ("featured_week");
--> statement-breakpoint
COMMIT;
