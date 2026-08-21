BEGIN;
--> statement-breakpoint
ALTER TABLE "devotional_plan"
ADD COLUMN IF NOT EXISTS "provenance" varchar(30) DEFAULT 'legacy_unclassified' NOT NULL;
--> statement-breakpoint
ALTER TABLE "devotional_plan"
ADD COLUMN IF NOT EXISTS "curated_by" varchar(120);
--> statement-breakpoint
ALTER TABLE "devotional_plan"
ADD COLUMN IF NOT EXISTS "curated_at" timestamp;
--> statement-breakpoint
ALTER TABLE "user_plan_enrollment"
DROP CONSTRAINT IF EXISTS "user_plan_enrollment_plan_id_devotional_plan_id_fk";
--> statement-breakpoint
ALTER TABLE "user_plan_enrollment"
ADD CONSTRAINT "user_plan_enrollment_plan_id_devotional_plan_id_fk"
FOREIGN KEY ("plan_id") REFERENCES "devotional_plan"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "devotional_plan_provenance_audit" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "plan_id" varchar NOT NULL REFERENCES "devotional_plan"("id"),
  "previous_provenance" varchar(30),
  "provenance" varchar(30) NOT NULL,
  "reason" text NOT NULL,
  "recorded_by" varchar(120) DEFAULT 'system' NOT NULL,
  "recorded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "devotional_plan_provenance_audit_plan_idx"
ON "devotional_plan_provenance_audit" USING btree ("plan_id");
--> statement-breakpoint
UPDATE "devotional_plan"
SET "provenance" = 'ai_generated'
WHERE "is_ai_generated" = true;
--> statement-breakpoint
INSERT INTO "devotional_plan_provenance_audit"
  ("plan_id", "previous_provenance", "provenance", "reason", "recorded_by")
SELECT
  plan."id",
  NULL,
  plan."provenance",
  CASE
    WHEN plan."provenance" = 'ai_generated' THEN 'Backfilled from existing AI-generated marker.'
    ELSE 'Pre-provenance record requires editorial review before catalog publication.'
  END,
  'migration'
FROM "devotional_plan" plan
WHERE NOT EXISTS (
  SELECT 1
  FROM "devotional_plan_provenance_audit" audit
  WHERE audit."plan_id" = plan."id"
    AND audit."recorded_by" = 'migration'
);
--> statement-breakpoint
-- NOT VALID preserves every legacy row while enforcing the rule for all new
-- inserts and future publication updates.
DO $migration$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'devotional_plan_catalog_authorship_check'
      AND conrelid = 'devotional_plan'::regclass
  ) THEN
    ALTER TABLE "devotional_plan"
    ADD CONSTRAINT "devotional_plan_catalog_authorship_check"
    CHECK (
      "is_published" IS NOT TRUE
      OR (
        "provenance" = 'human_curated'
        AND "is_ai_generated" IS NOT TRUE
        AND "curated_by" IS NOT NULL
        AND "curated_at" IS NOT NULL
      )
    ) NOT VALID;
  END IF;
END
$migration$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "audit_devotional_plan_provenance_change"()
RETURNS trigger
LANGUAGE plpgsql
AS $migration$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD."provenance" IS NOT DISTINCT FROM NEW."provenance" THEN
    RETURN NEW;
  END IF;

  INSERT INTO "devotional_plan_provenance_audit"
    ("plan_id", "previous_provenance", "provenance", "reason", "recorded_by")
  VALUES (
    NEW."id",
    CASE WHEN TG_OP = 'UPDATE' THEN OLD."provenance" ELSE NULL END,
    NEW."provenance",
    CASE
      WHEN TG_OP = 'INSERT' THEN 'Initial provenance classification.'
      ELSE 'Provenance classification changed.'
    END,
    'database'
  );
  RETURN NEW;
END
$migration$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "devotional_plan_provenance_audit_trigger" ON "devotional_plan";
--> statement-breakpoint
CREATE TRIGGER "devotional_plan_provenance_audit_trigger"
AFTER INSERT OR UPDATE OF "provenance" ON "devotional_plan"
FOR EACH ROW
EXECUTE FUNCTION "audit_devotional_plan_provenance_change"();
--> statement-breakpoint
COMMIT;