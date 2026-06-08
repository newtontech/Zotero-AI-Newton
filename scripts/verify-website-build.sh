#!/bin/bash
# Website build verification script
# Runs the static build and performs basic checks

set -e

echo "=== Building website ==="
npm run build:docs

echo ""
echo "=== Verifying build output ==="
if [ ! -f "docs/index.html" ]; then
  echo "ERROR: docs/index.html not found after build"
  exit 1
fi

if [ ! -d "docs/assets" ]; then
  echo "ERROR: docs/assets directory not found after build"
  exit 1
fi

echo "✓ Build output exists"

echo ""
echo "=== Checking for Babel/vendor leftovers ==="
if [ -d "docs/vendor" ]; then
  echo "WARNING: docs/vendor directory still exists (should use static build)"
fi

if [ -d "docs/js" ]; then
  echo "WARNING: docs/js directory still exists (should use static build)"
fi

echo ""
echo "=== Website build verification complete ==="
echo "Output: docs/index.html"
echo "To preview: npm run preview:docs"
