#!/usr/bin/env bash
# Copies the prebuilt consumer project into a run's empty workspace. The
# sandbox cannot follow a link out of the workspace, so this is a real copy.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
SOURCE="$REPO/scratch/eval-project"
if [ ! -f "$SOURCE/.built-from" ]; then
  echo "scratch/eval-project is missing. Run npm run build:eval-project." >&2
  exit 1
fi
cp -cR "$SOURCE/." . 2>/dev/null || cp -R "$SOURCE/." .
