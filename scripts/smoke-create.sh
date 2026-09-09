#!/usr/bin/env bash
# Smoke-test the `create` scaffold end to end, against the real tarball.
#
# Pipeline:
#   1. npm pack → tarball
#   2. Extract it and run the SHIPPED bin: `live-tokens create <app>`
#   3. Repoint the generated app's dependency at the tarball (the new version
#      isn't published yet) and `npm install` — no --legacy-peer-deps, so a
#      fresh consumer must resolve cleanly
#   4. `npm run build` → must succeed
#
# Proves the tarball actually contains template/ + the seed CSS sources, the
# bin runs from an installed location, and the generated app builds.
#
# Wired into prepublishOnly so a broken scaffold can't ship.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

PKG_NAME="$(node -p "require('./package.json').name")"
PKG_VERSION="$(node -p "require('./package.json').version")"

echo "→ npm pack ($PKG_NAME@$PKG_VERSION)…"
TARBALL_NAME="$(npm pack --silent)"
TARBALL_PATH="$REPO_ROOT/$TARBALL_NAME"

WORK="$(mktemp -d -t lt-create-smoke-XXXXXX)"
trap 'rm -f "$TARBALL_PATH"; rm -rf "$WORK"' EXIT

echo "→ Extracting tarball…"
tar -xzf "$TARBALL_PATH" -C "$WORK"
PKG_DIR="$WORK/package"
APP_DIR="$WORK/app"

echo "→ Scaffolding via shipped bin…"
node "$PKG_DIR/bin/cli.mjs" create "$APP_DIR"

echo "→ Repointing dependency at the tarball…"
node -e "
  const fs = require('fs');
  const p = '$APP_DIR/package.json';
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  j.dependencies['$PKG_NAME'] = 'file:$TARBALL_PATH';
  fs.writeFileSync(p, JSON.stringify(j, null, 2));
"

echo "→ Installing + building generated app…"
(cd "$APP_DIR" && npm install --silent --no-audit --no-fund --loglevel=error)

echo "→ Verifying postinstall placed the skills…"
# The scaffold's postinstall ends in `|| exit 0` so a skills copy can never fail
# someone's install. That also swallows a broken setup-claude, so assert the
# result here rather than trusting the install's exit code.
node -e "
  const fs = require('node:fs');
  const path = require('node:path');
  const dir = path.join('$APP_DIR', '.claude', 'skills');
  const shipped = fs.readdirSync(path.join('$PKG_DIR', '.claude', 'skills'))
    .filter((n) => fs.statSync(path.join('$PKG_DIR', '.claude', 'skills', n)).isDirectory());
  const got = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
  const missing = shipped.filter((s) => !got.includes(s));
  if (missing.length) throw new Error('postinstall installed no skills: ' + missing.join(', '));
  if (!fs.readFileSync(path.join('$APP_DIR', '.gitignore'), 'utf8').includes('.claude/skills/live-tokens-*/')) {
    throw new Error('scaffold tracks the skills copy: .gitignore has no live-tokens skills entry');
  }
"

(cd "$APP_DIR" && npm run build)

echo "✓ Smoke create OK"
