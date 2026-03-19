#!/bin/bash
set -e

echo "=== Building server ==="
npm run server:build

echo "=== Reconciling constraint names ==="
npx tsx scripts/reconcile-constraints.ts || true

echo "=== Pre-migration: normalize verse columns ==="
npx tsx scripts/normalize-verse-columns.ts || true

echo "=== Pushing schema ==="
if npx drizzle-kit push --force 2>&1; then
  echo "Schema push complete via drizzle-kit"
else
  echo "drizzle-kit push failed (exit $?), applying fallback SQL migrations..."
  npx tsx scripts/ensure-tables.ts
fi

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

echo "=== Deduplicating kids content (post-seed) ==="
npx tsx scripts/dedup-kids-content.ts

echo "=== Verifying flagship story ==="
npx tsx scripts/verify-flagship.ts
echo "Flagship verification: OK"

echo "=== Promoting admin accounts ==="
npx tsx scripts/promote-admins.ts

echo "=== Post-seed verification ==="
npx tsx scripts/verify-production.ts

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

echo "=== Building Expo web ==="
npx expo export --platform web --output-dir dist

echo "=== Build complete ==="
