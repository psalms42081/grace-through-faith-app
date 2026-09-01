BEGIN;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."odb_posts" (
  "date" date PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "author" text NOT NULL DEFAULT '',
  "scripture_ref" text NOT NULL DEFAULT '',
  "reading_ref" text NOT NULL DEFAULT '',
  "body_text" text NOT NULL DEFAULT '',
  "verse" text NOT NULL DEFAULT '',
  "thought" text NOT NULL DEFAULT '',
  "response" text NOT NULL DEFAULT '',
  "insights" text NOT NULL DEFAULT '',
  "insights_author" text NOT NULL DEFAULT '',
  "bible_in_a_year" text NOT NULL DEFAULT '',
  "source_url" text NOT NULL DEFAULT '',
  "image_url" text,
  "source_id" integer,
  "fetched_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
COMMIT;
