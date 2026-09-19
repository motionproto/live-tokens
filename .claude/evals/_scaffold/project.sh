#!/usr/bin/env bash
# Seeds a run's empty workspace with the least of the package that
# `npx live-tokens components` reads. The run's sandbox cannot read the
# repository or reach the network, so the files are copied in.
set -euo pipefail
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PKG=node_modules/@motion-proto/live-tokens
mkdir -p "$PKG/src/system" "$PKG/src/editor/component-editor" node_modules/.bin src/pages
cp -R "$REPO/bin" "$PKG/bin"
cp -R "$REPO/src/system/components" "$PKG/src/system/components"
cp "$REPO/src/editor/component-editor/registry.ts" "$PKG/src/editor/component-editor/registry.ts"
cp "$REPO/package.json" "$PKG/package.json"
ln -s ../@motion-proto/live-tokens/bin/cli.mjs node_modules/.bin/live-tokens
printf '{\n  "name": "eval-project",\n  "private": true,\n  "type": "module",\n  "dependencies": { "@motion-proto/live-tokens": "*" }\n}\n' > package.json
