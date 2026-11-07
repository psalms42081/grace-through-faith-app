BEGIN;
--> statement-breakpoint
ALTER TABLE "public"."user_highlight"
  ADD COLUMN IF NOT EXISTS "start_word" integer,
  ADD COLUMN IF NOT EXISTS "end_word" integer;
--> statement-breakpoint
DROP INDEX IF EXISTS "user_highlight_unique";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_highlight_unique"
  ON "public"."user_highlight" (
    "user_id",
    "verse_id",
    "color",
    COALESCE("start_word", -1),
    COALESCE("end_word", -1)
  );
--> statement-breakpoint
COMMIT;
