#!/bin/bash
set -e

echo "=== Building server ==="
npm run server:build

echo "=== Reconciling constraint names ==="
npx tsx scripts/reconcile-constraints.ts || true

echo "=== Pre-migration: normalize verse columns ==="
npx tsx scripts/normalize-verse-columns.ts || true

echo "=== Pre-migration: fix video_pipeline_jobs serial→varchar ==="
psql "$DATABASE_URL" -c "
DO \$\$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'video_pipeline_jobs' AND column_name = 'id' AND data_type = 'integer'
  ) THEN
    DROP TABLE video_pipeline_jobs CASCADE;
    DROP SEQUENCE IF EXISTS video_pipeline_jobs_id_seq CASCADE;
    RAISE NOTICE 'Dropped legacy serial-based video_pipeline_jobs table';
  END IF;
END
\$\$;
" || true

echo "=== Pre-migration: fix video_avatars heygen_avatar_id and voice ==="
psql "$DATABASE_URL" -c "
UPDATE video_avatars SET heygen_avatar_id = 'June_expressive_2024112701' WHERE heygen_avatar_id = 'Juniper';
UPDATE video_avatars SET heygen_voice_id = '68dedac41a9f46a6a4271a95c733823c' WHERE heygen_voice_id = 'hpp4J3VqNfWAUOO0d1Us';
" || true

echo "=== Pre-schema: dedup video topics by title+language ==="
psql "$DATABASE_URL" -c "
DELETE FROM video_topics
WHERE id NOT IN (
  SELECT DISTINCT ON (title, language) id FROM video_topics ORDER BY title, language, created_at ASC
);
" || true

echo "=== Pre-schema: dedup video avatars by name+voice ==="
psql "$DATABASE_URL" -c "
DELETE FROM video_avatars a USING video_avatars b
WHERE a.created_at > b.created_at AND a.name = b.name AND a.heygen_voice_id = b.heygen_voice_id;
" || true

echo "=== Pre-schema: ensure unique index on video_topics ==="
psql "$DATABASE_URL" -c "
CREATE UNIQUE INDEX IF NOT EXISTS video_topics_title_language_idx ON video_topics (title, language);
" || true

echo "=== Pushing schema ==="
if npx drizzle-kit push --force 2>&1; then
  echo "Schema push complete via drizzle-kit"
else
  echo "drizzle-kit push failed (exit $?), applying fallback SQL migrations..."
  npx tsx scripts/ensure-tables.ts
fi

echo "=== Applying hologram and Guided Study retirement migration ==="
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/0003_remove_hologram_and_scholarly_persona.sql

echo "=== Verifying critical tables ==="
npx tsx scripts/ensure-tables.ts

echo "=== Seeding production data ==="

echo "Seeding Bible verses (CRITICAL)..."
npx tsx scripts/seed-verses-prod.ts

echo "Seeding context cards & commentators..."
npx tsx scripts/seed-context.ts || true

echo "Seeding devotional plans..."
npx tsx scripts/seed-devotionals.ts || true

echo "Seeding SDA devotionals..."
npx tsx scripts/seed-sda-devotionals.ts || true

echo "Seeding more devotionals..."
npx tsx scripts/seed-more-devotionals.ts || true

echo "Seeding timeline events..."
npx tsx scripts/seed-timeline.ts || true

echo "Seeding locations..."
npx tsx scripts/seed-locations.ts || true

echo "Seeding application templates..."
npx tsx scripts/seed-application.ts || true

echo "Seeding Strong's concordance..."
npx tsx scripts/seed-strongs-from-json.ts || true

echo "Seeding startup data (formation, beliefs, resources)..."
npx tsx scripts/seed-startup-data.ts || true

echo "Seeding video topics and avatars..."
npx tsx server/seeds/videoAvatars.ts || true
npx tsx server/seeds/videoTopics.ts || true

echo "Post-seed: dedup video topics (safety net)..."
psql "$DATABASE_URL" -c "
DELETE FROM video_topics
WHERE id NOT IN (
  SELECT DISTINCT ON (title, language) id FROM video_topics ORDER BY title, language, created_at ASC
);
" || true

echo "Assigning avatars to video topics..."
psql "$DATABASE_URL" -c "
UPDATE video_topics SET avatar_id = (SELECT id FROM video_avatars WHERE name = 'Jude' LIMIT 1)
WHERE title IN ('Identity', 'Purpose', 'Peer Pressure', 'Gaming Addiction', 'Anger', 'Addiction', 'Ambition vs Surrender', 'What Do I Do With My Life', 'Calling', 'Failure')
AND (avatar_id IS NULL OR avatar_id != (SELECT id FROM video_avatars WHERE name = 'Jude' LIMIT 1));

UPDATE video_topics SET avatar_id = (SELECT id FROM video_avatars WHERE name = 'Young Male 2' LIMIT 1)
WHERE title IN ('Love', 'Romantic Relationships', 'Family Conflict', 'Boundaries', 'Trust', 'Forgiveness', 'Rejection')
AND (avatar_id IS NULL OR avatar_id != (SELECT id FROM video_avatars WHERE name = 'Young Male 2' LIMIT 1));

UPDATE video_topics SET avatar_id = (SELECT id FROM video_avatars WHERE name = 'Sienna' LIMIT 1)
WHERE title IN ('Anxiety', 'Depression', 'Loneliness', 'Body Image', 'Self Worth', 'Am I Enough', 'Belonging', 'Grief', 'Shame', 'Burnout', 'Comparison Culture', 'Toxic Friendships', 'Social Media and Your Identity', 'FOMO', 'Fear', 'Hope', 'Gratitude')
AND (avatar_id IS NULL OR avatar_id != (SELECT id FROM video_avatars WHERE name = 'Sienna' LIMIT 1));

UPDATE video_topics SET avatar_id = (SELECT id FROM video_avatars WHERE name = 'Jude' LIMIT 1)
WHERE title IN ('Daniel''s Diet', 'Your Body is a Temple', 'Exercise and Stewardship')
AND (avatar_id IS NULL OR avatar_id != (SELECT id FROM video_avatars WHERE name = 'Jude' LIMIT 1));

UPDATE video_avatars SET age_group = 'teens' WHERE name IN ('Jude', 'Young Male 2') AND age_group != 'teens';
" || true

echo "Assigning music tracks to video topics..."
psql "$DATABASE_URL" -c "
UPDATE video_topics SET music_track = 'sentimental-emotional-piano-strings.mp3'
WHERE title IN ('Depression', 'Grief', 'Loneliness', 'Shame') AND music_track IS NULL;

UPDATE video_topics SET music_track = 'cinematic-ambient-emotional.mp3'
WHERE title IN ('Anxiety', 'Burnout') AND music_track IS NULL;

UPDATE video_topics SET music_track = 'soft-calm-background.mp3'
WHERE category IN ('Mental Health', 'Mental and Emotional Health') AND music_track IS NULL;

UPDATE video_topics SET music_track = 'cinematic-relaxing-optimistic.mp3'
WHERE title IN ('Identity', 'Belonging', 'Self Worth', 'Faith Doubts', 'Fear', 'I Don''t Feel God', 'Is God Real', 'Prayer Feels Empty', 'Why Does God Allow Suffering') AND music_track IS NULL;

UPDATE video_topics SET music_track = 'morning-in-the-forest.mp3'
WHERE category = 'Biblical Health' AND music_track IS NULL;

UPDATE video_topics SET music_track = 'motivation-inspirational.mp3'
WHERE title IN ('Purpose', 'Calling', 'Hope', 'Gratitude', 'Ambition vs Surrender') AND music_track IS NULL;

UPDATE video_topics SET music_track = 'the-mountain-documentary.mp3'
WHERE title IN ('Peer Pressure', 'Addiction', 'Anger') AND music_track IS NULL;

UPDATE video_topics SET music_track = 'the-mountain-documentary.mp3'
WHERE category = 'Digital World' AND music_track IS NULL;

UPDATE video_topics SET music_track = 'wedding-love-story.mp3'
WHERE title IN ('Love', 'Romantic Relationships', 'Family', 'Forgiveness', 'Family Conflict') AND music_track IS NULL;

UPDATE video_topics SET music_track = 'wedding-love-story.mp3'
WHERE category = 'Relationships' AND music_track IS NULL;

UPDATE video_topics SET music_track = 'cinematic-documentaries-background.mp3'
WHERE category = 'Purpose and Future' AND music_track IS NULL;

UPDATE video_topics SET music_track = 'nastelbom-cinematic.mp3'
WHERE category IN ('Identity', 'Identity and Self Worth', 'Character') AND music_track IS NULL;

UPDATE video_topics SET music_track = 'cinematic-relaxing-optimistic.mp3'
WHERE category IN ('Faith', 'Faith and Doubt') AND music_track IS NULL;

UPDATE video_topics SET music_track = 'soft-calm-background.mp3'
WHERE music_track IS NULL;
" || true

echo "Auto-approving existing avatar-ready topics..."
psql "$DATABASE_URL" -c "
UPDATE video_topics SET review_status = 'approved', published_at = NOW()
WHERE status = 'avatar-ready' AND review_status IS NULL;
" || true

echo "Seeding global churches..."
npx tsx scripts/seed-global-churches.ts || true

echo "=== Deduplicating devotional days ==="
npx tsx scripts/dedup-devotional-days.ts

echo "=== Seeding CRITICAL content (failures block deploy) ==="

echo "Seeding kids content..."
npx tsx scripts/seed-kids-content.ts
echo "Kids content seed: OK"

echo "Seeding David flagship story..."
npx tsx scripts/seed-david-flagship.ts
echo "David flagship seed: OK"

echo "Seeding remaining flagship stories..."
npx tsx scripts/seed-flagship-stories.ts
echo "Flagship stories seed: OK"

echo "=== Backfilling creation story images ==="
npx tsx scripts/backfill-creation-images.ts

echo "=== Backfilling YD and Teen story scenes ==="
npx tsx scripts/backfill-yd-teen-images.ts

echo "=== Deduplicating kids content (post-seed) ==="
npx tsx scripts/dedup-kids-content.ts

echo "=== Verifying flagship story ==="
npx tsx scripts/verify-flagship.ts
echo "Flagship verification: OK"

echo "=== Promoting admin accounts ==="
npx tsx scripts/promote-admins.ts

echo "=== Post-seed verification ==="
npx tsx scripts/verify-production.ts

echo "=== Verifying approved devotional catalog ==="
npm run test:devotional-catalog

echo "=== Data seeding complete ==="

echo "=== Running security regression gate ==="
echo "Starting temporary server for security checks..."
SERVER_PID=""
cleanup_server() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
    echo "Temporary server stopped (pid $SERVER_PID)"
    SERVER_PID=""
  fi
}
trap cleanup_server EXIT

export DEPLOY_TEST_PORT=5099
RUN_STARTUP_SEEDS=false ALLOW_INSECURE_PASSWORD_RESET=false NODE_ENV=production PORT=$DEPLOY_TEST_PORT node server_dist/index.js &
SERVER_PID=$!

echo "Waiting for server (pid $SERVER_PID) to be ready on port $DEPLOY_TEST_PORT..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "" http://localhost:$DEPLOY_TEST_PORT/api/health 2>/dev/null; then
    echo "Server ready after ${i}s"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "DEPLOY BLOCKED: Temporary server failed to start within 30s"
    exit 1
  fi
  sleep 1
done

if bash scripts/security-regression.sh; then
  echo "Security regression: ALL PASSED"
else
  echo "DEPLOY BLOCKED: Security regression failed"
  exit 1
fi

cleanup_server
trap - EXIT

echo "=== Building Expo static (mobile) ==="
npm run expo:static:build

echo "=== Cleaning stale web build ==="
rm -rf dist/
echo "Old dist/ removed"

echo "=== Building Expo web (fresh) ==="
npx expo export --platform web --output-dir dist

if [ ! -f dist/index.html ]; then
  echo "DEPLOY BLOCKED: Expo web build failed — dist/index.html not found"
  exit 1
fi

echo "Web build verified: dist/index.html exists"
echo "=== Build complete ==="
