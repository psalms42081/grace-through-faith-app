BEGIN;
--> statement-breakpoint
ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "sda_church_id" varchar;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "users_sda_church_id_idx"
  ON "public"."users" ("sda_church_id");
--> statement-breakpoint
COMMIT;
