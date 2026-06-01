#!/usr/bin/env node
// Collapse the active manifest's customizations down into the shipped defaults,
// then clear the custom definitions. For each artifact the manifest points at:
//
//   • component config (≠ default)  → bake its aliases into the component's
//                                      `:global(:root)` .svelte block (the
//                                      source of truth shipped to consumers),
//                                      regenerate its default.json, reset the
//                                      active/production pointers, delete the file
//   • theme (≠ default)             → copy its editorConfigs/cssVariables/fonts
//                                      into themes/default.json, reset pointers,
//                                      delete the file
//   • manifest                      → point active back to the default manifest,
//                                      delete the custom manifest
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
const THEMES = join(DATA, 'themes');
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

console.log(`${write ? 'COLLAPSE' : 'DRY RUN'} — active manifest "${activeManifestName}"\n`);

// --- Components ---------------------------------------------------------------
const componentConfigs = manifest.componentConfigs ?? {};
let componentValueChanges = 0;
for (const [comp, file] of Object.entries(componentConfigs).sort()) {
  if (file === 'default') continue;

  const cfgPath = join(CONFIGS, comp, `${file}.json`);
  if (!existsSync(cfgPath)) {
    console.log(`SKIP  ${comp} → "${file}" (config file missing)`);
    continue;
  }
  const svelteName = svelteByLower.get(comp);
  if (!svelteName) {
    console.log(`SKIP  ${comp} (no matching .svelte to bake into)`);
    continue;
  }

  const aliases = readJson(cfgPath).aliases ?? {};
  const sveltePath = join(COMPONENTS, svelteName);
  const src = readFileSync(sveltePath, 'utf8');
  const { src: next, changed, skipped } = syncBlock(src, aliases);

  console.log(`${svelteName}  ← ${comp}/${file}  (${changed.length} changed${skipped.length ? `, ${skipped.length} skipped` : ''})`);
  for (const c of changed) console.log(`   ${c}`);
  for (const s of skipped) console.log(`   ⊘ ${s}`);
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
    rmSync(cfgPath);
  }
}

// --- Theme -------------------------------------------------------------------
const themeName = manifest.theme ?? 'default';
if (themeName !== 'default') {
  const themePath = join(THEMES, `${themeName}.json`);
  const defaultThemePath = join(THEMES, 'default.json');
  if (!existsSync(themePath)) {
    console.log(`\nSKIP  theme "${themeName}" (file missing)`);
  } else {
    const theme = readJson(themePath);
    const currentDefault = existsSync(defaultThemePath) ? readJson(defaultThemePath) : {};
    const diff = leafDiffCount(
      { ec: currentDefault.editorConfigs, cv: currentDefault.cssVariables },
      { ec: theme.editorConfigs, cv: theme.cssVariables },
    );
    console.log(`\ntheme  default.json ← ${themeName}  (${diff} value(s) differ)`);

    if (write) {
      writeJson(defaultThemePath, {
        name: currentDefault.name ?? 'Default Theme',
        createdAt: currentDefault.createdAt ?? new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        editorConfigs: theme.editorConfigs ?? {},
        cssVariables: theme.cssVariables ?? {},
        fontSources: theme.fontSources ?? [],
        fontStacks: theme.fontStacks ?? {},
        schemaVersion: theme.schemaVersion ?? 0,
      });
      writePointer(join(THEMES, '_active.json'), { activeFile: 'default' });
      writePointer(join(THEMES, '_production.json'), { productionFile: 'default' });
      rmSync(themePath);
    }
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
