#!/usr/bin/env node
// Scores each outcome-build-billing* run on accuracy, time, and loops.
// Accuracy is the runner's component-choice score plus the errors the full
// checkers find in what the run left behind, so every arm meets one bar
// whether or not it had the checker. Loops are the agent's turns and its
// checker runs, counted from the trace. The runner has no grader that runs a
// command, so this reads the workspaces and traces a `--keep-temp` run kept.
//
//   node scripts/eval-check-build.mjs scratch/eval-last.json [--tests]

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..');
const PROJECT = join(REPO, 'scratch/eval-project');
const PKG = 'node_modules/@motion-proto/live-tokens';
// The files _scaffold/remove-cli.mjs patches. Restoring them in every
// workspace lets each arm run its own CLI, whose --tests needs the workspace's
// own @playwright/test.
const PATCHED = ['bin/cli.mjs', 'bin/lib/buildChecks.mjs'];
const TOOLS = {
  'outcome-build-billing': 'lookup and checker',
  'outcome-build-billing-no-checker': 'lookup',
  'outcome-build-billing-no-lookup': 'checker',
  'outcome-build-billing-no-cli': 'neither',
};

const [resultPath, ...flags] = process.argv.slice(2);
if (!resultPath) {
  console.error('usage: node scripts/eval-check-build.mjs <eval result json> [--tests]');
  process.exit(1);
}
if (!existsSync(join(PROJECT, PKG))) {
  console.error('scratch/eval-project is missing. Run npm run build:eval-project.');
  process.exit(1);
}
const tests = flags.includes('--tests') ? ['--tests'] : [];
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

const CHECKER_RUN = /check-(page|component)\b/;
const LOOKUP_RUN = /live-tokens\s+(components|tokens)\b/;

function bashCommands(tracePath) {
  if (!existsSync(tracePath)) return null;
  const commands = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    if (node.type === 'tool_use' && node.name === 'Bash' && typeof node.input?.command === 'string') commands.push(node.input.command);
    Object.values(node).forEach(walk);
  };
  for (const line of readFileSync(tracePath, 'utf8').split('\n')) {
    if (line.trim()) walk(JSON.parse(line));
  }
  return commands;
}

function silencedRules(workspace) {
  const config = join(workspace, 'live-tokens.config.json');
  if (!existsSync(config)) return [];
  const rules = JSON.parse(readFileSync(config, 'utf8')).checks?.rules ?? {};
  return Object.entries(rules).filter(([, severity]) => severity === 'off').map(([rule]) => rule);
}

function runChecker(workspace, args) {
  const out = spawnSync(process.execPath, [join(PKG, 'bin/cli.mjs'), ...args, '--strict', '--json', '--no-fix', ...tests], {
    cwd: workspace,
    encoding: 'utf8',
  });
  try {
    return JSON.parse(out.stdout);
  } catch {
    return { note: `${args[0]} printed no JSON: ${(out.stderr || out.stdout).trim().split('\n')[0]}` };
  }
}

function summarize(label, report) {
  if (report.note) return { line: `${label}: ${report.note}`, errors: null };
  const byRule = new Map();
  for (const f of report.findings) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
  const rules = [...byRule].map(([rule, n]) => `${rule} ${n}`).join(', ');
  return { line: `${label}: ${report.errors} errors${rules ? ` (${rules})` : ''}`, errors: report.errors };
}

function checkRun(run) {
  const root = dirname(dirname(run.tracePath));
  const workspace = findWorkspace(root);
  const commands = bashCommands(run.tracePath);
  const loops = commands
    ? { checkerRuns: commands.filter((c) => CHECKER_RUN.test(c)).length, lookupRuns: commands.filter((c) => LOOKUP_RUN.test(c)).length }
    : { checkerRuns: null, lookupRuns: null };
  if (!workspace) return { ...loops, errors: null, lines: [`no kept workspace under ${root}; run the eval with --keep-temp`] };
  for (const file of PATCHED) copyFileSync(join(PROJECT, PKG, file), join(workspace, PKG, file));
  const lines = [];
  let errors = 0;
  const pages = readdirSync(join(workspace, 'src/pages'))
    .filter((name) => name.endsWith('.svelte') && !templatePages.has(name))
    .map((name) => join('src/pages', name));
  // The template authors no component, so every authored one is the run's own.
  const checks = [
    pages.length > 0 ? summarize(`check-page ${pages.join(' ')}`, runChecker(workspace, ['check-page', ...pages])) : { line: 'no new page under src/pages', errors: null },
    existsSync(join(workspace, 'src/system/components'))
      ? summarize('check-component', runChecker(workspace, ['check-component']))
      : { line: 'no component authored', errors: 0 },
  ];
  for (const check of checks) {
    lines.push(check.line);
    errors = errors === null || check.errors === null ? null : errors + check.errors;
  }
  const silenced = silencedRules(workspace);
  if (silenced.length > 0) lines.push(`live-tokens.config.json turns off: ${silenced.join(', ')}`);
  return { ...loops, errors, lines };
}

const mean = (values) => {
  const known = values.filter((v) => v !== null);
  return known.length === 0 ? 'n/a' : (known.reduce((a, b) => a + b, 0) / known.length).toFixed(1);
};

const result = JSON.parse(readFileSync(resultPath, 'utf8'));
const out = [`Each workspace's checkers, restored from scratch/eval-project, run with --strict --no-fix${tests.length ? ' --tests' : ''}.`, ''];
const table = [
  '| Skills | Tools | Runs | Grader score | Checker errors left | Seconds | Turns | Checker runs | Lookup runs | Cost |',
  '|---|---|---|---|---|---|---|---|---|---|',
];
for (const c of result.cases.filter((c) => TOOLS[c.name])) {
  for (const [arm, runs] of Object.entries(c.arms)) {
    const skills = arm === 'with' ? 'yes' : 'no';
    const scored = runs.map((run, i) => {
      const checked = checkRun(run);
      out.push(`skills ${skills}, ${TOOLS[c.name]}, run ${i + 1}: score ${run.score.toFixed(2)}, ${run.durationSeconds} s, ${run.turns} turns, ${checked.checkerRuns ?? '?'} checker runs, ${checked.lookupRuns ?? '?'} lookup runs, $${run.costUsd.toFixed(2)}${run.error ? `. Did not finish: ${run.error}` : ''}`);
      for (const line of checked.lines) out.push(`  ${line}`);
      return { run, checked };
    });
    const avg = (pick) => mean(scored.map(pick));
    table.push(
      `| ${skills} | ${TOOLS[c.name]} | ${runs.length} | ${avg((s) => s.run.score)} | ${avg((s) => s.checked.errors)} | ${avg((s) => s.run.durationSeconds)} | ${avg((s) => s.run.turns)} | ${avg((s) => s.checked.checkerRuns)} | ${avg((s) => s.checked.lookupRuns)} | $${avg((s) => s.run.costUsd)} |`,
    );
  }
}
console.log([...out, '', 'Means per arm:', '', ...table].join('\n'));
