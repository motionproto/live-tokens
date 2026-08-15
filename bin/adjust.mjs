// `live-tokens adjust` worker.
//
// Reads an ops file (JSON), applies it to every component's LIVE config via the
// compiled engine (dist-plugin/adjust — the CLI never imports TS sources), and
// writes the result into that component's `_working.json` buffer: the same slot
// the editor's own edits land in, so an adjustment is an unsaved edit the user
// saves into a theme when they want to keep it. `default.json`, named preset
// files, themes, colors and type, and tokens.css are never touched.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = resolve(pkgRoot, 'dist-plugin/adjust/index.js');
const packageThemesDir = join(pkgRoot, 'src/live-tokens/data/themes');

const SOURCE_LABELS = {
  working: 'your unsaved edits',
  theme: 'the open theme',
  default: 'the shipped default',
};

const SKIP_LABELS = [
  ['raw-value', 'raw value, not a token'],
  ['off-ladder', 'off the ladder'],
  ['clamped', 'already at the ladder end'],
  ['pill-preserved', 'pill preserved (pass "full": true to move it)'],
];

async function loadEngine() {
  if (!existsSync(ENGINE)) {
    throw new Error(
      `adjust engine not found at ${relative(process.cwd(), ENGINE)}. ` +
        `Build the plugin first (npm run build:plugin).`,
    );
  }
  return import(ENGINE);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readJsonIfExists(path) {
  return existsSync(path) ? readJson(path) : null;
}

function numericRung(token) {
  const match = /-(\d+)$/.exec(token);
  return match ? Number(match[1]) : null;
}

/** Net direction the ops asked for on this alias. An explicit `set` owns the
 *  value outright, so it reports no direction. */
function requestedDirection(ops, matchesKind, component, variable) {
  let total = 0;
  for (const op of ops) {
    if (op.target !== undefined && op.target !== component) continue;
    if (!matchesKind(variable, op.kind)) continue;
    if (op.shift === undefined) return 0;
    total += op.shift;
  }
  return Math.sign(total);
}

/** A shift can land below where it started: an off-subset value (`--space-64`)
 *  snaps to its nearest writable rung first. Those changes are marked, never
 *  listed as an ordinary shift. */
function opposesShift(ops, matchesKind, component, change) {
  const from = numericRung(change.from);
  const to = numericRung(change.to);
  if (from === null || to === null) return false;
  const direction = requestedDirection(ops, matchesKind, component, change.variable);
  return direction !== 0 && Math.sign(to - from) !== direction;
}

/** Successive ops can touch the same alias (soften, then pill the buttons);
 *  the report shows one entry per alias, first `from` to last `to`. */
function collapseChanges(changes) {
  const byVariable = new Map();
  for (const change of changes) {
    const entry = byVariable.get(change.variable);
    if (entry) entry.to = change.to;
    else byVariable.set(change.variable, { ...change });
  }
  return [...byVariable.values()].filter((c) => c.from !== c.to);
}

/** The open theme, read the way every other door reads it: the local file
 *  first, then the copy the installed package ships. */
function readActiveTheme(themesDir) {
  if (!themesDir) return null;
  const slug = readJsonIfExists(join(themesDir, '_active.json'))?.activeFile ?? 'default';
  const theme =
    readJsonIfExists(join(themesDir, `${slug}.json`)) ??
    readJsonIfExists(join(packageThemesDir, `${slug}.json`));
  return theme ? { slug, theme } : null;
}

/** Each component's live config and where it came from: the buffer, else the
 *  open theme's embedded copy, else the shipped default. Mirrors the dev
 *  server's `resolveLiveComponentConfig`, so the CLI adjusts what the page runs. */
function readLiveConfigs(dir, active) {
  const configs = {};
  const sources = {};
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const comp = entry.name;
    const componentDir = join(dir, comp);
    const working = readJsonIfExists(join(componentDir, '_working.json'));
    const embedded = active?.theme?.componentConfigs?.[comp];
    const config = working ?? embedded ?? readJsonIfExists(join(componentDir, 'default.json'));
    if (!config) {
      throw new Error(`component "${comp}": default.json is missing`);
    }
    configs[comp] = { ...config, component: comp };
    sources[comp] = working ? 'working' : embedded ? 'theme' : 'default';
  }
  return { configs, sources };
}

/** `engine` is a test seam; the CLI always runs the compiled bundle. */
export async function runAdjust({
  opsPath,
  dryRun = false,
  root = process.cwd(),
  componentConfigsDir,
  themesDir,
  engine,
} = {}) {
  const { adjustAliases, matchesKind, resolveDataDirs } = engine ?? (await loadEngine());

  const opsFull = resolve(root, opsPath);
  if (!existsSync(opsFull)) {
    throw new Error(`ops file not found at ${relative(root, opsFull)}`);
  }
  let doc;
  try {
    doc = readJson(opsFull);
  } catch (err) {
    throw new Error(`ops file is not valid JSON: ${err instanceof Error ? err.message : String(err)}`);
  }

  const ops = doc?.ops;
  if (!Array.isArray(ops) || ops.length === 0) {
    throw new Error('ops file needs a non-empty "ops" array');
  }

  const resolved = componentConfigsDir && themesDir ? null : resolveDataDirs();
  const dir = componentConfigsDir ?? resolved.componentConfigsDir;
  if (!existsSync(dir)) {
    throw new Error(`no component configs at ${relative(root, dir)}. Run the dev server once to create them.`);
  }

  const active = readActiveTheme(themesDir ?? resolved?.themesDir);
  const { configs, sources } = readLiveConfigs(dir, active);
  const now = new Date().toISOString();
  const { configs: next, report } = adjustAliases(configs, ops, now);

  const components = [];
  for (const entry of report.components) {
    const { component, skips } = entry;
    const changes = collapseChanges(entry.changes);

    if (changes.length > 0 && !dryRun) {
      writeFileSync(
        join(dir, component, '_working.json'),
        JSON.stringify({ ...next[component], component }, null, 2),
      );
    }

    components.push({
      component,
      source: sources[component],
      changes: changes.map((c) => ({ ...c, snapped: opposesShift(ops, matchesKind, component, c) })),
      skips,
    });
  }
  components.sort((a, b) => a.component.localeCompare(b.component));

  const changed = components.filter((c) => c.changes.length > 0);
  return {
    configsDir: dir,
    openTheme: active?.slug ?? null,
    // The ops file's `name` used to pick a file name. Buffers are fixed slots,
    // so it now names nothing; say so rather than drop it in silence.
    ignoredName: doc.name === undefined ? null : String(doc.name),
    dryRun,
    buffered: !dryRun && changed.length > 0,
    components,
    totals: {
      components: changed.length,
      aliases: changed.reduce((n, c) => n + c.changes.length, 0),
      skips: components.reduce((n, c) => n + c.skips.length, 0),
    },
  };
}

export function formatAdjustResult(result) {
  const root = process.cwd();
  const lines = [];
  const { components: changedCount, aliases, skips } = result.totals;

  if (changedCount === 0) {
    lines.push(
      skips > 0
        ? `Nothing changed: every matching alias was skipped (reasons below).`
        : `Nothing to change: no alias matched the ops.`,
    );
  } else {
    const verb = result.dryRun ? 'Would edit' : 'Edited';
    lines.push(`${verb} the open buffer of ${changedCount} component(s).`);
  }
  if (result.ignoredName !== null) {
    lines.push(
      `Ignored "name": "${result.ignoredName}". adjust edits the open buffer now, ` +
        `so it writes no file of its own.`,
    );
  }

  for (const entry of result.components) {
    const from =
      entry.source === 'theme' && result.openTheme
        ? `theme "${result.openTheme}"`
        : SOURCE_LABELS[entry.source];
    lines.push(`\n${entry.component}  (from: ${from})`);

    const width = Math.max(0, ...entry.changes.map((c) => c.variable.length));
    for (const c of entry.changes) {
      const note = c.snapped ? '   ← snapped to the nearest editor rung, against the requested shift' : '';
      lines.push(`  ${c.snapped ? '!' : ' '} ${c.variable.padEnd(width)}  ${c.from} → ${c.to}${note}`);
    }

    for (const [reason, label] of SKIP_LABELS) {
      const hit = entry.skips.filter((s) => s.reason === reason);
      if (hit.length === 0) continue;
      lines.push(`    skipped, ${label}: ${hit.map((s) => s.variable).join(', ')}`);
    }
  }

  lines.push(
    `\n${changedCount} component(s) changed, ${aliases} alias(es), ${skips} skipped.`,
  );
  if (result.buffered) {
    lines.push(
      `Reload the app to see it. This is an unsaved edit: save the open theme in the ` +
        `editor's Theme panel to keep it, or load a theme to discard it.`,
    );
  } else if (result.dryRun) {
    lines.push(`Dry run: nothing written under ${relative(root, result.configsDir)}.`);
  }
  return lines.join('\n');
}
