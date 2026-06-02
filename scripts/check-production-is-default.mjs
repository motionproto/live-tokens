#!/usr/bin/env node
// Publish gate: assert the shipped baseline is the DEFAULT. A production-only
// consumer never runs the dev plugin and inherits whatever palette/overrides are
// baked into the committed tokens.generated.css. If a maintainer packs while a
// production pointer is a custom file, every such consumer silently inherits
// that custom state. Mirrors check:component-defaults' --check exit semantics.
//
// Enforced (necessary conditions):
//   1. themes/_production.json   → "default"
//   2. manifests/_active.json    → "default"
//   3. every component-configs/<comp>/_production.json → "default"
//   4. committed tokens.generated.css carries NO component-alias override block
//      (regenerateTokensCss emits one only when a component production pointer
//      differs from default, so its presence contradicts #3 or means the file
//      is stale).
//
// Not enforced: a full regen-diff of the theme vars in tokens.generated.css.
// The dev plugin regenerates that file from the default theme on every start;
// re-deriving palettes/font stacks here would duplicate the plugin's generation
// logic as a second source of truth. The pointer checks above catch the
// documented risk (packing on a custom production theme).

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src/live-tokens/data');

const errors = [];

// A missing pointer file resolves to "default" at runtime, so absence is fine.
function pointer(file, key) {
  if (!existsSync(file)) return 'default';
  try {
    return JSON.parse(readFileSync(file, 'utf8'))[key] || 'default';
  } catch {
    return `<unparseable: ${file}>`;
  }
}

const themeProd = pointer(join(DATA, 'themes/_production.json'), 'productionFile');
if (themeProd !== 'default') errors.push(`themes production pointer is "${themeProd}", expected "default"`);

const manifestActive = pointer(join(DATA, 'manifests/_active.json'), 'activeFile');
if (manifestActive !== 'default') errors.push(`manifests active pointer is "${manifestActive}", expected "default"`);

const compRoot = join(DATA, 'component-configs');
if (existsSync(compRoot)) {
  for (const d of readdirSync(compRoot, { withFileTypes: true })) {
    if (!d.isDirectory()) continue;
    const prod = pointer(join(compRoot, d.name, '_production.json'), 'productionFile');
    if (prod !== 'default') errors.push(`component "${d.name}" production pointer is "${prod}", expected "default"`);
  }
}

const genPath = join(DATA, 'tokens.generated.css');
if (!existsSync(genPath)) {
  errors.push('tokens.generated.css is missing');
} else if (readFileSync(genPath, 'utf8').includes('Component aliases (production configs differing from defaults)')) {
  errors.push(
    'tokens.generated.css contains a component-alias override block, but every component production pointer must be default',
  );
}

if (errors.length) {
  console.error('check:production-is-default FAILED — the shipped baseline is not the default:\n');
  for (const e of errors) console.error(`  - ${e}`);
  console.error(
    '\nAdopt the Default manifest (or reset the production pointers to default) and regenerate ' +
      'tokens.generated.css, then commit, before publishing.',
  );
  process.exit(1);
}

console.log('check:production-is-default OK — themes / manifests / components production baseline is default.');
