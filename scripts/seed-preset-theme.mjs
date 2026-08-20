#!/usr/bin/env node
// Seed one shipped preset theme from its shape ops and font pairing, applied
// on top of the current component defaults.
//
//   node scripts/seed-preset-theme.mjs <slug> [--force]
//
// Refuses when `themes/<slug>.json` already exists, unless `--force`. There is
// no sweep-all mode (RJC 7, docs/plans/theme-completeness.md Wave 5): once a
// preset is seeded the file is the record of the whole look, and nothing ever
// re-derives it from a moving baseline again. `npm run check:preset-themes`
// guards the committed files instead of a regeneration re-running the
// arithmetic.

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { stampPresetFonts } from './lib/presetFonts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src/live-tokens/data');
const CONFIGS = join(DATA, 'component-configs');
const COLORS_AND_TYPE = join(DATA, 'colors-and-type');
const THEMES = join(DATA, 'themes');

const ENGINE = join(ROOT, 'dist-plugin/adjust/index.js');
const ENGINE_SOURCES = [
  'vite-plugin/adjust/index.ts',
  'src/editor/core/components/adjustAliases.ts',
  'src/editor/core/components/aliasKinds.ts',
  // Registers CURRENT_COMPONENT_SCHEMA_VERSION, re-exported below.
  'src/editor/core/themes/migrations/index.ts',
].map((p) => join(ROOT, p));

// Source of truth: vite-plugin/themes/normalizeTheme.ts. This copy cannot
// import TS, so `check:preset-themes` (Wave 5) is what catches a drift.
const THEME_SCHEMA_VERSION = 4;

/** Shape personality per preset, from the plan's addendum 2 table. Global ops
 *  come first and targeted `set` ops last, so a targeted corner wins over the
 *  sweep that would otherwise have moved it. This table is seeding input only
 *  (RJC 7): it shapes a preset once, at the moment it is first seeded, and is
 *  never replayed against an already-shipped file. */
const PRESETS = [
  {
    slug: 'autumn',
    ops: [{ kind: 'radius', shift: 2 }, { kind: 'padding', shift: 2 }, { kind: 'gap', shift: 1 }],
  },
  {
    slug: 'halloween',
    ops: [
      { kind: 'radius', set: '--radius-none' },
      { kind: 'border-width', shift: 2 },
      { kind: 'padding', shift: -1 },
    ],
  },
  {
    slug: 'midnight-study',
    ops: [
      { kind: 'padding', shift: -2 },
      { kind: 'gap', shift: -1 },
      { target: 'dialog', kind: 'radius', set: '--radius-none' },
      { target: 'card', kind: 'radius', set: '--radius-sm' },
      { target: 'button', kind: 'radius', set: '--radius-full' },
      { target: 'button', kind: 'padding', set: '--space-8' },
    ],
  },
  {
    slug: 'ocean',
    ops: [
      { kind: 'radius', shift: 2, full: true },
      { kind: 'padding', shift: 1 },
      { kind: 'gap', shift: 1 },
      { target: 'button', kind: 'radius', set: '--radius-full' },
    ],
  },
  {
    slug: 'royal-velvet',
    ops: [
      { kind: 'padding', shift: 2 },
      { kind: 'border-width', shift: 1 },
      { target: 'button', kind: 'radius', set: '--radius-full' },
    ],
  },
  {
    slug: 'spring-meadow',
    ops: [{ kind: 'padding', shift: 2 }, { kind: 'gap', shift: 2 }, { kind: 'radius', shift: 1 }],
  },
  {
    slug: 'sunset',
    ops: [
      { kind: 'radius', shift: 1 },
      { kind: 'padding', shift: 1 },
      { target: 'button', kind: 'radius', set: '--radius-full' },
    ],
  },
];

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

function usage(message) {
  if (message) console.error(`${message}\n`);
  console.error('Usage: node scripts/seed-preset-theme.mjs <slug> [--force]');
  console.error(`Known slugs: ${PRESETS.map((p) => p.slug).join(', ')}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const slug = args.find((a) => !a.startsWith('-'));
if (!slug) usage('Missing <slug>.');
const preset = PRESETS.find((p) => p.slug === slug);
if (!preset) usage(`Unknown preset slug "${slug}".`);

async function loadEngine() {
  if (!existsSync(ENGINE)) {
    throw new Error(
      `adjust engine not found at ${relative(ROOT, ENGINE)}. Build the plugin first: npm run build:plugin`,
    );
  }
  const built = statSync(ENGINE).mtimeMs;
  const stale = ENGINE_SOURCES.filter((src) => statSync(src).mtimeMs > built);
  if (stale.length > 0) {
    throw new Error(
      `adjust engine is older than ${stale.map((s) => relative(ROOT, s)).join(', ')}. ` +
        `Rebuild it first: npm run build:plugin`,
    );
  }
  return import(ENGINE);
}

function readDefaultConfigs() {
  const configs = {};
  for (const entry of readdirSync(CONFIGS, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(CONFIGS, entry.name, 'default.json');
    if (!existsSync(path)) {
      throw new Error(`component "${entry.name}" has no default.json. Start the dev server once to derive it.`);
    }
    configs[entry.name] = readJson(path);
  }
  return configs;
}

const themePath = join(THEMES, `${slug}.json`);
if (existsSync(themePath) && !force) {
  usage(`${relative(ROOT, themePath)} already exists. Pass --force to reseed it.`);
}

const colorsAndTypePath = join(COLORS_AND_TYPE, `${slug}.json`);
if (!existsSync(colorsAndTypePath)) {
  throw new Error(`preset theme "${slug}" not found at ${relative(ROOT, colorsAndTypePath)}`);
}

const { adjustAliases, CURRENT_COMPONENT_SCHEMA_VERSION } = await loadEngine();
const defaults = readDefaultConfigs();
const now = new Date().toISOString();

const colorsAndType = readJson(colorsAndTypePath);
if (stampPresetFonts(colorsAndType, slug)) {
  colorsAndType.updatedAt = now;
  writeFileSync(colorsAndTypePath, `${JSON.stringify(colorsAndType, null, 2)}\n`);
  console.log(`✓ ${slug}  fonts stamped into ${relative(ROOT, colorsAndTypePath)}`);
}

const { configs: next } = adjustAliases(defaults, preset.ops, now);

// Every component this install has, not `report.components`: the engine only
// adds an entry there for a component an op's *kind* actually matched at
// least one alias of, so a component with no radius/padding/gap alias at all
// (`radiobutton` is all `-dot-border-width`) is invisible to the report
// whenever a preset's ops never include `border-width`. `next` already
// carries every component regardless — `adjustAliases` seeds it as
// `{ ...configs }` — so it is the complete source. Ops that move nothing
// still produce a full config: the theme is the record of the whole look, not
// of a diff.
const componentConfigs = {};
let aliasCount = 0;
for (const comp of Object.keys(next).sort()) {
  const diff = Object.keys(next[comp].aliases).filter(
    (v) => next[comp].aliases[v] !== defaults[comp].aliases[v],
  ).length;
  componentConfigs[comp] = {
    name: slug,
    component: comp,
    createdAt: defaults[comp].createdAt,
    updatedAt: now,
    aliases: next[comp].aliases,
  };
  aliasCount += diff;
}

const existing = existsSync(themePath) ? readJson(themePath) : null;
const theme = {
  name: colorsAndType.name ?? slug,
  createdAt: typeof existing?.createdAt === 'string' ? existing.createdAt : now,
  updatedAt: now,
  schemaVersion: THEME_SCHEMA_VERSION,
  colorsAndType,
  componentConfigs,
  componentSchemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
};

writeFileSync(themePath, JSON.stringify(theme, null, 2));
console.log(
  `✓ ${slug}  ${Object.keys(componentConfigs).length} component(s) seeded, ${aliasCount} alias(es) moved by the ops` +
    ` — written to ${relative(ROOT, themePath)}`,
);
