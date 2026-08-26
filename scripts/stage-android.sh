#!/usr/bin/env bash
# Stage the Quart web app into the Android project's bundled assets.
# The same copy runs in CI before `gradle assembleRelease`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="$ROOT/android/app/src/main/assets/public"

rm -rf "$DEST"
mkdir -p "$DEST"

cp "$ROOT/index.html" "$DEST/"
cp "$ROOT/manifest.json" "$DEST/"
cp "$ROOT/sw.js" "$DEST/"
cp -r "$ROOT/src" "$DEST/src"
cp -r "$ROOT/assets" "$DEST/assets"

echo "◈ Staged web app → $DEST"
