BEGIN;
--> statement-breakpoint
ALTER TABLE "public"."verse_strong_map"
  ADD COLUMN IF NOT EXISTS "source" varchar(16) NOT NULL DEFAULT 'legacy';
--> statement-breakpoint
ALTER TABLE "public"."verse_strong_map"
  ADD COLUMN IF NOT EXISTS "is_ai_generated" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
ALTER TABLE "public"."verse_strong_map"
  ADD COLUMN IF NOT EXISTS "token_index" integer;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "verse_strong_verse_source_idx"
  ON "public"."verse_strong_map" ("verse_id", "source");
--> statement-breakpoint
COMMIT;
