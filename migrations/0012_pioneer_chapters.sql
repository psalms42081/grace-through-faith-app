BEGIN;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."pioneer_chapters" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "author" text NOT NULL,
  "author_slug" varchar(64) NOT NULL,
  "book" text NOT NULL,
  "book_slug" varchar(64) NOT NULL,
  "year" integer NOT NULL,
  "chapter_number" integer NOT NULL,
  "chapter_title" text NOT NULL,
  "paragraphs" jsonb NOT NULL,
  "source_url" text NOT NULL,
  "ingested_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pioneer_chapters_slug_chapter_uniq"
  ON "public"."pioneer_chapters" ("book_slug", "chapter_number");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pioneer_chapters_slug_idx"
  ON "public"."pioneer_chapters" ("book_slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pioneer_chapters_author_slug_idx"
  ON "public"."pioneer_chapters" ("author_slug");
--> statement-breakpoint
COMMIT;
