BEGIN;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."feedback" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar REFERENCES "public"."users"("id") ON DELETE SET NULL,
  "message" text NOT NULL,
  "screen" varchar(32) NOT NULL,
  "device" text,
  "email" varchar(255),
  "created_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feedback_created_at_idx" ON "public"."feedback" ("created_at");
--> statement-breakpoint
COMMIT;
