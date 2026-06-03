#!/usr/bin/env node
// Fail if a system component declares a `position: fixed` overlay but doesn't
// portal it to <body>.
//
// A fixed overlay is positioned relative to the viewport ONLY while no ancestor
// establishes a containing block or stacking context for it. A transformed /
// `isolation` / `contain` / `will-change` ancestor — common on real consumer
// pages, and present on the editor's `.content` pane — silently traps the
// overlay: it gets clipped or painted under sibling chrome. The fix is to
// portal the fixed layer out of the component's tree to <body>
// (src/system/internal/portal.ts), used via `use:portal`.
//
// This guards the contract: every component whose `<style>` has
// `position: fixed` must use the portal action. Tooltip is exempt — it is
// `position: absolute`, anchored to its trigger by design, not a fixed overlay.

import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const COMPONENTS = 'src/system/components';

const STYLE_BLOCK = /<style[^>]*>([\s\S]*?)<\/style>/g;
const FIXED = /position:\s*fixed/;
const USES_PORTAL = /\buse:portal\b/;

const violations = [];
for (const ent of await readdir(join(ROOT, COMPONENTS), { withFileTypes: true })) {
  if (!ent.name.endsWith('.svelte')) continue;
  const file = join(ROOT, COMPONENTS, ent.name);
  const src = await readFile(file, 'utf8');

  let hasFixed = false;
  let sb;
  while ((sb = STYLE_BLOCK.exec(src)) !== null) {
    if (FIXED.test(sb[1])) hasFixed = true;
  }
  if (hasFixed && !USES_PORTAL.test(src)) {
    violations.push(relative(ROOT, file));
  }
}

if (violations.length > 0) {
  console.error('[check-overlay-portal] Fixed overlay is not portaled.');
  console.error('A component with `position: fixed` must portal that layer to <body> via');
  console.error('`use:portal` (src/system/internal/portal.ts), or a transformed/isolated');
  console.error('ancestor will clip it. See Dialog.svelte / ImageLightbox.svelte.\n');
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}

console.log('[check-overlay-portal] OK — every fixed overlay portals to <body>.');
