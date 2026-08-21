ALTER TABLE "sabbath_school_day"
ADD COLUMN IF NOT EXISTS "audio_url" text;
--> statement-breakpoint
ALTER TABLE "sabbath_school_lesson"
ADD COLUMN IF NOT EXISTS "video_by_artist" jsonb;
