BEGIN;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."pioneer_readings" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chapter_id" varchar NOT NULL,
  "paragraph_start" integer NOT NULL,
  "paragraph_end" integer NOT NULL,
  "editor_note" text NOT NULL DEFAULT '',
  "week_start" date,
  "sort_order" integer NOT NULL DEFAULT 0,
  "published" boolean NOT NULL DEFAULT false
);
--> statement-breakpoint
ALTER TABLE "public"."pioneer_readings"
  ADD CONSTRAINT "pioneer_readings_chapter_id_fk"
  FOREIGN KEY ("chapter_id")
  REFERENCES "public"."pioneer_chapters"("id")
  ON DELETE restrict
  ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pioneer_readings_published_week_idx"
  ON "public"."pioneer_readings" ("published", "week_start");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pioneer_readings_chapter_id_idx"
  ON "public"."pioneer_readings" ("chapter_id");
--> statement-breakpoint
COMMIT;
