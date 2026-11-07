BEGIN;
--> statement-breakpoint
ALTER TABLE "public"."user_plan_progress"
  ADD COLUMN IF NOT EXISTS "completed_local_date" text;
--> statement-breakpoint
COMMIT;
