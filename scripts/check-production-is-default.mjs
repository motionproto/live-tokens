#!/usr/bin/env node
// Publish gate: assert the shipped baseline is the DEFAULT. A production-only
// consumer never runs the dev plugin and inherits whatever look is baked into
// the committed tokens.generated.css. If a maintainer packs while production
// names a custom theme, or while an unsaved buffer is on disk, every such
// consumer silently inherits that state. Mirrors check:component-defaults'
// --check exit semantics.
//
// Enforced (necessary conditions):
//   1. themes/_production.json → "default" (absent resolves to default too)
//   2. themes/_active.json     → "default"
//   3. no `_working.json` anywhere: the buffer is an unsaved edit, never shipped
//   4. no retired per-layer `_active`/`_production` pointer: while one exists
//      boot refuses to rebake, so tokens.generated.css could be anything
//   5. committed tokens.generated.css carries NO component-alias override block
//      (regenerateTokensCss emits one only where the production theme carries a
//      config differing from that component's default, so its presence
//      contradicts #1 or means the file is stale).
//
// Not enforced: a full regen-diff of the theme vars in tokens.generated.css.
// The dev plugin regenerates that file from the production theme on every
// start; re-deriving palettes/font stacks here would duplicate the plugin's
// generation logic as a second source of truth. The checks above catch the
// documented risk (packing on a custom production theme).

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src/live-tokens/data');

const errors = [];
const rel = (p) => relative(ROOT, p);

// A missing pointer file resolves to "default" at runtime, so absence is fine.
function pointer(file, key) {
  if (!existsSync(file)) return 'default';
  try {
    return JSON.parse(readFileSync(file, 'utf8'))[key] || 'default';
  } catch {
    return `<unparseable: ${rel(file)}>`;
  }
}

const themeProduction = pointer(join(DATA, 'themes/_production.json'), 'productionFile');
if (themeProduction !== 'default') {
  errors.push(`themes production pointer is "${themeProduction}", expected "default"`);
}

const themeActive = pointer(join(DATA, 'themes/_active.json'), 'activeFile');
if (themeActive !== 'default') {
  errors.push(`themes active pointer is "${themeActive}", expected "default"`);
}

const layerDirs = [join(DATA, 'colors-and-type'), join(DATA, 'themes')];
const compRoot = join(DATA, 'component-configs');
if (existsSync(compRoot)) {
  for (const d of readdirSync(compRoot, { withFileTypes: true })) {
    if (d.isDirectory()) layerDirs.push(join(compRoot, d.name));
  }
}

for (const dir of layerDirs) {
  const working = join(dir, '_working.json');
  if (existsSync(working)) {
    errors.push(`${rel(working)} exists — that is an unsaved edit, not a shipped baseline`);
  }
  if (dir === join(DATA, 'themes')) continue;
  for (const name of ['_active.json', '_production.json']) {
    const legacy = join(dir, name);
    if (existsSync(legacy)) {
      errors.push(`${rel(legacy)} is a retired per-layer pointer — run \`npx live-tokens migrate\``);
    }
  }
}

const genPath = join(DATA, 'tokens.generated.css');
if (!existsSync(genPath)) {
  errors.push('tokens.generated.css is missing');
} else if (readFileSync(genPath, 'utf8').includes('Component aliases (production configs differing from defaults)')) {
  errors.push(
    'tokens.generated.css contains a component-alias override block, but the production theme must be the default',
  );
}

if (errors.length) {
  console.error('check:production-is-default FAILED — the shipped baseline is not the default:\n');
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    '\nAdopt the Default theme, clear any working buffer, and regenerate ' +
      'tokens.generated.css, then commit, before publishing.',
  );
  process.exit(1);
}

console.log('check:production-is-default OK — the production theme is the default and no buffer is on disk.');
