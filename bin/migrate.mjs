// `live-tokens migrate` worker.
//
// Two passes, both against a consumer's project. The first applies the
// registered tokens-css migrations to their developer-authored tokens.css,
// reconciling Layer-1 drift after a package upgrade. The second heals the data
// tree: the pre-working-set model left a materialised copy of every applied
// theme behind and a pointer pair per layer pointing at them, and this is what
// turns that into one production theme plus one buffer per layer.
//
// Both engines live in the built plugin (dist-plugin/) so the CLI and the
// dev-plugin guardrail share one source of truth; this module handles path
// resolution, file IO, and reporting.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = resolve(pkgRoot, 'dist-plugin/tokensCssMigrations/index.js');
const DATA_ENGINE = resolve(pkgRoot, 'dist-plugin/migrateData/index.js');

// Locations to probe when neither --tokens nor config.tokensCssPath is given.
const DEFAULT_CANDIDATES = [
  'src/system/styles/tokens.css',
  'src/styles/tokens.css',
  'src/tokens.css',
  'tokens.css',
];

async function loadEngine() {
  if (!existsSync(ENGINE)) {
    throw new Error(
      `migration engine not found at ${relative(process.cwd(), ENGINE)}. ` +
        `Build the plugin first (npm run build:plugin).`,
    );
  }
  return import(ENGINE);
}

/** --tokens <path> > live-tokens.config.json tokensCssPath > default scan. */
export function resolveTokensCssPath(explicit, configPath, root = process.cwd()) {
  if (explicit) return resolve(root, explicit);
  if (configPath) return resolve(root, configPath);
  for (const c of DEFAULT_CANDIDATES) {
    const full = resolve(root, c);
    if (existsSync(full)) return full;
  }
  return null;
}

/**
 * Run migrations. Returns a result object; never writes when `check` is true.
 * `{ status: 'no-path' | 'unchanged' | 'changed' | 'would-change', ... }`
 */
export async function runMigrate({ tokensArg, check = false, root = process.cwd() } = {}) {
  const { runTokensCssMigrations, readLiveTokensConfig } = await loadEngine();

  const config = readLiveTokensConfig();
  const tokensPath = resolveTokensCssPath(tokensArg, config.tokensCssPath, root);
  if (!tokensPath) {
    return {
      status: 'no-path',
      message:
        `Could not locate tokens.css. Pass --tokens <path>, set "tokensCssPath" in ` +
        `live-tokens.config.json, or place it at one of: ${DEFAULT_CANDIDATES.join(', ')}.`,
    };
  }
  if (!existsSync(tokensPath)) {
    return { status: 'no-path', message: `tokens.css not found at ${relative(root, tokensPath)}.` };
  }

  const before = readFileSync(tokensPath, 'utf8');
  const { css, applied, changed } = runTokensCssMigrations(before);
  const addedLines = diffAddedLines(before, css);

  if (!changed) {
    return { status: 'unchanged', tokensPath };
  }
  if (check) {
    return { status: 'would-change', tokensPath, applied, addedLines };
  }
  writeFileSync(tokensPath, css);
  return { status: 'changed', tokensPath, applied, addedLines };
}

async function loadDataEngine() {
  if (!existsSync(DATA_ENGINE)) {
    throw new Error(
      `data migration engine not found at ${relative(process.cwd(), DATA_ENGINE)}. ` +
        `Build the plugin first (npm run build:plugin).`,
    );
  }
  return import(DATA_ENGINE);
}

/** `engine` is a test seam; the CLI always runs the compiled bundle. */
export async function runMigrateData({ check = false, engine } = {}) {
  const { migrateData, resolveDataDirs } = engine ?? (await loadDataEngine());
  const dirs = resolveDataDirs();
  return migrateData({
    dataDir: dirs.dataDir,
    colorsAndTypeDir: dirs.colorsAndTypeDir,
    componentConfigsDir: dirs.componentConfigsDir,
    themesDir: dirs.themesDir,
    packageDataDir: join(pkgRoot, 'src/live-tokens/data'),
    check,
  });
}

const HOW_SAID = {
  'all-default': 'every retired pointer named the default',
  matched: 'it matches what the retired pointers resolved to',
  recovered: 'no saved theme matched what the retired pointers resolved to, so it was captured',
};

export function formatMigrateDataResult(result) {
  const root = process.cwd();
  const rel = (p) => relative(root, p);
  if (result.status === 'clean') return '';

  const planned = result.status === 'planned';
  const lines = [planned ? 'Data tree heal (planned):' : 'Data tree healed:'];

  for (const { from, to } of result.renames) {
    lines.push(`  ${planned ? 'would move' : 'moved'} ${rel(from)} → ${rel(to)} (0.48 layout)`);
  }
  for (const p of result.upgradedThemes) {
    lines.push(`  ${planned ? 'would carry' : 'carried'} ${rel(p)} by value (was a pre-v3 theme naming files)`);
  }
  if (result.production) {
    lines.push(`  production theme → "${result.production.slug}" (${HOW_SAID[result.production.how]})`);
  }
  if (result.recoveredThemePath) {
    lines.push(`  ${planned ? 'would write' : 'wrote'} ${rel(result.recoveredThemePath)}`);
  }
  for (const p of result.workingWritten) {
    lines.push(`  ${planned ? 'would fill' : 'filled'} ${rel(p)} from the live state`);
  }
  for (const p of result.workingKept) {
    lines.push(`  kept ${rel(p)}: the editor already owns that buffer`);
  }
  for (const p of result.deletedFiles) {
    lines.push(`  ${planned ? 'would delete' : 'deleted'} ${rel(p)}: a copy of a saved theme`);
  }
  for (const p of result.keptUserFiles) {
    lines.push(`  kept ${rel(p)}: it matches no theme, so it is yours`);
  }
  for (const p of result.notThemes) {
    lines.push(`  left ${rel(p)} alone: it is a colors-and-type file, not a theme`);
  }
  for (const p of result.shadowedDefaults) {
    lines.push(`  kept ${rel(p)}: it shadows the default the package ships, which has moved on`);
  }
  lines.push(
    `  ${planned ? 'would retire' : 'retired'} ${result.deletedPointers.length} per-layer pointer file(s)`,
  );
  lines.push(
    planned
      ? '\nRun without --check to apply this, then review the diff in git.'
      : '\nRestart the dev server: it rebuilds tokens.generated.css from the production theme.',
  );
  return lines.join('\n');
}

function diffAddedLines(before, after) {
  const beforeSet = new Set(before.split('\n'));
  return after.split('\n').filter((l) => l.trim() && !beforeSet.has(l));
}

export function formatMigrateResult(result, { check }) {
  const root = process.cwd();
  switch (result.status) {
    case 'no-path':
      return result.message;
    case 'unchanged':
      return `✓ ${relative(root, result.tokensPath)} is already up to date.`;
    case 'would-change':
    case 'changed': {
      const verb = result.status === 'changed' ? 'Applied' : 'Would apply';
      const lines = [
        `${verb} ${result.applied.length} migration(s) to ${relative(root, result.tokensPath)}:`,
        ...result.applied.map((id) => `  • ${id}`),
      ];
      if (result.addedLines.length) {
        lines.push(`Added ${result.addedLines.length} line(s):`);
        for (const l of result.addedLines) lines.push(`  + ${l.trim()}`);
      }
      if (check) {
        lines.push(`\nRun without --check to write these changes, then review the diff in git.`);
      } else {
        lines.push(`\nReview the diff in git before committing.`);
      }
      return lines.join('\n');
    }
    default:
      return `Unknown result: ${JSON.stringify(result)}`;
  }
}
