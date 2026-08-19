#!/usr/bin/env node
// Publish/CI gate: assert the seven shipped preset themes on disk are
// complete, current, and distinct. Reads the COMMITTED files only and never
// re-derives them — a check that recomputes from the baseline is coupled to
// the baseline by construction and cannot guard against the baseline moving
// (Correction 5 / RJC 7, docs/plans/theme-completeness.md Wave 5).
//
// The baseline's own five deliberate `--space-2` paddings (RJC 8) are NOT
// checked here: they live on `component-configs/*/default.json`, not on any
// preset, and are pinned by a plain vitest test beside the component-default
// suite instead.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PRESET_FONTS } from './lib/presetFonts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src/live-tokens/data');
const THEMES = join(DATA, 'themes');
const CONFIGS = join(DATA, 'component-configs');
const rel = (p) => relative(ROOT, p);

const ENGINE = join(ROOT, 'dist-plugin/adjust/index.js');
if (!existsSync(ENGINE)) {
  console.error(
    `check:preset-themes FAILED — adjust engine not found at ${rel(ENGINE)}. Build the plugin first: npm run build:plugin`,
  );
  process.exit(1);
}
// Only used to read the current component-schema counter, never to run the
// engine's arithmetic against these files.
const { CURRENT_COMPONENT_SCHEMA_VERSION } = await import(ENGINE);

// Source of truth: vite-plugin/themes/normalizeTheme.ts. This script cannot
// import TS; `presetThemes.test.ts` imports the real constant and pins each
// shipped file against it, so a drift there is still caught.
const THEME_SCHEMA_VERSION = 4;

const PRESETS = ['autumn', 'halloween', 'midnight-study', 'ocean', 'royal-velvet', 'spring-meadow', 'sunset'];
const STAMPED_PREFIX = 'src_preset_';

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const KNOWN_COMPONENTS = readdirSync(CONFIGS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();
const defaultConfigOf = (comp) => readJson(join(CONFIGS, comp, 'default.json'));

const errors = [];
const themes = {};

for (const slug of PRESETS) {
  const themePath = join(THEMES, `${slug}.json`);
  if (!existsSync(themePath)) {
    errors.push(`${slug}: ${rel(themePath)} is missing`);
    continue;
  }
  const theme = readJson(themePath);
  themes[slug] = theme;

  if (theme.schemaVersion !== THEME_SCHEMA_VERSION) {
    errors.push(`${slug}: schemaVersion is ${theme.schemaVersion}, expected ${THEME_SCHEMA_VERSION}`);
  }
  if (theme.componentSchemaVersion !== CURRENT_COMPONENT_SCHEMA_VERSION) {
    errors.push(
      `${slug}: componentSchemaVersion is ${theme.componentSchemaVersion}, expected ${CURRENT_COMPONENT_SCHEMA_VERSION}`,
    );
  }

  const configs = theme.componentConfigs ?? {};
  const carried = Object.keys(configs).sort();
  const missingComponents = KNOWN_COMPONENTS.filter((c) => !carried.includes(c));
  if (missingComponents.length) {
    errors.push(`${slug}: missing component(s) ${missingComponents.join(', ')}`);
  }

  for (const comp of carried) {
    if (!KNOWN_COMPONENTS.includes(comp)) continue; // not an install component; not this check's business
    const baseKeys = Object.keys(defaultConfigOf(comp).aliases ?? {}).sort();
    const themeKeys = Object.keys(configs[comp].aliases ?? {}).sort();
    const missingKeys = baseKeys.filter((k) => !themeKeys.includes(k));
    const orphanKeys = themeKeys.filter((k) => !baseKeys.includes(k));
    if (missingKeys.length) errors.push(`${slug}/${comp}: missing alias key(s) ${missingKeys.join(', ')}`);
    if (orphanKeys.length) errors.push(`${slug}/${comp}: orphaned alias key(s) ${orphanKeys.join(', ')}`);
  }

  const pairing = PRESET_FONTS[slug];
  const stamped = (theme.colorsAndType?.fontSources ?? []).filter((s) => s.id?.startsWith(STAMPED_PREFIX));
  const [display, body] = stamped;
  if (display?.families?.[0]?.name !== pairing.display.name || body?.families?.[0]?.name !== pairing.body.name) {
    errors.push(
      `${slug}: stamped fonts are [${display?.families?.[0]?.name}, ${body?.families?.[0]?.name}], ` +
        `expected [${pairing.display.name}, ${pairing.body.name}]`,
    );
  }
}

// Distinctness (moved from presetThemes.test.ts, Wave 5 step 3): each preset
// reads as its own look rather than landing on the same spot as another.
function duplicates(label) {
  const seen = new Map();
  const clashes = [];
  for (const slug of PRESETS) {
    if (!themes[slug]) continue; // already reported as missing above
    const key = label(slug);
    if (seen.has(key)) clashes.push(`${slug} and ${seen.get(key)} both land on ${key}`);
    else seen.set(key, slug);
  }
  return clashes;
}
const aliasesOf = (slug, comp) => themes[slug]?.componentConfigs?.[comp]?.aliases ?? {};

for (const clash of duplicates(
  (slug) => `${aliasesOf(slug, 'card')['--card-default-radius']} + ${aliasesOf(slug, 'button')['--button-primary-padding']}`,
)) {
  errors.push(`distinctness (card radius + button padding): ${clash}`);
}
for (const clash of duplicates((slug) => PRESET_FONTS[slug].display.name)) {
  errors.push(`distinctness (display font): ${clash}`);
}
for (const clash of duplicates((slug) => PRESET_FONTS[slug].body.name)) {
  errors.push(`distinctness (body font): ${clash}`);
}

if (errors.length) {
  console.error('check:preset-themes FAILED\n');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}

console.log(
  `check:preset-themes OK — ${PRESETS.length} preset(s), each complete with all ${KNOWN_COMPONENTS.length} components, ` +
    'current schema, stamped fonts, and a distinct look.',
);
