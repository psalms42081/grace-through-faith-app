BEGIN;
--> statement-breakpoint
ALTER TABLE "public"."users"
ADD COLUMN IF NOT EXISTS "adult_confirmed_at" timestamptz;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."bible_small_group" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "host_user_id" varchar NOT NULL,
  "invite_code" varchar(8) NOT NULL,
  "church_id" varchar,
  "curriculum" varchar(16) DEFAULT 'adult' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "archived_at" timestamptz,
  CONSTRAINT "bible_small_group_invite_code_uniq" UNIQUE ("invite_code"),
  CONSTRAINT "bible_small_group_curriculum_check" CHECK ("curriculum" IN ('adult', 'inverse'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bible_small_group_host_idx"
  ON "public"."bible_small_group" ("host_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bible_small_group_church_idx"
  ON "public"."bible_small_group" ("church_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."bible_small_group_member" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" varchar NOT NULL,
  "user_id" varchar NOT NULL,
  "role" varchar(12) DEFAULT 'member' NOT NULL,
  "joined_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "bible_small_group_member_group_user_uniq" UNIQUE ("group_id", "user_id"),
  CONSTRAINT "bible_small_group_member_role_check" CHECK ("role" IN ('host', 'member'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bible_small_group_member_user_idx"
  ON "public"."bible_small_group_member" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "public"."bible_small_group_post" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "group_id" varchar NOT NULL,
  "user_id" varchar NOT NULL,
  "ss_week_key" varchar(64) NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bible_small_group_post_group_week_idx"
  ON "public"."bible_small_group_post" ("group_id", "ss_week_key");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bible_small_group_post_created_idx"
  ON "public"."bible_small_group_post" ("created_at");
--> statement-breakpoint
ALTER TABLE "public"."bible_small_group"
  ADD CONSTRAINT "bible_small_group_host_user_id_users_id_fk"
  FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."bible_small_group"
  ADD CONSTRAINT "bible_small_group_church_id_sda_church_id_fk"
  FOREIGN KEY ("church_id") REFERENCES "public"."sda_church"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."bible_small_group_member"
  ADD CONSTRAINT "bible_small_group_member_group_id_bible_small_group_id_fk"
  FOREIGN KEY ("group_id") REFERENCES "public"."bible_small_group"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."bible_small_group_member"
  ADD CONSTRAINT "bible_small_group_member_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."bible_small_group_post"
  ADD CONSTRAINT "bible_small_group_post_group_id_bible_small_group_id_fk"
  FOREIGN KEY ("group_id") REFERENCES "public"."bible_small_group"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "public"."bible_small_group_post"
  ADD CONSTRAINT "bible_small_group_post_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
COMMIT;
