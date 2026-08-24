#!/bin/bash
set -euo pipefail

echo "=== Database-free production build v1 ==="
echo "=== Verifying production build command allowlist ==="
npm run test:deploy-build-safety

echo "=== Auditing curated teaching video availability ==="
npm run audit:touchpoint-videos

echo "=== Building server ==="
npm run server:build

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
echo "=== Database-free build complete ==="