#!/usr/bin/env bash
#
# Bump the version in all three places: package.json, jsr.json, src/version.ts
#
# Usage:
#   ./scripts/bump-version.sh <new-version>
#   ./scripts/bump-version.sh 2.0.0-alpha.9
#   ./scripts/bump-version.sh 2.0.0-beta.1
#   ./scripts/bump-version.sh 2.0.0

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <new-version>"
  echo "Example: $0 2.0.0-alpha.9"
  exit 1
fi

NEW_VERSION="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Validate version format (semver with optional prerelease)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
  echo "Error: invalid semver: $NEW_VERSION"
  exit 1
fi

# Read current version from package.json
CURRENT=$(grep '"version"' "$ROOT/package.json" | head -1 | sed 's/.*"\([0-9][^"]*\)".*/\1/')

if [[ "$CURRENT" == "$NEW_VERSION" ]]; then
  echo "Already at $NEW_VERSION"
  exit 0
fi

echo "$CURRENT → $NEW_VERSION"

# Portable in-place edit: BSD sed wants `-i ''`, GNU sed parses that as a
# missing file. Use a temp file + mv instead — works in both, atomic.
replace_in_file() {
  local pattern="$1"
  local file="$2"
  local tmp
  tmp="$(mktemp "${file}.XXXXXX")"
  sed "$pattern" "$file" > "$tmp"
  mv "$tmp" "$file"
}

replace_in_file "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$ROOT/package.json"
replace_in_file "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW_VERSION\"/" "$ROOT/jsr.json"
replace_in_file "s/export const version = \"$CURRENT\"/export const version = \"$NEW_VERSION\"/" "$ROOT/src/version.ts"

# Verify
for file in package.json jsr.json src/version.ts; do
  if ! grep -q "$NEW_VERSION" "$ROOT/$file"; then
    echo "Error: failed to update $file"
    exit 1
  fi
done

echo "Updated: package.json, jsr.json, src/version.ts"
