#!/usr/bin/env node
// Build the nine shipped preset themes: one encapsulated (v3) theme per preset,
// carrying that preset's colors and type by value plus a shape personality
// applied to the derived component defaults. The run also stamps each preset's
// Google Fonts pairing into its colors-and-type file, so type and shape ship
// together.
//
//   node scripts/generate-preset-themes.mjs
//
// Deterministic and idempotent: a run that computes the same content (modulo
// timestamps) writes nothing, so regenerating after a component default drifts
// touches only the presets that actually moved. Nothing here reads or writes
// active/production pointers, so it leaves no working-file trail — this is the
// reason it uses the pure engine directly instead of the `adjust` CLI.

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
].map((p) => join(ROOT, p));

const THEME_SCHEMA_VERSION = 3;

/** Shape personality per preset, from the plan's addendum 2 table. Global ops
 *  come first and targeted `set` ops last, so a targeted corner wins over the
 *  sweep that would otherwise have moved it.
 *
 *  Three ops differ from the table's sketch, because the sketch lands three
 *  presets on the same card-radius/button-padding pair and two more on a second
 *  shared pair, which the addendum's own distinctness rule forbids: autumn takes
 *  radius +2 (was +1), royal-velvet drops its radius shift, and sunset takes
 *  radius +1 (was +2). `presetThemes.test.ts` gates the rule. */
const PRESETS = [
  {
    slug: 'autumn',
    ops: [{ kind: 'radius', shift: 2 }, { kind: 'padding', shift: 2 }, { kind: 'gap', shift: 1 }],
  },
  {
    slug: 'yuletide',
    ops: [
      { kind: 'radius', shift: 3 },
      { kind: 'gap', shift: 2 },
      { target: 'button', kind: 'radius', set: '--radius-full' },
    ],
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
    slug: 'leprechaun',
    ops: [
      { kind: 'radius', shift: 2 },
      { kind: 'gap', shift: 1 },
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

/** Content identity, timestamps excluded: what "unchanged" means for a rewrite. */
function signature(theme) {
  const configs = Object.fromEntries(
    Object.entries(theme.componentConfigs).map(([comp, cfg]) => {
      const { updatedAt, ...rest } = cfg;
      return [comp, rest];
    }),
  );
  return JSON.stringify({
    name: theme.name,
    schemaVersion: theme.schemaVersion,
    colorsAndType: theme.colorsAndType,
    componentConfigs: configs,
  });
}

const { adjustAliases } = await loadEngine();
const defaults = readDefaultConfigs();
const now = new Date().toISOString();

let written = 0;
let stamped = 0;
for (const { slug, ops } of PRESETS) {
  const colorsAndTypePath = join(COLORS_AND_TYPE, `${slug}.json`);
  if (!existsSync(colorsAndTypePath)) {
    throw new Error(`preset theme "${slug}" not found at ${relative(ROOT, colorsAndTypePath)}`);
  }
  const colorsAndType = readJson(colorsAndTypePath);
  if (stampPresetFonts(colorsAndType, slug)) {
    colorsAndType.updatedAt = now;
    writeFileSync(colorsAndTypePath, `${JSON.stringify(colorsAndType, null, 2)}\n`);
    stamped++;
    console.log(`✓ ${slug}  fonts stamped into ${relative(ROOT, colorsAndTypePath)}`);
  }
  const { configs: next, report } = adjustAliases(defaults, ops, now);

  const componentConfigs = {};
  let aliasCount = 0;
  for (const entry of [...report.components].sort((a, b) => a.component.localeCompare(b.component))) {
    const comp = entry.component;
    // Count aliases that end up differing from the default, not per-op change
    // records — overlapping ops (a sweep plus a targeted set) would otherwise
    // double-count, and a net-zero component must not embed a default-identical
    // config (delta encoding).
    const diff = Object.keys(next[comp].aliases).filter(
      (v) => next[comp].aliases[v] !== defaults[comp].aliases[v],
    ).length;
    if (diff === 0) continue;
    componentConfigs[comp] = {
      name: slug,
      component: comp,
      createdAt: defaults[comp].createdAt,
      updatedAt: now,
      aliases: next[comp].aliases,
    };
    aliasCount += diff;
  }

  const themePath = join(THEMES, `${slug}.json`);
  const existing = existsSync(themePath) ? readJson(themePath) : null;
  const theme = {
    name: colorsAndType.name ?? slug,
    createdAt: typeof existing?.createdAt === 'string' ? existing.createdAt : now,
    updatedAt: now,
    schemaVersion: THEME_SCHEMA_VERSION,
    colorsAndType,
    componentConfigs,
  };

  const summary = `${slug}  ${Object.keys(componentConfigs).length} component(s), ${aliasCount} alias(es)`;
  if (existing && signature(existing) === signature(theme)) {
    console.log(`  ${summary} — unchanged`);
    continue;
  }
  writeFileSync(themePath, JSON.stringify(theme, null, 2));
  written++;
  console.log(`✓ ${summary} — written`);
}

console.log(
  written === 0 && stamped === 0
    ? `\nAll ${PRESETS.length} preset colors-and-type files and themes were already current.`
    : `\nStamped ${stamped} preset colors-and-type file(s); wrote ${written} of ${PRESETS.length} themes to ${relative(ROOT, THEMES)}.`,
);
