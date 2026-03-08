#!/bin/bash
set -e

echo "=== Building server ==="
npm run server:build

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

echo "=== Building Expo static ==="
npm run expo:static:build
