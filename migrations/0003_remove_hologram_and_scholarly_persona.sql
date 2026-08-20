UPDATE "study_guide_session"
SET "persona" = 'pastoral'
WHERE "persona" = 'scholarly';
--> statement-breakpoint
ALTER TABLE "study_guide_session"
ALTER COLUMN "persona" SET DEFAULT 'pastoral';
--> statement-breakpoint
DROP TABLE IF EXISTS "pioneer_video";
--> statement-breakpoint
ALTER TABLE "users"
DROP COLUMN IF EXISTS "hologram_onboarding_seen";