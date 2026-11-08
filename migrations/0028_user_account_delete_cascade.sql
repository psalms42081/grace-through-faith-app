-- Account deletion: notes/highlights/bookmarks used ON DELETE NO ACTION, so
-- DELETE FROM users failed when any annotation existed. Plan-day progress
-- blocked enrollment cascade the same way.
ALTER TABLE "user_note" DROP CONSTRAINT IF EXISTS "user_note_user_id_users_id_fk";
ALTER TABLE "user_note"
  ADD CONSTRAINT "user_note_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "user_highlight" DROP CONSTRAINT IF EXISTS "user_highlight_user_id_users_id_fk";
ALTER TABLE "user_highlight"
  ADD CONSTRAINT "user_highlight_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "user_bookmark" DROP CONSTRAINT IF EXISTS "user_bookmark_user_id_users_id_fk";
ALTER TABLE "user_bookmark"
  ADD CONSTRAINT "user_bookmark_user_id_users_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "user_plan_progress" DROP CONSTRAINT IF EXISTS "user_plan_progress_enrollment_id_user_plan_enrollment_id_fk";
ALTER TABLE "user_plan_progress"
  ADD CONSTRAINT "user_plan_progress_enrollment_id_user_plan_enrollment_id_fk"
  FOREIGN KEY ("enrollment_id") REFERENCES "public"."user_plan_enrollment"("id") ON DELETE cascade ON UPDATE no action;
