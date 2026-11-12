BEGIN;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."user_reading_plan_day" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_plan_id" varchar NOT NULL,
  "day_number" integer NOT NULL,
  "completed_parts" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "completed_local_date" text,
  "completed_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "public"."user_reading_plan_day"
    ADD CONSTRAINT "user_reading_plan_day_user_plan_id_user_plan_id_fk"
    FOREIGN KEY ("user_plan_id") REFERENCES "public"."user_plan"("id")
    ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_reading_plan_day_unique"
  ON "public"."user_reading_plan_day" ("user_plan_id", "day_number");
--> statement-breakpoint
ALTER TABLE "public"."push_subscription"
  ADD COLUMN IF NOT EXISTS "plan_complete_sent_for" text;
--> statement-breakpoint
COMMIT;
