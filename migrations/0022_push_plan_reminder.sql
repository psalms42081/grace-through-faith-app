BEGIN;
--> statement-breakpoint
ALTER TABLE "public"."push_subscription"
  ADD COLUMN IF NOT EXISTS "plan_reminder" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "last_plan_local_date" text;
--> statement-breakpoint
COMMIT;
