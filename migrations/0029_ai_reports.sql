BEGIN;
-- "Report this answer" on AI-generated content (Google Play AI-generated content policy).
-- user_id is null for guests and after the account is deleted.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."ai_reports" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "user_id" varchar REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  "feature" varchar(64) NOT NULL,
  "reference" varchar(120),
  "version" varchar(32),
  "response_text" text NOT NULL,
  "reason" varchar(32) NOT NULL,
  "comment" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ai_reports_created_at_idx"
  ON "public"."ai_reports" ("created_at");
--> statement-breakpoint
COMMIT;
