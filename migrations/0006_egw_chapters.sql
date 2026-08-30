BEGIN;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."egw_chapters" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "book" text NOT NULL,
  "book_slug" varchar(64) NOT NULL,
  "chapter_number" integer NOT NULL,
  "chapter_title" text NOT NULL,
  "paragraphs" jsonb NOT NULL,
  "ingested_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "egw_chapters_slug_chapter_uniq"
  ON "public"."egw_chapters" ("book_slug", "chapter_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "egw_chapters_slug_idx"
  ON "public"."egw_chapters" ("book_slug");
--> statement-breakpoint
COMMIT;
