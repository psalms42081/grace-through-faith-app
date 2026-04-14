ALTER TABLE "sabbath_school_day"
ADD COLUMN "audio_url" text;
--> statement-breakpoint
ALTER TABLE "sabbath_school_lesson"
ADD COLUMN "video_by_artist" jsonb;
