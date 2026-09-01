BEGIN;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."bible_small_group_live_session" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" varchar NOT NULL,
  "started_by" varchar NOT NULL,
  "started_at" timestamptz DEFAULT now() NOT NULL,
  "ended_at" timestamptz,
  "room_name" text NOT NULL,
  "last_heartbeat_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bible_small_group_live_session_group_idx"
  ON "public"."bible_small_group_live_session" ("group_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "bible_small_group_live_session_active_group_uniq"
  ON "public"."bible_small_group_live_session" ("group_id")
  WHERE "ended_at" IS NULL;
--> statement-breakpoint
ALTER TABLE "public"."bible_small_group_live_session"
  ADD CONSTRAINT "bible_small_group_live_session_group_id_fk"
  FOREIGN KEY ("group_id") REFERENCES "public"."bible_small_group"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."bible_small_group_live_session"
  ADD CONSTRAINT "bible_small_group_live_session_started_by_fk"
  FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
COMMIT;
