#!/usr/bin/env node
// Collapse the active manifest's customizations down into the shipped defaults,
// then clear the custom definitions. The manifest carries the look by value, so
// it is the source for every bake; the working files it materialised are found
// through the active/production pointers and removed:
//
//   • embedded component config  → bake its aliases into the component's
//                                  `:global(:root)` .svelte block (the source
//                                  of truth shipped to consumers), regenerate
//                                  its default.json, reset the active/production
//                                  pointers, delete the working files
//   • embedded theme             → copy it into colors-and-type/default.json, reset
//                                  pointers, delete the working files
//   • manifest                   → point active back to the default manifest,
//                                  delete the custom manifest
//
//   node scripts/collapse-manifest-to-default.mjs [--write]
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
const MANIFESTS = join(DATA, 'manifests');
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

/** Non-default file names a resource's pointers currently name. These are the
 *  working files the collapsed look lives in; read them before resetting. */
function pointedFiles(dir) {
  const names = new Set();
  for (const [file, key] of [
    ['_active.json', 'activeFile'],
    ['_production.json', 'productionFile'],
  ]) {
    const pointerPath = join(dir, file);
    if (!existsSync(pointerPath)) continue;
    const name = readJson(pointerPath)[key];
    if (name && name !== 'default') names.add(name);
  }
  return [...names];
}

function clearWorkingFiles(dir, names) {
  for (const name of names) {
    const p = join(dir, `${name}.json`);
    if (existsSync(p)) rmSync(p);
  }
}

const reportCleared = (names) => {
  if (names.length) console.log(`   clears ${names.map((n) => `${n}.json`).join(', ')}`);
};

const activePointer = join(MANIFESTS, '_active.json');
const activeManifestName = existsSync(activePointer)
  ? readJson(activePointer).activeFile ?? 'default'
  : 'default';

if (activeManifestName === 'default') {
  console.log('Active manifest is already "default" — nothing to collapse.');
  process.exit(0);
}

const manifestPath = join(MANIFESTS, `${activeManifestName}.json`);
if (!existsSync(manifestPath)) {
  console.error(`Active manifest "${activeManifestName}" not found at ${manifestPath}`);
  process.exit(1);
}
const manifest = readJson(manifestPath);

if (typeof manifest.theme === 'string') {
  console.error(
    `Active manifest "${activeManifestName}" is still in the old pointer format. ` +
      "Re-save it in the editor's Manifest file manager, then re-run.",
  );
  process.exit(1);
}

console.log(`${write ? 'COLLAPSE' : 'DRY RUN'} — active manifest "${activeManifestName}"\n`);

// --- Components ---------------------------------------------------------------
const componentConfigs = manifest.componentConfigs ?? {};
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
  const working = pointedFiles(join(CONFIGS, comp));

  console.log(`${svelteName}  ← ${comp}  (${changed.length} changed${skipped.length ? `, ${skipped.length} skipped` : ''})`);
  for (const c of changed) console.log(`   ${c}`);
  for (const s of skipped) console.log(`   ⊘ ${s}`);
  reportCleared(working);
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

    writePointer(join(CONFIGS, comp, '_active.json'), { activeFile: 'default' });
    writePointer(join(CONFIGS, comp, '_production.json'), { productionFile: 'default' });
    clearWorkingFiles(join(CONFIGS, comp), working);
  }
}

// --- Colors and type ---------------------------------------------------------
const colorsAndType = manifest.theme;
if (!colorsAndType || typeof colorsAndType !== 'object') {
  console.log('\nSKIP  theme (manifest carries none)');
} else {
  const defaultColorsAndTypePath = join(COLORS_AND_TYPE, 'default.json');
  const currentDefault = existsSync(defaultColorsAndTypePath) ? readJson(defaultColorsAndTypePath) : {};
  const diff = leafDiffCount(
    { ec: currentDefault.editorConfigs, cv: currentDefault.cssVariables },
    { ec: colorsAndType.editorConfigs, cv: colorsAndType.cssVariables },
  );
  const working = pointedFiles(COLORS_AND_TYPE);
  console.log(`\ntheme  default.json ← manifest  (${diff} value(s) differ)`);
  reportCleared(working);

  if (write) {
    // Spread: the manifest's theme is the whole file, so fields the collapse
    // has no opinion on (fonts, harmony axes, schemaVersion) carry across
    // untouched. Only the default's identity is preserved.
    writeJson(defaultColorsAndTypePath, {
      ...colorsAndType,
      name: currentDefault.name ?? colorsAndType.name ?? 'Default Theme',
      createdAt: currentDefault.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    writePointer(join(COLORS_AND_TYPE, '_active.json'), { activeFile: 'default' });
    writePointer(join(COLORS_AND_TYPE, '_production.json'), { productionFile: 'default' });
    clearWorkingFiles(COLORS_AND_TYPE, working);
  }
}

// --- Manifest ----------------------------------------------------------------
console.log(`\nmanifest  active → default  (delete "${activeManifestName}")`);
if (write) {
  writePointer(activePointer, { activeFile: 'default' });
  rmSync(manifestPath);
}

// --- Summary -----------------------------------------------------------------
if (write) {
  console.log(`\nWROTE — ${componentValueChanges} component value(s) baked into source; pointers reset; custom files cleared.`);
  console.log('Next: restart the dev server to regenerate tokens.generated.css and fonts.css from the new defaults.');
} else {
  console.log(`\nDRY RUN — ${componentValueChanges} component value(s) would be baked. Re-run with --write to apply (dev server stopped).`);
}
