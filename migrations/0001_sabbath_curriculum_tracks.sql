ALTER TABLE "sabbath_school_quarterly"
ADD COLUMN "curriculum_type" varchar(16) NOT NULL DEFAULT 'adult';
--> statement-breakpoint
UPDATE "sabbath_school_quarterly"
SET "curriculum_type" = 'inverse'
WHERE "quarter_code" LIKE '%-cq';
--> statement-breakpoint
ALTER TABLE "users"
ADD COLUMN "preferred_curriculum" varchar(16) DEFAULT 'adult';
