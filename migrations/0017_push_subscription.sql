BEGIN;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."push_subscription" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "public"."users"("id") ON DELETE CASCADE,
  "endpoint" text NOT NULL,
  "keys" jsonb,
  "timezone" text DEFAULT 'UTC' NOT NULL,
  "verse_time_local" text,
  "ss_reminder" boolean DEFAULT false NOT NULL,
  "last_verse_local_date" text,
  "last_ss_local_date" text,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "push_subscription_endpoint_unique" ON "public"."push_subscription" ("endpoint");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "push_subscription_user_idx" ON "public"."push_subscription" ("user_id");
--> statement-breakpoint
COMMIT;
