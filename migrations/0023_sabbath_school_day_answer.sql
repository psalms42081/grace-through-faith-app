BEGIN;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."sabbath_school_day_answer" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" varchar NOT NULL,
  "day_id" varchar NOT NULL REFERENCES "public"."sabbath_school_day"("id"),
  "question_key" varchar(64) NOT NULL,
  "answer" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "ss_day_answer_user_day_question"
  ON "public"."sabbath_school_day_answer" ("user_id", "day_id", "question_key");
--> statement-breakpoint
COMMIT;
