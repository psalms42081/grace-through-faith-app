#!/bin/bash
set -e

echo "=== Building server ==="
npm run server:build

echo "=== Pushing schema ==="
if npx drizzle-kit push --force; then
  echo "Schema push complete via drizzle-kit"
else
  echo "drizzle-kit push failed, applying fallback SQL migrations..."
  npx tsx scripts/ensure-tables.ts
fi

echo "=== Verifying critical tables ==="
npx tsx scripts/ensure-tables.ts

echo "=== Seeding production data ==="

echo "Seeding Bible verses..."
npx tsx scripts/seed-verses-prod.ts || true

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

echo "Seeding kids content..."
npx tsx scripts/seed-kids-content.ts || true

echo "Seeding Strong's concordance..."
npx tsx scripts/seed-strongs-from-json.ts || true

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

RUN_STARTUP_SEEDS=false ALLOW_INSECURE_PASSWORD_RESET=false NODE_ENV=production node server_dist/index.js &
SERVER_PID=$!

echo "Waiting for server (pid $SERVER_PID) to be ready..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "" http://localhost:5000/api/health 2>/dev/null; then
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

echo "=== Building Expo static ==="
npm run expo:static:build
