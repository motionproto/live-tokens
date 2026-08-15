#!/usr/bin/env node
// Collapse the active theme's customizations down into the shipped defaults,
// then clear the custom definitions. The theme carries the look by value, so
// it is the source for every bake, and the buffers it filled are the fixed
// `_working.json` slots:
//
//   • embedded component config  → bake its aliases into the component's
//                                  `:global(:root)` .svelte block (the source
//                                  of truth shipped to consumers), regenerate
//                                  its default.json, clear the buffer
//   • embedded colors and type   → copy it into colors-and-type/default.json,
//                                  clear the buffer
//   • theme                      → point active back to the default theme,
//                                  delete the custom theme
//
//   node scripts/collapse-theme-to-default.mjs [--write]
//
// Without --write it's a dry run (prints the plan). Run with the dev server
// STOPPED — it re-derives config from these files and would race the rewrites.
// After --write, restart the dev server so tokens.generated.css and fonts.css
// rebuild from the new defaults (palette derivation lives in the vite plugin).

import { readFileSync, writeFileSync, readdirSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncBlock } from './lib/componentBlockSync.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src/live-tokens/data');
const CONFIGS = join(DATA, 'component-configs');
const COLORS_AND_TYPE = join(DATA, 'colors-and-type');
const THEMES = join(DATA, 'themes');
const COMPONENTS = join(ROOT, 'src/system/components');

const write = process.argv.includes('--write');

// Map a config dir (lowercase, no separators) → its PascalCase .svelte file.
const svelteByLower = new Map(
  readdirSync(COMPONENTS)
    .filter((f) => f.endsWith('.svelte') && !f.endsWith('Editor.svelte'))
    .map((f) => [f.replace('.svelte', '').toLowerCase(), f]),
);

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const writeJson = (p, obj) => writeFileSync(p, JSON.stringify(obj, null, 2));
const writePointer = (p, obj) => writeFileSync(p, JSON.stringify(obj)); // compact, matches server

/** Count differing leaves between two objects (for a readable dry-run summary). */
function leafDiffCount(a, b) {
  const flat = (o, prefix, out) => {
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      for (const k of Object.keys(o)) flat(o[k], prefix ? `${prefix}.${k}` : k, out);
    } else {
      out[prefix] = JSON.stringify(o);
    }
    return out;
  };
  const fa = flat(a, '', {});
  const fb = flat(b, '', {});
  const keys = new Set([...Object.keys(fa), ...Object.keys(fb)]);
  let n = 0;
  for (const k of keys) if (fa[k] !== fb[k]) n++;
  return n;
}

function clearWorking(dir) {
  const p = join(dir, '_working.json');
  if (existsSync(p)) rmSync(p);
}

const reportCleared = (dir) => {
  if (existsSync(join(dir, '_working.json'))) console.log('   clears _working.json');
};

const activePointer = join(THEMES, '_active.json');
const activeThemeName = existsSync(activePointer)
  ? readJson(activePointer).activeFile ?? 'default'
  : 'default';

if (activeThemeName === 'default') {
  console.log('Active theme is already "default" — nothing to collapse.');
  process.exit(0);
}

const themePath = join(THEMES, `${activeThemeName}.json`);
if (!existsSync(themePath)) {
  console.error(`Active theme "${activeThemeName}" not found at ${themePath}`);
  process.exit(1);
}
const theme = readJson(themePath);

if (typeof theme.colorsAndType === 'string') {
  console.error(
    `Active theme "${activeThemeName}" is still in the old pointer format. ` +
      "Re-save it in the editor's Theme file manager, then re-run.",
  );
  process.exit(1);
}

console.log(`${write ? 'COLLAPSE' : 'DRY RUN'} — active theme "${activeThemeName}"\n`);

// --- Components ---------------------------------------------------------------
const componentConfigs = theme.componentConfigs ?? {};
let componentValueChanges = 0;
for (const [comp, cfg] of Object.entries(componentConfigs).sort()) {
  const svelteName = svelteByLower.get(comp);
  if (!svelteName) {
    console.log(`SKIP  ${comp} (no matching .svelte to bake into)`);
    continue;
  }

  const aliases = cfg?.aliases ?? {};
  const sveltePath = join(COMPONENTS, svelteName);
  const src = readFileSync(sveltePath, 'utf8');
  const { src: next, changed, skipped } = syncBlock(src, aliases);

  console.log(`${svelteName}  ← ${comp}  (${changed.length} changed${skipped.length ? `, ${skipped.length} skipped` : ''})`);
  for (const c of changed) console.log(`   ${c}`);
  for (const s of skipped) console.log(`   ⊘ ${s}`);
  reportCleared(join(CONFIGS, comp));
  componentValueChanges += changed.length;

  if (write) {
    if (next !== src) writeFileSync(sveltePath, next);

    // Regenerate default.json in the canonical shape the dev server produces
    // (name/component/createdAt/updatedAt/aliases only). Written after the
    // .svelte so its mtime wins and the server trusts it on next boot.
    const defaultPath = join(CONFIGS, comp, 'default.json');
    const createdAt = existsSync(defaultPath)
      ? readJson(defaultPath).createdAt ?? new Date().toISOString()
      : new Date().toISOString();
    writeJson(defaultPath, {
      name: 'default',
      component: comp,
      createdAt,
      updatedAt: new Date().toISOString(),
      aliases,
    });

    clearWorking(join(CONFIGS, comp));
  }
}

// --- Colors and type ---------------------------------------------------------
const colorsAndType = theme.colorsAndType;
if (!colorsAndType || typeof colorsAndType !== 'object') {
  console.log('\nSKIP  colors and type (theme carries none)');
} else {
  const defaultColorsAndTypePath = join(COLORS_AND_TYPE, 'default.json');
  const currentDefault = existsSync(defaultColorsAndTypePath) ? readJson(defaultColorsAndTypePath) : {};
  const diff = leafDiffCount(
    { ec: currentDefault.editorConfigs, cv: currentDefault.cssVariables },
    { ec: colorsAndType.editorConfigs, cv: colorsAndType.cssVariables },
  );
  console.log(`\ncolors and type  default.json ← theme  (${diff} value(s) differ)`);
  reportCleared(COLORS_AND_TYPE);

  if (write) {
    // Spread: the theme's colors-and-type slice is the whole file, so fields
    // the collapse has no opinion on (fonts, harmony axes, schemaVersion) carry
    // across untouched. Only the default's identity is preserved.
    writeJson(defaultColorsAndTypePath, {
      ...colorsAndType,
      name: currentDefault.name ?? colorsAndType.name ?? 'Default Theme',
      createdAt: currentDefault.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    clearWorking(COLORS_AND_TYPE);
  }
}

// --- Theme -------------------------------------------------------------------
// Production names a theme now, so a collapse that deletes the published one
// has to move it or leave the pointer dangling.
const productionPointer = join(THEMES, '_production.json');
const productionName = existsSync(productionPointer)
  ? readJson(productionPointer).productionFile ?? 'default'
  : 'default';
console.log(`\ntheme  active → default  (delete "${activeThemeName}")`);
if (productionName === activeThemeName) console.log('   production → default');
if (write) {
  writePointer(activePointer, { activeFile: 'default' });
  if (productionName === activeThemeName) writePointer(productionPointer, { productionFile: 'default' });
  rmSync(themePath);
}

// --- Summary -----------------------------------------------------------------
if (write) {
  console.log(`\nWROTE — ${componentValueChanges} component value(s) baked into source; buffers cleared; theme deleted.`);
  console.log('Next: restart the dev server to regenerate tokens.generated.css and fonts.css from the new defaults.');
} else {
  console.log(`\nDRY RUN — ${componentValueChanges} component value(s) would be baked. Re-run with --write to apply (dev server stopped).`);
}
