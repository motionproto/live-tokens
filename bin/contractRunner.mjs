// `check-component --tests`: runs the registry contract under Vitest and the
// component contract suites under Playwright for one component or every
// authored one, and maps their results onto findings by rule.
//
// Spawns the two tools as child processes rather than importing their APIs, so
// this module needs neither `@playwright/test` nor `vitest` at its own module
// top — it is loaded lazily, only when `--tests` is passed (see cli.mjs).

import { spawn } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverComponents, resolveComponentPaths } from './check-component.mjs';
import { lineOf } from './lib/findings.mjs';

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const TEST_DATA_DIR_ENV = 'LIVE_TOKENS_TEST_DATA_DIR';
const DATA_DIR_ENV = 'LIVE_TOKENS_DATA_DIR';
const COMPONENT_ENV = 'LIVE_TOKENS_COMPONENT';

// Mirrors src/testing/isolation.ts's own list. Duplicated rather than shared:
// that module compiles into src/testing-js, which does not exist until
// `build:testing` runs, and this one ships unbuilt.
const SESSION_FILES = new Set(['_working.json', '_active.json', '_production.json']);

const REQUIRED_TOOLS = [
  {
    name: '@playwright/test',
    install: 'npm install -D @playwright/test',
    extra: 'Then run `npx playwright install chromium`.',
  },
  { name: 'vitest', install: 'npm install -D vitest' },
  { name: 'happy-dom', install: 'npm install -D happy-dom' },
];

const HARD_FAILURE_RULES = new Set(['tests-not-installed', 'tests-setup', 'tests-incomplete']);

/** Design decision 8's fixed rule ids, the full set reconciliation checks
 *  coverage against. */
const ALL_CONTRACT_RULES = [
  'contract-registry',
  'contract-listed',
  'contract-alias',
  'contract-preview',
  'contract-persist',
  'contract-theme',
  'contract-sketch',
  'contract-render',
];

/**
 * `component-editor.contract.ts` runs each component through the same eight
 * `test()` calls in the same order (`describe.serial` preserves declaration
 * order in the reporter). Position, not title text, is what identifies the
 * obligation: two positions read "resolves every alias" and "answers the
 * pointer", but rewording either string must not silently stop this from
 * recognising it — only reordering or adding/removing a `test()` call would,
 * and that is a deliberate change to the suite itself.
 */
export const EDITOR_SUITE_POSITIONAL_RULES = [
  'contract-listed',
  'contract-alias', // declares every part and every shipped alias (assertInventory)
  'contract-alias', // resolves every alias it paints with
  'contract-preview', // previews the state being edited
  'contract-preview', // answers the pointer and the keyboard
  'contract-persist',
  'contract-theme',
  'contract-sketch',
];

// ─── tool + path resolution ─────────────────────────────────────────────────

/** Node's own node_modules resolution, walked by hand: a monorepo hoists a
 *  peer to an ancestor, so checking only `root/node_modules` under-reports. */
function findPeerRoot(root, name) {
  let dir = resolve(root);
  for (;;) {
    const candidate = join(dir, 'node_modules', ...name.split('/'));
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

export function missingToolFindings(root) {
  return REQUIRED_TOOLS.filter((tool) => !findPeerRoot(root, tool.name)).map((tool) => ({
    rule: 'tests-not-installed',
    file: 'package.json',
    line: 1,
    message: `${tool.name} is not installed. Run \`${tool.install}\`.${tool.extra ? ` ${tool.extra}` : ''}`,
  }));
}

function peerBin(root, name, relBin) {
  const peerRoot = findPeerRoot(root, name);
  if (!peerRoot) throw new Error(`${name} is not installed under ${root}`);
  return join(peerRoot, relBin);
}

/** The shipped testing module: compiled once `build:testing` has run,
 *  source in this repo's own dev loop otherwise. Resolved to an absolute path
 *  so the generated configs below need no bare-specifier or extensionless
 *  resolution of their own. */
function resolveTestingEntry(name) {
  const compiled = join(PKG_ROOT, 'src/testing-js', `${name}.js`);
  if (existsSync(compiled)) return compiled;
  const source = join(PKG_ROOT, 'src/testing', `${name}.ts`);
  if (existsSync(source)) return source;
  throw new Error(
    `Cannot find the shipped testing module "${name}" under ${PKG_ROOT}. ` +
      'Run `npm run build:testing` (development) or reinstall the package.',
  );
}

function settingsFilePath(root) {
  for (const name of ['live-tokens.testing.ts', 'live-tokens.testing.mts', 'live-tokens.testing.js', 'live-tokens.testing.mjs']) {
    const path = join(root, name);
    if (existsSync(path)) return path;
  }
  return null;
}

/**
 * A generated config's own extensionless relative imports (Vite/Playwright's
 * loaders resolve those, matching how this repo's own `vite.config.ts` and
 * `live-tokens.testing.ts` are written) only get that treatment for a
 * *static* import. A dynamic `import()` of the same path, called after a Vite
 * config finishes loading, runs through plain Node resolution instead and
 * fails on the same files: verified against `vitest.contract.config.ts` with
 * both a `file://` URL and a plain absolute path as the dynamic specifier,
 * identical `ERR_MODULE_NOT_FOUND` both times. So neither `settings.viteConfig`
 * nor `settings.dataDir` (the resolved values `resolveTestingConfig` computes)
 * has a reader here on purpose — reading either would mean importing the
 * settings file dynamically first, which reintroduces exactly this failure.
 * Regexing the settings file's *source text* for a field, imprecise as that
 * is, is what stays inside the static-import constraint: a wrong guess still
 * fails loudly (a bad `viteConfig` throws on its own static import in the
 * generated file; a bad `dataDir` throws "no data directory at ..." below),
 * never as a silent pass. A settings-level `dataDir` this cannot see at all
 * is worse than one resolved this imprecisely, since a project that names its
 * data directory only in `live-tokens.testing.ts` would otherwise have its
 * contracts checked against whatever happens to sit at the default path.
 */
function scrapeSettingsField(settingsPath, fieldName) {
  if (!settingsPath) return null;
  try {
    const m = new RegExp(`${fieldName}\\s*:\\s*['"]([^'"]+)['"]`).exec(readFileSync(settingsPath, 'utf8'));
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function guessViteConfigPath(root, settingsPath) {
  return resolve(root, scrapeSettingsField(settingsPath, 'viteConfig') ?? 'vite.config.ts');
}

/**
 * `dataDir` as the plugin resolves it: a `dataDir` field scraped from the
 * settings file (see above), else `live-tokens.config.json`'s own key, else
 * the default. Mirrors `resolveTestingConfig`'s own `configuredDataDir`
 * fallback (`src/testing/config.ts`) rather than importing it: that module
 * compiles into `src/testing-js`, which does not exist until `build:testing`
 * runs, and importing the *source* `.ts` module to reach it hits the same
 * extensionless-import failure documented above — measured with
 * `src/testing-js` moved aside, `resolveTestingEntry`'s `.ts` fallback threw
 * exactly that trying to load `vitest.ts`. Duplicating this small a resolver
 * has precedent in this file already, at `SESSION_FILES`.
 */
export function resolveSourceDataDir(root, settingsPath) {
  const scraped = scrapeSettingsField(settingsPath, 'dataDir');
  if (scraped) return resolve(root, scraped);
  try {
    const parsed = JSON.parse(readFileSync(join(root, 'live-tokens.config.json'), 'utf8'));
    if (parsed && typeof parsed === 'object' && typeof parsed.dataDir === 'string') {
      return resolve(root, parsed.dataDir);
    }
  } catch {
    // Missing or unparseable reads as absent, matching the plugin's own resolver.
  }
  return resolve(root, 'src/live-tokens/data');
}

// ─── data isolation ─────────────────────────────────────────────────────────

function copyIsolatedDataDir(sourceDataDir) {
  if (!existsSync(sourceDataDir)) {
    throw new Error(
      `No data directory at ${sourceDataDir}. Set "dataDir" in live-tokens.config.json ` +
        'when the project keeps its live-tokens data somewhere else.',
    );
  }
  // realpath: macOS resolves os.tmpdir() through a symlink, and the plugin
  // compares resolved paths when it decides whether a write is in scope.
  const dataDir = realpathSync(mkdtempSync(join(tmpdir(), 'live-tokens-check-')));
  cpSync(sourceDataDir, dataDir, { recursive: true });
  for (const entry of readdirSync(dataDir, { recursive: true })) {
    if (SESSION_FILES.has(basename(entry))) rmSync(join(dataDir, entry), { force: true });
  }
  return dataDir;
}

/** The one child process a `withCleanup` signal handler needs to stop before
 *  it is safe to remove the directories that process is still writing into.
 *  Module-scoped because exactly one `runContractTests` call is ever active
 *  in a given process. */
let activeChild = null;

/**
 * Removes `paths` on completion, on an uncaught exception, and on SIGINT or
 * SIGTERM. On a signal, it first asks the active child (Playwright or Vitest)
 * to stop and waits, briefly, for it to exit — measured against a live
 * `webServer`: Playwright only tears its dev server down on SIGINT, never
 * SIGTERM, so this always sends SIGINT to the child regardless of which
 * signal this process received, and falls back to SIGKILL if the child
 * ignores it. Only then does it remove the directories, so a slow child
 * cannot recreate a report or a trace file in a directory that is already
 * gone (also measured: without the wait, Playwright wrote into `test-results/`
 * after cleanup had already removed it).
 *
 * The handler removes its own listener and re-sends the original signal to
 * this process rather than just cleaning up and returning: any listener at
 * all cancels Node's default terminate-on-signal behaviour, so a handler that
 * only cleans up would swallow the first Ctrl+C in a process that installed
 * no other SIGINT listener.
 */
function withCleanup(paths) {
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    for (const path of paths) rmSync(path, { recursive: true, force: true });
  };
  const stopActiveChild = () =>
    new Promise((resolveStop) => {
      if (!activeChild || activeChild.exitCode !== null || activeChild.signalCode !== null) {
        resolveStop();
        return;
      }
      const child = activeChild;
      const timer = setTimeout(() => child.kill('SIGKILL'), 5_000);
      child.once('exit', () => {
        clearTimeout(timer);
        resolveStop();
      });
      child.kill('SIGINT');
    });
  const onSignal = async (signal) => {
    await stopActiveChild();
    cleanup();
    process.removeListener(signal, onSignal);
    process.kill(process.pid, signal);
  };
  process.once('SIGINT', onSignal);
  process.once('SIGTERM', onSignal);
  process.once('exit', cleanup);
  return cleanup;
}

// ─── generated tool configs ─────────────────────────────────────────────────

export function writeGeneratedConfigs({ configDir, root }) {
  // `configDir` sits under the OS temp directory, which has no ancestor
  // `package.json`. Without one naming `"type": "module"` here, Node treats
  // these configs as CommonJS by default, and `createPlaywrightConfig`'s
  // `import.meta.url` throws "Cannot use 'import.meta' outside a module".
  writeFileSync(join(configDir, 'package.json'), JSON.stringify({ type: 'module' }));

  const settingsPath = settingsFilePath(root);
  const testingIndex = resolveTestingEntry('index');
  const testingVitest = resolveTestingEntry('vitest');
  const viteConfigPath = guessViteConfigPath(root, settingsPath);

  const settingsImport = settingsPath ? `import settingsModule from ${JSON.stringify(settingsPath)};\n` : '';
  // A source fragment for the generated files below, not an actual settings
  // object: this module never imports the consumer's settings file itself
  // (see the static-import note above), so it only ever sees this as text.
  // `settingsModule` is already the file's default export (a default import
  // unwraps it), not a module namespace object — it has no `.default` of its
  // own.
  const settingsExpr = settingsPath ? 'settingsModule' : '{}';

  const playwrightConfigPath = join(configDir, 'playwright.config.ts');
  writeFileSync(
    playwrightConfigPath,
    `${settingsImport}import { createPlaywrightConfig } from ${JSON.stringify(testingIndex)};

export default createPlaywrightConfig({
  ...${settingsExpr},
  root: ${JSON.stringify(root)},
});
`,
  );

  const vitestConfigPath = join(configDir, 'vitest.config.ts');
  writeFileSync(
    vitestConfigPath,
    `${settingsImport}import viteConfigModule from ${JSON.stringify(viteConfigPath)};
import { createVitestConfig, resolveTestingConfig } from ${JSON.stringify(testingVitest)};

const settings = resolveTestingConfig(${settingsExpr}, ${JSON.stringify(root)});

export default createVitestConfig(viteConfigModule.default ?? viteConfigModule, {
  registrySetup: settings.registrySetup,
});
`,
  );

  return { playwrightConfigPath, vitestConfigPath };
}

// ─── subprocess execution ───────────────────────────────────────────────────

function runCli(command, args, { cwd, env }) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    activeChild = child;
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    const finish = (result) => {
      if (activeChild === child) activeChild = null;
      resolveRun(result);
    };
    child.on('close', (code) => finish({ code, stdout, stderr }));
    child.on('error', (error) => finish({ code: -1, stdout, stderr: `${stderr}\n${error.message}` }));
  });
}

function setupFinding(tool, code, stdout, stderr) {
  return {
    rule: 'tests-setup',
    file: 'package.json',
    line: 1,
    message: `${tool} exited with code ${code} before producing a report.\n${`${stdout}\n${stderr}`.trim().slice(-2000)}`,
  };
}

/** Reads a JSON report or explains, as a `tests-setup` finding, why there
 *  isn't one. Split from the process-spawning around it so a malformed or
 *  absent report is testable without a subprocess. */
export function readReportOrSetupFinding(tool, reportPath, code, stdout, stderr) {
  if (!existsSync(reportPath)) return { setupFinding: setupFinding(tool, code, stdout, stderr) };
  try {
    return { report: JSON.parse(readFileSync(reportPath, 'utf8')) };
  } catch (error) {
    return { setupFinding: setupFinding(tool, code, stdout, `report at ${reportPath} did not parse: ${error.message}`) };
  }
}

export async function runPlaywrightSuite({ root, configDir, playwrightConfigPath }) {
  const reportPath = join(configDir, 'playwright-report.json');
  const bin = peerBin(root, '@playwright/test', 'cli.js');
  const { code, stdout, stderr } = await runCli(
    process.execPath,
    [bin, 'test', '-c', playwrightConfigPath, '--reporter=json'],
    { cwd: root, env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath } },
  );
  return readReportOrSetupFinding('Playwright', reportPath, code, stdout, stderr);
}

export async function runRegistrySuite({ root, configDir, vitestConfigPath }) {
  const reportPath = join(configDir, 'vitest-report.json');
  const bin = peerBin(root, 'vitest', 'vitest.mjs');
  const { code, stdout, stderr } = await runCli(
    process.execPath,
    [bin, 'run', '--config', vitestConfigPath, '--reporter=json', '--outputFile', reportPath],
    { cwd: root, env: process.env },
  );
  const outcome = readReportOrSetupFinding('Vitest', reportPath, code, stdout, stderr);
  // Kept alongside a successfully-parsed report too: a file that failed to
  // collect a single test still carries a report, and `mapVitestResults`
  // falls back to this when that file names no message of its own.
  return outcome.setupFinding ? outcome : { ...outcome, stderr };
}

// ─── result mapping: shared ─────────────────────────────────────────────────

const TOKEN_RE = /(--[a-z0-9-]+)/;

export function extractToken(message) {
  return TOKEN_RE.exec(message ?? '')?.[1] ?? null;
}

/** The real line a token sits on, found by literal search with a trailing
 *  boundary so a shorter token cannot match inside a longer one that starts
 *  the same way (`--card-default-body` inside `--card-default-body-padding`,
 *  measured against every shipped alias: 34 pairs resolved to the wrong line
 *  without this boundary). Falls back to line 1 (decision 8's documented
 *  fallback) when the token is absent from the message or the file. */
export function findTokenLine(filePath, token) {
  if (!token || !existsSync(filePath)) return 1;
  const text = readFileSync(filePath, 'utf8');
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}(?![a-z0-9-])`).exec(text);
  return match ? lineOf(text, match.index) : 1;
}

function componentConfigPath(sourceDataDir, id) {
  return join(sourceDataDir, 'component-configs', id, 'default.json');
}

/** A message block ends at the first blank line: `ContractViolation`'s own
 *  multi-line messages (e.g. a list of aliases, one per line) never contain
 *  one, while Playwright always separates the message from the ANSI code
 *  frame it appends with one. Splitting on the first single `\n` instead
 *  (as an earlier version of this file did) silently dropped every line
 *  after the first. */
function messageBlock(rawMessage) {
  return String(rawMessage ?? '').split(/\n\n/)[0].trim();
}

/** Signatures Playwright's own errors carry that are not a component contract
 *  obligation failing — a missing browser or a crashed worker — checked
 *  before any rule/component-shaped parsing runs. Measured: with
 *  `PLAYWRIGHT_BROWSERS_PATH` pointed at an empty directory, every obligation
 *  failed with `browserType.launch: Executable doesn't exist` and, before
 *  this check existed, each one produced an unrelated contract finding. */
export function classifyInfrastructureError(message) {
  const text = String(message ?? '');
  if (/Executable doesn't exist|browserType\.launch:/.test(text)) {
    return {
      rule: 'tests-not-installed',
      message: 'Chromium is not installed for Playwright. Run `npx playwright install chromium`.',
    };
  }
  if (/Worker process exited unexpectedly|Test process crashed/.test(text)) {
    return { rule: 'tests-setup', message: `Playwright's worker process crashed: ${text.split('\n')[0]}` };
  }
  return null;
}

// ─── result mapping: Playwright ─────────────────────────────────────────────

/** `component-editor.contract.ts` names each component in a
 *  `describe.serial(id, ...)`, its immediate parent; the other two suites
 *  name it as the leading word of the spec title instead. Either way, the
 *  candidate is only trusted against `knownIds` — a leading word like
 *  "every" or "component" is not a component id. */
export function identifyComponent(describeTitles, specTitle, knownIds) {
  const parent = describeTitles[describeTitles.length - 1];
  if (parent && knownIds.has(parent)) return parent;
  const prefix = specTitle.split(' ')[0];
  return knownIds.has(prefix) ? prefix : null;
}

/** One entry per *test*, not per attempt: `test.status` is Playwright's own
 *  reconciliation of every retry ('expected' | 'unexpected' | 'flaky' |
 *  'skipped'), and `test.annotations` — not `result.annotations`, which is
 *  always empty — is where an inapplicable reason actually lands (measured
 *  against a real sketch-inapplicable run). Reading `test.results` per entry
 *  instead double-reported a flaky test's failed attempt as an error finding
 *  alongside its final `passed` coverage. */
export function readPlaywrightTests(report) {
  const out = [];
  const walk = (suite, titles) => {
    for (const child of suite.suites ?? []) walk(child, [...titles, child.title]);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        out.push({
          describeTitles: titles,
          specTitle: spec.title,
          specFile: spec.file,
          specLine: spec.line,
          status: test.status,
          annotations: test.annotations ?? [],
          lastResult: test.results?.[test.results.length - 1] ?? null,
        });
      }
    }
  };
  for (const suite of report.suites ?? []) walk(suite, []);
  return out;
}

/**
 * Where a contract rule's finding points: the consumer's own artifact, never
 * the shipped `.contract.ts` suite (absent from the tarball, and Playwright
 * reports no assertion location for it once compiled — see the plan's Wave
 * 3b/4 notes). `contract-alias`/`persist`/`theme` name the shipped config;
 * `contract-listed` names the editor; render/preview/sketch name the runtime.
 */
export function artifactForContractRule(root, sourceDataDir, rule, componentId, token) {
  if (!componentId) return { file: 'package.json', line: 1 };
  const paths = resolveComponentPaths(componentId, root);
  if (rule === 'contract-alias' || rule === 'contract-persist' || rule === 'contract-theme') {
    const target = componentConfigPath(sourceDataDir, componentId);
    return { file: relative(root, target), line: findTokenLine(target, token) };
  }
  if (rule === 'contract-listed') {
    return { file: relative(root, paths.editorPath), line: 1 };
  }
  return { file: relative(root, paths.runtimePath), line: findTokenLine(paths.runtimePath, token) };
}

const VIOLATION_RE = /^ContractViolation:\s*\[([a-z-]+)\]\s+([a-z0-9-]+):\s*([\s\S]*)$/;

/** The rule a passing or failing test exercises, derived from *where* the
 *  test lives rather than its title text: position within a component's
 *  `describe.serial` group for the eight editor-suite obligations (see
 *  `EDITOR_SUITE_POSITIONAL_RULES`), the suite file for the other two. A
 *  `ContractViolation`'s own `[rule]` prefix, when present, is more
 *  authoritative than either and wins in the caller. */
function structuralRule(entry, componentId, positionCounters) {
  if (componentId && entry.describeTitles[entry.describeTitles.length - 1] === componentId) {
    const index = positionCounters.get(componentId) ?? 0;
    positionCounters.set(componentId, index + 1);
    return EDITOR_SUITE_POSITIONAL_RULES[index] ?? null;
  }
  const file = basename(entry.specFile ?? '');
  if (file.startsWith('component-render.contract')) return 'contract-render';
  if (file.startsWith('component-alias.contract')) return 'contract-alias';
  return null;
}

/** failed beats passed beats inapplicable, so a component whose interaction
 *  is genuinely inapplicable but whose states obligation is a real pass
 *  (both currently map to `contract-preview`) reads as passed, and either
 *  reading as failed always wins. */
const COVERAGE_PRIORITY = { failed: 3, passed: 2, inapplicable: 1 };

export function mapPlaywrightResults(report, { root, sourceDataDir, knownIds }) {
  const zeroCollected = (report.suites ?? []).length === 0;
  if (zeroCollected || (report.errors ?? []).length > 0) {
    const detail = (report.errors ?? []).map((e) => e.message).join('\n') || 'the run collected no tests';
    return {
      findings: [{ rule: 'tests-incomplete', file: 'package.json', line: 1, message: `Playwright collected nothing to check: ${detail}` }],
      coverage: {},
      // Distinct from a per-test `tests-incomplete` (a single timed-out
      // obligation, say): this one finding already explains every missing
      // (component, rule) pair, so reconciliation must not also flag each of
      // them — that would multiply one collection failure into dozens of
      // findings that all say the same thing.
      explained: true,
    };
  }

  const tests = readPlaywrightTests(report);

  for (const t of tests) {
    if (t.status !== 'unexpected') continue;
    const infra = classifyInfrastructureError(t.lastResult?.errors?.[0]?.message);
    if (infra?.rule === 'tests-not-installed') {
      return { findings: [{ rule: infra.rule, file: 'package.json', line: 1, message: infra.message }], coverage: {}, explained: true };
    }
  }

  const findings = [];
  const coverage = {};
  const positionCounters = new Map();
  const markCoverage = (id, rule, status, reason) => {
    if (!id || !rule) return;
    coverage[id] ??= {};
    const existing = coverage[id][rule];
    if (!existing || COVERAGE_PRIORITY[status] >= COVERAGE_PRIORITY[existing.status]) {
      coverage[id][rule] = reason ? { status, reason } : { status };
    }
  };

  for (const t of tests) {
    const componentId = identifyComponent(t.describeTitles, t.specTitle, knownIds);
    const rule = structuralRule(t, componentId, positionCounters);
    const inapplicable = t.annotations.find((a) => a.type === 'inapplicable')?.description;

    if (t.status === 'expected' || t.status === 'flaky') {
      markCoverage(componentId, rule, inapplicable ? 'inapplicable' : 'passed', inapplicable);
      continue;
    }
    // `describe.serial` skips the rest of a component's obligations after its
    // first failure; reconciliation (in runContractTests) accounts for these,
    // so a bare skip here is not, by itself, a second thing to report.
    if (t.status === 'skipped') continue;

    const last = t.lastResult;
    if (last?.status === 'timedOut' || last?.status === 'interrupted') {
      findings.push({
        rule: 'tests-incomplete',
        file: 'package.json',
        line: 1,
        message: `${componentId ? `${componentId}: ` : ''}"${t.specTitle}" did not finish (${last.status})`,
        context: { suite: 'playwright', title: [...t.describeTitles, t.specTitle].join(' > '), suiteFile: t.specFile, suiteLine: t.specLine },
      });
      markCoverage(componentId, rule, 'failed');
      continue;
    }

    const rawErrors = last?.errors?.length ? last.errors : [{ message: `${t.status}: ${t.specTitle}` }];
    for (const error of rawErrors) {
      const infra = classifyInfrastructureError(error.message);
      if (infra) {
        findings.push({
          rule: infra.rule,
          file: 'package.json',
          line: 1,
          message: infra.message,
          context: { suite: 'playwright', title: [...t.describeTitles, t.specTitle].join(' > ') },
        });
        markCoverage(componentId, rule, 'failed');
        continue;
      }
      const block = messageBlock(error.message);
      const violation = VIOLATION_RE.exec(block);
      const finalRule = violation?.[1] ?? rule ?? 'tests-setup';
      const id = violation?.[2] ?? componentId;
      const message = violation?.[3] ?? block;
      const token = extractToken(message);
      const { file, line } = artifactForContractRule(root, sourceDataDir, finalRule, id, token);
      findings.push({
        rule: finalRule,
        file,
        line,
        message: id ? `${id}: ${message}` : message,
        context: {
          suite: 'playwright',
          title: [...t.describeTitles, t.specTitle].join(' > '),
          suiteFile: t.specFile,
          suiteLine: t.specLine,
          attachments: (last?.attachments ?? []).map((a) => a.path).filter(Boolean),
        },
      });
      markCoverage(id, finalRule, 'failed');
    }
  }
  return { findings, coverage };
}

// ─── result mapping: Vitest (registry contract) ─────────────────────────────

/** `checkRegistryEntry`'s violation strings, read back out of Vitest's
 *  `expected [ ... ] to deeply equal []` failure text. `createVitestConfig`
 *  sets `chaiConfig.truncateThreshold: 0` so this array is never summarized
 *  away before it gets here. */
export function extractViolationArray(text) {
  const m = /expected \[([\s\S]*?)\] to deeply equal \[\]/.exec(text ?? '');
  if (!m) return [];
  return [...m[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((x) => x[1]);
}

/** `checkRegistryEntry` prefixes every violation with its category
 *  (`registration:`, `uniqueness:`, `runtime:`, `default config:`,
 *  `opacity floor:`, `round-trip:`); the two config-shaped ones point at the
 *  shipped default, everything else at the runtime the schema describes. */
export function mapRegistryViolation(root, sourceDataDir, componentId, text) {
  const category = text.split(':')[0];
  const token = extractToken(text);
  const paths = resolveComponentPaths(componentId, root);
  const target =
    category === 'default config' || category === 'opacity floor'
      ? componentConfigPath(sourceDataDir, componentId)
      : paths.runtimePath;
  return { file: relative(root, target), line: findTokenLine(target, token) };
}

/** Mirrors the Playwright side's zero-collection check: a file that failed
 *  before it ran a single assertion (`assertionResults` empty, `status`
 *  'failed') carries its own `message` — measured against a bad
 *  `registrySetup` path, "Cannot find module '.../does-not-exist.ts'". Left
 *  unhandled, this fell through with empty coverage and no finding of its
 *  own, relying entirely on reconciliation's generic "did not run" message,
 *  which never names what actually failed to load. */
export function mapVitestResults(report, { root, sourceDataDir, stderr } = {}) {
  const files = report.testResults ?? [];
  const collectionFailures = files.filter((f) => f.status === 'failed' && (f.assertionResults ?? []).length === 0);
  if (files.length === 0 || collectionFailures.length === files.length) {
    const detail =
      collectionFailures.map((f) => f.message).filter(Boolean).join('\n') || stderr?.trim() || 'the run collected no tests';
    return {
      findings: [{ rule: 'tests-incomplete', file: 'package.json', line: 1, message: `Vitest collected nothing to check: ${detail}` }],
      coverage: {},
      explained: true,
    };
  }

  const findings = [];
  const coverage = {};
  for (const file of files) {
    for (const assertion of file.assertionResults ?? []) {
      const componentId = assertion.ancestorTitles.length >= 2 ? assertion.ancestorTitles[1] : null;
      if (assertion.status !== 'failed') {
        if (assertion.status === 'passed' && componentId) {
          coverage[componentId] ??= {};
          coverage[componentId]['contract-registry'] = { status: 'passed' };
        }
        continue;
      }
      const text = (assertion.failureMessages ?? []).join('\n');
      const violations = componentId ? extractViolationArray(text) : [];
      if (violations.length > 0) {
        for (const violation of violations) {
          const { file: f, line } = mapRegistryViolation(root, sourceDataDir, componentId, violation);
          findings.push({
            rule: 'contract-registry',
            file: f,
            line,
            message: `${componentId}: ${violation}`,
            context: { suite: 'vitest', title: assertion.fullName },
          });
        }
      } else {
        findings.push({
          rule: componentId ? 'contract-registry' : 'tests-setup',
          file: componentId ? relative(root, resolveComponentPaths(componentId, root).editorPath) : 'package.json',
          line: 1,
          message: text ? `${assertion.fullName}: ${text.split('\n')[0]}` : assertion.fullName,
          context: { suite: 'vitest', title: assertion.fullName },
        });
      }
      if (componentId) {
        coverage[componentId] ??= {};
        coverage[componentId]['contract-registry'] = { status: 'failed' };
      }
    }
  }
  return { findings, coverage };
}

function mergeCoverage(a, b) {
  const out = {};
  for (const [id, rules] of [...Object.entries(a), ...Object.entries(b)]) {
    out[id] = { ...out[id], ...rules };
  }
  return out;
}

// ─── reconciliation ─────────────────────────────────────────────────────────

/**
 * Every expected (component, rule) pair coverage does not already carry a
 * verdict for becomes `incomplete`. A component with a `failed` rule already
 * explains its own gaps (`describe.serial` stops after the first failure);
 * `explainedGlobally` does the same for a setup-level finding that stopped
 * the whole run. Anything left over is a genuinely unexpected skip, which
 * gets its own `tests-incomplete` finding — the plan requires those to fail
 * the run, not read as a clean, partial pass.
 */
export function reconcileCoverage(coverage, expectedIds, { expectedRules = ALL_CONTRACT_RULES, explainedGlobally = false } = {}) {
  const out = {};
  for (const [id, rules] of Object.entries(coverage)) out[id] = { ...rules };
  const findings = [];
  for (const id of expectedIds) {
    const rules = (out[id] ??= {});
    const explained = explainedGlobally || Object.values(rules).some((r) => r.status === 'failed');
    for (const rule of expectedRules) {
      if (rules[rule]) continue;
      rules[rule] = { status: 'incomplete' };
      if (!explained) {
        findings.push({
          rule: 'tests-incomplete',
          file: 'package.json',
          line: 1,
          message: `${id}: ${rule} did not run, and nothing else for ${id} failed to explain why`,
        });
      }
    }
  }
  return { coverage: out, findings };
}

// ─── entry point ────────────────────────────────────────────────────────────

export async function runContractTests(id, { root = process.cwd(), dataDir: explicitDataDir } = {}) {
  const toolFindings = missingToolFindings(root);
  if (toolFindings.length > 0) return { findings: toolFindings, coverage: {} };

  const ids = id ? [id] : discoverComponents(root);
  if (ids.length === 0) {
    return {
      findings: [
        {
          rule: 'tests-setup',
          file: 'package.json',
          line: 1,
          message: 'no component authored under src/system/components yet; nothing for --tests to run',
        },
      ],
      coverage: {},
    };
  }

  let sourceDataDir;
  let dataDir;
  let configDir;
  try {
    // `dataDir` bypasses resolution entirely: the seam a caller (a test, or a
    // future batch/CI runner) uses to point an isolated copy at a source tree
    // other than the project's own, without ever touching the real one.
    sourceDataDir = explicitDataDir ?? resolveSourceDataDir(root, settingsFilePath(root));
    dataDir = copyIsolatedDataDir(sourceDataDir);
    configDir = mkdtempSync(join(tmpdir(), 'live-tokens-check-cfg-'));
  } catch (error) {
    if (dataDir) rmSync(dataDir, { recursive: true, force: true });
    if (configDir) rmSync(configDir, { recursive: true, force: true });
    return {
      findings: [{ rule: 'tests-setup', file: 'package.json', line: 1, message: `could not prepare an isolated run: ${error.message}` }],
      coverage: {},
    };
  }

  const cleanup = withCleanup([dataDir, configDir]);

  try {
    const { playwrightConfigPath, vitestConfigPath } = writeGeneratedConfigs({ configDir, root });
    process.env[TEST_DATA_DIR_ENV] = dataDir;
    process.env[DATA_DIR_ENV] = dataDir;
    if (id) process.env[COMPONENT_ENV] = id;
    else delete process.env[COMPONENT_ENV];

    const knownIds = new Set([...discoverComponents(root), ...discoverComponents(PKG_ROOT)]);
    const expectedIds = id ? [id] : [...knownIds];

    // Sequential: both share the one isolated data directory, and the
    // registry run's own Vite instance and the Playwright run's dev server
    // would otherwise regenerate the same derived files concurrently.
    const registryOutcome = await runRegistrySuite({ root, configDir, vitestConfigPath });
    const playwrightOutcome = await runPlaywrightSuite({ root, configDir, playwrightConfigPath });

    const registryMapped = registryOutcome.setupFinding
      ? { findings: [registryOutcome.setupFinding], coverage: {}, explained: true }
      : mapVitestResults(registryOutcome.report, { root, sourceDataDir, stderr: registryOutcome.stderr });
    const playwrightMapped = playwrightOutcome.setupFinding
      ? { findings: [playwrightOutcome.setupFinding], coverage: {}, explained: true }
      : mapPlaywrightResults(playwrightOutcome.report, { root, sourceDataDir, knownIds });

    const mergedFindings = [...registryMapped.findings, ...playwrightMapped.findings];
    // A finding from either suite's own setup path, or an explicit `explained`
    // flag from a whole-run short-circuit (zero collected, missing browser),
    // already accounts for every missing (component, rule) pair — without
    // this, one such failure would multiply into one reconciliation finding
    // per expected id on top of it.
    const explainedGlobally =
      registryMapped.explained ||
      playwrightMapped.explained ||
      mergedFindings.some((f) => f.rule === 'tests-setup' || f.rule === 'tests-not-installed');
    const reconciled = reconcileCoverage(mergeCoverage(registryMapped.coverage, playwrightMapped.coverage), expectedIds, {
      explainedGlobally,
    });

    return { findings: [...mergedFindings, ...reconciled.findings], coverage: reconciled.coverage };
  } catch (error) {
    return {
      findings: [{ rule: 'tests-setup', file: 'package.json', line: 1, message: `check-component --tests crashed: ${error.message}` }],
      coverage: {},
    };
  } finally {
    cleanup();
  }
}

export function hasHardFailure(findings) {
  return findings.some((f) => HARD_FAILURE_RULES.has(f.rule));
}
