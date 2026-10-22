#!/usr/bin/env node
// Reports each billing run on accuracy, time, and loops, and saves what each
// run built into one report that shows one arm at a time or two side by side.
// Accuracy is the grader score plus the errors the full checkers find in what
// the run left behind, so every arm meets one bar whether or not it had the
// checker. Loops are the agent's turns and its checker runs, counted from the
// trace.
//
//   node scripts/eval-check-build.mjs <harbor jobs folder>... [--out <dir>]
//   node scripts/eval-check-build.mjs <result json>... [--tests] [--out <dir>] [--clean] [--reuse]
//
// A Harbor folder is scratch/harbor/jobs/<time>, which holds one job per arm,
// or one arm's job. Harbor's verifier has already scored each trial, so the
// report reads its files and scores nothing on the host.
//
// A result JSON is `claude plugin eval`'s. Its runner has no grader that runs
// a command, so the report scores the workspaces a `--keep-temp` run kept.
// --clean deletes each run's kept sandbox once the report holds its copies.
// --reuse rebuilds the report from the findings, inventory, and screenshots an
// earlier scoring saved in the same --out folder, without running the checks.
//
// The report lands in <dir>/index.html (default eval-reports/<time>),
// with each run's screenshots, sources, findings, and trace beside it.

import { spawn, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';

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
const grantsOf = (tools) => new Set(tools.split(' and ').filter((tool) => tool !== 'neither'));
// isolate.mjs closes each tool under its group of the same name.
const ISOLATE_GROUPS = ['lookup', 'checker'];
const ROUTE = '/billing';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const USAGE = 'usage: node scripts/eval-check-build.mjs <harbor jobs folder>... [--out <dir>]\n'
  + '       node scripts/eval-check-build.mjs <result json>... [--tests] [--out <dir>] [--clean] [--reuse]';
const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const outArg = outAt >= 0 ? args[outAt + 1] : undefined;
const inputs = args.filter((a, i) => !a.startsWith('--') && (outAt < 0 || i !== outAt + 1));
const tests = args.includes('--tests') ? ['--tests'] : [];
const clean = args.includes('--clean');
const reuse = args.includes('--reuse');
if (inputs.length === 0 || (outAt >= 0 && !outArg)) {
  console.error(USAGE);
  process.exit(1);
}
const folders = inputs.filter((path) => statSync(path).isDirectory());
if (folders.length > 0 && folders.length < inputs.length) {
  console.error(`Pass Harbor jobs folders or result JSON files, not both.\n${USAGE}`);
  process.exit(1);
}
const harbor = folders.length > 0;
if (harbor && (tests.length > 0 || clean || reuse)) {
  console.error(`--tests, --clean, and --reuse apply to result JSON files. Harbor's verifier has already scored each trial.\n${USAGE}`);
  process.exit(1);
}
if (!existsSync(join(PROJECT, PKG))) {
  console.error('scratch/eval-project is missing. Run npm run build:eval-project.');
  process.exit(1);
}
const templatePages = new Set(readdirSync(join(PROJECT, 'src/pages')));
const reportDir = outArg ? resolve(outArg) : join(REPO, 'eval-reports', new Date().toISOString().replace(/[:.]/g, '-'));

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

// Each tool call in the trace, in order, with the text it returned. A Claude
// Code session log also holds `api-request-blob` entries that repeat earlier
// tool calls, so only the conversation's own entries count.
function traceSteps(tracePath) {
  if (!existsSync(tracePath)) return null;
  const steps = [];
  const byId = new Map();
  for (const line of readFileSync(tracePath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line);
    if (entry.type !== 'assistant' && entry.type !== 'user') continue;
    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === 'tool_use') {
        const step = { tool: block.name, input: block.input ?? {}, output: '', turn: entry.message.id, time: Date.parse(entry.timestamp) };
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

// A plugin-eval sandbox's workspace, or the Harbor container's /app.
const WORKSPACE_PATH = /\/(?:private\/)?tmp\/e-[A-Za-z0-9]+\/home\/cwd\/?|^\/app\//g;
const SOURCE_READ = /node_modules\/@motion-proto\/live-tokens\//;
const sourcePaths = (text) => [...new Set([...String(text).matchAll(/node_modules\/@motion-proto\/live-tokens\/([\w./-]*\w)/g)].map((m) => m[1]))];
const relative = (path) => String(path).replace(WORKSPACE_PATH, '');

// A call counts by the call itself. isolate.mjs refuses every call of a verb
// the arm lacks, so the arm's grants say which calls were blocked, and a call
// whose output went to a file still counts as a run.
const LOOKUP_CALL = /live-tokens\s+(?:components|tokens)\b/;
const CHECKER_CALL = /(?:live-tokens|cli\.mjs)\s+check-(?:page|component)\b|node\s+\S*bin\/check-(?:page|component)\.mjs/;
const blockedCall = (command, grants) =>
  (!grants.has('lookup') && LOOKUP_CALL.test(command)) || (!grants.has('checker') && CHECKER_CALL.test(command));

// What the agent saw of a checker run: the report's error count when the
// output holds one, else null, and the run shows as unread.
function checkerResult(output) {
  const json = output.match(/"errors":\s*(\d+)/);
  const text = output.match(/(\d+) error\(s\)/);
  const errors = json ? Number(json[1]) : text ? Number(text[1]) : /file\(s\) clean/.test(output) ? 0 : null;
  const rules = new Set([...output.matchAll(/"rule":\s*"([\w-]+)"/g), ...output.matchAll(/\[([a-z][\w-]*)\]$/gm)].map((m) => m[1]));
  return { errors, rules: [...rules] };
}

// `for c in card button; do npx live-tokens components $c; done` is one call
// that looks up two components, so each loop item counts as a lookup.
function loopItems(command, arg) {
  const variable = arg.match(/\$\{?(\w+)\}?/);
  const loop = variable && command.match(new RegExp(`for\\s+${variable[1]}\\s+in\\s+([^;\\n]+?)\\s*[;\\n]\\s*do\\b`));
  if (!loop) return [arg];
  return loop[1].trim().split(/\s+/).map((item) => arg.replace(variable[0], item.replace(/^["']|["']$/g, '')));
}

// Probing the block: reading the CLI's dispatch, or asking it for its usage.
// Reading the checker's rules to check work by hand is what an arm without the
// checker does instead, so it is not counted as lost.
const CLI_PROBE = /bin\/cli\.mjs|live-tokens\s+(?:--help|-h)\b|(?:npx\s+(?:@motion-proto\/)?live-tokens|\.bin\/live-tokens)\s*(?:$|[;|&])/m;
const stepText = (input) => String(input.command ?? input.file_path ?? input.path ?? input.pattern ?? '');

// What a blocked call cost: its turn and the turns of CLI probing that follow
// it, up to the agent's next unrelated step.
function blockedCost(steps, grants) {
  const turns = [];
  for (const step of steps) {
    const text = stepText(step.input);
    const blocked = step.tool === 'Bash' && blockedCall(text, grants);
    const last = turns.at(-1);
    if (last && last.id === step.turn) {
      last.blocked ||= blocked;
      last.waste &&= blocked || CLI_PROBE.test(text);
      last.reads += SOURCE_READ.test(text) ? 1 : 0;
    } else turns.push({ id: step.turn, time: step.time, blocked, waste: blocked || CLI_PROBE.test(text), reads: SOURCE_READ.test(text) ? 1 : 0 });
  }
  const lost = { turns: 0, seconds: 0, sourceReads: 0 };
  for (let i = 0; i < turns.length; i++) {
    if (!turns[i].blocked) continue;
    let j = i;
    while (j + 1 < turns.length && turns[j + 1].waste) j++;
    lost.turns += j - i + 1;
    lost.seconds += ((turns[j + 1]?.time ?? turns[j].time) - turns[i].time) / 1000;
    lost.sourceReads += turns.slice(i, j + 1).reduce((n, t) => n + t.reads, 0);
    i = j;
  }
  return lost;
}

// What the agent reached for and when: skills, lookups, checker runs and what
// they reported, reads of the package's own source, and the files it wrote.
function behaviour(steps, grants) {
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
      const arg = m[1].replace(/\s--json\b/g, '').replace(/\s+\d$/, '').trim();
      const items = loopItems(command, arg);
      const label = items.length > 1 ? arg.replace(/\$\{?\w+\}?/, `{${items.map((i) => i.split(/\s+/).at(-1)).join(', ')}}`) : arg;
      push({ kind: 'lookup', label, lookups: items.length, failed: !grants.has('lookup') });
    }
    for (const m of command.matchAll(/(?:live-tokens|cli\.mjs)\s+(check-(?:page|component)\b[^;|&>]*)|node\s+\S*bin\/(check-(?:page|component))\.mjs\b([^;|&>]*)/g)) {
      const call = m[1] ?? `${m[2]}${m[3]}`;
      const label = call.replace(/\s--(?:json|strict|tests|no-fix)\b/g, '').replace(/\s+\d$/, '').trim();
      push({ kind: 'checker', label, ...(grants.has('checker') ? checkerResult(output) : { failed: true }) });
    }
    if (SOURCE_READ.test(command)) push({ kind: 'source', label: 'read package source', paths: sourcePaths(command) });
  }
  const count = (kind, keep = () => true) => timeline.filter((e) => e.kind === kind && keep(e)).reduce((n, e) => n + (kind === 'source' ? e.count : e.lookups ?? 1), 0);
  return {
    timeline,
    skills: count('skill'),
    lookups: count('lookup', (e) => !e.failed),
    lookupFailures: count('lookup', (e) => e.failed),
    checkerRuns: count('checker', (e) => !e.failed),
    checkerFailures: count('checker', (e) => e.failed),
    sourceReads: count('source'),
    lost: blockedCost(steps, grants),
  };
}

const NO_TRACE = { timeline: [], skills: null, checkerRuns: null, checkerFailures: null, lookups: null, lookupFailures: null, sourceReads: null, lost: null };

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
async function checkRun(browser, run, slug, grants) {
  const saved = join(reportDir, slug);
  const root = dirname(dirname(run.tracePath));
  if (existsSync(root)) unseal(root);
  const tracePath = existsSync(run.tracePath) ? run.tracePath : join(saved, 'trace.jsonl');
  const commands = traceSteps(tracePath);
  const loops = commands ? behaviour(commands, grants) : NO_TRACE;
  const sealed = existsSync(join(root, 'sealed')) ? findWorkspace(join(root, 'sealed'), 3) : null;
  const kept = sealed ?? (existsSync(join(saved, 'workspace')) ? join(saved, 'workspace') : null);
  if (reuse && !sealed && existsSync(join(saved, 'findings.json'))) return savedScore(saved, kept, loops);
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

function savedScore(saved, workspace, loops) {
  const checks = JSON.parse(readFileSync(join(saved, 'findings.json'), 'utf8'));
  const made = JSON.parse(readFileSync(join(saved, 'inventory.json'), 'utf8'));
  const pages = checks.some((c) => c.label.startsWith('check-page'));
  const errors = !pages || checks.some((c) => c.errors === null) ? null : checks.reduce((n, c) => n + c.errors, 0);
  const sources = [
    ...readdirSync(saved).filter((name) => name.endsWith('.svelte')),
    ...(existsSync(join(saved, 'components')) ? readdirSync(join(saved, 'components')).map((name) => `components/${name}`) : []),
  ];
  const shots = VIEWPORTS.map((v) => v.name).filter((name) => existsSync(join(saved, `${name}.png`)));
  const silenced = workspace ? silencedRules(workspace) : [];
  const notes = silenced.length > 0 ? [`live-tokens.config.json turns off: ${silenced.join(', ')}`] : [];
  return { ...loops, errors, checks, shots, sources, notes, made };
}

async function scoreWorkspace(browser, run, slug, workspace, commands, loops) {
  const outDir = join(reportDir, slug);
  mkdirSync(outDir, { recursive: true });
  const notes = [];
  const pages = readdirSync(join(workspace, 'src/pages'))
    .filter((name) => name.endsWith('.svelte') && !templatePages.has(name))
    .map((name) => join('src/pages', name));
  if (pages.length === 0) notes.push('no new page under src/pages');
  const found = inventory(workspace, pages);
  if (found.created.length === 0) notes.push('no component authored');
  // Without an id, --tests reruns every shipped component's contract suite,
  // which no run can change, so each authored component is checked by its id.
  const checks = [
    ...(pages.length > 0 ? [runChecker(workspace, `check-page ${pages.join(' ')}`, ['check-page', ...pages])] : []),
    ...found.created.map((c) => runChecker(workspace, `check-component ${c.id}`, ['check-component', c.id])),
  ];
  const errors = pages.length === 0 || checks.some((c) => c.errors === null) ? null : checks.reduce((n, c) => n + c.errors, 0);
  const silenced = silencedRules(workspace);
  if (silenced.length > 0) notes.push(`live-tokens.config.json turns off: ${silenced.join(', ')}`);
  writeFileSync(join(outDir, 'findings.json'), JSON.stringify(checks, null, 2));
  const made = { ...found, literals: checks.flatMap((c) => c.findings).filter((f) => LITERAL_RULES.has(f.rule)).map((f) => `${f.file}:${f.line} ${f.message.replace(/\. Use .*$/s, '')}`) };
  writeFileSync(join(outDir, 'inventory.json'), JSON.stringify(made, null, 2));
  const sources = saveSources(workspace, outDir, pages);
  if (commands && resolve(run.tracePath) !== resolve(join(outDir, 'trace.jsonl'))) copyFileSync(run.tracePath, join(outDir, 'trace.jsonl'));
  const { shots, note } = pages.length > 0 ? await screenshot(browser, workspace, outDir) : { shots: [] };
  if (note) notes.push(note);
  return { ...loops, errors, checks, shots, sources, notes, made };
}

const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));
const subfolders = (dir) => readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => join(dir, e.name));

// scripts/eval-harbor.sh writes its arms table, in report order, beside the jobs.
function armsTable(folder) {
  const path = join(folder, 'arms.json');
  if (!existsSync(path)) throw new Error(`${folder} holds no arms.json, the arms table scripts/eval-harbor.sh writes beside its jobs.`);
  return readJson(path).map((row) => ({
    id: row.arm,
    name: row.name,
    grants: ISOLATE_GROUPS.filter((group) => !row.groups.includes(group)),
    // The arms the package leaves whole differ only in where the browser tests run.
    loop: row.groups.length === 0,
    gate: row.settings === 'gate',
    skills: row.skills !== 'none',
    tests: row.tests,
    settings: row.settings,
  }));
}

// A jobs folder holds one Harbor job per arm, and each job holds its trials.
function harborTrials(folder) {
  const jobs = existsSync(join(folder, 'lock.json')) ? [folder] : subfolders(folder).filter((dir) => existsSync(join(dir, 'lock.json')));
  if (jobs.length === 0) throw new Error(`${folder} holds no Harbor job.`);
  return jobs
    .flatMap((job) => {
      const table = armsTable(dirname(job));
      return subfolders(job).filter((dir) => existsSync(join(dir, 'result.json'))).map((dir) => ({ dir, table }));
    })
    .map((trial) => ({ ...trial, result: readJson(join(trial.dir, 'result.json')) }))
    .sort((a, b) => String(a.result.started_at).localeCompare(String(b.result.started_at)));
}

// Claude Code's stream: the init line names the session, and the result line
// carries the turn count and why the session ended.
function agentStream(dir) {
  const path = join(dir, 'agent/claude-code.txt');
  if (!existsSync(path)) return {};
  const lines = readFileSync(path, 'utf8').split('\n').filter((line) => line.startsWith('{')).map((line) => JSON.parse(line));
  return { init: lines.find((l) => l.type === 'system' && l.subtype === 'init'), end: lines.findLast((l) => l.type === 'result') };
}

function firstPrompt(steps, tracePath) {
  if (!steps) return null;
  for (const line of readFileSync(tracePath, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const entry = JSON.parse(line);
    if (entry.type !== 'user') continue;
    const c = entry.message?.content;
    return typeof c === 'string' ? c : c.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  }
  return null;
}

function gateStops(dir) {
  const path = join(dir, 'agent/browser-gate.jsonl');
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line));
}

const byRule = (findings) => {
  const counts = new Map();
  for (const f of findings) counts.set(f.rule, (counts.get(f.rule) ?? 0) + 1);
  return [...counts];
};

// Copies the trial's files into the report, so the report outlives the jobs folder.
function harborRun({ dir, result }, arm, slug) {
  const out = join(reportDir, slug);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const { init, end } = agentStream(dir);
  const sessions = join(dir, 'agent/sessions/projects/-app');
  const tracePath = init ? join(sessions, `${init.session_id}.jsonl`) : null;
  const steps = tracePath ? traceSteps(tracePath) : null;
  if (steps) copyFileSync(tracePath, join(out, 'trace.jsonl'));
  const loops = steps ? behaviour(steps, new Set(arm.grants)) : NO_TRACE;

  const verifier = join(dir, 'verifier');
  const verdict = existsSync(join(verifier, 'findings.json')) ? readJson(join(verifier, 'findings.json')) : null;
  const made = existsSync(join(verifier, 'inventory.json')) ? readJson(join(verifier, 'inventory.json')) : null;
  for (const name of ['findings.json', 'inventory.json', ...VIEWPORTS.map((v) => `${v.name}.png`)]) {
    if (existsSync(join(verifier, name))) copyFileSync(join(verifier, name), join(out, name));
  }
  const workspace = join(dir, 'artifacts/app');
  let sources = [];
  if (existsSync(join(workspace, 'src/pages'))) {
    cpSync(workspace, join(out, 'workspace'), { recursive: true });
    const pages = readdirSync(join(workspace, 'src/pages'))
      .filter((name) => name.endsWith('.svelte') && !templatePages.has(name))
      .map((name) => join('src/pages', name));
    sources = saveSources(workspace, out, pages);
  }
  const stops = arm.gate ? gateStops(dir) : null;
  if (stops) copyFileSync(join(dir, 'agent/browser-gate.jsonl'), join(out, 'browser-gate.jsonl'));

  const timing = result.agent_execution;
  const exception = result.exception_info;
  const run = {
    score: result.verifier_result?.rewards?.grader_score ?? null,
    durationSeconds: timing?.finished_at ? (Date.parse(timing.finished_at) - Date.parse(timing.started_at)) / 1000 : null,
    turns: end?.num_turns ?? null,
    costUsd: result.agent_result?.cost_usd ?? null,
    graders: verdict?.graders ?? [],
    error: exception && exception.exception_type !== 'AgentTimeoutError' ? `${exception.exception_type}: ${exception.exception_message.split('\n')[0]}` : null,
  };
  const maxTurns = result.config?.agent?.kwargs?.max_turns;
  const capped =
    end?.subtype === 'error_max_turns' ? `Hit the turn cap of ${maxTurns}.`
    : exception?.exception_type === 'AgentTimeoutError' ? `Hit the time cap: ${exception.exception_message.split('\n')[0]}`
    : null;
  const notes = verdict ? [...verdict.notes] : ['the verifier wrote no findings.json'];
  const checked = {
    ...loops,
    errors: verdict?.errors ?? null,
    checks: (verdict?.checks ?? []).map((c) => ({ label: c.label, errors: c.errors, note: c.note, byRule: byRule(c.findings), findings: c.findings })),
    shots: VIEWPORTS.map((v) => v.name).filter((name) => existsSync(join(out, `${name}.png`))),
    sources,
    notes,
    made,
    stops,
    trial: result.trial_name,
  };
  const failed = run.graders.filter((g) => !g.passed).map((g) => g.name);
  return { run, checked, failed, capped, prompt: firstPrompt(steps, tracePath) };
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
const fmt = (n, digits = 1) => (n === null || n === undefined ? 'n/a' : n.toFixed(digits));

function readPrompt(name) {
  const path = join(REPO, '.claude/evals', name, 'prompt.md');
  return existsSync(path) ? readFileSync(path, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '').trim() : null;
}

const arms = new Map();
const prompts = new Map();
const harborOrder = [];
if (harbor) {
  for (const folder of folders) {
    for (const trial of harborTrials(folder)) {
      for (const { id } of trial.table) if (!harborOrder.includes(id)) harborOrder.push(id);
      const arm = trial.table.find((a) => a.id === trial.result.task_name);
      if (!arm) throw new Error(`${trial.dir}: arms.json has no arm named ${trial.result.task_name}.`);
      const entry = arms.get(arm.id) ?? { key: arm.id, ...arm, runs: [] };
      const index = entry.runs.length + 1;
      const slug = `${arm.id}-run-${index}`;
      console.error(`reading ${entry.name}, run ${index}`);
      const { prompt, ...read } = harborRun(trial, arm, slug);
      if (prompt) prompts.set(arm.id, prompt);
      entry.runs.push({ index, slug, ...read });
      arms.set(arm.id, entry);
    }
  }
} else {
  const { chromium } = await import('playwright');
  const browser = reuse ? null : await chromium.launch();
  try {
    for (const path of inputs) {
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
            const checked = await checkRun(browser, run, slug, grantsOf(TOOLS[c.name]));
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
    await browser?.close();
  }
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

const rank = (arm) => {
  const order = harbor ? harborOrder : ARM_ORDER;
  return order.indexOf(arm.key) === -1 ? order.length : order.indexOf(arm.key);
};
const ordered = [...arms.values()].sort((a, b) => rank(a) - rank(b));
const isFinished = (r) => !r.capped && !r.run.error;
const newTokenCount = (made) => made.addedTokens.length + made.changedTokens.length + made.customProperties.filter((p) => !p.component).length;
// Cost is per session, not per turn, so a blocked call's cost is estimated as
// its share of the run's turns.
const lostShare = (r) => (r.run.turns ? r.checked.lost.turns / r.run.turns : 0);
const gateBlocks = (r) => (r.checked.stops ? r.checked.stops.filter((s) => s.blocked).length : null);
const summary = ordered.map((arm) => {
  const avg = (pick) => mean(arm.runs.map(pick));
  return {
    name: arm.name,
    runs: arm.runs.length,
    finished: arm.runs.filter(isFinished).length,
    score: avg((r) => r.run.score),
    errors: avg((r) => r.checked.errors),
    seconds: avg((r) => r.run.durationSeconds),
    turns: avg((r) => r.run.turns),
    skills: avg((r) => r.checked.skills),
    checkerRuns: avg((r) => r.checked.checkerRuns),
    checkerFailures: avg((r) => r.checked.checkerFailures),
    lookups: avg((r) => r.checked.lookups),
    lookupFailures: avg((r) => r.checked.lookupFailures),
    sourceReads: avg((r) => r.checked.sourceReads),
    cost: avg((r) => r.run.costUsd),
    lostTurns: avg((r) => r.checked.lost?.turns),
    lostSeconds: avg((r) => r.checked.lost?.seconds),
    lostSourceReads: avg((r) => r.checked.lost?.sourceReads),
    lostCost: avg((r) => r.checked.lost && r.run.costUsd * lostShare(r)),
    keptSeconds: avg((r) => r.checked.lost && r.run.durationSeconds - r.checked.lost.seconds),
    keptTurns: avg((r) => r.checked.lost && r.run.turns - r.checked.lost.turns),
    keptSourceReads: avg((r) => r.checked.lost && r.checked.sourceReads - r.checked.lost.sourceReads),
    keptCost: avg((r) => r.checked.lost && r.run.costUsd * (1 - lostShare(r))),
    shippedUsed: avg((r) => r.checked.made?.used.filter((c) => c.origin === 'shipped').length),
    created: avg((r) => r.checked.made?.created.length),
    newTokens: avg((r) => r.checked.made && newTokenCount(r.checked.made)),
    literals: avg((r) => r.checked.made?.literals.length),
  };
});

const runNotes = (r) => [r.capped, r.run.error && `Did not finish: ${r.run.error}`, ...r.checked.notes].filter(Boolean);
const perRun = ordered.flatMap((arm) => arm.runs.map((r) => ({ arm, r })));
const hasGate = ordered.some((arm) => arm.gate);

function midranks(values) {
  const order = values.map((value, i) => [value, i]).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(values.length);
  for (let i = 0; i < order.length; ) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j++;
    for (let k = i; k <= j; k++) ranks[order[k][1]] = (i + j) / 2 + 1;
    i = j + 1;
  }
  return ranks;
}

// The exact two-sided Mann-Whitney test, over every split of the pooled runs,
// so ties and five runs a side need no normal approximation.
function rankTest(a, b) {
  const n = a.length;
  const total = n + b.length;
  const ranks = midranks([...a, ...b]);
  const uOf = (picked) => picked.reduce((sum, i) => sum + ranks[i], 0) - (n * (n + 1)) / 2;
  const u = uOf([...Array(n).keys()]);
  const centre = (n * b.length) / 2;
  let splits = 0;
  let extreme = 0;
  const pick = (start, chosen) => {
    if (chosen.length === n) {
      splits++;
      if (Math.abs(uOf(chosen) - centre) >= Math.abs(u - centre) - 1e-9) extreme++;
      return;
    }
    for (let i = start; i <= total - (n - chosen.length); i++) pick(i + 1, [...chosen, i]);
  };
  pick(0, []);
  return { u, p: extreme / splits };
}

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length === 0 ? null : sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const grantsFor = (arm) => (arm.grants ? new Set(arm.grants) : grantsOf(arm.key.split('|')[1] ?? 'neither'));
const RANKED = [
  { label: 'Errors left', pick: (r) => r.checked.errors, digits: 1 },
  { label: 'Generation seconds', pick: (r) => r.run.durationSeconds, digits: 0 },
  { label: 'Generation cost', pick: (r) => r.run.costUsd, digits: 2, unit: '$' },
  { label: 'Checker runs', pick: (r) => r.checked.checkerRuns, digits: 1, both: 'checker' },
  { label: 'Source reads', pick: (r) => r.checked.sourceReads, digits: 1 },
];
const loopArms = ordered.filter((arm) => arm.loop);
const factorsOf = (arm) => {
  const grants = grantsFor(arm);
  return {
    skills: arm.skills ?? !arm.key.startsWith('no skills'),
    lookup: grants.has('lookup'),
    checker: grants.has('checker'),
    tests: arm.tests ?? 'browser',
    settings: arm.settings ?? 'base',
  };
};
const differences = (a, b) => {
  const fa = factorsOf(a);
  const fb = factorsOf(b);
  return Object.keys(fa).filter((factor) => fa[factor] !== fb[factor]);
};
// The loop arms differ only in when the browser tests run; every other pair is
// tested only when one tool or setting separates the two arms.
const rankPairs = ordered.flatMap((first, i) => ordered.slice(i + 1)
  .filter((second) => (first.loop && second.loop) || differences(first, second).length === 1)
  .map((second) => [first, second]));
const FACTOR_HEAD = { skills: 'Skills', lookup: 'Lookup', checker: 'Checker' };
const pairHead = (a, b) => {
  const diff = differences(a, b);
  return diff.length === 1 && FACTOR_HEAD[diff[0]] ? FACTOR_HEAD[diff[0]] : 'Browser tests';
};
const rankRows = rankPairs.flatMap(([first, second]) => RANKED
  .filter((measure) => !measure.both || (grantsFor(first).has(measure.both) && grantsFor(second).has(measure.both)))
  .map((measure) => {
  const values = (arm) => arm.runs.filter(isFinished).map(measure.pick).filter((v) => v !== null && v !== undefined);
  const a = values(first);
  const b = values(second);
  const test = a.length > 0 && b.length > 0 ? rankTest(a, b) : null;
  const shown = (v) => (v === null ? 'n/a' : `${measure.unit ?? ''}${v.toFixed(measure.digits)}`);
  return { first, second, measure: measure.label, runs: `${a.length} and ${b.length}`, medians: `${shown(median(a))} and ${shown(median(b))}`, test, ma: median(a), mb: median(b), shown, head: pairHead(first, second) };
}));

const gateRows = perRun.filter(({ arm }) => arm.gate).map(({ arm, r }) => {
  const stops = r.checked.stops;
  const blocks = (stops ?? []).filter((s) => s.blocked).map((s) => [...new Set(s.checks.flatMap((c) => c.rules))]);
  return { arm, r, stops: stops?.length ?? null, blocks, capped: (stops ?? []).some((s) => s.capped) };
});

const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
const slugOf = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const rankId = (row) => `rank-${slugOf(row.first.key)}-${slugOf(row.second.key)}-${slugOf(row.measure)}`;
const finishedOf = (arm) => arm.runs.filter(isFinished);
const finishedMean = (arm, pick) => mean(finishedOf(arm).map(pick));
const rulesOf = (r) => new Set(r.checked.checks.flatMap((c) => c.byRule.map(([rule]) => rule)));
const listed = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);
const span = (values, digits) => {
  const known = values.filter((v) => v !== null && v !== undefined);
  const lo = Math.min(...known);
  const hi = Math.max(...known);
  return lo === hi ? fmt(lo, digits) : `${fmt(lo, digits)} to ${fmt(hi, digits)}`;
};
const choose = (n, k) => (k === 0 ? 1 : (choose(n - 1, k - 1) * n) / k);

const link = {
  run: (arm, r, label = `run ${r.index}`) => `<a href="#arm=${encodeURIComponent(arm.key)}&amp;run=${r.index}">${esc(label)}</a>`,
  arm: (arm) => `<a href="#arm=${encodeURIComponent(arm.key)}&amp;run=1">${esc(arm.name)}</a>`,
  compare: (a, b) => `<a href="#arm=${encodeURIComponent(a.key)}&amp;vs=${encodeURIComponent(b.key)}&amp;run=1">compare ${esc(a.name)} with ${esc(b.name)}</a>`,
  table: (id, label) => `<a href="#${id}">${esc(label)}</a>`,
};
const runsOf = (arm, rs) => `${esc(arm.name)} ${listed(rs.map((r) => link.run(arm, r, String(r.index))))}`;
const worstRun = (arm) => [...finishedOf(arm)].sort((a, b) => (b.checked.errors ?? 0) - (a.checked.errors ?? 0))[0];

// Each insight is a rule over the runs, so a new report states only what its own data shows.
const insights = [];
const say = (head, text, see) => insights.push({ head, text, see });

const checkerArms = ordered.filter((arm) => grantsFor(arm).has('checker'));
const plainArms = ordered.filter((arm) => !grantsFor(arm).has('checker'));
const errorsOf = (arm) => finishedMean(arm, (r) => r.checked.errors);
if (checkerArms.length && plainArms.length) {
  say(
    'Checker',
    `Arms with the checker left ${span(checkerArms.map(errorsOf))} errors a run on average. Arms without it left ${span(plainArms.map(errorsOf))}.`,
    [link.table('means', 'Means per arm'), ...plainArms.filter(worstRun).map((arm) => link.run(arm, worstRun(arm), `${arm.name}, run ${worstRun(arm).index}`))],
  );
  const plainRuns = plainArms.flatMap((arm) => finishedOf(arm).map((r) => ({ arm, r })));
  const counts = new Map();
  for (const { r } of plainRuns) for (const rule of rulesOf(r)) counts.set(rule, (counts.get(rule) ?? 0) + 1);
  const common = [...counts].filter(([, n]) => n >= plainRuns.length / 2).sort((a, b) => b[1] - a[1]).slice(0, 4);
  if (common.length) {
    say(
      'Errors without the checker',
      `The same rules recur across ${plainRuns.length} runs: ${listed(common.map(([rule, n]) => `<code>${esc(rule)}</code> in ${n}`))}.`,
      plainArms.filter(worstRun).map((arm) => link.run(arm, worstRun(arm), `${arm.name}, run ${worstRun(arm).index}`)),
    );
  }
}

for (const arm of checkerArms) {
  const left = finishedOf(arm).filter((r) => r.checked.errors > 0);
  if (!left.length) continue;
  const always = [...rulesOf(left[0])].filter((rule) => left.every((r) => rulesOf(r).has(rule)));
  say(
    `Errors left by ${arm.name}`,
    `${left.length} of ${finishedOf(arm).length} runs left errors${always.length ? `, and every one of them left ${listed(always.map((rule) => `<code>${esc(rule)}</code>`))}` : ''}.`,
    [runsOf(arm, left)],
  );
}

const VERB = {
  'Errors left': 'left fewer errors',
  'Generation seconds': 'finished faster',
  'Generation cost': 'cost less',
  'Checker runs': 'ran the checker less often',
  'Source reads': "read the package's source less often",
};
const rankInsights = (head) => {
  const tested = rankRows.filter((row) => row.head === head && row.test && row.ma !== null && row.mb !== null);
  const order = (row) => (row.ma <= row.mb ? [row.first, row.second, row.ma, row.mb] : [row.second, row.first, row.mb, row.ma]);
  for (const row of tested.filter((row) => row.test.p < 0.1 && row.ma !== row.mb)) {
    const [low, high, a, b] = order(row);
    const margin = row.test.p < 0.05 ? '' : ', short of the 0.05 mark';
    say(
      head,
      `${esc(low.name)} ${VERB[row.measure]} than ${esc(high.name)}: median ${row.shown(a)} against ${row.shown(b)}, p = ${row.test.p.toFixed(3)}${margin}.`,
      [link.table(rankId(row), 'the rank test'), link.compare(low, high)],
    );
  }
  const even = tested.filter((row) => row.test.p >= 0.1);
  if (even.length) {
    say(
      head,
      `${even.length === tested.length ? 'The' : 'The other'} ${even.length} rank tests of these arms found no measurable difference, with p from ${span(even.map((row) => row.test.p), 3)}.`,
      [link.table('rank-tests', 'Rank tests')],
    );
  }
};
rankInsights('Checker');

for (const head of ['Skills', 'Lookup', 'Browser tests']) rankInsights(head);

const gateArmsOf = (rows) => ordered.map((arm) => [arm, rows.filter((g) => g.arm === arm).map((g) => g.r)]).filter(([, rs]) => rs.length);
if (gateRows.length) {
  const blocked = gateRows.filter((g) => g.blocks.length);
  const rules = [...new Set(blocked.flatMap((g) => g.blocks.flat()))];
  const left = gateRows.map((g) => g.r.checked.errors);
  say(
    'Browser gate',
    `The gate blocked ${blocked.length} of ${gateRows.length} runs at least once, ${blocked.reduce((n, g) => n + g.blocks.length, 0)} blocks in all${rules.length ? `, on ${listed(rules.map((rule) => `<code>${esc(rule)}</code>`))}` : ''}. ${left.every((n) => n === 0) ? 'Every gate run then finished with no errors left.' : `Its runs finished with ${span(left, 0)} errors left.`}`,
    [link.table('gate', 'Browser gate'), ...gateArmsOf(blocked).map(([arm, rs]) => `${runsOf(arm, rs)}`)],
  );
}

const graderFails = new Map();
for (const { arm, r } of perRun) for (const grader of r.failed) graderFails.set(grader, [...(graderFails.get(grader) ?? []), { arm, r }]);
if (graderFails.size) {
  const where = (hits) => listed(ordered.filter((arm) => hits.some((h) => h.arm === arm)).map((arm) => runsOf(arm, hits.filter((h) => h.arm === arm).map((h) => h.r))));
  say(
    'Graders',
    `${listed([...graderFails].map(([grader, hits]) => `<code>${esc(grader)}</code> failed in ${where(hits)}`))}. Every other run passed every grader.`,
    [link.table('per-run', 'Per run')],
  );
} else if (perRun.length) {
  say('Graders', 'Every run passed every grader.', [link.table('per-run', 'Per run')]);
}

const priced = ordered.map((arm) => ({ arm, cost: finishedMean(arm, (r) => r.run.costUsd), reads: finishedMean(arm, (r) => r.checked.sourceReads) })).filter((p) => p.cost !== null);
if (priced.length > 1) {
  const byCost = [...priced].sort((a, b) => a.cost - b.cost);
  const dear = byCost.at(-1);
  const cheap = byCost[0];
  const otherReads = priced.filter((p) => p !== dear).map((p) => p.reads ?? 0);
  const reads = dear.reads !== null && dear.reads > 1.5 * Math.max(...otherReads)
    ? ` It also read the package's own source ${fmt(dear.reads)} times a run, against at most ${fmt(Math.max(...otherReads))} for any other arm.`
    : '';
  say(
    'Cost',
    `${esc(dear.arm.name)} cost the most, $${fmt(dear.cost, 2)} a run, and ${esc(cheap.arm.name)} the least, $${fmt(cheap.cost, 2)}.${reads}`,
    [link.table('means', 'Means per arm'), link.arm(dear.arm)],
  );
}

const lostShares = summary.map((s) => (s.turns && s.lostTurns !== null ? s.lostTurns / s.turns : null)).filter((v) => v !== null);
if (lostShares.length && Math.max(...lostShares) > 0) {
  say(
    'Blocked calls',
    `An arm lost ${Math.max(...lostShares) < 0.01 ? 'under 1%' : `at most ${Math.round(Math.max(...lostShares) * 100)}%`} of its turns to calls its tools could not make${Math.max(...summary.map((s) => s.lostCost ?? 0)) >= 0.005 ? `, and at most $${fmt(Math.max(...summary.map((s) => s.lostCost ?? 0)), 2)} a run` : ''}.`,
    [link.table('blocked', 'Blocked calls'), link.table('kept', 'Means without blocked calls')],
  );
}

const unfinished = perRun.filter(({ r }) => !isFinished(r));
const runCounts = ordered.map((arm) => arm.runs.length);
say(
  'Sample size',
  [
    unfinished.length
      ? `${unfinished.length} runs did not finish, and the insights above leave them out.`
      : 'Every run finished, so every number above measures a completed task.',
    `Arms ran ${span(runCounts, 0)} times on one brief.`,
    (() => {
      const sizes = [...new Set(rankPairs.map(([a, b]) => [finishedOf(a).length, finishedOf(b).length].sort((x, y) => y - x).join(' against ')))]
        .map((pair) => pair.split(' against ').map(Number))
        .filter(([n, m]) => n > 0 && m > 0)
        .sort((x, y) => x[0] * x[1] - y[0] * y[1]);
      if (!sizes.length) return '';
      const floor = ([n, m]) => {
        const p = 2 / choose(n + m, m);
        return p < 0.001 ? `below 0.001 for ${n} runs against ${m}` : `${p.toFixed(3)} for ${n} runs against ${m}`;
      };
      return `The lowest p an exact rank test can reach is ${listed(sizes.map(floor))}.`;
    })(),
  ].filter(Boolean).join(' '),
  [link.table('per-run', 'Per run')],
);

const grouped = [];
for (const insight of insights) {
  const group = grouped.find((g) => g.head === insight.head);
  if (group) group.parts.push(insight);
  else grouped.push({ head: insight.head, parts: [insight] });
}
const insightsBlock = `<section class="block insights" id="insights">
  <h2>Insights</h2>
  <ul>${grouped.map((i) => {
    const part = (p) => `${p.text}${p.see.length ? ` <span class="see">See ${listed(p.see)}.</span>` : ''}`;
    const id = `insight-${slugOf(i.head)}`;
    return i.parts.length === 1
      ? `<li id="${id}"><b>${esc(i.head)}.</b> ${part(i.parts[0])}</li>`
      : `<li id="${id}"><b>${esc(i.head)}.</b><ul class="parts">${i.parts.map((p) => `<li>${part(p)}</li>`).join('')}</ul></li>`;
  }).join('')}</ul>
</section>`;

// Conclusions are judgment, so they come from a hand-written file kept beside
// the report, which a rebuild leaves in place.
const conclusionsPath = join(reportDir, 'conclusions.md');
const conclusionsBlock = existsSync(conclusionsPath)
  ? `<section class="block conclusions" id="conclusions">
  <h2>Conclusions</h2>
  ${(await import('marked')).marked.parse(readFileSync(conclusionsPath, 'utf8'))}
</section>`
  : '';

const lines = [
  harbor
    ? 'Scored by the Harbor verifier in a fresh container: graders, then the full checkers with --tests --strict --no-fix.'
    : `Checkers restored from scratch/eval-project, run with --strict --no-fix${tests.length ? ' --tests' : ''}.`,
  '',
  '| Arm | Finished | Grader score | Checker errors left | Generation seconds | Turns | Skills loaded | Checker runs | Failed checker calls | Lookups | Failed lookups | Source reads | Generation cost | Shipped components | New components | New tokens | Literal values |',
  '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
  ...summary.map((s) => `| ${s.name} | ${s.finished} of ${s.runs} | ${fmt(s.score, 2)} | ${fmt(s.errors)} | ${fmt(s.seconds, 0)} | ${fmt(s.turns)} | ${fmt(s.skills)} | ${fmt(s.checkerRuns)} | ${fmt(s.checkerFailures)} | ${fmt(s.lookups)} | ${fmt(s.lookupFailures)} | ${fmt(s.sourceReads)} | $${fmt(s.cost, 2)} | ${fmt(s.shippedUsed)} | ${fmt(s.created)} | ${fmt(s.newTokens)} | ${fmt(s.literals)} |`),
  '',
  'Blocked calls:',
  '',
  '| Arm | Failed checker calls | Failed lookups | Turns lost | Seconds lost | Source reads lost | Cost lost |',
  '|---|---|---|---|---|---|---|',
  ...summary.map((s) => `| ${s.name} | ${fmt(s.checkerFailures)} | ${fmt(s.lookupFailures)} | ${fmt(s.lostTurns)} of ${fmt(s.turns)} | ${fmt(s.lostSeconds, 0)} of ${fmt(s.seconds, 0)} | ${fmt(s.lostSourceReads)} | $${fmt(s.lostCost, 2)} of $${fmt(s.cost, 2)} |`),
  '',
  'Means without blocked calls:',
  '',
  '| Arm | Grader score | Checker errors left | Generation seconds | Turns | Checker runs | Lookups | Source reads | Generation cost | New tokens |',
  '|---|---|---|---|---|---|---|---|---|---|',
  ...summary.map((s) => `| ${s.name} | ${fmt(s.score, 2)} | ${fmt(s.errors)} | ${fmt(s.keptSeconds, 0)} | ${fmt(s.keptTurns)} | ${fmt(s.checkerRuns)} | ${fmt(s.lookups)} | ${fmt(s.keptSourceReads)} | $${fmt(s.keptCost, 2)} | ${fmt(s.newTokens)} |`),
  '',
  'Per run:',
  '',
  `| Arm | Run | Finished | Grader score | Checker errors left | Generation seconds | Turns | Generation cost | Checker runs${hasGate ? ' | Gate blocks' : ''} |`,
  `|---|---|---|---|---|---|---|---|---${hasGate ? '|---' : ''}|`,
  ...perRun.map(({ arm, r }) => `| ${arm.name} | ${r.index} | ${isFinished(r) ? 'yes' : 'no'} | ${fmt(r.run.score, 2)} | ${r.checked.errors ?? 'n/a'} | ${fmt(r.run.durationSeconds, 0)} | ${r.run.turns ?? 'n/a'} | $${fmt(r.run.costUsd, 2)} | ${r.checked.checkerRuns ?? 'n/a'}${hasGate ? ` | ${gateBlocks(r) ?? ''}` : ''} |`),
  ...(rankRows.length
    ? [
        '',
        'Rank tests (exact two-sided Mann-Whitney, finished runs):',
        '',
        '| First arm | Second arm | Measure | Runs | Medians | U | p |',
        '|---|---|---|---|---|---|---|',
        ...rankRows.map((row) => `| ${row.first.name} | ${row.second.name} | ${row.measure} | ${row.runs} | ${row.medians} | ${row.test ? fmt(row.test.u) : 'n/a'} | ${row.test ? row.test.p.toFixed(3) : 'n/a'} |`),
      ]
    : []),
  '',
  `Report: ${join(reportDir, 'index.html')}`,
];
console.log(lines.join('\n'));

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
    e.kind === 'lookup' && e.failed ? ' <span class="bad">blocked</span>'
    : e.kind !== 'checker' ? ''
    : e.failed ? ' <span class="bad">blocked</span>'
    : e.errors === null ? ' <span class="muted">result not read</span>'
    : e.errors === 0 ? ' <span class="good">clean</span>'
    : ` <span class="bad">${e.errors} error${e.errors === 1 ? '' : 's'}</span>${e.rules.length ? ` <span class="muted">${e.rules.map(esc).join(', ')}</span>` : ''}`;
  const paths = e.paths?.length ? ` <span class="muted">${e.paths.map(esc).join(', ')}</span>` : '';
  return `<li class="${e.kind}"><span class="kind">${STEP_KIND[e.kind]}</span> <code>${esc(e.label)}</code>${times}${result}${paths}</li>`;
}

const errorCount = (n) => (n === null ? 'printed no report' : `${n} error${n === 1 ? '' : 's'}`);
function stop(s) {
  if (s.capped) return `<li><span class="muted">Let the run end after ${s.blocks} blocks.</span></li>`;
  if (!s.blocked) return `<li><span class="good">passed</span> <span class="muted">${s.checks.map(esc).join(', ')}</span></li>`;
  return `<li><span class="bad">blocked</span> ${s.checks.map((c) => `<code>${esc(c.label)}</code> ${errorCount(c.errors)}${c.rules.length ? ` <span class="muted">${c.rules.map(esc).join(', ')}</span>` : ''}`).join('; ')}</li>`;
}

function column(arm, r, armIndex, runIndex) {
  const at = `data-arm="${armIndex}" data-run="${runIndex}"`;
  if (!r) return `<article class="col empty" ${at}><h3>${esc(arm.name)}</h3><p class="note">This arm has no run ${runIndex + 1}.</p></article>`;
  const { run, checked, failed, slug } = r;
  const metric = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;
  const shot = (name) =>
    checked.shots.includes(name)
      ? `<a class="shot" data-view="${name}" href="${slug}/${name}.png" data-width="${VIEWPORTS.find((v) => v.name === name).width}" data-caption="${esc(arm.name)}, run ${r.index}, ${name}"><img src="${slug}/${name}.png" alt="${esc(arm.name)}, run ${r.index}, ${name}" loading="lazy"></a>`
      : `<p class="none shot-missing" data-view="${name}">No ${name} screenshot.</p>`;
  const rules = checked.checks
    .map((c) => `<li><span class="check">${esc(c.label)}</span> ${c.note ? esc(c.note) : `${c.errors} errors`}${c.byRule.length ? `<ul class="rules">${c.byRule.map(([rule, n]) => `<li><code>${esc(rule)}</code> ${n}</li>`).join('')}</ul>` : ''}</li>`)
    .join('');
  const status = isFinished(r) ? '<span class="pill good">Finished</span>' : '<span class="pill bad">Did not finish</span>';
  const files = [
    ...checked.sources.map((s) => [s, s]),
    ...(existsSync(join(reportDir, slug, 'findings.json')) ? [['findings.json', 'findings.json']] : []),
    ...(existsSync(join(reportDir, slug, 'inventory.json')) ? [['inventory.json', 'inventory.json']] : []),
    ...(existsSync(join(reportDir, slug, 'workspace')) ? [['workspace/', 'workspace']] : []),
    ...(checked.checkerRuns !== null ? [['trace.jsonl', 'trace.jsonl']] : []),
    ...(checked.stops ? [['browser-gate.jsonl', 'browser-gate.jsonl']] : []),
  ];
  return `<article class="col" ${at}>
  <header class="col-head"><h3>${esc(arm.name)}, run ${r.index}</h3>${status}</header>
  ${checked.trial ? `<p class="trial">${esc(checked.trial)}</p>` : ''}
  <dl class="metrics">
    ${metric('Grader score', fmt(run.score, 2))}
    ${metric('Errors left', checked.errors ?? 'n/a')}
    ${metric('Generation seconds', fmt(run.durationSeconds, 0))}
    ${metric('Turns', run.turns ?? 'n/a')}
    ${metric('Skills loaded', checked.skills ?? 'n/a')}
    ${metric('Checker runs', checked.checkerRuns ?? 'n/a')}
    ${metric('Failed checker calls', checked.checkerFailures ?? 'n/a')}
    ${metric('Lookups', checked.lookups ?? 'n/a')}
    ${metric('Failed lookups', checked.lookupFailures ?? 'n/a')}
    ${metric('Source reads', checked.sourceReads ?? 'n/a')}
    ${metric('Generation cost', `$${fmt(run.costUsd, 2)}`)}
    ${arm.gate ? metric('Gate blocks', gateBlocks(r) ?? 'n/a') : ''}
  </dl>
  ${r.capped ? `<p class="note">${esc(r.capped)} The agent never said it was done, so read this run's numbers as a floor.</p>` : ''}
  ${run.error ? `<p class="note">Did not finish: ${esc(run.error)}</p>` : ''}
  ${checked.notes.map((n) => `<p class="note">${esc(n)}</p>`).join('')}
  <div class="frame">${shot('desktop')}${shot('mobile')}</div>
  ${arm.gate ? `<h4>Browser gate</h4>${checked.stops ? `<ol class="stops">${checked.stops.map(stop).join('')}</ol>` : '<p class="none">The gate left no log.</p>'}` : ''}
  ${checked.timeline.length ? `<h4>Behaviour</h4><ol class="timeline">${checked.timeline.map(step).join('')}</ol>` : ''}
  ${checked.made ? made(checked.made) : ''}
  ${failed.length ? `<h4>Failed graders</h4><ul class="graders">${failed.map((g) => `<li><code>${esc(g)}</code></li>`).join('')}</ul>` : (run.graders ?? []).length ? '<h4>Every grader passed</h4>' : ''}
  ${rules ? `<h4>Checker findings</h4><ul class="checks">${rules}</ul>` : ''}
  ${files.length ? `<h4>Files</h4><ul class="sources">${files.map(([href, label]) => `<li><a href="${slug}/${esc(href)}" target="_blank">${esc(label)}</a></li>`).join('')}</ul>` : ''}
</article>`;
}

const prose = (text) =>
  text.split(/\n\s*\n/).map((para) => `<p>${esc(para.trim()).replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`).join('');
const nameOfPrompt = (key) => (harbor ? arms.get(key)?.name ?? key : key);
const distinctPrompts = [...new Set([...prompts.values()].filter(Boolean))];
const brief = distinctPrompts.length === 1
  ? `<div class="brief">${prose(distinctPrompts[0])}</div>`
  : [...prompts].filter(([, text]) => text).map(([key, text]) => `<h3><code>${esc(nameOfPrompt(key))}</code></h3><div class="brief">${prose(text)}</div>`).join('');

const lede = [
  'Every run gets the same brief in a fresh session.',
  harbor
    ? 'Each agent works in its own container, built from its arm\'s image. The verifier then scores every arm the same way: in a fresh container from one image, it puts the run\'s files over the base project and runs the graders and the full checkers with --tests --strict --no-fix.'
    : `Inside the eval, --tests ran the static checks only, because the sandbox cannot start a browser. Checker errors come from the full checkers run afterwards on a fresh copy of each run's files, with --strict --no-fix${tests.length ? ' --tests' : ''}, the same for every arm.`,
  'Generation seconds and cost cover the agent\'s session from prompt to its final answer, page and components included. Cost is the list-price value of the tokens.',
  'Below the tables, the run picker and the arm tabs choose one arm\'s panel, and the arrow keys step through the arms. Compare sets two arms of the same run side by side, each half with its own arm picker; the arrow keys then step the half you last used. The switch shows the page at 1280 or 390 pixels wide, and a click opens it full size, where the arrow keys step through every arm\'s page for that run.',
  'Each run\'s behaviour lists, in order, the skills it loaded, its lookups, its checker runs and what they reported, its reads of the package\'s own source, and the files it wrote.',
].join(' ');

const td = (value) => `<td>${value}</td>`;
const perRunTable = `<section class="block" id="per-run">
  <h2>Per run</h2>
  <div class="table-scroll"><table>
    <thead><tr><th>Arm</th><th>Run</th>${harbor ? '<th>Trial</th>' : ''}<th>Finished</th><th>Grader score</th><th>Errors left</th><th>Generation seconds</th><th>Turns</th><th>Generation cost</th><th>Checker runs</th>${hasGate ? '<th>Gate blocks</th>' : ''}<th>Notes</th></tr></thead>
    <tbody>${perRun.map(({ arm, r }) => `<tr id="row-${r.slug}">${td(esc(arm.name))}${td(link.run(arm, r, String(r.index)))}${harbor ? td(esc(r.checked.trial)) : ''}${td(isFinished(r) ? 'yes' : '<span class="bad">no</span>')}${td(fmt(r.run.score, 2))}${td(r.checked.errors ?? 'n/a')}${td(fmt(r.run.durationSeconds, 0))}${td(r.run.turns ?? 'n/a')}${td(`$${fmt(r.run.costUsd, 2)}`)}${td(r.checked.checkerRuns ?? 'n/a')}${hasGate ? td(gateBlocks(r) ?? '') : ''}<td class="notes">${runNotes(r).map(esc).join('<br>')}</td></tr>`).join('')}</tbody>
  </table></div>
  <p class="table-note">One row per run. Errors left are the full checkers' count on what the run left behind.</p>
</section>`;

const rankTable = rankRows.length ? `<section class="block" id="rank-tests">
  <h2>Rank tests</h2>
  <div class="table-scroll"><table>
    <thead><tr><th>First arm</th><th>Second arm</th><th>Measure</th><th>Runs</th><th>Medians</th><th>U</th><th>p</th></tr></thead>
    <tbody>${rankRows.map((row) => `<tr id="${rankId(row)}">${td(esc(row.first.name))}<td class="lead">${esc(row.second.name)}</td>${td(row.measure)}${td(row.runs)}${td(row.medians)}${td(row.test ? fmt(row.test.u) : 'n/a')}${td(row.test ? row.test.p.toFixed(3) : 'n/a')}</tr>`).join('')}</tbody>
  </table></div>
  <p class="table-note">The table pairs every two arms that one tool or setting separates${loopArms.length > 1 ? ', and the arms with every tool, which differ only in when the browser tests run' : ''}. Checker runs are compared only between arms that both have the checker. Each row is an exact two-sided Mann-Whitney test on the two arms' finished runs. U counts the pairs of runs in which the first arm's value is higher, a tie as half; p is the share of all splits of the pooled runs at least as far from an even split.</p>
</section>` : '';

const gateTable = gateRows.length ? `<section class="block" id="gate">
  <h2>Browser gate</h2>
  <div class="table-scroll"><table>
    <thead><tr><th>Arm</th><th>Run</th><th>Stops</th><th>Blocks</th><th>Rules behind each block</th></tr></thead>
    <tbody>${gateRows.map(({ arm, r, stops, blocks, capped }) => `<tr>${td(esc(arm.name))}${td(link.run(arm, r, String(r.index)))}${td(stops ?? 'n/a')}${td(`${blocks.length}${capped ? ', then let the run end' : ''}`)}<td class="notes">${blocks.map((rules, i) => `${i + 1}: ${rules.map(esc).join(', ')}`).join('<br>')}</td></tr>`).join('')}</tbody>
  </table></div>
  <p class="table-note">At each stop the gate runs the full checkers with --tests on the run's new page and components, and blocks the stop while either reports an error. After three blocks it lets the run end.</p>
</section>` : '';

const armOptions = ordered.map((arm, i) => `<option value="${i}">${esc(arm.name)}</option>`).join('');
const half = (h) => `<div class="half" data-half="${h}"${h === 1 ? ' hidden' : ''}>
    <label class="picker">${h === 0 ? 'Left' : 'Right'} arm <select data-pick="${h}">${armOptions}</select></label>
    <div class="slot"></div>
  </div>`;

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
  th:first-child, td:first-child, td.lead { text-align: left; font-family: inherit; font-size: 14px; font-weight: 600; }
  td.notes { text-align: left; white-space: normal; min-width: 24ch; max-width: 60ch; color: var(--muted); }
  .table-scroll { overflow-x: auto; }
  tr:target td { background: var(--sunken); }
  .insights ul { max-width: 90ch; padding-left: 20px; }
  .insights li { margin: 10px 0; }
  .insights .parts li { margin: 6px 0; }
  .insights a { text-underline-offset: 2px; }
  .see { color: var(--muted); font-size: 13px; }
  .insights li:target, .conclusions li:target { background: var(--sunken); }
  .conclusions > * { max-width: 90ch; }
  .conclusions ul, .conclusions ol { padding-left: 20px; }
  .conclusions li { margin: 10px 0; }
  .conclusions a { text-underline-offset: 2px; }
  .table-note { margin: 10px 0 0; max-width: 80ch; font-size: 13px; color: var(--muted); }

  .bar { position: sticky; top: 0; z-index: 2; display: flex; flex-direction: column; gap: 8px; padding: 12px 32px 0; background: var(--bg); border-bottom: 1px solid var(--line); }
  .bar-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
  .bar-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  .bar-gap { flex: 1; }
  .tabs { display: flex; flex-wrap: wrap; gap: 4px; }
  .tabs button { font: inherit; font-weight: 600; color: var(--muted); background: none; border: 0; border-bottom: 2px solid transparent; padding: 6px 12px; cursor: pointer; }
  .tabs button[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--ink); }
  .segmented { display: inline-flex; flex-wrap: wrap; padding: 3px; background: var(--sunken); border: 1px solid var(--line); border-radius: 999px; }
  .segmented button { font: inherit; font-size: 13px; font-weight: 600; color: var(--muted); background: none; border: 0; border-radius: 999px; padding: 4px 14px; cursor: pointer; }
  .segmented button[aria-pressed="true"] { color: var(--ink); background: var(--surface); box-shadow: 0 1px 2px rgb(0 0 0 / 0.15); }
  .switch { font: inherit; font-size: 13px; font-weight: 600; color: var(--muted); background: var(--sunken); border: 1px solid var(--line); border-radius: 999px; padding: 4px 14px; cursor: pointer; }
  .switch[aria-pressed="true"] { color: var(--ink); background: var(--surface); border-color: var(--ink); }
  .tabs button:focus-visible, .segmented button:focus-visible, .switch:focus-visible, .picker select:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }

  .panels { display: grid; grid-template-columns: minmax(0, 1fr); gap: 16px; padding: 24px 32px 32px; }
  .panels[data-compare="true"] { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .picker { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: var(--muted); }
  .picker select { font: inherit; font-weight: 600; color: var(--ink); background: var(--surface); border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; }
  .panels[data-compare="false"] .picker { display: none; }
  .col { background: var(--surface); border: 1px solid var(--line); border-radius: 10px; padding: 16px; min-width: 0; }
  .half[data-active="true"] .col { border-color: var(--ink); }
  .col.empty { opacity: 0.5; }
  .col-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .trial { margin: 2px 0 0; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; color: var(--muted); }
  .pill { font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 999px; border: 1px solid currentColor; }
  .metrics { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 6px 16px; margin: 12px 0 0; }
  .metrics div { display: flex; justify-content: space-between; border-bottom: 1px dotted var(--line); }
  dt { color: var(--muted); font-size: 13px; }
  dd { margin: 0; }

  .frame { margin-top: 16px; height: 70vh; overflow: auto; overscroll-behavior: contain; background: var(--sunken); border: 1px solid var(--line); border-radius: 8px; }
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
  .timeline, .stops { font-size: 13px; padding-left: 22px; }
  .timeline li, .stops li { margin: 2px 0; overflow-wrap: anywhere; }
  .timeline .kind { display: inline-block; min-width: 58px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  .timeline .write, .timeline .source { color: var(--muted); }
  .timeline b { font-weight: 600; }
  .bad { color: var(--bad); }
  .good { color: var(--good); }
  .muted { color: var(--muted); }
  @media (max-width: 900px) {
    .panels[data-compare="true"] { grid-template-columns: minmax(0, 1fr); }
  }
  @media (max-width: 720px) {
    .page-head, .block { padding: 16px; }
    .bar { padding: 10px 16px 0; }
    .panels { padding: 16px; }
  }
</style>
</head>
<body data-view="desktop">
<header class="page-head">
  <h1>Billing eval report</h1>
  <p class="lede">${esc(lede)}</p>
</header>
${conclusionsBlock}
${insightsBlock}
<section class="block">
  <h2>Brief</h2>
  ${brief || '<p class="none">No prompt file found.</p>'}
</section>
<section class="block" id="means">
  <h2>Means per arm</h2>
  <div class="table-scroll"><table>
    <thead><tr><th>Arm</th><th>Finished</th><th>Grader score</th><th>Errors left</th><th>Generation seconds</th><th>Turns</th><th>Skills loaded</th><th>Checker runs</th><th>Failed checker calls</th><th>Lookups</th><th>Failed lookups</th><th>Source reads</th><th>Generation cost</th><th>Shipped components</th><th>New components</th><th>New tokens</th><th>Literal values</th></tr></thead>
    <tbody>${summary.map((s) => `<tr><td>${esc(s.name)}</td><td>${s.finished} of ${s.runs}</td><td>${fmt(s.score, 2)}</td><td>${fmt(s.errors)}</td><td>${fmt(s.seconds, 0)}</td><td>${fmt(s.turns)}</td><td>${fmt(s.skills)}</td><td>${fmt(s.checkerRuns)}</td><td>${fmt(s.checkerFailures)}</td><td>${fmt(s.lookups)}</td><td>${fmt(s.lookupFailures)}</td><td>${fmt(s.sourceReads)}</td><td>$${fmt(s.cost, 2)}</td><td>${fmt(s.shippedUsed)}</td><td>${fmt(s.created)}</td><td>${fmt(s.newTokens)}</td><td>${fmt(s.literals)}</td></tr>`).join('')}</tbody>
  </table></div>
  <p class="table-note">Lookups count each component and scale looked up, including each item of a shell loop. A checker run counts each call the arm could make, whether or not the agent read its output. An arm without a tool runs none; its calls to the tool are blocked and counted as failed.</p>
</section>
<section class="block" id="blocked">
  <h2>Blocked calls</h2>
  <div class="table-scroll"><table>
    <thead><tr><th>Arm</th><th>Failed checker calls</th><th>Failed lookups</th><th>Turns lost</th><th>Seconds lost</th><th>Source reads lost</th><th>Cost lost</th></tr></thead>
    <tbody>${summary.map((s) => `<tr><td>${esc(s.name)}</td><td>${fmt(s.checkerFailures)}</td><td>${fmt(s.lookupFailures)}</td><td>${fmt(s.lostTurns)} of ${fmt(s.turns)}</td><td>${fmt(s.lostSeconds, 0)} of ${fmt(s.seconds, 0)}</td><td>${fmt(s.lostSourceReads)}</td><td>$${fmt(s.lostCost, 2)} of $${fmt(s.cost, 2)}</td></tr>`).join('')}</tbody>
  </table></div>
  <p class="table-note">The skills name both tools, so an arm without one still calls it. A blocked call loses its own turn and the turns the agent spends probing the CLI afterwards, up to its next unrelated step. Cost lost is the run's cost times its share of turns lost.</p>
</section>
<section class="block" id="kept">
  <h2>Means without blocked calls</h2>
  <div class="table-scroll"><table>
    <thead><tr><th>Arm</th><th>Grader score</th><th>Errors left</th><th>Generation seconds</th><th>Turns</th><th>Checker runs</th><th>Lookups</th><th>Source reads</th><th>Generation cost</th><th>New tokens</th></tr></thead>
    <tbody>${summary.map((s) => `<tr><td>${esc(s.name)}</td><td>${fmt(s.score, 2)}</td><td>${fmt(s.errors)}</td><td>${fmt(s.keptSeconds, 0)}</td><td>${fmt(s.keptTurns)}</td><td>${fmt(s.checkerRuns)}</td><td>${fmt(s.lookups)}</td><td>${fmt(s.keptSourceReads)}</td><td>$${fmt(s.keptCost, 2)}</td><td>${fmt(s.newTokens)}</td></tr>`).join('')}</tbody>
  </table></div>
  <p class="table-note">The means above with every blocked call and the probing after it taken out of the time, turns, source reads, and cost. Grader score, errors, and new tokens measure what the run built, so they keep their values.</p>
</section>
${perRunTable}
${rankTable}
${gateTable}
<div class="bar">
  <div class="bar-row">
    <span class="bar-label">Run</span>
    <div class="segmented" role="group" aria-label="Run">
      ${Array.from({ length: maxRuns }, (_, i) => `<button type="button" data-run-pick="${i}" aria-pressed="${i === 0}">Run ${i + 1}</button>`).join('')}
    </div>
    <button type="button" class="switch" data-compare aria-pressed="false">Compare</button>
    <span class="bar-gap"></span>
    <div class="segmented" role="group" aria-label="Screenshot width">
      <button type="button" data-set-view="desktop" aria-pressed="true">Desktop</button>
      <button type="button" data-set-view="mobile" aria-pressed="false">Mobile</button>
    </div>
  </div>
  <div class="tabs" role="tablist" aria-label="Arms">
    ${ordered.map((arm, i) => `<button type="button" role="tab" data-key="${esc(arm.key)}" aria-controls="arm-panels" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${esc(arm.name)}</button>`).join('')}
  </div>
</div>
<section class="panels" id="arm-panels" role="tabpanel" aria-label="Selected arms" data-compare="false">
  ${half(0)}
  ${half(1)}
</section>
<div class="pool" hidden>
${ordered.map((arm, a) => Array.from({ length: maxRuns }, (_, i) => column(arm, arm.runs[i], a, i)).join('\n')).join('\n')}
</div>
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
  const box = document.querySelector('.lightbox');
  const pool = document.querySelector('.pool');
  const panels = document.querySelector('.panels');
  const halves = [...panels.querySelectorAll('.half')];
  const pickers = halves.map((half) => half.querySelector('select'));
  const armTabs = [...document.querySelectorAll('[role="tab"]')];
  const runButtons = [...document.querySelectorAll('[data-run-pick]')];
  const compareButton = document.querySelector('[data-compare]');
  const keys = armTabs.map((tab) => tab.dataset.key);
  const armCount = keys.length;

  // Arms are saved by key, so a report with other arms still opens on a real one.
  let saved = {};
  try { saved = JSON.parse(store.get('eval-report-selection') ?? '{}'); } catch {}
  const armAt = (key, fallback) => (keys.includes(key) ? keys.indexOf(key) : fallback);
  const state = {
    run: Number.isInteger(saved.run) && saved.run < runButtons.length ? saved.run : 0,
    arms: [armAt(saved.arms?.[0], 0), armAt(saved.arms?.[1], Math.min(1, armCount - 1))],
    compare: saved.compare === true,
    active: saved.compare === true && saved.active === 1 ? 1 : 0,
  };
  const shown = [null, null];
  const current = () => (state.compare ? state.active : 0);

  function render() {
    panels.dataset.compare = String(state.compare);
    halves[1].hidden = !state.compare;
    halves.forEach((half, h) => {
      half.dataset.active = String(state.compare && h === state.active);
      pickers[h].value = String(state.arms[h]);
      if (h === 1 && !state.compare) return;
      const id = state.arms[h] + ':' + state.run;
      if (shown[h] === id) return;
      shown[h] = id;
      const article = pool.querySelector('[data-arm="' + state.arms[h] + '"][data-run="' + state.run + '"]');
      half.querySelector('.slot').replaceChildren(article.cloneNode(true));
    });
    const selected = state.arms[current()];
    armTabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === selected));
      tab.tabIndex = i === selected ? 0 : -1;
    });
    runButtons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === state.run)));
    compareButton.setAttribute('aria-pressed', String(state.compare));
    store.set('eval-report-selection', JSON.stringify({ run: state.run, arms: state.arms.map((a) => keys[a]), compare: state.compare, active: state.active }));
  }

  function pickArm(index, focus) {
    state.arms[current()] = (index + armCount) % armCount;
    render();
    if (focus) armTabs[state.arms[current()]].focus();
  }
  armTabs.forEach((tab, i) => tab.addEventListener('click', () => pickArm(i)));
  runButtons.forEach((button, i) => button.addEventListener('click', () => { state.run = i; render(); }));
  compareButton.addEventListener('click', () => {
    if (state.compare) {
      state.arms[0] = state.arms[state.active];
      state.compare = false;
    } else {
      state.compare = true;
      if (state.arms[1] === state.arms[0]) state.arms[1] = (state.arms[0] + 1) % armCount;
    }
    state.active = 0;
    render();
  });
  pickers.forEach((select, h) => select.addEventListener('change', () => {
    state.active = h;
    state.arms[h] = Number(select.value);
    render();
  }));
  halves.forEach((half, h) => half.addEventListener('pointerdown', () => {
    if (state.compare && state.active !== h) { state.active = h; render(); }
  }));
  document.addEventListener('keydown', (event) => {
    if (box.open || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest?.('select, input, textarea')) return;
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const tab = event.target.closest?.('[role="tab"]');
    pickArm((tab ? armTabs.indexOf(tab) : state.arms[current()]) + step, Boolean(tab));
  });

  const viewButtons = [...document.querySelectorAll('[data-set-view]')];
  function setView(view) {
    document.body.dataset.view = view;
    viewButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setView === view)));
    store.set('eval-report-view', view);
  }
  viewButtons.forEach((b) => b.addEventListener('click', () => setView(b.dataset.setView)));
  if (store.get('eval-report-view') === 'mobile') setView('mobile');
  render();

  // An insight links to #arm=<key>&run=<n>, optionally &vs=<key> for Compare.
  const bar = document.querySelector('.bar');
  function follow() {
    const params = new URLSearchParams(location.hash.slice(1));
    const arm = params.get('arm');
    if (!keys.includes(arm)) return;
    const run = Number(params.get('run')) - 1;
    if (Number.isInteger(run) && run >= 0 && run < runButtons.length) state.run = run;
    const vs = params.get('vs');
    state.compare = keys.includes(vs) && vs !== arm;
    state.arms[0] = keys.indexOf(arm);
    if (state.compare) state.arms[1] = keys.indexOf(vs);
    state.active = 0;
    render();
    window.scrollTo({ top: panels.getBoundingClientRect().top + window.scrollY - bar.offsetHeight });
  }
  window.addEventListener('hashchange', follow);
  // A second click on the same link changes no hash, so it fires no hashchange.
  document.addEventListener('click', (event) => {
    const a = event.target.closest?.('a[href^="#arm="]');
    if (a && a.getAttribute('href') === location.hash) follow();
  });
  follow();

  const img = box.querySelector('img');
  const caption = box.querySelector('.lightbox-caption');
  const stage = box.querySelector('.lightbox-stage');
  let shots = [];
  let at = 0;
  // Shots are captured at 2x, so the CSS width is the viewport the page was rendered at.
  function show(i) {
    at = (i + shots.length) % shots.length;
    const shot = shots[at];
    img.src = shot.getAttribute('href');
    img.alt = shot.dataset.caption;
    img.style.width = shot.dataset.width + 'px';
    caption.textContent = shot.dataset.caption + ' (' + (at + 1) + ' of ' + shots.length + ')';
    stage.scrollTop = 0;
    if (!box.open) box.showModal();
  }
  panels.addEventListener('click', (event) => {
    const shot = event.target.closest('.shot');
    if (!shot) return;
    event.preventDefault();
    shots = [...pool.querySelectorAll('[data-run="' + state.run + '"] .shot[data-view="' + document.body.dataset.view + '"]')];
    const arm = shot.closest('article').dataset.arm;
    show(shots.findIndex((s) => s.closest('article').dataset.arm === arm));
  });
  box.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => show(at + Number(b.dataset.step))));
  box.querySelector('[data-close]').addEventListener('click', () => box.close());
  img.addEventListener('click', () => box.close());
  box.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') show(at + 1);
    if (event.key === 'ArrowLeft') show(at - 1);
  });
</script>
</body>
</html>
`;
mkdirSync(reportDir, { recursive: true });
writeFileSync(join(reportDir, 'index.html'), html);
