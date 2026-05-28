// `live-tokens migrate` worker.
//
// Applies the registered tokens-css migrations to a consumer's developer-authored
// tokens.css, reconciling Layer-1 drift after a package upgrade. The migration
// engine itself lives in the built plugin (dist-plugin/tokensCssMigrations) so
// the CLI and the dev-plugin guardrail share one source of truth; this module
// only handles path resolution, file IO, and reporting.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = resolve(pkgRoot, 'dist-plugin/tokensCssMigrations/index.js');

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
