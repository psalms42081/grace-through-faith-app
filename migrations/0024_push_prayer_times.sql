BEGIN;
--> statement-breakpoint
ALTER TABLE "public"."push_subscription"
  ADD COLUMN IF NOT EXISTS "prayer_times" jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS "last_prayer_sent" jsonb NOT NULL DEFAULT '{}'::jsonb;
--> statement-breakpoint
COMMIT;
