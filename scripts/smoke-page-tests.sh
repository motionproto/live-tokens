#!/usr/bin/env bash
# Smoke-test the consumer acceptance gate: the real published tarball,
# installed into a fresh throwaway project outside this repo, must let a
# consumer validate their own page's rendered output with `check-page --tests`.
#
# Pipeline:
#   1. npm pack → tarball (same reasoning as scripts/smoke-component-tests.sh:
#      a file:<dir> or symlink install gives two copies of @playwright/test)
#   2. scripts/lib/pageGate.mjs builds one throwaway consumer project from the
#      shipped `create` template and runs the documented command on the
#      template's own clean page and on the same page under a deliberate
#      site.css override, asserting every result
#
# Extends the scripts/smoke-install.sh / scripts/smoke-create.sh /
# scripts/smoke-component-tests.sh pattern. Kept to two pages: the component
# gate already measured what a full-catalogue batch costs.
# Wired into prepublishOnly so a broken consumer page-testing path can't ship.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PKG_NAME="$(node -p "require('./package.json').name")"
PKG_VERSION="$(node -p "require('./package.json').version")"

# Packs to a temp directory, not the repo root, for the same reason
# scripts/smoke-component-tests.sh does: a tarball stranded in /tmp is inert;
# one stranded at the repo root is untracked and would ride along with the
# next commit.
PACK_DIR="$(mktemp -d -t lt-page-gate-pack-XXXXXX)"
trap 'rm -rf "$PACK_DIR"' EXIT

echo "→ npm pack ($PKG_NAME@$PKG_VERSION)…"
TARBALL_NAME="$(npm pack --silent --pack-destination "$PACK_DIR")"
TARBALL_PATH="$PACK_DIR/$TARBALL_NAME"

node "$REPO_ROOT/scripts/lib/pageGate.mjs" "$TARBALL_PATH"
