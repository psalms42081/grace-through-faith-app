#!/bin/bash
set -e
npm run server:build
echo "Seeding Bible verses if needed..."
npx tsx scripts/seed-verses-prod.ts
npm run expo:static:build
