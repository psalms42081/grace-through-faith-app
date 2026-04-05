CREATE TABLE "application_template" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" integer,
	"chapter" integer,
	"then_context" text NOT NULL,
	"now_application" text NOT NULL,
	"reflection_questions" jsonb NOT NULL,
	"prayer_prompt" text,
	"key_theme" text
);
--> statement-breakpoint
CREATE TABLE "assessment_item_i18n" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" varchar NOT NULL,
	"language" varchar(10) NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"explanation" text
);
--> statement-breakpoint
CREATE TABLE "assessment_item" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assessment_id" varchar NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text
);
--> statement-breakpoint
CREATE TABLE "bible_book" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"abbreviation" varchar(10) NOT NULL,
	"testament" varchar(3) NOT NULL,
	"chapter_count" integer NOT NULL,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bible_translation" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"abbreviation" varchar(10) NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bible_verse" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"translation_id" varchar NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"text" text NOT NULL,
	"search_vector" text
);
--> statement-breakpoint
CREATE TABLE "biblical_episode" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"scripture_anchor" text,
	"video_url" text,
	"duration" integer,
	"order_index" integer NOT NULL,
	"status" varchar(20) DEFAULT 'ready' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "biblical_series" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"subtitle" text,
	"description" text,
	"tag" varchar(50),
	"speaker" varchar(100),
	"gradient_colors" jsonb,
	"episode_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'published' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapter_context_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"locations" text DEFAULT '[]' NOT NULL,
	"timeline_events" text DEFAULT '[]' NOT NULL,
	"key_figures" text DEFAULT '[]' NOT NULL,
	"cultural_insights" text,
	"geographical_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapter_passage_sections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"sections" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapter_summary" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"big_idea" text NOT NULL,
	"narrative_role" text NOT NULL,
	"focus_themes" text DEFAULT '[]' NOT NULL,
	"pastoral_frame" text NOT NULL,
	"thesis_statement" text,
	"doctrinal_anchor" text,
	"narrative_placement" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "characters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" varchar(100) NOT NULL,
	"character_type" varchar(30) NOT NULL,
	"gender" varchar(10),
	"description" text,
	"cloudinary_url" text,
	"thumbnail_url" text,
	"voice_id" varchar(50),
	"aliases" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "child_profile" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" varchar NOT NULL,
	"name" text NOT NULL,
	"age_group" varchar(20) DEFAULT 'little_lambs' NOT NULL,
	"avatar_url" text,
	"total_points" integer DEFAULT 0,
	"current_level" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "commentary_entry" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"commentator_id" varchar NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"verse_start" integer,
	"verse_end" integer,
	"content" text NOT NULL,
	"title" text
);
--> statement-breakpoint
CREATE TABLE "commentator" (
	"id" varchar PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"dates" text,
	"bio" text,
	"tradition" text
);
--> statement-breakpoint
CREATE TABLE "context_card" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" integer,
	"chapter" integer,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"historical_background" text,
	"cultural_notes" text,
	"author_info" text,
	"date_written" text,
	"audience" text,
	"themes" jsonb
);
--> statement-breakpoint
CREATE TABLE "device_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"push_token" text NOT NULL,
	"platform" varchar(16),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devotional_day" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"day_number" integer NOT NULL,
	"title" text NOT NULL,
	"book_id" integer,
	"chapter" integer,
	"verse_start" integer,
	"verse_end" integer,
	"passage_label" text,
	"context_note" text,
	"key_term_strong_id" varchar,
	"location_id" varchar,
	"timeline_event_id" varchar,
	"commentator_id" varchar,
	"historic_voice_excerpt" text,
	"reflection_questions" jsonb NOT NULL,
	"prayer_prompt" text,
	"then_context" text,
	"now_application" text
);
--> statement-breakpoint
CREATE TABLE "devotional_plan" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"total_days" integer NOT NULL,
	"theme" text,
	"target_goals" jsonb,
	"difficulty_level" varchar(20),
	"estimated_minutes_per_day" integer,
	"category" varchar(20) DEFAULT 'thematic',
	"tradition_key" varchar(30) DEFAULT 'core' NOT NULL,
	"is_published" boolean DEFAULT false,
	"is_ai_generated" boolean DEFAULT false,
	"generated_for_user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dinner_table_topic" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" varchar NOT NULL,
	"child_profile_id" varchar,
	"child_name" text NOT NULL,
	"story_id" varchar,
	"story_title" text NOT NULL,
	"scripture_ref" text,
	"quiz_score" integer,
	"notification_text" text NOT NULL,
	"dinner_question" text NOT NULL,
	"follow_up_questions" jsonb DEFAULT '[]'::jsonb,
	"discussed" boolean DEFAULT false,
	"discussed_at" timestamp,
	"bonus_points_awarded" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_verse_map" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"verse_id" varchar NOT NULL
);
--> statement-breakpoint
CREATE TABLE "families" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"invite_code" varchar(10) NOT NULL,
	"created_by" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "families_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "formation_assessment" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" varchar NOT NULL,
	"title" text NOT NULL,
	"passing_score" integer DEFAULT 70
);
--> statement-breakpoint
CREATE TABLE "formation_lesson_i18n" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" varchar NOT NULL,
	"language" varchar(10) NOT NULL,
	"title" text NOT NULL,
	"summary" text
);
--> statement-breakpoint
CREATE TABLE "formation_lesson" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"lesson_order" integer NOT NULL,
	"anchor_text" text,
	"anchor_book_id" integer,
	"anchor_chapter" integer,
	"anchor_verse_start" integer,
	"anchor_verse_end" integer,
	"estimated_minutes" integer DEFAULT 30
);
--> statement-breakpoint
CREATE TABLE "formation_module_i18n" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module_id" varchar NOT NULL,
	"language" varchar(10) NOT NULL,
	"title" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "formation_module" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"track_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"learning_objective" text,
	"module_order" integer NOT NULL,
	"total_lessons" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "formation_track" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"icon" varchar(50) DEFAULT 'school',
	"color" varchar(20) DEFAULT '#C9933A',
	"category" varchar(30) NOT NULL,
	"total_modules" integer DEFAULT 0,
	"total_weeks" integer DEFAULT 0,
	"difficulty" varchar(20) DEFAULT 'beginner',
	"is_published" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gc_exploration_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"node_id" varchar(64) NOT NULL,
	"narrative_explanation" text NOT NULL,
	"connections" jsonb NOT NULL,
	"reflection_question" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "gc_exploration_cache_node_id_unique" UNIQUE("node_id")
);
--> statement-breakpoint
CREATE TABLE "group_announcement" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"author_name" text,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_discussion_reply" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"discussion_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"author_name" text,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_discussion" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"author_name" text,
	"content" text NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"reply_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "heygen_video" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"video_id" varchar NOT NULL,
	"title" text,
	"avatar_id" varchar,
	"script" text,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"video_url" text,
	"user_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "heygen_video_video_id_unique" UNIQUE("video_id")
);
--> statement-breakpoint
CREATE TABLE "illustration_link" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"illustration_id" varchar NOT NULL,
	"verse_id" varchar,
	"book_id" integer,
	"chapter" integer
);
--> statement-breakpoint
CREATE TABLE "illustration" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"image_url" text,
	"credit" text,
	"era" text
);
--> statement-breakpoint
CREATE TABLE "kids_badge" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" varchar(50),
	"requirement" text,
	"required_count" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "kids_collection" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"age_group" varchar(20) NOT NULL,
	"icon" varchar(50),
	"image_url" text,
	"story_count" integer DEFAULT 0,
	"order_index" integer DEFAULT 0,
	"published" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "kids_daily_quest" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"child_profile_id" varchar,
	"quest_date" varchar(10) NOT NULL,
	"read_story" boolean DEFAULT false,
	"practice_verse" boolean DEFAULT false,
	"take_quiz" boolean DEFAULT false,
	"bonus_claimed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kids_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"story_id" varchar NOT NULL,
	"completed" boolean DEFAULT false,
	"quiz_score" integer,
	"memory_verse_memorized" boolean DEFAULT false,
	"wonder_answers" jsonb DEFAULT '[]'::jsonb,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "kids_purchase" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"child_profile_id" varchar,
	"item_id" varchar(60) NOT NULL,
	"category" varchar(30) NOT NULL,
	"star_cost" integer NOT NULL,
	"equipped" boolean DEFAULT false,
	"purchased_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kids_quiz_question" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" varchar NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"correct_index" integer NOT NULL,
	"explanation" text
);
--> statement-breakpoint
CREATE TABLE "kids_story" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"scripture_ref" text,
	"book_id" integer,
	"chapter" integer,
	"age_group" varchar(20) NOT NULL,
	"collection_id" varchar,
	"order_in_collection" integer DEFAULT 0,
	"image_url" text,
	"story_text" text NOT NULL,
	"memory_verse" text,
	"memory_verse_ref" text,
	"think_questions" jsonb DEFAULT '[]'::jsonb,
	"prayer_prompt" text,
	"activity_suggestion" text,
	"estimated_minutes" integer DEFAULT 5,
	"published" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "kids_story_scene" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" varchar NOT NULL,
	"scene_index" integer NOT NULL,
	"narration" text NOT NULL,
	"illustration_prompt" text NOT NULL,
	"image_url" text,
	"video_url" text,
	"video_timecodes" jsonb,
	"mood" varchar(20) DEFAULT 'PEACE' NOT NULL,
	"pause_and_wonder" jsonb,
	"interaction_type" varchar(30),
	"interaction_config" jsonb,
	"sound_effects" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kids_streak" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_activity_date" text
);
--> statement-breakpoint
CREATE TABLE "kids_user_badge" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"badge_id" varchar NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kids_wonder_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"story_id" varchar NOT NULL,
	"age_group" varchar(20) DEFAULT 'little_lambs' NOT NULL,
	"moments" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "layer_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"layer" varchar(20) NOT NULL,
	"verse_start" integer DEFAULT 0 NOT NULL,
	"verse_end" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "leader_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"full_name" text NOT NULL,
	"church_name" text NOT NULL,
	"role" varchar(30) NOT NULL,
	"contact_email" text NOT NULL,
	"description" text,
	"status" varchar(12) DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar,
	"reviewed_at" timestamp,
	"review_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_section_i18n" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" varchar NOT NULL,
	"language" varchar(10) NOT NULL,
	"heading" text,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_section" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" varchar NOT NULL,
	"section_type" varchar(20) NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"sort_order" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lesson_source_packets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quarterly_id" varchar NOT NULL,
	"lesson_id" varchar NOT NULL,
	"week_number" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"source_json" jsonb NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'ingested' NOT NULL,
	"ingested_at" timestamp DEFAULT now() NOT NULL,
	"source_version" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "live_session" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"group_id" varchar,
	"church_id" varchar,
	"host_user_id" varchar NOT NULL,
	"host_display_name" text,
	"room_url" text NOT NULL,
	"status" varchar(20) DEFAULT 'live' NOT NULL,
	"participant_count" integer DEFAULT 1,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "location_verse_map" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"location_id" varchar NOT NULL,
	"verse_id" varchar NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"modern_name" text,
	"latitude" text,
	"longitude" text,
	"description" text,
	"image_url" text,
	"location_type" varchar(50),
	"era" text
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar(12) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"type" varchar(12) NOT NULL,
	"parent_id" varchar,
	"join_code" varchar(8) NOT NULL,
	"owner_id" varchar NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"tier" varchar(6) DEFAULT 'free' NOT NULL,
	"max_members" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "plan_day" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" varchar NOT NULL,
	"day_number" integer NOT NULL,
	"book_id" integer,
	"chapter" integer,
	"verse_start" integer,
	"verse_end" integer,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "prayer_group_member" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"display_name" text,
	"role" varchar(20) DEFAULT 'member' NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prayer_groups" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"join_code" varchar(10) NOT NULL,
	"created_by" varchar NOT NULL,
	"member_count" integer DEFAULT 1 NOT NULL,
	"group_type" varchar(30) DEFAULT 'prayer' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"church_id" varchar,
	"assigned_track_id" varchar,
	"group_plan_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prayer_groups_join_code_unique" UNIQUE("join_code")
);
--> statement-breakpoint
CREATE TABLE "prayer_request" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"family_id" varchar,
	"group_id" varchar,
	"title" text NOT NULL,
	"content" text,
	"category" varchar(30) DEFAULT 'personal' NOT NULL,
	"author_name" text,
	"answered" boolean DEFAULT false,
	"answered_at" timestamp,
	"support_count" integer DEFAULT 0,
	"supported_by" jsonb DEFAULT '[]'::jsonb,
	"scriptural_verse" text,
	"scriptural_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_lesson" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"lesson_id" varchar NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"sections_completed" jsonb DEFAULT '[]'::jsonb,
	"assessment_score" integer,
	"assessment_passed" boolean
);
--> statement-breakpoint
CREATE TABLE "progress_track" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"track_id" varchar NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"current_module_id" varchar,
	"current_lesson_id" varchar,
	"percent_complete" integer DEFAULT 0,
	"module_confidence" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "reading_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"book_id" integer NOT NULL,
	"book_name" text NOT NULL,
	"chapter" integer NOT NULL,
	"translation" varchar(10) DEFAULT 'KJV',
	"read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_plan" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" varchar(40),
	"cover_image_url" text,
	"duration_days" integer NOT NULL,
	"type" varchar(12) DEFAULT 'ready-made' NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_streak" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"current_streak" integer DEFAULT 0,
	"longest_streak" integer DEFAULT 0,
	"last_read_date" text,
	CONSTRAINT "reading_streak_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "resource_bookmarks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"resource_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"resource_id" varchar NOT NULL,
	"started" boolean DEFAULT true NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"last_accessed_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "resource_review_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resource_id" varchar NOT NULL,
	"action" varchar(30) NOT NULL,
	"status_from" varchar(20),
	"status_to" varchar(20),
	"notes" text,
	"created_by" varchar NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(255) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text NOT NULL,
	"resource_type" varchar(50) NOT NULL,
	"category" varchar(50) NOT NULL,
	"tier" varchar(10) DEFAULT 'free' NOT NULL,
	"cover_image_url" text,
	"content_json" jsonb NOT NULL,
	"source_ref" jsonb,
	"source_packet_id" varchar,
	"prompt_version" varchar(20),
	"generation_status" varchar(20) DEFAULT 'completed',
	"review_status" varchar(20) DEFAULT 'pending',
	"age_group" varchar(20),
	"estimated_minutes" integer DEFAULT 15,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"generated_by" varchar(20) DEFAULT 'ai' NOT NULL,
	"reviewed_at" timestamp,
	"reviewed_by" varchar,
	"review_notes" text,
	"previous_content_json" jsonb,
	"supersedes_resource_id" varchar,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "resources_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "sabbath_reflection" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"date" varchar(10) NOT NULL,
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sabbath_school_day" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" varchar NOT NULL,
	"day_number" integer NOT NULL,
	"title" text,
	"date" varchar(16),
	"content_markdown" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sabbath_school_discussion_prep" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lesson_id" varchar NOT NULL,
	"key_questions" jsonb NOT NULL,
	"ai_summary" text NOT NULL,
	"reflection_prompts" jsonb NOT NULL,
	"depth" varchar(16) DEFAULT 'standard' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sabbath_school_lesson" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quarterly_id" varchar NOT NULL,
	"lesson_number" integer NOT NULL,
	"title" text NOT NULL,
	"start_date" varchar(16),
	"end_date" varchar(16),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sabbath_school_quarterly" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quarter_code" varchar(16) NOT NULL,
	"language" varchar(8) DEFAULT 'en' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"human_date" varchar(100),
	"start_date" varchar(16),
	"end_date" varchar(16),
	"color_primary" varchar(16),
	"cover_url" text,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sabbath_school_quarterly_quarter_code_unique" UNIQUE("quarter_code")
);
--> statement-breakpoint
CREATE TABLE "sabbath_school_user_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"day_id" varchar NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"journal_entry" text,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sabbath_scriptures" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sabbath_type_id" varchar NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"verse_start" integer NOT NULL,
	"verse_end" integer,
	"label" text NOT NULL,
	"order_index" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sabbath_types" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"hebrew_name" text NOT NULL,
	"type" text NOT NULL,
	"anchor_scripture" text NOT NULL,
	"description" text NOT NULL,
	"historical_context" text NOT NULL,
	"prophetic_significance" text NOT NULL,
	"frequency_description" text NOT NULL,
	"order_index" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sda_church" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"state" text,
	"country" text NOT NULL,
	"lat" varchar(20) NOT NULL,
	"lng" varchar(20) NOT NULL,
	"service_times" text,
	"contact_phone" text,
	"contact_email" text,
	"website" text,
	"pastor_name" text,
	"membership_size" varchar(20),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"query_text" text NOT NULL,
	"query_hash" varchar(64) NOT NULL,
	"user_id" varchar,
	"results" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "search_cache_query_hash_unique" UNIQUE("query_hash")
);
--> statement-breakpoint
CREATE TABLE "strong_entry" (
	"id" varchar PRIMARY KEY NOT NULL,
	"language" varchar(2) NOT NULL,
	"lemma" text NOT NULL,
	"transliteration" text,
	"pronunciation" text,
	"definition" text NOT NULL,
	"extended_definition" text,
	"kjv_usage" text,
	"derivation" text
);
--> statement-breakpoint
CREATE TABLE "study_guide_session" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"verse_reference" text NOT NULL,
	"verse_text" text NOT NULL,
	"book_name" text NOT NULL,
	"chapter" integer NOT NULL,
	"verse" integer NOT NULL,
	"phase" varchar(20) DEFAULT 'observe' NOT NULL,
	"persona" varchar(20) DEFAULT 'scholarly' NOT NULL,
	"messages" text DEFAULT '[]' NOT NULL,
	"progression" text DEFAULT '{}' NOT NULL,
	"summary" text,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "study_journal_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"book_id" integer NOT NULL,
	"chapter" integer NOT NULL,
	"layer" varchar(20) NOT NULL,
	"section_key" varchar(60) NOT NULL,
	"verse_start" integer DEFAULT 0 NOT NULL,
	"verse_end" integer DEFAULT 0 NOT NULL,
	"content" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_event" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"year_approx" integer,
	"year_label" text,
	"period" text,
	"category" varchar(50),
	"location_id" varchar
);
--> statement-breakpoint
CREATE TABLE "topic_videos" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" varchar NOT NULL,
	"scripture_anchor" text NOT NULL,
	"generated_script" text,
	"voiceover_url" text,
	"character_anchor_url" text,
	"cinematic_scenes" jsonb,
	"assembled_video_url" text,
	"final_video_url" text,
	"thumbnail_url" text,
	"music_track" text,
	"assembly_status" text,
	"review_status" text,
	"review_notes" text,
	"cross_ref_of" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_activity_counter" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"feature_type" varchar(50) NOT NULL,
	"use_count" integer DEFAULT 0,
	"last_used_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_bookmark" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"verse_id" varchar NOT NULL,
	"label" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_feedback" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"topic" varchar(32) NOT NULL,
	"message" text NOT NULL,
	"context" text,
	"email" varchar(255),
	"app_version" varchar(32),
	"platform" varchar(16),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_highlight" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"verse_id" varchar NOT NULL,
	"color" varchar(20) DEFAULT 'yellow' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_note" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"verse_id" varchar NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_plan_enrollment" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"enrolled_at" timestamp DEFAULT now() NOT NULL,
	"started_at" timestamp,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "user_plan_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"enrollment_id" varchar NOT NULL,
	"day_id" varchar NOT NULL,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"journal_entry" text
);
--> statement-breakpoint
CREATE TABLE "user_plan" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"plan_id" varchar NOT NULL,
	"start_date" timestamp DEFAULT now() NOT NULL,
	"current_day" integer DEFAULT 1 NOT NULL,
	"completed_at" timestamp,
	"notification_time" varchar(10),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"display_name" text,
	"email" text,
	"family_id" varchar,
	"role" varchar(24) DEFAULT 'member' NOT NULL,
	"profile_type" varchar(24),
	"is_pro" boolean DEFAULT false NOT NULL,
	"is_patron" boolean DEFAULT false,
	"donation_amount" integer DEFAULT 0,
	"last_mission_invite" timestamp,
	"preferred_language" varchar(10) DEFAULT 'en',
	"preferred_bible_translation" varchar(10),
	"preferred_narrator" varchar(10) DEFAULT 'george',
	"organization_id" varchar,
	"organization_type" varchar(12),
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verse_map_cache" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verse_id" varchar NOT NULL,
	"cross_references" text DEFAULT '[]' NOT NULL,
	"context_snippet" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "verse_map_cache_verse_id_unique" UNIQUE("verse_id")
);
--> statement-breakpoint
CREATE TABLE "verse_strong_map" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"verse_id" varchar NOT NULL,
	"strong_id" varchar NOT NULL,
	"word_position" integer NOT NULL,
	"original_word" text NOT NULL,
	"translated_word" text
);
--> statement-breakpoint
CREATE TABLE "video_avatars" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"heygen_avatar_id" text NOT NULL,
	"heygen_voice_id" text NOT NULL,
	"gender" text,
	"ethnicity" text,
	"age_group" text DEFAULT 'teens',
	"description" text,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"elevenlabs_voice_id" text,
	"character_description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "video_pipeline_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic" text NOT NULL,
	"script" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"avatar_video_url" text,
	"broll_image_urls" jsonb,
	"broll_video_urls" jsonb,
	"assembled_video_url" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_topics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_age_group" text DEFAULT 'teens',
	"scripture_anchor" text,
	"category" text,
	"status" text DEFAULT 'pending',
	"priority" integer DEFAULT 0,
	"generated_script" text,
	"avatar_video_url" text,
	"final_video_url" text,
	"language" text DEFAULT 'en',
	"avatar_id" varchar,
	"music_track" text,
	"pipeline_mode" text DEFAULT 'cinematic',
	"assembly_status" text,
	"assembled_video_url" text,
	"cinematic_scenes" jsonb,
	"voiceover_url" text,
	"character_anchor_url" text,
	"thumbnail_url" text,
	"review_status" text,
	"review_notes" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_template" ADD CONSTRAINT "application_template_book_id_bible_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."bible_book"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_item_i18n" ADD CONSTRAINT "assessment_item_i18n_item_id_assessment_item_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."assessment_item"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_item" ADD CONSTRAINT "assessment_item_assessment_id_formation_assessment_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."formation_assessment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bible_verse" ADD CONSTRAINT "bible_verse_translation_id_bible_translation_id_fk" FOREIGN KEY ("translation_id") REFERENCES "public"."bible_translation"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bible_verse" ADD CONSTRAINT "bible_verse_book_id_bible_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."bible_book"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "biblical_episode" ADD CONSTRAINT "biblical_episode_series_id_biblical_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."biblical_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "child_profile" ADD CONSTRAINT "child_profile_parent_id_users_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentary_entry" ADD CONSTRAINT "commentary_entry_commentator_id_commentator_id_fk" FOREIGN KEY ("commentator_id") REFERENCES "public"."commentator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "commentary_entry" ADD CONSTRAINT "commentary_entry_book_id_bible_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."bible_book"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "context_card" ADD CONSTRAINT "context_card_book_id_bible_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."bible_book"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devotional_day" ADD CONSTRAINT "devotional_day_plan_id_devotional_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."devotional_plan"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devotional_day" ADD CONSTRAINT "devotional_day_book_id_bible_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."bible_book"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devotional_day" ADD CONSTRAINT "devotional_day_key_term_strong_id_strong_entry_id_fk" FOREIGN KEY ("key_term_strong_id") REFERENCES "public"."strong_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devotional_day" ADD CONSTRAINT "devotional_day_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devotional_day" ADD CONSTRAINT "devotional_day_timeline_event_id_timeline_event_id_fk" FOREIGN KEY ("timeline_event_id") REFERENCES "public"."timeline_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devotional_day" ADD CONSTRAINT "devotional_day_commentator_id_commentator_id_fk" FOREIGN KEY ("commentator_id") REFERENCES "public"."commentator"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinner_table_topic" ADD CONSTRAINT "dinner_table_topic_child_profile_id_child_profile_id_fk" FOREIGN KEY ("child_profile_id") REFERENCES "public"."child_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dinner_table_topic" ADD CONSTRAINT "dinner_table_topic_story_id_kids_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."kids_story"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_verse_map" ADD CONSTRAINT "event_verse_map_event_id_timeline_event_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."timeline_event"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_verse_map" ADD CONSTRAINT "event_verse_map_verse_id_bible_verse_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."bible_verse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_assessment" ADD CONSTRAINT "formation_assessment_lesson_id_formation_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."formation_lesson"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_lesson_i18n" ADD CONSTRAINT "formation_lesson_i18n_lesson_id_formation_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."formation_lesson"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_lesson" ADD CONSTRAINT "formation_lesson_module_id_formation_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."formation_module"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_module_i18n" ADD CONSTRAINT "formation_module_i18n_module_id_formation_module_id_fk" FOREIGN KEY ("module_id") REFERENCES "public"."formation_module"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formation_module" ADD CONSTRAINT "formation_module_track_id_formation_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."formation_track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "illustration_link" ADD CONSTRAINT "illustration_link_illustration_id_illustration_id_fk" FOREIGN KEY ("illustration_id") REFERENCES "public"."illustration"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "illustration_link" ADD CONSTRAINT "illustration_link_verse_id_bible_verse_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."bible_verse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "illustration_link" ADD CONSTRAINT "illustration_link_book_id_bible_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."bible_book"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kids_daily_quest" ADD CONSTRAINT "kids_daily_quest_child_profile_id_child_profile_id_fk" FOREIGN KEY ("child_profile_id") REFERENCES "public"."child_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kids_progress" ADD CONSTRAINT "kids_progress_story_id_kids_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."kids_story"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kids_purchase" ADD CONSTRAINT "kids_purchase_child_profile_id_child_profile_id_fk" FOREIGN KEY ("child_profile_id") REFERENCES "public"."child_profile"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kids_quiz_question" ADD CONSTRAINT "kids_quiz_question_story_id_kids_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."kids_story"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kids_story" ADD CONSTRAINT "kids_story_book_id_bible_book_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."bible_book"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kids_story" ADD CONSTRAINT "kids_story_collection_id_kids_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."kids_collection"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kids_story_scene" ADD CONSTRAINT "kids_story_scene_story_id_kids_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."kids_story"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kids_user_badge" ADD CONSTRAINT "kids_user_badge_badge_id_kids_badge_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."kids_badge"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kids_wonder_cache" ADD CONSTRAINT "kids_wonder_cache_story_id_kids_story_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."kids_story"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leader_requests" ADD CONSTRAINT "leader_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_section_i18n" ADD CONSTRAINT "lesson_section_i18n_section_id_lesson_section_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."lesson_section"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_section" ADD CONSTRAINT "lesson_section_lesson_id_formation_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."formation_lesson"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_verse_map" ADD CONSTRAINT "location_verse_map_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location_verse_map" ADD CONSTRAINT "location_verse_map_verse_id_bible_verse_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."bible_verse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_day" ADD CONSTRAINT "plan_day_plan_id_reading_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."reading_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_group_member" ADD CONSTRAINT "prayer_group_member_group_id_prayer_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."prayer_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prayer_group_member" ADD CONSTRAINT "prayer_group_member_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_lesson" ADD CONSTRAINT "progress_lesson_lesson_id_formation_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."formation_lesson"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_track" ADD CONSTRAINT "progress_track_track_id_formation_track_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."formation_track"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sabbath_school_day" ADD CONSTRAINT "sabbath_school_day_lesson_id_sabbath_school_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."sabbath_school_lesson"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sabbath_school_discussion_prep" ADD CONSTRAINT "sabbath_school_discussion_prep_lesson_id_sabbath_school_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."sabbath_school_lesson"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sabbath_school_lesson" ADD CONSTRAINT "sabbath_school_lesson_quarterly_id_sabbath_school_quarterly_id_fk" FOREIGN KEY ("quarterly_id") REFERENCES "public"."sabbath_school_quarterly"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sabbath_school_user_progress" ADD CONSTRAINT "sabbath_school_user_progress_day_id_sabbath_school_day_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."sabbath_school_day"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sabbath_scriptures" ADD CONSTRAINT "sabbath_scriptures_sabbath_type_id_sabbath_types_id_fk" FOREIGN KEY ("sabbath_type_id") REFERENCES "public"."sabbath_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_event" ADD CONSTRAINT "timeline_event_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bookmark" ADD CONSTRAINT "user_bookmark_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_bookmark" ADD CONSTRAINT "user_bookmark_verse_id_bible_verse_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."bible_verse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_highlight" ADD CONSTRAINT "user_highlight_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_highlight" ADD CONSTRAINT "user_highlight_verse_id_bible_verse_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."bible_verse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note" ADD CONSTRAINT "user_note_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_note" ADD CONSTRAINT "user_note_verse_id_bible_verse_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."bible_verse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plan_enrollment" ADD CONSTRAINT "user_plan_enrollment_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plan_enrollment" ADD CONSTRAINT "user_plan_enrollment_plan_id_devotional_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."devotional_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plan_progress" ADD CONSTRAINT "user_plan_progress_enrollment_id_user_plan_enrollment_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."user_plan_enrollment"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plan_progress" ADD CONSTRAINT "user_plan_progress_day_id_devotional_day_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."devotional_day"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_plan" ADD CONSTRAINT "user_plan_plan_id_reading_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."reading_plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_strong_map" ADD CONSTRAINT "verse_strong_map_verse_id_bible_verse_id_fk" FOREIGN KEY ("verse_id") REFERENCES "public"."bible_verse"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verse_strong_map" ADD CONSTRAINT "verse_strong_map_strong_id_strong_entry_id_fk" FOREIGN KEY ("strong_id") REFERENCES "public"."strong_entry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "item_i18n_item_lang" ON "assessment_item_i18n" USING btree ("item_id","language");--> statement-breakpoint
CREATE INDEX "bible_verse_book_chapter_idx" ON "bible_verse" USING btree ("book_id","chapter");--> statement-breakpoint
CREATE INDEX "bible_verse_translation_idx" ON "bible_verse" USING btree ("translation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bible_verse_unique" ON "bible_verse" USING btree ("translation_id","book_id","chapter","verse");--> statement-breakpoint
CREATE INDEX "biblical_episode_series_idx" ON "biblical_episode" USING btree ("series_id");--> statement-breakpoint
CREATE INDEX "biblical_episode_order_idx" ON "biblical_episode" USING btree ("series_id","order_index");--> statement-breakpoint
CREATE INDEX "chapter_context_book_chapter_idx" ON "chapter_context_cache" USING btree ("book_id","chapter");--> statement-breakpoint
CREATE UNIQUE INDEX "passage_sections_book_chapter" ON "chapter_passage_sections" USING btree ("book_id","chapter");--> statement-breakpoint
CREATE UNIQUE INDEX "chapter_summary_book_chapter_unique" ON "chapter_summary" USING btree ("book_id","chapter");--> statement-breakpoint
CREATE UNIQUE INDEX "characters_slug_idx" ON "characters" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "characters_active_partial_idx" ON "characters" USING btree ("is_active") WHERE is_active = true;--> statement-breakpoint
CREATE INDEX "characters_type_idx" ON "characters" USING btree ("character_type");--> statement-breakpoint
CREATE INDEX "child_profile_parent_idx" ON "child_profile" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "commentary_book_chapter_idx" ON "commentary_entry" USING btree ("book_id","chapter");--> statement-breakpoint
CREATE INDEX "device_tokens_user_idx" ON "device_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "device_tokens_token_unique" ON "device_tokens" USING btree ("push_token");--> statement-breakpoint
CREATE INDEX "dinner_topic_parent_idx" ON "dinner_table_topic" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "dinner_topic_child_idx" ON "dinner_table_topic" USING btree ("child_profile_id");--> statement-breakpoint
CREATE INDEX "event_verse_event_idx" ON "event_verse_map" USING btree ("event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_i18n_lesson_lang" ON "formation_lesson_i18n" USING btree ("lesson_id","language");--> statement-breakpoint
CREATE UNIQUE INDEX "module_i18n_module_lang" ON "formation_module_i18n" USING btree ("module_id","language");--> statement-breakpoint
CREATE INDEX "announcement_group_idx" ON "group_announcement" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "reply_discussion_idx" ON "group_discussion_reply" USING btree ("discussion_id");--> statement-breakpoint
CREATE INDEX "discussion_group_idx" ON "group_discussion" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "discussion_created_idx" ON "group_discussion" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "heygen_video_id_idx" ON "heygen_video" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "heygen_video_user_idx" ON "heygen_video" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "kids_quest_user_date_idx" ON "kids_daily_quest" USING btree ("user_id","child_profile_id","quest_date");--> statement-breakpoint
CREATE UNIQUE INDEX "kids_progress_user_story" ON "kids_progress" USING btree ("user_id","story_id");--> statement-breakpoint
CREATE INDEX "kids_purchase_user_child_idx" ON "kids_purchase" USING btree ("user_id","child_profile_id");--> statement-breakpoint
CREATE INDEX "kids_quiz_story_idx" ON "kids_quiz_question" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "kids_story_collection_idx" ON "kids_story" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "kids_story_age_group_idx" ON "kids_story" USING btree ("age_group");--> statement-breakpoint
CREATE UNIQUE INDEX "kids_story_scene_story_idx_unique" ON "kids_story_scene" USING btree ("story_id","scene_index");--> statement-breakpoint
CREATE UNIQUE INDEX "kids_user_badge_unique" ON "kids_user_badge" USING btree ("user_id","badge_id");--> statement-breakpoint
CREATE UNIQUE INDEX "kids_wonder_story_age_unique" ON "kids_wonder_cache" USING btree ("story_id","age_group");--> statement-breakpoint
CREATE UNIQUE INDEX "layer_completions_unique" ON "layer_completions" USING btree ("user_id","book_id","chapter","layer","verse_start","verse_end");--> statement-breakpoint
CREATE INDEX "layer_user_book_idx" ON "layer_completions" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "leader_requests_user_idx" ON "leader_requests" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "leader_requests_status_idx" ON "leader_requests" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "section_i18n_section_lang" ON "lesson_section_i18n" USING btree ("section_id","language");--> statement-breakpoint
CREATE INDEX "source_packets_lesson_idx" ON "lesson_source_packets" USING btree ("lesson_id");--> statement-breakpoint
CREATE INDEX "source_packets_quarterly_idx" ON "lesson_source_packets" USING btree ("quarterly_id");--> statement-breakpoint
CREATE INDEX "source_packets_status_idx" ON "lesson_source_packets" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "source_packets_hash_idx" ON "lesson_source_packets" USING btree ("lesson_id","source_hash");--> statement-breakpoint
CREATE INDEX "live_session_status_idx" ON "live_session" USING btree ("status");--> statement-breakpoint
CREATE INDEX "live_session_group_idx" ON "live_session" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "live_session_host_idx" ON "live_session" USING btree ("host_user_id");--> statement-breakpoint
CREATE INDEX "location_verse_location_idx" ON "location_verse_map" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "location_verse_verse_idx" ON "location_verse_map" USING btree ("verse_id");--> statement-breakpoint
CREATE UNIQUE INDEX "org_member_org_user" ON "organization_members" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "plan_day_plan_idx" ON "plan_day" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "plan_day_order_idx" ON "plan_day" USING btree ("plan_id","day_number");--> statement-breakpoint
CREATE UNIQUE INDEX "group_member_unique" ON "prayer_group_member" USING btree ("group_id","user_id");--> statement-breakpoint
CREATE INDEX "group_member_group_idx" ON "prayer_group_member" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "prayer_user_idx" ON "prayer_request" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "prayer_family_idx" ON "prayer_request" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "prayer_group_idx" ON "prayer_request" USING btree ("group_id");--> statement-breakpoint
CREATE UNIQUE INDEX "progress_user_lesson_unique" ON "progress_lesson" USING btree ("user_id","lesson_id");--> statement-breakpoint
CREATE UNIQUE INDEX "progress_user_track_unique" ON "progress_track" USING btree ("user_id","track_id");--> statement-breakpoint
CREATE INDEX "reading_history_user_idx" ON "reading_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reading_history_read_at_idx" ON "reading_history" USING btree ("read_at");--> statement-breakpoint
CREATE INDEX "reading_history_user_read_at_idx" ON "reading_history" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "bookmark_user_resource" ON "resource_bookmarks" USING btree ("user_id","resource_id");--> statement-breakpoint
CREATE UNIQUE INDEX "progress_user_resource" ON "resource_progress" USING btree ("user_id","resource_id");--> statement-breakpoint
CREATE INDEX "review_notes_resource_idx" ON "resource_review_notes" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "review_notes_created_at_idx" ON "resource_review_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "resources_status_idx" ON "resources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "resources_category_idx" ON "resources" USING btree ("category");--> statement-breakpoint
CREATE INDEX "resources_tier_idx" ON "resources" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "resources_type_idx" ON "resources" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "resources_source_packet_idx" ON "resources" USING btree ("source_packet_id");--> statement-breakpoint
CREATE INDEX "resources_generation_status_idx" ON "resources" USING btree ("generation_status");--> statement-breakpoint
CREATE UNIQUE INDEX "sabbath_reflection_user_date_prompt" ON "sabbath_reflection" USING btree ("user_id","date","prompt");--> statement-breakpoint
CREATE INDEX "sabbath_scriptures_sabbath_idx" ON "sabbath_scriptures" USING btree ("sabbath_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sabbath_scriptures_type_order_idx" ON "sabbath_scriptures" USING btree ("sabbath_type_id","order_index");--> statement-breakpoint
CREATE INDEX "sabbath_types_type_idx" ON "sabbath_types" USING btree ("type");--> statement-breakpoint
CREATE INDEX "sabbath_types_order_idx" ON "sabbath_types" USING btree ("order_index");--> statement-breakpoint
CREATE UNIQUE INDEX "sabbath_types_name_idx" ON "sabbath_types" USING btree ("name");--> statement-breakpoint
CREATE INDEX "church_city_idx" ON "sda_church" USING btree ("city");--> statement-breakpoint
CREATE INDEX "church_country_idx" ON "sda_church" USING btree ("country");--> statement-breakpoint
CREATE INDEX "search_cache_user_idx" ON "search_cache" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "study_guide_user_idx" ON "study_guide_session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "journal_entries_unique" ON "study_journal_entries" USING btree ("user_id","book_id","chapter","layer","section_key","verse_start","verse_end");--> statement-breakpoint
CREATE INDEX "journal_user_book_idx" ON "study_journal_entries" USING btree ("user_id","book_id");--> statement-breakpoint
CREATE INDEX "topic_videos_topic_id_idx" ON "topic_videos" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "topic_videos_assembly_status_idx" ON "topic_videos" USING btree ("assembly_status");--> statement-breakpoint
CREATE UNIQUE INDEX "topic_videos_topic_scripture_idx" ON "topic_videos" USING btree ("topic_id","scripture_anchor");--> statement-breakpoint
CREATE UNIQUE INDEX "activity_user_feature" ON "user_activity_counter" USING btree ("user_id","feature_type");--> statement-breakpoint
CREATE UNIQUE INDEX "user_bookmark_unique" ON "user_bookmark" USING btree ("user_id","verse_id");--> statement-breakpoint
CREATE INDEX "user_bookmark_user_idx" ON "user_bookmark" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_highlight_unique" ON "user_highlight" USING btree ("user_id","verse_id","color");--> statement-breakpoint
CREATE INDEX "user_highlight_user_idx" ON "user_highlight" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_note_user_idx" ON "user_note" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_note_verse_idx" ON "user_note" USING btree ("verse_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_plan_unique" ON "user_plan_enrollment" USING btree ("user_id","plan_id");--> statement-breakpoint
CREATE UNIQUE INDEX "enrollment_day_unique" ON "user_plan_progress" USING btree ("enrollment_id","day_id");--> statement-breakpoint
CREATE INDEX "user_plan_user_idx" ON "user_plan" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_plan_user_plan_idx" ON "user_plan" USING btree ("user_id","plan_id");--> statement-breakpoint
CREATE INDEX "verse_map_verse_idx" ON "verse_map_cache" USING btree ("verse_id");--> statement-breakpoint
CREATE INDEX "verse_strong_verse_idx" ON "verse_strong_map" USING btree ("verse_id");--> statement-breakpoint
CREATE INDEX "video_topics_status_idx" ON "video_topics" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_topics_category_idx" ON "video_topics" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "video_topics_title_language_idx" ON "video_topics" USING btree ("title","language");