#!/usr/bin/env bash
set -euo pipefail

# The outcome evals start in an empty workspace with no network, so they copy
# in a consumer project that was installed ahead of time.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"
source "$REPO_ROOT/scripts/lib/consumer-project.sh"

TARGET="$REPO_ROOT/scratch/eval-project"
STAMP="$(git rev-parse HEAD)$(git status --porcelain -- src bin template package.json | shasum | cut -c1-12)"

if [ -f "$TARGET/.built-from" ] && [ "$(cat "$TARGET/.built-from")" = "$STAMP" ]; then
  echo "eval project is current"
  exit 0
fi

npm run build:lib

WORK="$(mktemp -d -t lt-eval-project-XXXXXX)"
TARBALL_PATH=""
trap 'rm -f "$TARBALL_PATH"; rm -rf "$WORK"' EXIT

rm -rf "$TARGET"
mkdir -p "$(dirname "$TARGET")"
make_consumer_project "$REPO_ROOT" "$WORK" "$TARGET"

# The plugin under test supplies the skills. A copy in the project would reach
# the arm that runs without them.
rm -rf "$TARGET/.claude"

echo "$STAMP" > "$TARGET/.built-from"
echo "✓ eval project built at scratch/eval-project"
