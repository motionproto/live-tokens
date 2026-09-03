#!/usr/bin/env node
// Publish/CI gate: assert the eight shipped preset themes on disk are
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
const TOKENS_CSS = join(ROOT, 'src/system/styles/tokens.css');
const rel = (p) => relative(ROOT, p);

const ENGINE = join(ROOT, 'dist-plugin/setGeometry/index.js');
if (!existsSync(ENGINE)) {
  console.error(
    `check:preset-themes FAILED — adjust engine not found at ${rel(ENGINE)}. Build the plugin first: npm run build:plugin`,
  );
  process.exit(1);
}
// Only used to read the current component-schema counter, never to run the
// engine's arithmetic against these files.
const { CURRENT_COMPONENT_SCHEMA_VERSION } = await import(ENGINE);

// Source of truth: src/editor/core/themes/themeTypes.ts, which
// normalizeTheme.ts re-exports. This script cannot import TS;
// `presetThemes.test.ts` imports the real constant and pins each shipped file
// against it, so a drift there is still caught.
const THEME_SCHEMA_VERSION = 5;

const PRESETS = [
  'autumn', 'halloween', 'midnight-study', 'ocean', 'royal-velvet',
  'sketchy', 'spring-meadow', 'sunset',
];

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));
const KNOWN_COMPONENTS = readdirSync(CONFIGS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();
const defaultConfigOf = (comp) => readJson(join(CONFIGS, comp, 'default.json'));

const errors = [];
const themes = {};

/** The face a stack renders: its project slot resolved through the font
 *  sources. Read off the stack rather than off a `src_preset_` source id,
 *  because that prefix records who wrote the source, not what the theme uses.
 *  A hand-authored preset carries no stamp and is pinned here just the same. */
function faceOf(colorsAndType, variable) {
  const stack = (colorsAndType?.fontStacks ?? []).find((s) => s.variable === variable);
  const slot = (stack?.slots ?? []).find((s) => s.kind === 'project');
  if (!slot) return null;
  for (const source of colorsAndType?.fontSources ?? []) {
    const family = (source.families ?? []).find((f) => f.id === slot.familyId);
    if (family) return family.name;
  }
  return null;
}

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
  const faces = [faceOf(theme.colorsAndType, '--font-display'), faceOf(theme.colorsAndType, '--font-sans')];
  const expected = [pairing.display.name, pairing.body.name];
  if (faces[0] !== expected[0] || faces[1] !== expected[1]) {
    errors.push(`${slug}: display and body faces are [${faces}], expected [${expected}]`);
  }
}

// The override bag stays inside the token contract. A preset may override any
// name `tokens.css` declares; a name it does not declare paints nothing and is
// dead weight the next restructure will forget to remove, which is how the 36
// keys 2026-09-03-drop-legacy-component-keys drops got there. Default is in
// scope here even though the loop above skips it: it is the file every other
// theme falls through to.
const declaredTokens = new Set(
  [...readFileSync(TOKENS_CSS, 'utf8').matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((m) => m[1]),
);
for (const slug of [...PRESETS, 'default']) {
  const theme = slug === 'default' ? readJson(join(THEMES, 'default.json')) : themes[slug];
  if (!theme) continue; // already reported as missing above
  for (const key of Object.keys(theme.colorsAndType?.cssVariables ?? {})) {
    if (!declaredTokens.has(key)) {
      errors.push(`${slug}: cssVariables key ${key} is not declared in ${rel(TOKENS_CSS)}`);
    }
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
    'current schema, the pairing its stacks name, a distinct look, and an ' +
    'override bag inside the token contract.',
);
