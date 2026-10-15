#!/usr/bin/env node
// Runs the full page checker over each page an outcome-page-from-brief* run
// left behind, so the arms with and without the checker are scored by one bar.
// The runner has no grader that runs a command, so this reads the workspaces a
// `--keep-temp` run kept.
//
//   npm run eval -- --case 'outcome-page-from-brief*' --keep-temp
//   node scripts/eval-check-pages.mjs scratch/eval-last.json [--tests]

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import process from 'node:process';

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..');
const PROJECT = join(REPO, 'scratch/eval-project');
const PKG = 'node_modules/@motion-proto/live-tokens';
// The files _scaffold/remove-checker.mjs patches. Restoring them in every
// workspace lets each arm run its own CLI, whose --tests needs the workspace's
// own @playwright/test.
const PATCHED = ['bin/cli.mjs', 'bin/lib/buildChecks.mjs'];

const [resultPath, ...flags] = process.argv.slice(2);
if (!resultPath) {
  console.error('usage: node scripts/eval-check-pages.mjs <eval result json> [--tests]');
  process.exit(1);
}
if (!existsSync(join(PROJECT, PKG))) {
  console.error('scratch/eval-project is missing. Run npm run build:eval-project.');
  process.exit(1);
}
const tests = flags.includes('--tests');
const templatePages = new Set(readdirSync(join(PROJECT, 'src/pages')));

function findWorkspace(root, depth = 2) {
  if (existsSync(join(root, 'src/App.svelte'))) return root;
  if (depth === 0 || !existsSync(root)) return null;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name === 'node_modules') continue;
    const found = findWorkspace(join(root, entry.name), depth - 1);
    if (found) return found;
  }
  return null;
}

function silencedRules(workspace) {
  const config = join(workspace, 'live-tokens.config.json');
  if (!existsSync(config)) return [];
  const rules = JSON.parse(readFileSync(config, 'utf8')).checks?.rules ?? {};
  return Object.entries(rules).filter(([, severity]) => severity === 'off').map(([rule]) => rule);
}

function checkRun(run) {
  const root = dirname(dirname(run.tracePath));
  const workspace = findWorkspace(root);
  if (!workspace) return { note: `no kept workspace under ${root}; run the eval with --keep-temp` };
  const pages = readdirSync(join(workspace, 'src/pages'))
    .filter((name) => name.endsWith('.svelte') && !templatePages.has(name))
    .map((name) => join('src/pages', name));
  if (pages.length === 0) return { note: 'no new page under src/pages' };
  for (const file of PATCHED) copyFileSync(join(PROJECT, PKG, file), join(workspace, PKG, file));
  const args = [join(PKG, 'bin/cli.mjs'), 'check-page', ...pages, '--strict', '--json', '--no-fix', ...(tests ? ['--tests'] : [])];
  const out = spawnSync(process.execPath, args, { cwd: workspace, encoding: 'utf8' });
  let report;
  try {
    report = JSON.parse(out.stdout);
  } catch {
    return { note: `check-page printed no JSON: ${(out.stderr || out.stdout).trim().split('\n')[0]}` };
  }
  const byRule = new Map();
  for (const f of report.findings) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
  return { pages, errors: report.errors, byRule, silenced: silencedRules(workspace) };
}

const result = JSON.parse(readFileSync(resultPath, 'utf8'));
const lines = [`check-page --strict --no-fix${tests ? ' --tests' : ''}, each workspace's CLI restored from ${relative(REPO, PROJECT)}`, ''];
for (const c of result.cases.filter((c) => c.name.startsWith('outcome-page-from-brief'))) {
  for (const [arm, runs] of Object.entries(c.arms)) {
    const label = `${c.name.endsWith('-no-checker') ? 'no checker' : 'checker'}, ${arm === 'with' ? 'skills' : 'no skills'}`;
    for (const [i, run] of runs.entries()) {
      const head = `${label}, run ${i + 1}: ${run.turns} turns, ${run.durationSeconds} s, $${run.costUsd.toFixed(2)}`;
      const checked = checkRun(run);
      if (checked.note) {
        lines.push(`${head}. ${checked.note}`);
        continue;
      }
      const rules = [...checked.byRule].map(([rule, n]) => `${rule} ${n}`).join(', ');
      lines.push(`${head}. ${checked.errors} errors in ${checked.pages.join(', ')}${rules ? `: ${rules}` : ''}`);
      if (checked.silenced.length > 0) lines.push(`  live-tokens.config.json turns off: ${checked.silenced.join(', ')}`);
    }
  }
}
console.log(lines.join('\n'));
