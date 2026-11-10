BEGIN;
-- Report and block for user-generated content (Google Play UGC policy).
-- Apply with: npm run db:migrate:numbered
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."user_blocks" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "blocker_user_id" varchar NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action,
  "blocked_user_id" varchar NOT NULL REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "user_blocks_pair_unique"
  ON "public"."user_blocks" ("blocker_user_id", "blocked_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "user_blocks_blocker_idx"
  ON "public"."user_blocks" ("blocker_user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."ugc_reports" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "reporter_user_id" varchar REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  "target_user_id" varchar REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action,
  "surface" varchar(64) NOT NULL,
  "content_id" varchar(120) NOT NULL,
  "snapshot" text NOT NULL,
  "reason" varchar(32) NOT NULL,
  "comment" text
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ugc_reports_created_at_idx"
  ON "public"."ugc_reports" ("created_at");
--> statement-breakpoint
COMMIT;
