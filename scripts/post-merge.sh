#!/bin/bash
set -e

echo "=== Post-merge setup ==="

echo "Installing dependencies..."
npm install --legacy-peer-deps 2>&1 || true

echo "Pushing schema changes..."
npx drizzle-kit push --force 2>&1

echo "=== Post-merge setup complete ==="
