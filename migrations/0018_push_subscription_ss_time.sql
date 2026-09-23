BEGIN;
--> statement-breakpoint
ALTER TABLE "public"."push_subscription"
  ADD COLUMN IF NOT EXISTS "ss_time_local" text;
--> statement-breakpoint
COMMIT;
