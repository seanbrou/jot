#!/bin/bash
# Build Jot: landing page at /, React app at /app
set -e

# Install and build React app
npm install --legacy-peer-deps
npm run build

# Move React build to dist/app/
mkdir -p dist/app
cp -r dist/assets dist/app/
mv dist/index.html dist/app/

# Landing page becomes root index.html
cp landing.html dist/index.html

echo "✓ Built: landing page at / and app at /app"
