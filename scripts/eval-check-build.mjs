#!/usr/bin/env node
// Scores each outcome-build-billing* run on accuracy, time, and loops, and
// saves what each run built into one report for side-by-side comparison.
// Accuracy is the runner's grader score plus the errors the full checkers find
// in what the run left behind, so every arm meets one bar whether or not it
// had the checker. Loops are the agent's turns and its checker runs, counted
// from the trace. The runner has no grader that runs a command, so this reads
// the workspaces and traces a `--keep-temp` run kept.
//
//   node scripts/eval-check-build.mjs <result json>... [--tests] [--out <dir>] [--clean]
//
// The report lands in <dir>/index.html (default scratch/eval-reports/<time>),
// with each run's screenshots, sources, findings, and trace beside it.
// --clean deletes each run's kept sandbox once the report holds its copies.

import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

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
const ROUTE = '/billing';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const CHECKER_RUN = /check-(page|component)\b/;
const LOOKUP_RUN = /live-tokens\s+(components|tokens)\b/;

const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const outArg = outAt >= 0 ? args[outAt + 1] : undefined;
const resultPaths = args.filter((a, i) => !a.startsWith('--') && i !== outAt + 1);
const tests = args.includes('--tests') ? ['--tests'] : [];
const clean = args.includes('--clean');
if (resultPaths.length === 0 || (outAt >= 0 && !outArg)) {
  console.error('usage: node scripts/eval-check-build.mjs <result json>... [--tests] [--out <dir>] [--clean]');
  process.exit(1);
}
if (!existsSync(join(PROJECT, PKG))) {
  console.error('scratch/eval-project is missing. Run npm run build:eval-project.');
  process.exit(1);
}
const templatePages = new Set(readdirSync(join(PROJECT, 'src/pages')));
const reportDir = outArg ? resolve(outArg) : join(REPO, 'scratch/eval-reports', new Date().toISOString().replace(/[:.]/g, '-'));

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

function runChecker(workspace, label, checkerArgs) {
  const out = spawnSync(process.execPath, [join(PKG, 'bin/cli.mjs'), ...checkerArgs, '--strict', '--json', '--no-fix', ...tests], {
    cwd: workspace,
    encoding: 'utf8',
  });
  let report;
  try {
    report = JSON.parse(out.stdout);
  } catch {
    return { label, note: `printed no JSON: ${(out.stderr || out.stdout).trim().split('\n')[0]}`, errors: null, byRule: [], findings: [] };
  }
  const byRule = new Map();
  for (const f of report.findings) byRule.set(f.rule, (byRule.get(f.rule) ?? 0) + 1);
  return { label, errors: report.errors, byRule: [...byRule], findings: report.findings };
}

async function waitForServer(url, child) {
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error('the dev server exited');
    try {
      if ((await fetch(url)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('the dev server did not answer within 60 s');
}

let nextPort = 5390;
async function screenshot(browser, workspace, outDir) {
  const port = nextPort++;
  const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--port', String(port), '--strictPort'], {
    cwd: workspace,
    stdio: 'ignore',
  });
  try {
    await waitForServer(`http://localhost:${port}/`, server);
    const shots = [];
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 2 });
      await page.goto(`http://localhost:${port}${ROUTE}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('[data-live-tokens-page]', { timeout: 15000 });
      await page.addStyleTag({ content: '[data-live-tokens-chrome] { display: none !important; }' });
      await page.waitForTimeout(500);
      await page.screenshot({ path: join(outDir, `${viewport.name}.png`), fullPage: true });
      await page.close();
      shots.push(viewport.name);
    }
    return { shots };
  } catch (error) {
    return { shots: [], note: `screenshot failed: ${error.message.split('\n')[0]}` };
  } finally {
    server.kill('SIGINT');
    await new Promise((r) => setTimeout(r, 300));
    if (server.exitCode === null) server.kill('SIGKILL');
  }
}

// Findings whose message names a raw value the run wrote instead of a token.
const LITERAL_RULES = new Set(['color-literal', 'dimension-literal', 'raw-text-axis', 'hardcoded-columns']);
function declarations(css) {
  const found = new Map();
  for (const m of css.matchAll(/(--[\w-]+)\s*:\s*([^;{}]+);/g)) {
    found.set(m[1], [...(found.get(m[1]) ?? []), m[2].trim()]);
  }
  return found;
}

function inventory(workspace, pages) {
  const report = spawnSync(process.execPath, [join(PKG, 'bin/cli.mjs'), 'report', '--json'], { cwd: workspace, encoding: 'utf8' });
  const facts = JSON.parse(report.stdout);
  const origin = new Map(facts.components.map((c) => [c.id, c.origin]));
  const used = facts.usage.byPage
    .filter((p) => pages.includes(p.file))
    .flatMap((p) => p.components.map((c) => ({ ...c, origin: origin.get(c.id) })));
  const created = facts.components
    .filter((c) => c.origin !== 'shipped')
    .map(({ id, file, registered, tokens }) => ({ id, file, registered, properties: tokens }));

  const template = declarations(readFileSync(join(PROJECT, 'src/system/styles/tokens.css'), 'utf8'));
  const tokensCss = join(workspace, 'src/system/styles/tokens.css');
  const current = existsSync(tokensCss) ? declarations(readFileSync(tokensCss, 'utf8')) : new Map();
  const addedTokens = [...current.keys()].filter((name) => !template.has(name));
  const changedTokens = [...current.keys()].filter((name) => template.has(name) && current.get(name).join('|') !== template.get(name).join('|'));

  const owned = created.map((c) => `--${c.id}-`);
  const authoredFiles = [...pages, ...created.map((c) => c.file), ...created.map((c) => c.file.replace(/\.svelte$/, 'Editor.svelte'))];
  const customProperties = [];
  for (const file of authoredFiles) {
    if (!existsSync(join(workspace, file))) continue;
    for (const name of declarations(readFileSync(join(workspace, file), 'utf8')).keys()) {
      if (owned.some((prefix) => name.startsWith(prefix))) continue;
      customProperties.push({ name, file, overrides: template.has(name) });
    }
  }

  return { used, created, addedTokens, changedTokens, customProperties };
}

function saveSources(workspace, outDir, pages) {
  const saved = [];
  for (const page of pages) {
    copyFileSync(join(workspace, page), join(outDir, page.split('/').pop()));
    saved.push(page.split('/').pop());
  }
  const components = join(workspace, 'src/system/components');
  if (existsSync(components)) {
    cpSync(components, join(outDir, 'components'), { recursive: true });
    for (const name of readdirSync(components)) saved.push(`components/${name}`);
  }
  return saved;
}

async function checkRun(browser, run, slug) {
  const commands = bashCommands(run.tracePath);
  const loops = commands
    ? { checkerRuns: commands.filter((c) => CHECKER_RUN.test(c)).length, lookupRuns: commands.filter((c) => LOOKUP_RUN.test(c)).length }
    : { checkerRuns: null, lookupRuns: null };
  const root = dirname(dirname(run.tracePath));
  const workspace = findWorkspace(root);
  if (!workspace) return { ...loops, errors: null, checks: [], shots: [], sources: [], notes: [`no kept workspace under ${root}; run the eval with --keep-temp`] };

  const outDir = join(reportDir, slug);
  mkdirSync(outDir, { recursive: true });
  for (const file of PATCHED) copyFileSync(join(PROJECT, PKG, file), join(workspace, PKG, file));
  const notes = [];
  const pages = readdirSync(join(workspace, 'src/pages'))
    .filter((name) => name.endsWith('.svelte') && !templatePages.has(name))
    .map((name) => join('src/pages', name));
  if (pages.length === 0) notes.push('no new page under src/pages');
  // The template authors no component, so every authored one is the run's own.
  const authored = existsSync(join(workspace, 'src/system/components'));
  if (!authored) notes.push('no component authored');
  const checks = [
    ...(pages.length > 0 ? [runChecker(workspace, `check-page ${pages.join(' ')}`, ['check-page', ...pages])] : []),
    ...(authored ? [runChecker(workspace, 'check-component', ['check-component'])] : []),
  ];
  const errors = pages.length === 0 || checks.some((c) => c.errors === null) ? null : checks.reduce((n, c) => n + c.errors, 0);
  const silenced = silencedRules(workspace);
  if (silenced.length > 0) notes.push(`live-tokens.config.json turns off: ${silenced.join(', ')}`);
  writeFileSync(join(outDir, 'findings.json'), JSON.stringify(checks, null, 2));
  const made = { ...inventory(workspace, pages), literals: checks.flatMap((c) => c.findings).filter((f) => LITERAL_RULES.has(f.rule)).map((f) => `${f.file}:${f.line} ${f.message.replace(/\. Use .*$/s, '')}`) };
  writeFileSync(join(outDir, 'inventory.json'), JSON.stringify(made, null, 2));
  const sources = saveSources(workspace, outDir, pages);
  if (commands) copyFileSync(run.tracePath, join(outDir, 'trace.jsonl'));
  const { shots, note } = pages.length > 0 ? await screenshot(browser, workspace, outDir) : { shots: [] };
  if (note) notes.push(note);
  return { ...loops, errors, checks, shots, sources, notes, made };
}

const ARM_ORDER = ['no skills|neither', 'skills|neither', 'skills|lookup', 'skills|checker', 'skills|lookup and checker'];
function armName(skills, tools) {
  if (skills === 'no skills' && tools === 'neither') return 'Unattended';
  if (skills === 'skills' && tools === 'neither') return 'Skills only';
  if (skills === 'skills') return `Skills, ${tools}`;
  return `No skills, ${tools}`;
}

const mean = (values) => {
  const known = values.filter((v) => v !== null && v !== undefined);
  return known.length === 0 ? null : known.reduce((a, b) => a + b, 0) / known.length;
};
const fmt = (n, digits = 1) => (n === null ? 'n/a' : n.toFixed(digits));

const browser = await chromium.launch();
const arms = new Map();
try {
  for (const path of resultPaths) {
    const result = JSON.parse(readFileSync(path, 'utf8'));
    for (const c of result.cases.filter((c) => TOOLS[c.name])) {
      for (const [arm, runs] of Object.entries(c.arms)) {
        const skills = arm === 'with' ? 'skills' : 'no skills';
        const key = `${skills}|${TOOLS[c.name]}`;
        const entry = arms.get(key) ?? { key, name: armName(skills, TOOLS[c.name]), runs: [] };
        for (const run of runs) {
          const index = entry.runs.length + 1;
          const slug = `${key.replace(/[^a-z]+/g, '-')}-run-${index}`;
          console.error(`checking ${entry.name}, run ${index}`);
          const checked = await checkRun(browser, run, slug);
          const failed = (run.graders ?? []).filter((g) => g.scored !== false && !g.passed).map((g) => g.name);
          entry.runs.push({ index, slug, run, checked, failed });
        }
        arms.set(key, entry);
      }
    }
  }
} finally {
  await browser.close();
}

// Only a directory the runner itself names `e-<id>` is removed, so a stray tracePath cannot reach anything else.
if (clean) {
  for (const arm of arms.values()) {
    for (const { run } of arm.runs) {
      const sandbox = dirname(dirname(run.tracePath));
      if (/^e-[A-Za-z0-9]+$/.test(basename(sandbox)) && existsSync(sandbox)) rmSync(sandbox, { recursive: true, force: true });
    }
  }
}

const ordered = [...arms.values()].sort((a, b) => {
  const rank = (k) => (ARM_ORDER.indexOf(k) === -1 ? ARM_ORDER.length : ARM_ORDER.indexOf(k));
  return rank(a.key) - rank(b.key);
});
const newTokenCount = (made) => made.addedTokens.length + made.changedTokens.length + made.customProperties.length;
const summary = ordered.map((arm) => {
  const avg = (pick) => mean(arm.runs.map(pick));
  return {
    name: arm.name,
    runs: arm.runs.length,
    score: avg((r) => r.run.score),
    errors: avg((r) => r.checked.errors),
    seconds: avg((r) => r.run.durationSeconds),
    turns: avg((r) => r.run.turns),
    checkerRuns: avg((r) => r.checked.checkerRuns),
    lookupRuns: avg((r) => r.checked.lookupRuns),
    cost: avg((r) => r.run.costUsd),
    shippedUsed: avg((r) => r.checked.made?.used.filter((c) => c.origin === 'shipped').length),
    created: avg((r) => r.checked.made?.created.length),
    newTokens: avg((r) => r.checked.made && newTokenCount(r.checked.made)),
    literals: avg((r) => r.checked.made?.literals.length),
  };
});

const lines = [
  `Checkers restored from scratch/eval-project, run with --strict --no-fix${tests.length ? ' --tests' : ''}.`,
  '',
  '| Arm | Runs | Grader score | Checker errors left | Seconds | Turns | Checker runs | Lookup runs | Cost | Shipped components | New components | New tokens | Literal values |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...summary.map((s) => `| ${s.name} | ${s.runs} | ${fmt(s.score, 2)} | ${fmt(s.errors)} | ${fmt(s.seconds, 0)} | ${fmt(s.turns)} | ${fmt(s.checkerRuns)} | ${fmt(s.lookupRuns)} | $${fmt(s.cost, 2)} | ${fmt(s.shippedUsed)} | ${fmt(s.created)} | ${fmt(s.newTokens)} | ${fmt(s.literals)} |`),
  '',
  `Report: ${join(reportDir, 'index.html')}`,
];
console.log(lines.join('\n'));

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const maxRuns = Math.max(...ordered.map((a) => a.runs.length));

function made({ used, created, addedTokens, changedTokens, customProperties, literals }) {
  const list = (items, render) => `<ul class="made">${items.map((item) => `<li>${render(item)}</li>`).join('')}</ul>`;
  const none = (text) => `<p class="none">${text}</p>`;
  const tokens = [
    ...addedTokens.map((name) => `<code>${esc(name)}</code> added to tokens.css`),
    ...changedTokens.map((name) => `<code>${esc(name)}</code> changed in tokens.css`),
    ...customProperties.map((p) => `<code>${esc(p.name)}</code> declared in ${esc(p.file)}${p.overrides ? ', overriding a design token' : ''}`),
  ];
  return `<h4>Components used</h4>
  ${used.length ? `<div class="chips">${used.map((c) => `<span class="chip ${c.origin === 'shipped' ? '' : 'custom'}">${esc(c.id)} <b>${c.rendered}</b></span>`).join('')}</div>` : none('No component rendered on the page.')}
  <h4>New components</h4>
  ${created.length ? list(created, (c) => `<code>${esc(c.id)}</code> ${esc(c.file)}, ${c.properties} properties, ${c.registered ? 'registered' : 'not registered'}`) : none('None.')}
  <h4>New tokens</h4>
  ${tokens.length ? list(tokens, (t) => t) : none('None.')}
  <h4>Literal values</h4>
  ${literals.length ? list(literals, (l) => esc(l)) : none('None.')}`;
}

function column(arm, r) {
  if (!r) return `<article class="col empty"><h3>${esc(arm.name)}</h3><p class="note">No run ${esc(String(arm.runs.length + 1))}.</p></article>`;
  const { run, checked, failed, slug } = r;
  const metric = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  const shot = (name) =>
    checked.shots.includes(name)
      ? `<a class="shot ${name}" href="${slug}/${name}.png" data-width="${VIEWPORTS.find((v) => v.name === name).width}" data-caption="${esc(arm.name)}, run ${r.index}, ${name}"><img src="${slug}/${name}.png" alt="${esc(arm.name)}, run ${r.index}, ${name}" loading="lazy"></a>`
      : '';
  const rules = checked.checks
    .map((c) => `<li><span class="check">${esc(c.label)}</span> ${c.note ? esc(c.note) : `${c.errors} errors`}${c.byRule.length ? `<ul class="rules">${c.byRule.map(([rule, n]) => `<li><code>${esc(rule)}</code> ${n}</li>`).join('')}</ul>` : ''}</li>`)
    .join('');
  return `<article class="col">
  <h3>${esc(arm.name)}</h3>
  <dl class="metrics">
    ${metric('Grader score', fmt(run.score, 2))}
    ${metric('Errors left', checked.errors ?? 'n/a')}
    ${metric('Seconds', run.durationSeconds)}
    ${metric('Turns', run.turns)}
    ${metric('Checker runs', checked.checkerRuns ?? 'n/a')}
    ${metric('Lookup runs', checked.lookupRuns ?? 'n/a')}
    ${metric('Cost', `$${run.costUsd.toFixed(2)}`)}
  </dl>
  ${run.error ? `<p class="note">Did not finish: ${esc(run.error)}</p>` : ''}
  ${checked.notes.map((n) => `<p class="note">${esc(n)}</p>`).join('')}
  <div class="shots">${shot('desktop')}${shot('mobile')}</div>
  ${checked.made ? made(checked.made) : ''}
  ${failed.length ? `<h4>Failed graders</h4><ul class="graders">${failed.map((g) => `<li><code>${esc(g)}</code></li>`).join('')}</ul>` : (run.graders ?? []).length ? '<h4>Every grader passed</h4>' : ''}
  ${rules ? `<h4>Checker findings</h4><ul class="checks">${rules}</ul>` : ''}
  ${checked.sources.length ? `<h4>Sources</h4><ul class="sources">${checked.sources.map((s) => `<li><a href="${slug}/${esc(s)}" target="_blank">${esc(s)}</a></li>`).join('')}<li><a href="${slug}/findings.json" target="_blank">findings.json</a></li><li><a href="${slug}/inventory.json" target="_blank">inventory.json</a></li>${checked.checkerRuns !== null ? `<li><a href="${slug}/trace.jsonl" target="_blank">trace.jsonl</a></li>` : ''}</ul>` : ''}
</article>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Billing eval report</title>
<style>
  :root {
    --bg: #f4f3ef; --surface: #ffffff; --ink: #1b1b1a; --muted: #6b6a66; --line: #dcdad3; --bad: #a3361f; --good: #2f6b3a;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #151514; --surface: #1e1e1c; --ink: #ecebe6; --muted: #9a998f; --line: #34332f; --bad: #e0866f; --good: #8cc196; color-scheme: dark; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 ui-sans-serif, -apple-system, "Segoe UI", sans-serif; }
  header, section { padding: 24px 32px; }
  h1 { margin: 0 0 4px; font-size: 26px; letter-spacing: -0.01em; }
  h2 { margin: 0 0 16px; font-size: 18px; }
  h3 { margin: 0 0 12px; font-size: 16px; }
  h4 { margin: 16px 0 6px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  p.lede { margin: 0; color: var(--muted); max-width: 72ch; }
  code, .num, dd, td { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13px; }
  table { border-collapse: collapse; background: var(--surface); border: 1px solid var(--line); }
  th, td { padding: 8px 12px; border-bottom: 1px solid var(--line); text-align: right; white-space: nowrap; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 600; }
  th:first-child, td:first-child { text-align: left; font-family: inherit; font-size: 14px; font-weight: 600; }
  .table-scroll { overflow-x: auto; }
  .strip { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(480px, 600px); gap: 16px; overflow-x: auto; padding-bottom: 12px; }
  .col { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 16px; min-width: 0; }
  .col.empty { opacity: 0.5; }
  .metrics { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px 16px; margin: 0; }
  .metrics div { display: flex; justify-content: space-between; border-bottom: 1px dotted var(--line); }
  dt { color: var(--muted); font-size: 13px; }
  dd { margin: 0; }
  .shots { display: grid; gap: 12px; margin-top: 16px; justify-items: start; }
  .shot { display: block; width: 100%; border: 1px solid var(--line); border-radius: 6px; overflow: hidden; max-height: 900px; }
  .shot.mobile { width: 50%; }
  .shot img { display: block; width: 100%; }
  .shot { cursor: zoom-in; }
  .lightbox { width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: #0a0a09; color: #ecebe6; }
  .lightbox::backdrop { background: transparent; }
  .lightbox-bar { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 12px 20px; background: rgb(10 10 9 / 0.9); }
  .lightbox-bar span { flex: 1; font-weight: 600; }
  .lightbox-bar button { font: inherit; color: inherit; background: rgb(255 255 255 / 0.1); border: 1px solid rgb(255 255 255 / 0.2); border-radius: 999px; padding: 4px 14px; cursor: pointer; }
  .lightbox-bar button:hover { background: rgb(255 255 255 / 0.2); }
  .lightbox-stage { overflow: auto; height: calc(100dvh - 58px); padding: 0 20px 40px; }
  .lightbox-stage img { display: block; margin: 0 auto; max-width: 100%; height: auto; cursor: zoom-out; }
  ul { margin: 0; padding-left: 18px; }
  .rules { padding-left: 16px; color: var(--muted); }
  .graders li, .note { color: var(--bad); }
  .note { margin: 8px 0 0; font-size: 13px; }
  .check { font-weight: 600; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; padding: 2px 8px; border: 1px solid var(--line); border-radius: 999px; }
  .chip b { font-weight: 600; color: var(--muted); }
  .chip.custom { border-color: var(--ink); }
  .made { font-size: 13px; }
  .none { margin: 0; font-size: 13px; color: var(--muted); }
  a { color: inherit; }
  @media (max-width: 640px) { header, section { padding: 16px; } .strip { grid-auto-columns: 88vw; } }
</style>
</head>
<body>
<header>
  <h1>Billing eval report</h1>
  <p class="lede">Every run gets the same brief in a fresh session and a freshly copied project. Columns compare the arms; click a screenshot to open it at full size, and use the arrow keys to step between screenshots. Checker errors come from the full checkers run afterwards with --strict --no-fix${tests.length ? ' --tests' : ''}, the same for every arm.</p>
</header>
<section>
  <h2>Means per arm</h2>
  <div class="table-scroll"><table>
    <thead><tr><th>Arm</th><th>Runs</th><th>Grader score</th><th>Errors left</th><th>Seconds</th><th>Turns</th><th>Checker runs</th><th>Lookup runs</th><th>Cost</th><th>Shipped components</th><th>New components</th><th>New tokens</th><th>Literal values</th></tr></thead>
    <tbody>${summary.map((s) => `<tr><td>${esc(s.name)}</td><td>${s.runs}</td><td>${fmt(s.score, 2)}</td><td>${fmt(s.errors)}</td><td>${fmt(s.seconds, 0)}</td><td>${fmt(s.turns)}</td><td>${fmt(s.checkerRuns)}</td><td>${fmt(s.lookupRuns)}</td><td>$${fmt(s.cost, 2)}</td><td>${fmt(s.shippedUsed)}</td><td>${fmt(s.created)}</td><td>${fmt(s.newTokens)}</td><td>${fmt(s.literals)}</td></tr>`).join('')}</tbody>
  </table></div>
</section>
${Array.from({ length: maxRuns }, (_, i) => `<section>
  <h2>Run ${i + 1}</h2>
  <div class="strip">${ordered.map((arm) => column(arm, arm.runs[i])).join('\n')}</div>
</section>`).join('\n')}
<dialog class="lightbox" aria-label="Screenshot">
  <div class="lightbox-bar">
    <span class="lightbox-caption"></span>
    <button type="button" data-step="-1" aria-label="Previous screenshot">Previous</button>
    <button type="button" data-step="1" aria-label="Next screenshot">Next</button>
    <button type="button" data-close aria-label="Close">Close</button>
  </div>
  <div class="lightbox-stage"><img alt=""></div>
</dialog>
<script>
  const shots = [...document.querySelectorAll('.shot')];
  const box = document.querySelector('.lightbox');
  const img = box.querySelector('img');
  const caption = box.querySelector('.lightbox-caption');
  const stage = box.querySelector('.lightbox-stage');
  let current = 0;
  // Shots are captured at 2x, so the CSS width is the viewport the page was rendered at.
  function show(i) {
    current = (i + shots.length) % shots.length;
    const shot = shots[current];
    img.src = shot.getAttribute('href');
    img.alt = shot.dataset.caption;
    img.style.width = shot.dataset.width + 'px';
    caption.textContent = shot.dataset.caption + ' (' + (current + 1) + ' of ' + shots.length + ')';
    stage.scrollTop = 0;
    if (!box.open) box.showModal();
  }
  shots.forEach((shot, i) => shot.addEventListener('click', (event) => { event.preventDefault(); show(i); }));
  box.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => show(current + Number(b.dataset.step))));
  box.querySelector('[data-close]').addEventListener('click', () => box.close());
  img.addEventListener('click', () => box.close());
  box.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') show(current + 1);
    if (event.key === 'ArrowLeft') show(current - 1);
  });
</script>
</body>
</html>
`;
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'index.html'), html);
