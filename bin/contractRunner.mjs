// `check-component --tests`: runs the registry contract under Vitest and the
// component contract suites under Playwright for one component or every
// authored one, and maps their results onto findings by rule.
//
// `check-page --tests` (`runPageTests`, below `runContractTests`) shares this
// file's tool detection, data isolation, generated Playwright config, spawn
// deadline, report reading, and infrastructure classification, running the
// suite's `page` project instead of `contract` and skipping the registry
// (Vitest) half pages have no equivalent of.
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
  statSync,
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
// Mirrors src/testing/config.ts's own PAGES_ENV: the page targets a run opens,
// as JSON. Duplicated rather than imported for the same reason as
// SESSION_FILES below.
const PAGES_ENV = 'LIVE_TOKENS_PAGES';

/** Milliseconds a spawned tool gets before this file sends it SIGINT, then
 *  SIGKILL five seconds later. A hung dev server or worker can no longer hold
 *  a caller open past this. */
const DEFAULT_TESTS_TIMEOUT_MS = 15 * 60_000;
const TESTS_TIMEOUT_ENV = 'LIVE_TOKENS_TESTS_TIMEOUT';

function testsTimeoutMs() {
  const raw = process.env[TESTS_TIMEOUT_ENV];
  const ms = raw ? Number(raw) : NaN;
  return Number.isFinite(ms) && ms > 0 ? ms : DEFAULT_TESTS_TIMEOUT_MS;
}

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
  'contract-states',
  'contract-interaction',
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
  'contract-states', // previews the state being edited
  'contract-interaction', // answers the pointer and the keyboard
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

/** The newest mtime among the source tree's own `.ts` files. `tsup`'s
 *  `splitting: true` spreads one entry across several output chunks, so an
 *  edit that matters can land in a file `name` never names directly (e.g.
 *  `support/contractHarness.ts` feeding `component-editor.contract.js`), so
 *  the whole source tree is the unit of staleness. */
function newestSourceMtime(dir) {
  let newest = 0;
  for (const entry of readdirSync(dir, { recursive: true })) {
    if (!entry.endsWith('.ts')) continue;
    const mtime = statSync(join(dir, entry)).mtimeMs;
    if (mtime > newest) newest = mtime;
  }
  return newest;
}

/** The shipped testing module: compiled once `build:testing` has run,
 *  source in this repo's own dev loop otherwise. Resolved to an absolute path
 *  so the generated configs below need no bare-specifier or extensionless
 *  resolution of their own.
 *
 *  A tarball install ships only the compiled copy (`src/testing` is not in
 *  `package.json`'s `files`), so `sourceDir` never exists there and this
 *  always returns `compiled` unconditionally, same as before. In this repo's
 *  own dev loop both exist, and an edit under `src/testing` used to leave the
 *  compiled copy silently stale: measured by editing `contractHarness.ts` and
 *  confirming the compiled `component-editor.contract.js` in `src/testing-js`
 *  still ran the old assertion. Preferring the newer one makes the dev loop
 *  self-healing. */
function resolveTestingEntry(name) {
  const compiled = join(PKG_ROOT, 'src/testing-js', `${name}.js`);
  const sourceDir = join(PKG_ROOT, 'src/testing');
  const source = join(sourceDir, `${name}.ts`);
  const compiledExists = existsSync(compiled);
  const sourceExists = existsSync(source);
  if (compiledExists && sourceExists && newestSourceMtime(sourceDir) > statSync(compiled).mtimeMs) {
    console.warn(
      `[live-tokens] src/testing/ has changes newer than src/testing-js/${name}.js. ` +
        `Using the source directly. Run \`npm run build:testing\` to refresh the compiled copy.`,
    );
    return source;
  }
  if (compiledExists) return compiled;
  if (sourceExists) return source;
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
function stripComments(text) {
  // Block comments first: a `//` inside one (`/* // note */`) must not seed a
  // second, overlapping strip.
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

/** Measured across eleven settings-file shapes: a commented-out `dataDir:`
 *  above the real one won the regex, because the regex only sees text
 *  position, never comment syntax, and a comment naming the field with
 *  nothing else present invented a setting out of prose. Comments are
 *  stripped before the field ever gets a chance to match. A field present in
 *  live code as a template literal, a computed value, or an import throws
 *  instead of falling through to a default silently: the two guesses this
 *  feeds, `viteConfig` and `dataDir`, can each resolve to a real path that
 *  simply names the wrong tree, which then reads as a clean run. */
function scrapeSettingsField(settingsPath, fieldName) {
  if (!settingsPath) return null;
  let text;
  try {
    text = readFileSync(settingsPath, 'utf8');
  } catch {
    return null;
  }
  const live = stripComments(text);
  const literal = new RegExp(`\\b${fieldName}\\s*:\\s*['"]([^'"]+)['"]`).exec(live);
  if (literal) return literal[1];
  if (new RegExp(`\\b${fieldName}\\s*:`).test(live)) {
    throw new Error(
      `"${fieldName}" in ${settingsPath} is set to something other than a plain string literal, ` +
        `so --tests cannot read it statically. Use a literal string, or remove the key to fall back to the default.`,
    );
  }
  return null;
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

// `configDir` sits under the OS temp directory, which has no ancestor
// `package.json`. Without one naming `"type": "module"` here, Node treats
// these configs as CommonJS by default, and `createPlaywrightConfig`'s
// `import.meta.url` throws "Cannot use 'import.meta' outside a module".
export function writeConfigPackageJson(configDir) {
  writeFileSync(join(configDir, 'package.json'), JSON.stringify({ type: 'module' }));
}

/** A source fragment for the generated files below, not an actual settings
 *  object: this module never imports the consumer's settings file itself (see
 *  the static-import note above), so it only ever sees this as text.
 *  `settingsModule` is already the file's default export (a default import
 *  unwraps it), not a module namespace object — it has no `.default` of its
 *  own. */
function settingsFragments(root) {
  const settingsPath = settingsFilePath(root);
  const settingsImport = settingsPath ? `import settingsModule from ${JSON.stringify(settingsPath)};\n` : '';
  const settingsExpr = settingsPath ? 'settingsModule' : '{}';
  return { settingsPath, settingsImport, settingsExpr };
}

/**
 * The `page` project alone, config `globalTimeout` set to `timeoutMs`: a
 * `check-page --tests` run must never also carry the whole `contract` project
 * (every component's editor cycle, against no `LIVE_TOKENS_COMPONENT`), and a
 * page suite that hangs reports `timedOut` tests in a real JSON report before
 * this file's own SIGINT/SIGKILL watchdog (`runCli`) ever has to act.
 */
export function writePlaywrightConfig({ configDir, root, timeoutMs = DEFAULT_TESTS_TIMEOUT_MS } = {}) {
  const { settingsImport, settingsExpr } = settingsFragments(root);
  const testingIndex = resolveTestingEntry('index');
  const playwrightConfigPath = join(configDir, 'playwright.config.ts');
  writeFileSync(
    playwrightConfigPath,
    `${settingsImport}import { createPlaywrightConfig } from ${JSON.stringify(testingIndex)};

export default createPlaywrightConfig({
  ...${settingsExpr},
  root: ${JSON.stringify(root)},
}).then((config) => ({ ...config, globalTimeout: ${JSON.stringify(timeoutMs)} }));
`,
  );
  return playwrightConfigPath;
}

export function writeGeneratedConfigs({ configDir, root, timeoutMs = DEFAULT_TESTS_TIMEOUT_MS } = {}) {
  writeConfigPackageJson(configDir);
  const playwrightConfigPath = writePlaywrightConfig({ configDir, root, timeoutMs });

  const { settingsPath, settingsImport, settingsExpr } = settingsFragments(root);
  const testingVitest = resolveTestingEntry('vitest');
  const viteConfigPath = guessViteConfigPath(root, settingsPath);

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

/** Spawns `command`, and at `timeoutMs` sends the child SIGINT (Playwright's
 *  own graceful-stop signal, per `withCleanup`'s own note above), then
 *  SIGKILL five seconds later if it has not exited. `result.timedOut` tells
 *  the caller the run never finished on its own, whatever the child's own
 *  exit code or report ends up saying. */
function runCli(command, args, { cwd, env, timeoutMs = DEFAULT_TESTS_TIMEOUT_MS } = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(command, args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] });
    activeChild = child;
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    const deadline = setTimeout(() => {
      timedOut = true;
      const killer = setTimeout(() => child.kill('SIGKILL'), 5_000);
      child.once('exit', () => clearTimeout(killer));
      child.kill('SIGINT');
    }, timeoutMs);
    const finish = (result) => {
      clearTimeout(deadline);
      if (activeChild === child) activeChild = null;
      resolveRun({ ...result, timedOut });
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

/** `tests-incomplete`, not `tests-setup`: the tool itself never got the
 *  chance to explain the failure, this file's own watchdog cut it off. */
export function timeoutFinding(tool, timeoutMs) {
  return {
    rule: 'tests-incomplete',
    file: 'package.json',
    line: 1,
    message: `${tool} did not finish within ${Math.round(timeoutMs / 60_000)} minute(s) and was interrupted. Set LIVE_TOKENS_TESTS_TIMEOUT (milliseconds) to change the bound.`,
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

export async function runPlaywrightSuite({ root, configDir, playwrightConfigPath, project, timeoutMs = DEFAULT_TESTS_TIMEOUT_MS }) {
  const reportPath = join(configDir, 'playwright-report.json');
  const bin = peerBin(root, '@playwright/test', 'cli.js');
  const args = [bin, 'test', '-c', playwrightConfigPath, '--reporter=json'];
  if (project) args.push('--project', project);
  const { code, stdout, stderr, timedOut } = await runCli(process.execPath, args, {
    cwd: root,
    env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath },
    timeoutMs,
  });
  if (timedOut) return { setupFinding: timeoutFinding('Playwright', timeoutMs) };
  return readReportOrSetupFinding('Playwright', reportPath, code, stdout, stderr);
}

export async function runRegistrySuite({ root, configDir, vitestConfigPath, timeoutMs = DEFAULT_TESTS_TIMEOUT_MS }) {
  const reportPath = join(configDir, 'vitest-report.json');
  const bin = peerBin(root, 'vitest', 'vitest.mjs');
  const { code, stdout, stderr, timedOut } = await runCli(
    process.execPath,
    [bin, 'run', '--config', vitestConfigPath, '--reporter=json', '--outputFile', reportPath],
    { cwd: root, env: process.env, timeoutMs },
  );
  if (timedOut) return { setupFinding: timeoutFinding('Vitest', timeoutMs) };
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
 * `contract-listed` names the editor; render/preview/sketch name the runtime;
 * `contract-missing` names the settings file the contract module is declared in.
 */
export function artifactForContractRule(root, sourceDataDir, rule, componentId, token) {
  if (!componentId) return { file: 'package.json', line: 1 };
  if (rule === 'contract-missing') {
    const settings = settingsFilePath(root);
    return { file: settings ? relative(root, settings) : 'package.json', line: 1 };
  }
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

/** failed beats flaky beats passed beats inapplicable, so a component whose
 *  interaction is genuinely inapplicable but whose states obligation is a
 *  real pass reads as passed, and
 *  either reading as failed always wins. `flaky` outranks `passed` so a
 *  retried obligation stays visible rather than being overwritten by a
 *  sibling that passed clean the first time. */
const COVERAGE_PRIORITY = { failed: 4, flaky: 3, passed: 2, inapplicable: 1 };

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
      // Flaky reaches a passing final attempt, same as expected, but a retry
      // was needed to get there: worth a distinct coverage status so it stays
      // visible rather than reading identically to a clean pass. It carries no
      // finding and never flips exit status. CI's retry budget exists to
      // absorb a shared dev server wobbling under CI load; failing the run on
      // the very condition retries exist to tolerate would defeat the point.
      const status = t.status === 'flaky' ? 'flaky' : inapplicable ? 'inapplicable' : 'passed';
      markCoverage(componentId, rule, status, inapplicable);
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

// ─── result mapping: page rules ─────────────────────────────────────────────

/** The plan's Runtime rule ids, fixed rather than read off a page's own
 *  results: `reconcileCoverage`'s expected set, same reasoning as
 *  `ALL_CONTRACT_RULES` above. */
const PAGE_RUNTIME_RULES = ['page-component-paint', 'page-text-style', 'page-contrast', 'page-grid', 'page-overflow'];

/** Mirrors `src/testing/config.ts`'s own `DEFAULT_PAGE_VIEWPORTS`, duplicated
 *  for the reason `SESSION_FILES` documents above. A project's own
 *  `pageViewports` override, read from the settings file only once the
 *  generated Playwright config (a separate process) resolves it, is invisible
 *  to this reconciliation: a page checked at a replaced viewport list still
 *  gets a real pass or fail per rule, it is only the "did every expected
 *  triple run" reconciliation below that assumes the shipped default. */
const PAGE_VIEWPORTS = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
];

/** `page-compliance.contract.ts` titles each test `${rule} | ${source} |
 *  ${width}x${height}`, so the rule, the page, and the viewport are read off
 *  the title rather than off describe-block position (there is none — every
 *  page test is a sibling at the suite's top level). */
const PAGE_TEST_TITLE_RE = /^(page-[a-z-]+) \| (.+) \| (\d+x\d+)$/;

/** A `PageViolation`'s own `[rule] source:line: message`, read back out of
 *  Playwright's `Error.prototype.toString()` (`${name}: ${message}`), the
 *  same convention `VIOLATION_RE` above reads `ContractViolation` through. */
const PAGE_VIOLATION_RE = /^PageViolation:\s*\[([a-z-]+)\]\s+(.+):(\d+):\s*([\s\S]*)$/;

/**
 * `PageViolation` to a finding at the page file and line; a timeout or an
 * interruption to `tests-incomplete`; a `test.skip(...)` call — the mechanism
 * `PageHarness.assert*` uses to report a rule inapplicable — to `inapplicable`
 * coverage carrying the skip's own description, never a finding. Structurally
 * the Playwright half of `mapPlaywrightResults` above, with no component,
 * describe-block, or `ContractViolation` concept to lean on: every triple's
 * identity comes off the test's own title.
 */
export function mapPageResults(report) {
  const zeroCollected = (report.suites ?? []).length === 0;
  if (zeroCollected || (report.errors ?? []).length > 0) {
    const detail = (report.errors ?? []).map((e) => e.message).join('\n') || 'the run collected no tests';
    return {
      findings: [{ rule: 'tests-incomplete', file: 'package.json', line: 1, message: `Playwright collected nothing to check: ${detail}` }],
      coverage: {},
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
  // The outer key carries the page and the viewport, the inner key the bare
  // rule id — never the reverse: `applyCoverageSeverity` and `--off` (`bin/
  // lib/findings.mjs`) resolve a coverage entry's severity by looking up its
  // inner key straight in `PAGE_RULES`, so a composite `rule@viewport` inner
  // key would never match a plain rule id and `--off`/`checks.rules` would
  // silently stop reaching page coverage.
  const markCoverage = (pageAtViewport, rule, status, reason) => {
    if (!pageAtViewport || !rule) return;
    coverage[pageAtViewport] ??= {};
    const existing = coverage[pageAtViewport][rule];
    if (!existing || COVERAGE_PRIORITY[status] >= COVERAGE_PRIORITY[existing.status]) {
      coverage[pageAtViewport][rule] = reason ? { status, reason } : { status };
    }
  };

  for (const t of tests) {
    const [, titleRule, titleSource, titleViewport] = PAGE_TEST_TITLE_RE.exec(t.specTitle) ?? [];
    const pageAtViewport = titleSource && titleViewport ? `${titleSource}@${titleViewport}` : null;

    if (t.status === 'expected' || t.status === 'flaky') {
      markCoverage(pageAtViewport, titleRule, t.status === 'flaky' ? 'flaky' : 'passed');
      continue;
    }
    if (t.status === 'skipped') {
      // Playwright's own `skip` annotation, from `test.skip(condition,
      // description)` inside the test body — decision 10's "inapplicable is a
      // status with a reason", never a silent pass.
      const reason = t.annotations.find((a) => a.type === 'skip')?.description || 'inapplicable';
      markCoverage(pageAtViewport, titleRule, 'inapplicable', reason);
      continue;
    }

    const last = t.lastResult;
    if (last?.status === 'timedOut' || last?.status === 'interrupted') {
      findings.push({
        rule: 'tests-incomplete',
        file: 'package.json',
        line: 1,
        message: `"${t.specTitle}" did not finish (${last.status})`,
        context: { suite: 'playwright', title: t.specTitle, suiteFile: t.specFile, suiteLine: t.specLine },
      });
      markCoverage(pageAtViewport, titleRule, 'failed');
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
          context: { suite: 'playwright', title: t.specTitle },
        });
        markCoverage(pageAtViewport, titleRule, 'failed');
        continue;
      }
      const block = messageBlock(error.message);
      const violation = PAGE_VIOLATION_RE.exec(block);
      findings.push({
        rule: violation?.[1] ?? titleRule ?? 'tests-setup',
        file: violation?.[2] ?? titleSource ?? 'package.json',
        line: violation ? Number(violation[3]) : 1,
        message: violation?.[4] ?? block,
        context: {
          suite: 'playwright',
          title: t.specTitle,
          suiteFile: t.specFile,
          suiteLine: t.specLine,
          attachments: (last?.attachments ?? []).map((a) => a.path).filter(Boolean),
        },
      });
      markCoverage(pageAtViewport, titleRule, 'failed');
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
  if (files.length === 0) {
    return {
      findings: [{ rule: 'tests-incomplete', file: 'package.json', line: 1, message: `Vitest collected nothing to check: ${stderr?.trim() || 'the run collected no tests'}` }],
      coverage: {},
      explained: true,
    };
  }

  const collectionFailures = files.filter((f) => f.status === 'failed' && (f.assertionResults ?? []).length === 0);
  const findings = collectionFailures.map((f) => ({
    rule: 'tests-incomplete',
    file: 'package.json',
    line: 1,
    message: `Vitest collected nothing from ${f.name ?? 'a test file'}: ${f.message || stderr?.trim() || 'no message reported'}`,
  }));
  // Only when every file failed to load does this already account for every
  // missing (component, rule) pair; one crashed file beside others that ran
  // fine still leaves real gaps reconciliation has to name on its own.
  if (collectionFailures.length === files.length) {
    return { findings, coverage: {}, explained: true };
  }

  const coverage = {};
  for (const file of files) {
    if (collectionFailures.includes(file)) continue;
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
    const timeoutMs = testsTimeoutMs();
    const { playwrightConfigPath, vitestConfigPath } = writeGeneratedConfigs({ configDir, root, timeoutMs });
    process.env[TEST_DATA_DIR_ENV] = dataDir;
    process.env[DATA_DIR_ENV] = dataDir;
    if (id) process.env[COMPONENT_ENV] = id;
    else delete process.env[COMPONENT_ENV];

    const knownIds = new Set([...discoverComponents(root), ...discoverComponents(PKG_ROOT)]);
    const expectedIds = id ? [id] : [...knownIds];

    // Sequential: both share the one isolated data directory, and the
    // registry run's own Vite instance and the Playwright run's dev server
    // would otherwise regenerate the same derived files concurrently.
    const registryOutcome = await runRegistrySuite({ root, configDir, vitestConfigPath, timeoutMs });
    const playwrightOutcome = await runPlaywrightSuite({ root, configDir, playwrightConfigPath, project: 'contract', timeoutMs });

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

/**
 * `check-page --tests`'s own entry point: the Playwright half of
 * `runContractTests` above, minus the registry (Vitest) suite pages have no
 * equivalent of (decision 11) and minus the `contract` project (`project:
 * 'page'` below, so a page run never opens every component's editor cycle).
 *
 * `targets` is `resolvePageTargets`'s own return shape (`bin/lib/
 * pageRoutes.mjs`): a page with no route carries `route: null` and a
 * `reason`, reported as its own `tests-setup` finding rather than passed to
 * the suite, which cannot open a page it has no URL for (decision 3).
 */
export async function runPageTests(targets, { root = process.cwd(), dataDir: explicitDataDir } = {}) {
  const toolFindings = missingToolFindings(root);
  if (toolFindings.length > 0) return { findings: toolFindings, coverage: {} };

  if (targets.length === 0) {
    return {
      findings: [
        {
          rule: 'tests-setup',
          file: 'package.json',
          line: 1,
          message: 'no page renders through a route yet; nothing for --tests to run',
        },
      ],
      coverage: {},
    };
  }

  const unrouted = targets.filter((t) => !t.route);
  const routed = targets.filter((t) => t.route);
  const unroutedFindings = unrouted.map((t) => ({
    rule: 'tests-setup',
    file: t.source,
    line: 1,
    message: t.reason ?? 'no route renders this page',
  }));

  if (routed.length === 0) {
    return { findings: unroutedFindings, coverage: {} };
  }

  let sourceDataDir;
  let dataDir;
  let configDir;
  try {
    sourceDataDir = explicitDataDir ?? resolveSourceDataDir(root, settingsFilePath(root));
    dataDir = copyIsolatedDataDir(sourceDataDir);
    configDir = mkdtempSync(join(tmpdir(), 'live-tokens-check-cfg-'));
  } catch (error) {
    if (dataDir) rmSync(dataDir, { recursive: true, force: true });
    if (configDir) rmSync(configDir, { recursive: true, force: true });
    return {
      findings: [...unroutedFindings, { rule: 'tests-setup', file: 'package.json', line: 1, message: `could not prepare an isolated run: ${error.message}` }],
      coverage: {},
    };
  }

  const cleanup = withCleanup([dataDir, configDir]);

  try {
    const timeoutMs = testsTimeoutMs();
    writeConfigPackageJson(configDir);
    const playwrightConfigPath = writePlaywrightConfig({ configDir, root, timeoutMs });
    process.env[TEST_DATA_DIR_ENV] = dataDir;
    process.env[DATA_DIR_ENV] = dataDir;
    process.env[PAGES_ENV] = JSON.stringify(routed);
    delete process.env[COMPONENT_ENV];

    const playwrightOutcome = await runPlaywrightSuite({ root, configDir, playwrightConfigPath, project: 'page', timeoutMs });
    const mapped = playwrightOutcome.setupFinding
      ? { findings: [playwrightOutcome.setupFinding], coverage: {}, explained: true }
      : mapPageResults(playwrightOutcome.report);

    const explainedGlobally =
      mapped.explained || mapped.findings.some((f) => f.rule === 'tests-setup' || f.rule === 'tests-not-installed');
    // One expected id per (page, viewport) pair — mapPageResults's own outer
    // coverage key — each checked against the same flat PAGE_RUNTIME_RULES,
    // the shape reconcileCoverage already expects.
    const expectedIds = routed.flatMap((t) => PAGE_VIEWPORTS.map((v) => `${t.source}@${v.width}x${v.height}`));
    const reconciled = reconcileCoverage(mapped.coverage, expectedIds, {
      expectedRules: PAGE_RUNTIME_RULES,
      explainedGlobally,
    });

    return {
      findings: [...unroutedFindings, ...mapped.findings, ...reconciled.findings],
      coverage: reconciled.coverage,
    };
  } catch (error) {
    return {
      findings: [...unroutedFindings, { rule: 'tests-setup', file: 'package.json', line: 1, message: `check-page --tests crashed: ${error.message}` }],
      coverage: {},
    };
  } finally {
    cleanup();
    delete process.env[PAGES_ENV];
  }
}

export function hasHardFailure(findings) {
  return findings.some((f) => HARD_FAILURE_RULES.has(f.rule));
}
