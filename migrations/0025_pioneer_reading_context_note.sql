BEGIN;
--> statement-breakpoint
ALTER TABLE "public"."pioneer_readings"
  ADD COLUMN IF NOT EXISTS "context_note" text;
--> statement-breakpoint
COMMIT;
