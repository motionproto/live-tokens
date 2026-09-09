#!/usr/bin/env bash
# Smoke-test the consumer acceptance gate: the real published tarball,
# installed into fresh throwaway projects outside this repo, must let a
# consumer validate a component they authored themselves with
# `check-component --tests`.
#
# Pipeline:
#   1. npm pack → tarball (never a symlink or file:<dir> install: two copies
#      of @playwright/test give "Requiring @playwright/test second time" and
#      "0 tests in 0 files", so this must always be a real tarball install)
#   2. scripts/lib/componentGate.mjs builds two throwaway consumer projects
#      from the shipped `create` template, exercises the documented setup and
#      the CLI end to end (registration, contracts, defects, isolation), and
#      asserts every result
#
# Extends the scripts/smoke-install.sh / scripts/smoke-create.sh pattern.
# Costs minutes: one full-catalogue batch run is part of what it proves.
# Wired into prepublishOnly so a broken consumer testing path can't ship.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PKG_NAME="$(node -p "require('./package.json').name")"
PKG_VERSION="$(node -p "require('./package.json').version")"

# Packs to a temp directory, not the repo root: this gate runs for minutes
# (a full-catalogue batch is part of what it proves), which is a much wider
# window for an interrupted run to skip the EXIT trap below than the other
# smoke scripts get. A tarball stranded in /tmp is inert; one stranded at the
# repo root is untracked and would ride along with the next commit.
PACK_DIR="$(mktemp -d -t lt-component-gate-pack-XXXXXX)"
trap 'rm -rf "$PACK_DIR"' EXIT

echo "→ npm pack ($PKG_NAME@$PKG_VERSION)…"
TARBALL_NAME="$(npm pack --silent --pack-destination "$PACK_DIR")"
TARBALL_PATH="$PACK_DIR/$TARBALL_NAME"

node "$REPO_ROOT/scripts/lib/componentGate.mjs" "$TARBALL_PATH"
