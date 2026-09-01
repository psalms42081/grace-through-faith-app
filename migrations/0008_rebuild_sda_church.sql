BEGIN;
-- Rebuild sda_church from curated sources only. Wipes all directory rows.
-- Safe because no user has claimed a church (asserted below).
-- User runs this in Neon, then: npx tsx scripts/reseed-sda-churches-curated.ts
--> statement-breakpoint
DO $$
DECLARE
  claimed integer;
BEGIN
  SELECT count(*) INTO claimed
    FROM "public"."users"
   WHERE sda_church_id IS NOT NULL;
  IF claimed <> 0 THEN
    RAISE EXCEPTION
      'Aborting sda_church rebuild: expected (SELECT count(*) FROM users WHERE sda_church_id IS NOT NULL) = 0, found %',
      claimed;
  END IF;
END $$;
--> statement-breakpoint
SELECT count(*) AS sda_church_pre_truncate_count
FROM "public"."sda_church";
--> statement-breakpoint
ALTER TABLE "public"."sda_church"
  ADD COLUMN IF NOT EXISTS "source" varchar NOT NULL DEFAULT 'unknown';
--> statement-breakpoint
ALTER TABLE "public"."sda_church"
  ADD COLUMN IF NOT EXISTS "verified" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
TRUNCATE TABLE "public"."sda_church";
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sda_church_name_address_city_country_uniq"
  ON "public"."sda_church" ("name", "address", "city", "country");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."church_submissions" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "city" text NOT NULL,
  "country" text NOT NULL,
  "address" text,
  "user_id" varchar,
  "status" varchar(20) DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
SELECT count(*) AS sda_church_post_truncate_count
FROM "public"."sda_church";
--> statement-breakpoint
COMMIT;
