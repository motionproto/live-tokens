#!/usr/bin/env bash
# Copies the prebuilt consumer project into a run's empty workspace. The
# sandbox cannot follow a link out of the workspace, so this is a real copy.
set -euo pipefail
# scripts/eval.sh runs the cases from a staged copy and writes the repository path beside this file.
REPO="$(cat "$(dirname "${BASH_SOURCE[0]}")/repo")"
SOURCE="$REPO/scratch/eval-project"
if [ ! -f "$SOURCE/.built-from" ]; then
  echo "scratch/eval-project is missing. Run npm run build:eval-project." >&2
  exit 1
fi
cp -cR "$SOURCE/." . 2>/dev/null || cp -R "$SOURCE/." .
