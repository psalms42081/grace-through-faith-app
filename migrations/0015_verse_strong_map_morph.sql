BEGIN;
--> statement-breakpoint
ALTER TABLE "public"."verse_strong_map"
  ADD COLUMN IF NOT EXISTS "morph" text;
--> statement-breakpoint
COMMIT;
