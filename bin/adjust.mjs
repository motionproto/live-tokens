// `live-tokens adjust` worker.
//
// Reads an ops file (JSON), applies it to every component's ACTIVE config via
// the compiled engine (dist-plugin/adjust — the CLI never imports TS sources),
// writes `<slug>.json` into each component dir the engine actually changed, and
// points that component's `_active.json` at it. Production slots, `default.json`,
// themes, and tokens.css are never touched.

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = resolve(pkgRoot, 'dist-plugin/adjust/index.js');

/** Unnamed runs roll into one file per component, so hands-off iteration
 *  ("a bit more", "back one") leaves no trail in the file manager. */
const ROLLING_SLUG = 'adjusted';

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

function readActiveConfigs(dir) {
  const configs = {};
  const previousActive = {};
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const componentDir = join(dir, entry.name);
    const active = readJsonIfExists(join(componentDir, '_active.json'))?.activeFile ?? 'default';
    const config = readJsonIfExists(join(componentDir, `${active}.json`));
    if (!config) {
      throw new Error(`component "${entry.name}": active config "${active}.json" is missing`);
    }
    configs[entry.name] = config;
    previousActive[entry.name] = active;
  }
  return { configs, previousActive };
}

/** `engine` is a test seam; the CLI always runs the compiled bundle. */
export async function runAdjust({
  opsPath,
  activate = true,
  dryRun = false,
  root = process.cwd(),
  componentConfigsDir,
  engine,
} = {}) {
  const { adjustAliases, matchesKind, sanitizeFileName, resolveDataDirs } =
    engine ?? (await loadEngine());

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

  const slug = doc.name === undefined ? ROLLING_SLUG : sanitizeFileName(String(doc.name));
  if (slug === 'default') {
    throw new Error('name: "default" is the protected package config; pick another name');
  }

  const dir = componentConfigsDir ?? resolveDataDirs().componentConfigsDir;
  if (!existsSync(dir)) {
    throw new Error(`no component configs at ${relative(root, dir)}. Run the dev server once to create them.`);
  }

  const { configs, previousActive } = readActiveConfigs(dir);
  const now = new Date().toISOString();
  const { configs: next, report } = adjustAliases(configs, ops, now);

  const components = [];
  for (const entry of report.components) {
    const { component, skips } = entry;
    const changes = collapseChanges(entry.changes);

    if (changes.length > 0 && !dryRun) {
      const configPath = join(dir, component, `${slug}.json`);
      const existing = readJsonIfExists(configPath);
      const config = { ...next[component], name: slug, createdAt: existing?.createdAt ?? now };
      writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
      if (activate) {
        writeFileSync(join(dir, component, '_active.json'), JSON.stringify({ activeFile: slug }));
      }
    }

    components.push({
      component,
      previousActive: previousActive[component],
      changes: changes.map((c) => ({ ...c, snapped: opposesShift(ops, matchesKind, component, c) })),
      skips,
    });
  }
  components.sort((a, b) => a.component.localeCompare(b.component));

  const changed = components.filter((c) => c.changes.length > 0);
  return {
    slug,
    configsDir: dir,
    dryRun,
    activated: activate && !dryRun && changed.length > 0,
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
    const verb = result.dryRun ? 'Would write' : 'Wrote';
    lines.push(`${verb} "${result.slug}.json" into ${changedCount} component config folder(s).`);
  }

  for (const entry of result.components) {
    const flipped = result.activated && entry.changes.length > 0;
    lines.push(`\n${entry.component}  (${flipped ? 'previously' : 'active'}: ${entry.previousActive})`);

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
  if (result.activated) {
    lines.push(
      `Activated "${result.slug}" in each changed component (previous active shown above). ` +
        `Reload the app to see it; revert any time in the editor's Component file manager.`,
    );
  } else if (result.dryRun) {
    lines.push(`Dry run: nothing written under ${relative(root, result.configsDir)}.`);
  } else if (changedCount > 0) {
    lines.push(`Not activated (--no-activate). Select "${result.slug}" in the editor's Component file manager.`);
  }
  return lines.join('\n');
}
