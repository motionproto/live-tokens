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
import { tmpdir } from 'node:os';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const REPO = resolve(dirname(new URL(import.meta.url).pathname), '..');
const PROJECT = join(REPO, 'scratch/eval-project');
const PKG = 'node_modules/@motion-proto/live-tokens';
// What a run can author. The runner seals each kept workspace and warns
// against running anything in it, and its CLI is patched, so each run's files
// are scored in a fresh copy of the eval project.
const RUN_FILES = ['src', 'tests', 'live-tokens.config.json', 'live-tokens.testing.ts'];
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

// Each tool call in the trace, in order, with the text it returned.
function traceSteps(tracePath) {
  if (!existsSync(tracePath)) return null;
  const steps = [];
  const byId = new Map();
  for (const line of readFileSync(tracePath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const content = JSON.parse(line).message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === 'tool_use') {
        const step = { tool: block.name, input: block.input ?? {}, output: '' };
        byId.set(block.id, step);
        steps.push(step);
      } else if (block.type === 'tool_result' && byId.has(block.tool_use_id)) {
        const c = block.content;
        byId.get(block.tool_use_id).output = typeof c === 'string' ? c : (c ?? []).map((part) => part.text ?? '').join('');
      }
    }
  }
  return steps;
}

const WORKSPACE_PATH = /\/(?:private\/)?tmp\/e-[A-Za-z0-9]+\/home\/cwd\/?/g;
const SOURCE_READ = /node_modules\/@motion-proto\/live-tokens\//;
const sourcePaths = (text) => [...new Set([...String(text).matchAll(/node_modules\/@motion-proto\/live-tokens\/([\w./-]*\w)/g)].map((m) => m[1]))];
const UNKNOWN_COMMAND = /unknown command/i;
const relative = (path) => String(path).replace(WORKSPACE_PATH, '');

function checkerResult(output) {
  if (UNKNOWN_COMMAND.test(output)) return { failed: true };
  const json = output.match(/"errors":\s*(\d+)/);
  const text = output.match(/(\d+) error\(s\)/);
  const errors = json ? Number(json[1]) : text ? Number(text[1]) : /file\(s\) clean/.test(output) ? 0 : null;
  const rules = new Set([...output.matchAll(/"rule":\s*"([\w-]+)"/g), ...output.matchAll(/\[([a-z][\w-]*)\]$/gm)].map((m) => m[1]));
  return { errors, rules: [...rules] };
}

// What the agent reached for and when: skills, lookups, checker runs and what
// they reported, reads of the package's own source, and the files it wrote.
function behaviour(steps) {
  const timeline = [];
  const push = (entry) => {
    const last = timeline.at(-1);
    if (last && last.kind === entry.kind && last.label === entry.label && (entry.kind === 'write' || entry.kind === 'source')) {
      last.count++;
      if (entry.paths) last.paths = [...new Set([...last.paths, ...entry.paths])];
    } else timeline.push({ count: 1, ...entry });
  };
  for (const { tool, input, output } of steps) {
    if (tool === 'Skill') push({ kind: 'skill', label: String(input.skill).replace(/^[\w-]+:/, '') });
    if (tool === 'Write' || tool === 'Edit') push({ kind: 'write', label: `${tool === 'Write' ? 'wrote' : 'edited'} ${relative(input.file_path)}` });
    const path = input.file_path ?? input.path ?? input.pattern ?? '';
    if ((tool === 'Read' || tool === 'Grep' || tool === 'Glob') && SOURCE_READ.test(path)) push({ kind: 'source', label: 'read package source', paths: sourcePaths(path) });
    if (tool !== 'Bash') continue;
    const command = String(input.command);
    for (const m of command.matchAll(/live-tokens\s+((?:components|tokens)\b[^;|&>]*)/g)) {
      push({ kind: 'lookup', label: m[1].replace(/\s+\d$/, '').trim(), failed: UNKNOWN_COMMAND.test(output) });
    }
    for (const m of command.matchAll(/(?:live-tokens|cli\.mjs)\s+(check-(?:page|component)\b[^;|&>]*)/g)) {
      const label = m[1].replace(/\s--(?:json|strict|tests|no-fix)\b/g, '').replace(/\s+\d$/, '').trim();
      push({ kind: 'checker', label, ...checkerResult(output) });
    }
    if (SOURCE_READ.test(command)) push({ kind: 'source', label: 'read package source', paths: sourcePaths(command) });
  }
  const count = (kind) => timeline.filter((e) => e.kind === kind).reduce((n, e) => n + (kind === 'source' ? e.count : 1), 0);
  return {
    timeline,
    skills: count('skill'),
    lookupRuns: count('lookup'),
    checkerRuns: count('checker'),
    sourceReads: count('source'),
  };
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
  const shipped = facts.components.filter((c) => c.origin === 'shipped').map((c) => c.id);
  const authoredFiles = [...pages, ...created.map((c) => c.file), ...created.map((c) => c.file.replace(/\.svelte$/, 'Editor.svelte'))];
  const customProperties = [];
  for (const file of authoredFiles) {
    if (!existsSync(join(workspace, file))) continue;
    for (const name of declarations(readFileSync(join(workspace, file), 'utf8')).keys()) {
      // `--sketch-*` are the hooks the create-component skill's sketch mode prescribes.
      if (name.startsWith('--sketch-') || owned.some((prefix) => name.startsWith(prefix))) continue;
      // A shipped component's semantic property set in place is property-override's
      // finding, so it is listed but not counted as a new token.
      const component = shipped.find((id) => name.startsWith(`--${id}-`));
      customProperties.push({ name, file, overrides: template.has(name), component });
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

// The runner leaves home/ and tmp/ in mode 000 and the kept directory read-only.
function unseal(root) {
  spawnSync('chmod', ['-R', 'u+rwX', root]);
}

function freshProject(workspace) {
  const work = mkdtempSync(join(tmpdir(), 'lt-eval-score-'));
  spawnSync('cp', ['-cR', `${PROJECT}/.`, work]);
  for (const file of RUN_FILES) {
    rmSync(join(work, file), { recursive: true, force: true });
    if (existsSync(join(workspace, file))) cpSync(join(workspace, file), join(work, file), { recursive: true });
  }
  return work;
}

// A report keeps each run's files and trace, so scoring the same result JSON
// into the same --out folder again works after --clean removed the sandbox.
async function checkRun(browser, run, slug) {
  const saved = join(reportDir, slug);
  const root = dirname(dirname(run.tracePath));
  if (existsSync(root)) unseal(root);
  const tracePath = existsSync(run.tracePath) ? run.tracePath : join(saved, 'trace.jsonl');
  const commands = traceSteps(tracePath);
  const loops = commands
    ? behaviour(commands)
    : { timeline: [], skills: null, checkerRuns: null, lookupRuns: null, sourceReads: null };
  const sealed = existsSync(join(root, 'sealed')) ? findWorkspace(join(root, 'sealed'), 3) : null;
  const kept = sealed ?? (existsSync(join(saved, 'workspace')) ? join(saved, 'workspace') : null);
  if (!kept) return { ...loops, errors: null, checks: [], shots: [], sources: [], notes: [`no kept workspace under ${root}; run the eval with --keep-temp`] };
  if (sealed) {
    rmSync(join(saved, 'workspace'), { recursive: true, force: true });
    for (const file of RUN_FILES) {
      if (existsSync(join(sealed, file))) cpSync(join(sealed, file), join(saved, 'workspace', file), { recursive: true });
    }
  }
  const workspace = freshProject(kept);
  try {
    return await scoreWorkspace(browser, { ...run, tracePath }, slug, workspace, commands, loops);
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
}

async function scoreWorkspace(browser, run, slug, workspace, commands, loops) {
  const outDir = join(reportDir, slug);
  mkdirSync(outDir, { recursive: true });
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
  if (commands && resolve(run.tracePath) !== resolve(join(outDir, 'trace.jsonl'))) copyFileSync(run.tracePath, join(outDir, 'trace.jsonl'));
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

function readPrompt(name) {
  const path = join(REPO, '.claude/evals', name, 'prompt.md');
  return existsSync(path) ? readFileSync(path, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '').trim() : null;
}

const browser = await chromium.launch();
const arms = new Map();
const prompts = new Map();
try {
  for (const path of resultPaths) {
    const result = JSON.parse(readFileSync(path, 'utf8'));
    for (const c of result.cases.filter((c) => TOOLS[c.name])) {
      if (!prompts.has(c.name)) prompts.set(c.name, readPrompt(c.name));
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
          // A capped run stopped before the agent said it was done, so its numbers measure the cap.
          const capped =
            run.turns >= c.maxTurns ? `Hit the turn cap of ${c.maxTurns}.`
            : run.durationSeconds >= c.timeoutSeconds ? `Hit the time cap of ${c.timeoutSeconds} s.`
            : null;
          entry.runs.push({ index, slug, run, checked, failed, capped });
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
      if (/^e-[A-Za-z0-9]+$/.test(basename(sandbox)) && existsSync(sandbox)) {
        unseal(sandbox);
        rmSync(sandbox, { recursive: true, force: true });
      }
    }
  }
}

const ordered = [...arms.values()].sort((a, b) => {
  const rank = (k) => (ARM_ORDER.indexOf(k) === -1 ? ARM_ORDER.length : ARM_ORDER.indexOf(k));
  return rank(a.key) - rank(b.key);
});
const newTokenCount = (made) => made.addedTokens.length + made.changedTokens.length + made.customProperties.filter((p) => !p.component).length;
const summary = ordered.map((arm) => {
  const avg = (pick) => mean(arm.runs.map(pick));
  return {
    name: arm.name,
    runs: arm.runs.length,
    finished: arm.runs.filter((r) => !r.capped && !r.run.error).length,
    score: avg((r) => r.run.score),
    errors: avg((r) => r.checked.errors),
    seconds: avg((r) => r.run.durationSeconds),
    turns: avg((r) => r.run.turns),
    skills: avg((r) => r.checked.skills),
    checkerRuns: avg((r) => r.checked.checkerRuns),
    lookupRuns: avg((r) => r.checked.lookupRuns),
    sourceReads: avg((r) => r.checked.sourceReads),
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
  '| Arm | Finished | Grader score | Checker errors left | Generation seconds | Turns | Skills loaded | Checker runs | Lookup runs | Source reads | Generation cost | Shipped components | New components | New tokens | Literal values |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...summary.map((s) => `| ${s.name} | ${s.finished} of ${s.runs} | ${fmt(s.score, 2)} | ${fmt(s.errors)} | ${fmt(s.seconds, 0)} | ${fmt(s.turns)} | ${fmt(s.skills)} | ${fmt(s.checkerRuns)} | ${fmt(s.lookupRuns)} | ${fmt(s.sourceReads)} | $${fmt(s.cost, 2)} | ${fmt(s.shippedUsed)} | ${fmt(s.created)} | ${fmt(s.newTokens)} | ${fmt(s.literals)} |`),
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
    ...customProperties.filter((p) => !p.component).map((p) => `<code>${esc(p.name)}</code> declared in ${esc(p.file)}${p.overrides ? ', overriding a design token' : ''}`),
  ];
  const overrides = customProperties.filter((p) => p.component);
  return `<h4>Components used</h4>
  ${used.length ? `<div class="chips">${used.map((c) => `<span class="chip ${c.origin === 'shipped' ? '' : 'custom'}">${esc(c.id)} <b>${c.rendered}</b></span>`).join('')}</div>` : none('No component rendered on the page.')}
  <h4>New components</h4>
  ${created.length ? list(created, (c) => `<code>${esc(c.id)}</code> ${esc(c.file)}, ${c.properties} properties, ${c.registered ? 'registered' : 'not registered'}`) : none('None.')}
  <h4>New tokens</h4>
  ${tokens.length ? list(tokens, (t) => t) : none('None.')}
  ${overrides.length ? `<h4>Overridden component properties</h4>
  ${list(overrides, (p) => `<code>${esc(p.name)}</code> set in ${esc(p.file)}, overriding ${esc(p.component)}`)}` : ''}
  <h4>Literal values</h4>
  ${literals.length ? list(literals, (l) => esc(l)) : none('None.')}`;
}

const STEP_KIND = { skill: 'Skill', lookup: 'Lookup', checker: 'Checker', source: 'Source', write: 'File' };
function step(e) {
  const times = e.count > 1 ? ` <b>×${e.count}</b>` : '';
  const result =
    e.kind === 'lookup' && e.failed ? ' <span class="bad">unknown command</span>'
    : e.kind !== 'checker' ? ''
    : e.failed ? ' <span class="bad">unknown command</span>'
    : e.errors === null ? ' <span class="muted">result not read</span>'
    : e.errors === 0 ? ' <span class="good">clean</span>'
    : ` <span class="bad">${e.errors} error${e.errors === 1 ? '' : 's'}</span>${e.rules.length ? ` <span class="muted">${e.rules.map(esc).join(', ')}</span>` : ''}`;
  const paths = e.paths?.length ? ` <span class="muted">${e.paths.map(esc).join(', ')}</span>` : '';
  return `<li class="${e.kind}"><span class="kind">${STEP_KIND[e.kind]}</span> <code>${esc(e.label)}</code>${times}${result}${paths}</li>`;
}

function column(arm, r) {
  if (!r) return `<article class="col empty"><h3>${esc(arm.name)}</h3><p class="note">This arm has no run here.</p></article>`;
  const { run, checked, failed, slug } = r;
  const metric = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  const shot = (name) =>
    checked.shots.includes(name)
      ? `<a class="shot" data-view="${name}" href="${slug}/${name}.png" data-width="${VIEWPORTS.find((v) => v.name === name).width}" data-caption="${esc(arm.name)}, run ${r.index}, ${name}"><img src="${slug}/${name}.png" alt="${esc(arm.name)}, run ${r.index}, ${name}" loading="lazy"></a>`
      : `<p class="none shot-missing" data-view="${name}">No ${name} screenshot.</p>`;
  const rules = checked.checks
    .map((c) => `<li><span class="check">${esc(c.label)}</span> ${c.note ? esc(c.note) : `${c.errors} errors`}${c.byRule.length ? `<ul class="rules">${c.byRule.map(([rule, n]) => `<li><code>${esc(rule)}</code> ${n}</li>`).join('')}</ul>` : ''}</li>`)
    .join('');
  const status = r.capped || run.error ? '<span class="pill bad">Did not finish</span>' : '<span class="pill good">Finished</span>';
  return `<article class="col">
  <header class="col-head"><h3>${esc(arm.name)}</h3>${status}</header>
  <dl class="metrics">
    ${metric('Grader score', fmt(run.score, 2))}
    ${metric('Errors left', checked.errors ?? 'n/a')}
    ${metric('Generation seconds', run.durationSeconds)}
    ${metric('Turns', run.turns)}
    ${metric('Skills loaded', checked.skills ?? 'n/a')}
    ${metric('Checker runs', checked.checkerRuns ?? 'n/a')}
    ${metric('Lookup runs', checked.lookupRuns ?? 'n/a')}
    ${metric('Source reads', checked.sourceReads ?? 'n/a')}
    ${metric('Generation cost', `$${run.costUsd.toFixed(2)}`)}
  </dl>
  ${r.capped ? `<p class="note">${esc(r.capped)} The agent never said it was done, so read this run's numbers as a floor.</p>` : ''}
  ${run.error ? `<p class="note">Did not finish: ${esc(run.error)}</p>` : ''}
  ${checked.notes.map((n) => `<p class="note">${esc(n)}</p>`).join('')}
  <div class="frame">${shot('desktop')}${shot('mobile')}</div>
  ${checked.timeline.length ? `<h4>Behaviour</h4><ol class="timeline">${checked.timeline.map(step).join('')}</ol>` : ''}
  ${checked.made ? made(checked.made) : ''}
  ${failed.length ? `<h4>Failed graders</h4><ul class="graders">${failed.map((g) => `<li><code>${esc(g)}</code></li>`).join('')}</ul>` : (run.graders ?? []).length ? '<h4>Every grader passed</h4>' : ''}
  ${rules ? `<h4>Checker findings</h4><ul class="checks">${rules}</ul>` : ''}
  ${checked.sources.length ? `<h4>Sources</h4><ul class="sources">${checked.sources.map((s) => `<li><a href="${slug}/${esc(s)}" target="_blank">${esc(s)}</a></li>`).join('')}<li><a href="${slug}/findings.json" target="_blank">findings.json</a></li><li><a href="${slug}/inventory.json" target="_blank">inventory.json</a></li><li><a href="${slug}/workspace/" target="_blank">workspace</a></li>${checked.checkerRuns !== null ? `<li><a href="${slug}/trace.jsonl" target="_blank">trace.jsonl</a></li>` : ''}</ul>` : ''}
</article>`;
}

const prose = (text) =>
  text.split(/\n\s*\n/).map((para) => `<p>${esc(para.trim()).replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`).join('');
const distinctPrompts = [...new Set([...prompts.values()].filter(Boolean))];
const brief = distinctPrompts.length === 1
  ? `<div class="brief">${prose(distinctPrompts[0])}</div>`
  : [...prompts].filter(([, text]) => text).map(([name, text]) => `<h3><code>${esc(name)}</code></h3><div class="brief">${prose(text)}</div>`).join('');

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Billing eval report</title>
<style>
  :root {
    --bg: #f4f3ef; --surface: #ffffff; --sunken: #ebe9e3; --ink: #1b1b1a; --muted: #6b6a66; --line: #dcdad3; --bad: #a3361f; --good: #2f6b3a;
    color-scheme: light;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg: #151514; --surface: #1e1e1c; --sunken: #121211; --ink: #ecebe6; --muted: #9a998f; --line: #34332f; --bad: #e0866f; --good: #8cc196; color-scheme: dark; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--ink); font: 15px/1.5 ui-sans-serif, -apple-system, "Segoe UI", sans-serif; }
  .page-head, .block { padding: 24px 32px; }
  h1 { margin: 0 0 4px; font-size: 26px; letter-spacing: -0.01em; }
  h2 { margin: 0 0 16px; font-size: 18px; }
  h3 { margin: 0; font-size: 16px; }
  h4 { margin: 18px 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  p.lede { margin: 0; color: var(--muted); max-width: 80ch; }
  code, dd, td { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 13px; }
  a { color: inherit; }
  ul { margin: 0; padding-left: 18px; }

  .brief { max-width: 80ch; background: var(--surface); border: 1px solid var(--line); border-left: 4px solid var(--ink); border-radius: 8px; padding: 4px 20px; }
  .brief p { margin: 12px 0; }

  table { border-collapse: collapse; background: var(--surface); border: 1px solid var(--line); }
  th, td { padding: 8px 12px; border-bottom: 1px solid var(--line); text-align: right; white-space: nowrap; }
  th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); font-weight: 600; }
  th:first-child, td:first-child { text-align: left; font-family: inherit; font-size: 14px; font-weight: 600; }
  .table-scroll { overflow-x: auto; }

  .bar { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 32px; background: var(--bg); border-bottom: 1px solid var(--line); }
  .tabs { display: flex; flex-wrap: wrap; gap: 4px; }
  .tabs button { font: inherit; font-weight: 600; color: var(--muted); background: none; border: 0; border-bottom: 2px solid transparent; padding: 6px 12px; cursor: pointer; }
  .tabs button[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--ink); }
  .segmented { display: inline-flex; padding: 3px; background: var(--sunken); border: 1px solid var(--line); border-radius: 999px; }
  .segmented button { font: inherit; font-size: 13px; font-weight: 600; color: var(--muted); background: none; border: 0; border-radius: 999px; padding: 4px 14px; cursor: pointer; }
  .segmented button[aria-pressed="true"] { color: var(--ink); background: var(--surface); box-shadow: 0 1px 2px rgb(0 0 0 / 0.15); }
  .tabs button:focus-visible, .segmented button:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

  .strip { display: grid; grid-auto-flow: column; gap: 16px; overflow-x: auto; padding: 24px 32px 32px; scroll-padding-inline: 32px; scroll-snap-type: x proximity; }
  body[data-view="desktop"] .strip { grid-auto-columns: minmax(720px, 880px); }
  body[data-view="mobile"] .strip { grid-auto-columns: 440px; }
  .col { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 16px; min-width: 0; scroll-snap-align: start; }
  .col.empty { opacity: 0.5; }
  .col-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 12px; }
  .pill { font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 999px; border: 1px solid currentColor; }
  .metrics { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 6px 16px; margin: 0; }
  .metrics div { display: flex; justify-content: space-between; border-bottom: 1px dotted var(--line); }
  dt { color: var(--muted); font-size: 13px; }
  dd { margin: 0; }

  .frame { margin-top: 16px; height: 75vh; overflow: auto; background: var(--sunken); border: 1px solid var(--line); border-radius: 8px; }
  .shot { display: block; cursor: zoom-in; }
  .shot img { display: block; width: 100%; height: auto; }
  .shot[data-view="mobile"] img { width: 390px; max-width: 100%; margin: 0 auto; }
  body[data-view="desktop"] [data-view="mobile"], body[data-view="mobile"] [data-view="desktop"] { display: none; }
  .shot-missing { padding: 16px; }

  .lightbox { width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: #0a0a09; color: #ecebe6; }
  .lightbox::backdrop { background: transparent; }
  .lightbox-bar { position: sticky; top: 0; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 12px 20px; background: rgb(10 10 9 / 0.9); }
  .lightbox-bar span { flex: 1; font-weight: 600; }
  .lightbox-bar button { font: inherit; color: inherit; background: rgb(255 255 255 / 0.1); border: 1px solid rgb(255 255 255 / 0.2); border-radius: 999px; padding: 4px 14px; cursor: pointer; }
  .lightbox-bar button:hover { background: rgb(255 255 255 / 0.2); }
  .lightbox-stage { overflow: auto; height: calc(100dvh - 58px); padding: 0 20px 40px; }
  .lightbox-stage img { display: block; margin: 0 auto; max-width: 100%; height: auto; cursor: zoom-out; }

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
  .timeline { font-size: 13px; padding-left: 22px; }
  .timeline li { margin: 2px 0; overflow-wrap: anywhere; }
  .timeline .kind { display: inline-block; min-width: 58px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  .timeline .write, .timeline .source { color: var(--muted); }
  .timeline b { font-weight: 600; }
  .bad { color: var(--bad); }
  .good { color: var(--good); }
  .muted { color: var(--muted); }
  @media (max-width: 720px) {
    .page-head, .block { padding: 16px; }
    .bar { padding: 10px 16px; }
    .strip { padding: 16px; scroll-padding-inline: 16px; }
    body[data-view="desktop"] .strip, body[data-view="mobile"] .strip { grid-auto-columns: calc(100vw - 32px); }
  }
</style>
</head>
<body data-view="desktop">
<header class="page-head">
  <h1>Billing eval report</h1>
  <p class="lede">Every run gets the same brief in a fresh session and a freshly copied project. Each tab holds one run of every arm, side by side; the switch shows the page at 1280 or 390 pixels wide, and a click opens the screenshot full size, where the arrow keys step through the arms. Each run's behaviour lists, in order, the skills it loaded, its lookups, its checker runs and what they reported, its reads of the package's own source, and the files it wrote. Generation seconds and cost cover the agent's session from prompt to its final answer, page and components included; cost is the list-price value of the tokens, not a charge. Inside the eval, --tests ran the static checks only, because the sandbox cannot start a browser. Checker errors come from the full checkers run afterwards on a fresh copy of each run's files, with --strict --no-fix${tests.length ? ' --tests' : ''}, the same for every arm.</p>
</header>
<section class="block">
  <h2>Brief</h2>
  ${brief || '<p class="none">No prompt file found.</p>'}
</section>
<section class="block">
  <h2>Means per arm</h2>
  <div class="table-scroll"><table>
    <thead><tr><th>Arm</th><th>Finished</th><th>Grader score</th><th>Errors left</th><th>Generation seconds</th><th>Turns</th><th>Skills loaded</th><th>Checker runs</th><th>Lookup runs</th><th>Source reads</th><th>Generation cost</th><th>Shipped components</th><th>New components</th><th>New tokens</th><th>Literal values</th></tr></thead>
    <tbody>${summary.map((s) => `<tr><td>${esc(s.name)}</td><td>${s.finished} of ${s.runs}</td><td>${fmt(s.score, 2)}</td><td>${fmt(s.errors)}</td><td>${fmt(s.seconds, 0)}</td><td>${fmt(s.turns)}</td><td>${fmt(s.skills)}</td><td>${fmt(s.checkerRuns)}</td><td>${fmt(s.lookupRuns)}</td><td>${fmt(s.sourceReads)}</td><td>$${fmt(s.cost, 2)}</td><td>${fmt(s.shippedUsed)}</td><td>${fmt(s.created)}</td><td>${fmt(s.newTokens)}</td><td>${fmt(s.literals)}</td></tr>`).join('')}</tbody>
  </table></div>
</section>
<div class="bar">
  <div class="tabs" role="tablist" aria-label="Runs">
    ${Array.from({ length: maxRuns }, (_, i) => `<button type="button" role="tab" id="tab-${i + 1}" aria-controls="run-${i + 1}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">Run ${i + 1}</button>`).join('')}
  </div>
  <div class="segmented" role="group" aria-label="Screenshot width">
    <button type="button" data-set-view="desktop" aria-pressed="true">Desktop</button>
    <button type="button" data-set-view="mobile" aria-pressed="false">Mobile</button>
  </div>
</div>
${Array.from({ length: maxRuns }, (_, i) => `<section class="strip" role="tabpanel" id="run-${i + 1}" aria-labelledby="tab-${i + 1}"${i === 0 ? '' : ' hidden'}>
  ${ordered.map((arm) => column(arm, arm.runs[i])).join('\n')}
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
  const store = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} },
  };
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = [...document.querySelectorAll('[role="tabpanel"]')];
  function selectTab(index, focus) {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus();
    store.set('eval-report-run', String(index));
  }
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectTab(i));
    tab.addEventListener('keydown', (event) => {
      const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
      if (step) selectTab((i + step + tabs.length) % tabs.length, true);
    });
  });

  const viewButtons = [...document.querySelectorAll('[data-set-view]')];
  function setView(view) {
    document.body.dataset.view = view;
    viewButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setView === view)));
    store.set('eval-report-view', view);
  }
  viewButtons.forEach((b) => b.addEventListener('click', () => setView(b.dataset.setView)));
  const savedRun = Number(store.get('eval-report-run'));
  if (savedRun > 0 && savedRun < tabs.length) selectTab(savedRun);
  if (store.get('eval-report-view') === 'mobile') setView('mobile');

  const box = document.querySelector('.lightbox');
  const img = box.querySelector('img');
  const caption = box.querySelector('.lightbox-caption');
  const stage = box.querySelector('.lightbox-stage');
  let shots = [];
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
  document.querySelectorAll('.shot').forEach((shot) => shot.addEventListener('click', (event) => {
    event.preventDefault();
    const panel = shot.closest('[role="tabpanel"]');
    shots = [...panel.querySelectorAll('.shot[data-view="' + document.body.dataset.view + '"]')];
    show(shots.indexOf(shot));
  }));
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
