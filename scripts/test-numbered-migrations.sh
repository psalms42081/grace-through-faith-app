#!/bin/bash
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

TEST_SCHEMA="migration_test_$$_$(date +%s)"
INCOMPLETE_SCHEMA="${TEST_SCHEMA}_incomplete"
FIRST_DEPLOY_LOG="/tmp/${TEST_SCHEMA}_first.log"
SECOND_DEPLOY_LOG="/tmp/${TEST_SCHEMA}_second.log"

cleanup() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -c "DROP SCHEMA IF EXISTS \"$TEST_SCHEMA\" CASCADE" >/dev/null 2>&1
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
    -c "DROP SCHEMA IF EXISTS \"$INCOMPLETE_SCHEMA\" CASCADE" >/dev/null 2>&1
  rm -f "$FIRST_DEPLOY_LOG" "$SECOND_DEPLOY_LOG"
}
trap cleanup EXIT

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "CREATE SCHEMA \"$TEST_SCHEMA\"" >/dev/null

export NUMBERED_MIGRATIONS_SCHEMA="$TEST_SCHEMA"
export PGOPTIONS="-c search_path=$TEST_SCHEMA"

scalar() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -Atqc "$1"
}

echo "=== Fresh database: applying schema and pre-seed migrations ==="
npx tsx scripts/run-numbered-migrations.ts --through 0004

if [ "$(scalar "SELECT count(*) FROM app_sql_migration")" -ne 5 ]; then
  echo "Expected migrations 0000-0004 in the fresh-database ledger" >&2
  exit 1
fi

if [ "$(scalar "SELECT count(*) FROM devotional_plan")" -ne 0 ]; then
  echo "Fresh migration test unexpectedly contains devotional plans before seeding" >&2
  exit 1
fi

echo "=== Concurrent fresh deployments: serializing seeds and catalog approval ==="
npx tsx scripts/prepare-devotional-catalog.ts >"$FIRST_DEPLOY_LOG" 2>&1 &
first_deploy_pid=$!
npx tsx scripts/prepare-devotional-catalog.ts >"$SECOND_DEPLOY_LOG" 2>&1 &
second_deploy_pid=$!

first_status=0
second_status=0
wait "$first_deploy_pid" || first_status=$?
wait "$second_deploy_pid" || second_status=$?
cat "$FIRST_DEPLOY_LOG"
cat "$SECOND_DEPLOY_LOG"

if [ "$first_status" -ne 0 ] || [ "$second_status" -ne 0 ]; then
  echo "Concurrent devotional catalog preparation failed" >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO devotional_plan
  (id, title, total_days, is_published, is_ai_generated, provenance)
VALUES
  ('migration-repeat-preservation-check', 'Migration preservation check', 1, false, false, 'legacy_unclassified');
SQL

plan_count_before="$(scalar "SELECT count(*) FROM devotional_plan")"
day_count_before="$(scalar "SELECT count(*) FROM devotional_day")"

echo "=== Repeat deployment: all migrations skip and data remains intact ==="
npx tsx scripts/prepare-devotional-catalog.ts

if [ "$(scalar "SELECT count(*) FROM app_sql_migration")" -ne 6 ]; then
  echo "Expected exactly six numbered migrations in the ledger" >&2
  exit 1
fi

if [ "$(scalar "SELECT count(*) FROM app_sql_migration WHERE execution_method = 'applied'")" -ne 6 ]; then
  echo "Fresh database should apply every numbered migration rather than baseline one" >&2
  exit 1
fi

if [ "$(scalar "SELECT count(*) FROM devotional_plan")" -ne "$plan_count_before" ]; then
  echo "Repeat deployment changed the devotional plan count" >&2
  exit 1
fi

if [ "$(scalar "SELECT count(*) FROM devotional_day")" -ne "$day_count_before" ]; then
  echo "Repeat deployment changed the devotional day count" >&2
  exit 1
fi

echo "=== Existing database adoption: verifying and preserving pre-ledger data ==="
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL' >/dev/null
INSERT INTO sabbath_school_quarterly
  (id, quarter_code, title, curriculum_type)
VALUES
  ('migration-adoption-quarterly', '2099-q1-cq', 'Migration adoption check', 'adult');
SQL
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "DROP TABLE app_sql_migration" >/dev/null
npx tsx scripts/prepare-devotional-catalog.ts

if [ "$(scalar "SELECT count(*) FROM app_sql_migration WHERE execution_method = 'schema_baseline'")" -ne 2 ]; then
  echo "Expected existing schema adoption to baseline only migrations 0000 and 0003" >&2
  exit 1
fi

if [ "$(scalar "SELECT count(*) FROM app_sql_migration WHERE execution_method = 'applied'")" -ne 4 ]; then
  echo "Expected existing schema adoption to apply migrations 0001, 0002, 0004, and 0005" >&2
  exit 1
fi

if [ "$(scalar "SELECT count(*) FROM sabbath_school_quarterly WHERE id = 'migration-adoption-quarterly' AND curriculum_type = 'inverse'")" -ne 1 ]; then
  echo "Existing schema adoption did not apply migration 0001's curriculum backfill" >&2
  exit 1
fi

if [ "$(scalar "SELECT count(*) FROM devotional_plan")" -ne "$plan_count_before" ] \
  || [ "$(scalar "SELECT count(*) FROM devotional_day")" -ne "$day_count_before" ]; then
  echo "Existing database adoption changed devotional data counts" >&2
  exit 1
fi

if [ "$(scalar "SELECT count(*) FROM devotional_plan WHERE id = 'migration-repeat-preservation-check'")" -ne 1 ]; then
  echo "Repeat deployment or existing schema adoption lost an existing devotional plan" >&2
  exit 1
fi

if [ "$(scalar "SELECT count(*) FROM (SELECT title FROM devotional_plan GROUP BY title HAVING count(*) > 1) duplicates")" -ne 0 ]; then
  echo "Repeat deployment created duplicate devotional plan titles" >&2
  exit 1
fi

if [ "$(scalar "SELECT count(*) FROM (SELECT plan_id, day_number FROM devotional_day GROUP BY plan_id, day_number HAVING count(*) > 1) duplicates")" -ne 0 ]; then
  echo "Repeat deployment created duplicate devotional days" >&2
  exit 1
fi

echo "=== Incomplete schema adoption: refusing unsafe baseline ==="
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "CREATE SCHEMA \"$INCOMPLETE_SCHEMA\"; CREATE TABLE \"$INCOMPLETE_SCHEMA\".unrelated_data (id integer)" \
  >/dev/null
if NUMBERED_MIGRATIONS_SCHEMA="$INCOMPLETE_SCHEMA" \
  PGOPTIONS="-c search_path=$INCOMPLETE_SCHEMA" \
  npx tsx scripts/run-numbered-migrations.ts --through 0004 >/dev/null 2>&1; then
  echo "Migration runner accepted an incomplete, unrelated schema" >&2
  exit 1
fi

echo "Numbered migration fresh-database and repeat-deployment checks passed."