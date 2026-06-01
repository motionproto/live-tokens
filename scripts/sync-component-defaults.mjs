#!/usr/bin/env node
// Sync each component's baked `:global(:root)` defaults (what SHIPS to
// consumers) from its editor config `default.json` (what the demo renders).
// Only value lines inside the first `:global(:root){…}` block are rewritten;
// `@media` / class-selector responsive wiring is left untouched.
//
//   node scripts/sync-component-defaults.mjs [component] [--write]
//
// Without --write it's a dry run (prints the diff per component).

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncBlock } from './lib/componentBlockSync.mjs';

const ROOT = resolveRoot();
const CONFIGS = join(ROOT, 'src/live-tokens/data/component-configs');
const COMPONENTS = join(ROOT, 'src/system/components');

const args = process.argv.slice(2);
const write = args.includes('--write');
const check = args.includes('--check'); // exit 1 if any drift (CI gate)
const only = args.find((a) => !a.startsWith('-'));

// Map a config dir (lowercase, no separators) → its PascalCase .svelte file.
const svelteByLower = new Map(
  readdirSync(COMPONENTS)
    .filter((f) => f.endsWith('.svelte') && !f.endsWith('Editor.svelte'))
    .map((f) => [f.replace('.svelte', '').toLowerCase(), f]),
);

const dirs = readdirSync(CONFIGS).filter((d) => !only || d === only);
let totalChanged = 0;
for (const dir of dirs.sort()) {
  const cfgPath = join(CONFIGS, dir, 'default.json');
  if (!existsSync(cfgPath)) continue;
  const svelteName = svelteByLower.get(dir);
  if (!svelteName) {
    console.log(`SKIP  ${dir} (no matching .svelte)`);
    continue;
  }
  const aliases = JSON.parse(readFileSync(cfgPath, 'utf8')).aliases ?? {};
  const sveltePath = join(COMPONENTS, svelteName);
  const src = readFileSync(sveltePath, 'utf8');
  const { src: next, changed, skipped } = syncBlock(src, aliases);
  if (changed.length || skipped.length) {
    console.log(`\n${svelteName}  (${changed.length} changed${skipped.length ? `, ${skipped.length} skipped` : ''})`);
    for (const c of changed) console.log(`   ${c}`);
    for (const s of skipped) console.log(`   ⊘ ${s}`);
  }
  totalChanged += changed.length;
  if (write && next !== src) writeFileSync(sveltePath, next);
}
console.log(`\n${write ? 'WROTE' : check ? 'CHECK' : 'DRY RUN'} — ${totalChanged} value(s) across components`);
if (check && totalChanged > 0) {
  console.error(
    `\nComponent .svelte defaults are out of sync with their config default.json.\n` +
      `Run: node scripts/sync-component-defaults.mjs --write`,
  );
  process.exit(1);
}

function resolveRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), '..');
}
