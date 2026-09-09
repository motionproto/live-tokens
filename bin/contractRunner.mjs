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

function configuredDataDir(root) {
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

/**
 * Removes `paths` on completion, on an uncaught exception, and on SIGINT or
 * SIGTERM. The signal handlers remove their own listener and re-send the
 * signal to this process rather than just cleaning up and returning: any
 * listener at all cancels Node's default terminate-on-signal behaviour, so a
 * handler that only cleans up would swallow the first Ctrl+C in a process
 * that installed no other SIGINT listener.
 */
function withCleanup(paths) {
  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    for (const path of paths) rmSync(path, { recursive: true, force: true });
  };
  const onSignal = (signal) => {
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

/**
 * A generated config's own extensionless relative imports (Vite/Playwright's
 * loaders resolve those, matching how this repo's own `vite.config.ts` and
 * `live-tokens.testing.ts` are written) only get that treatment for a
 * *static* import. A dynamic `import()` of the same path, called after a Vite
 * config finishes loading, runs through plain Node resolution instead and
 * fails on the same files — proven against `vitest.contract.config.ts` while
 * building this runner. So every module a generated config needs is a static
 * import, resolved to an absolute path at generation time.
 */
function guessViteConfigPath(root, settingsPath) {
  if (settingsPath) {
    try {
      const m = /viteConfig\s*:\s*['"]([^'"]+)['"]/.exec(readFileSync(settingsPath, 'utf8'));
      if (m) return resolve(root, m[1]);
    } catch {
      // Falls through to the default below.
    }
  }
  return resolve(root, 'vite.config.ts');
}

function writeGeneratedConfigs({ configDir, root }) {
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
  const settingsExpr = settingsPath ? '(settingsModule.default ?? {})' : '{}';

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

  // `resolveTestingConfig` recomputes `settings.viteConfig`, which is only
  // used below for `registrySetup` — the Vite config module itself is a
  // static import already resolved by `guessViteConfigPath`, above.
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
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    child.on('close', (code) => resolveRun({ code, stdout, stderr }));
    child.on('error', (error) => resolveRun({ code: -1, stdout, stderr: `${stderr}\n${error.message}` }));
  });
}

function setupFinding(tool, code, stdout, stderr) {
  const combined = `${stdout}\n${stderr}`;
  if (/Executable doesn't exist/.test(combined)) {
    return {
      rule: 'tests-not-installed',
      file: 'package.json',
      line: 1,
      message: 'Chromium is not installed for Playwright. Run `npx playwright install chromium`.',
    };
  }
  return {
    rule: 'tests-setup',
    file: 'package.json',
    line: 1,
    message: `${tool} exited with code ${code} before producing a report.\n${combined.trim().slice(-2000)}`,
  };
}

async function runPlaywrightSuite({ root, env, playwrightConfigPath, configDir }) {
  const reportPath = join(configDir, 'playwright-report.json');
  const bin = peerBin(root, '@playwright/test', 'cli.js');
  const { code, stdout, stderr } = await runCli(
    process.execPath,
    [bin, 'test', '-c', playwrightConfigPath, '--reporter=json'],
    { cwd: root, env: { ...env, PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath } },
  );
  if (!existsSync(reportPath)) return { setupFinding: setupFinding('Playwright', code, stdout, stderr) };
  try {
    return { report: JSON.parse(readFileSync(reportPath, 'utf8')) };
  } catch (error) {
    return { setupFinding: setupFinding('Playwright', code, stdout, `report at ${reportPath} did not parse: ${error.message}`) };
  }
}

async function runRegistrySuite({ root, env, vitestConfigPath, configDir }) {
  const reportPath = join(configDir, 'vitest-report.json');
  const bin = peerBin(root, 'vitest', 'vitest.mjs');
  const { code, stdout, stderr } = await runCli(
    process.execPath,
    [bin, 'run', '--config', vitestConfigPath, '--reporter=json', '--outputFile', reportPath],
    { cwd: root, env },
  );
  if (!existsSync(reportPath)) return { setupFinding: setupFinding('Vitest', code, stdout, stderr) };
  try {
    return { report: JSON.parse(readFileSync(reportPath, 'utf8')) };
  } catch (error) {
    return { setupFinding: setupFinding('Vitest', code, stdout, `report at ${reportPath} did not parse: ${error.message}`) };
  }
}

// ─── result mapping: shared ─────────────────────────────────────────────────

const TOKEN_RE = /(--[a-z0-9-]+)/;

export function extractToken(message) {
  return TOKEN_RE.exec(message ?? '')?.[1] ?? null;
}

/** The real line a token sits on, found by literal search — never invented.
 *  Falls back to line 1 (decision 8's documented fallback) when the token is
 *  absent from the message or the artifact does not carry it. */
export function findTokenLine(filePath, token) {
  if (!token || !existsSync(filePath)) return 1;
  const text = readFileSync(filePath, 'utf8');
  const at = text.indexOf(token);
  return at >= 0 ? lineOf(text, at) : 1;
}

function componentConfigPath(sourceDataDir, id) {
  return join(sourceDataDir, 'component-configs', id, 'default.json');
}

// ─── result mapping: Playwright ─────────────────────────────────────────────

// Every obligation `component-editor.contract.ts` names, its test title's
// stable suffix mapped to the rule it exercises. Assertions inside the
// harness throw `ContractViolation` (a `[rule]` prefix on the message), so
// this table only catches the few plain `expect()` failures that don't:
// zero-property contracts, the two catalogue-level render tests, and the
// alias fan-out test, none of which throw through the harness.
const TITLE_RULES = [
  [/is listed in its registry group$/, 'contract-listed'],
  [/declares every part and every shipped alias$/, 'contract-alias'],
  [/resolves every alias it paints with$/, 'contract-alias'],
  [/previews the state being edited$/, 'contract-preview'],
  [/answers the pointer and the keyboard$/, 'contract-preview'],
  [/persists an edit and resets to the saved config$/, 'contract-persist'],
  [/takes the theme's values and gives them back$/, 'contract-theme'],
  [/draws every painted part in Sketch mode$/, 'contract-sketch'],
  [/paints each declared property on its declared part$/, 'contract-render'],
  [/repaints every property in its standardized runtime preview$/, 'contract-render'],
  [/fans out set, update, and remove to the document root$/, 'contract-alias'],
  [/covers every alias exactly once$/, 'contract-alias'],
];

export function ruleForSpecTitle(title) {
  return TITLE_RULES.find(([re]) => re.test(title))?.[1] ?? null;
}

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

export function readPlaywrightEntries(report) {
  const out = [];
  const walk = (suite, titles) => {
    for (const child of suite.suites ?? []) walk(child, [...titles, child.title]);
    for (const spec of suite.specs ?? []) {
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          out.push({ describeTitles: titles, specTitle: spec.title, specFile: spec.file, specLine: spec.line, result });
        }
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

const VIOLATION_RE = /^ContractViolation:\s*\[([a-z-]+)\]\s+([a-z0-9]+):\s*([\s\S]*)$/;

export function mapPlaywrightResults(entries, { root, sourceDataDir, knownIds }) {
  const findings = [];
  const coverage = {};
  const markCoverage = (id, rule, status, reason) => {
    if (!id || !rule) return;
    coverage[id] ??= {};
    coverage[id][rule] = reason ? { status, reason } : { status };
  };

  for (const { describeTitles, specTitle, specFile, specLine, result } of entries) {
    const componentId = identifyComponent(describeTitles, specTitle, knownIds);
    const inapplicable = (result.annotations ?? []).find((a) => a.type === 'inapplicable')?.description;
    const titleRule = ruleForSpecTitle(specTitle);

    if (result.status === 'passed') {
      markCoverage(componentId, titleRule, inapplicable ? 'inapplicable' : 'passed', inapplicable);
      continue;
    }
    // `describe.serial` skips the rest of a component's obligations after its
    // first failure; that failure already carries the finding, so a skip here
    // is expected fallout rather than a second thing to report.
    if (result.status === 'skipped') continue;

    const rawErrors = result.errors?.length ? result.errors : [{ message: `${result.status}: ${specTitle}` }];
    for (const error of rawErrors) {
      const firstLine = String(error.message ?? '').split('\n')[0].trim();
      const violation = VIOLATION_RE.exec(firstLine);
      const rule = violation?.[1] ?? titleRule ?? 'tests-setup';
      const id = violation?.[2] ?? componentId;
      const message = violation?.[3] ?? firstLine;
      const token = extractToken(message);
      const { file, line } = artifactForContractRule(root, sourceDataDir, rule, id, token);
      findings.push({
        rule,
        file,
        line,
        message: id ? `${id}: ${message}` : message,
        context: {
          suite: 'playwright',
          title: [...describeTitles, specTitle].join(' > '),
          suiteFile: specFile,
          suiteLine: specLine,
        },
      });
      markCoverage(id, rule, 'failed');
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

export function mapVitestResults(report, { root, sourceDataDir }) {
  const findings = [];
  const coverage = {};
  for (const file of report.testResults ?? []) {
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

// ─── entry point ────────────────────────────────────────────────────────────

export async function runContractTests(id, { root = process.cwd() } = {}) {
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

  const sourceDataDir = configuredDataDir(root);
  const dataDir = copyIsolatedDataDir(sourceDataDir);
  const configDir = mkdtempSync(join(tmpdir(), 'live-tokens-check-cfg-'));
  const cleanup = withCleanup([dataDir, configDir]);

  try {
    const { playwrightConfigPath, vitestConfigPath } = writeGeneratedConfigs({ configDir, root });
    const env = { ...process.env, [TEST_DATA_DIR_ENV]: dataDir, [DATA_DIR_ENV]: dataDir };
    if (id) env[COMPONENT_ENV] = id;
    else delete env[COMPONENT_ENV];

    const knownIds = new Set([...discoverComponents(root), ...discoverComponents(PKG_ROOT)]);

    // Sequential: both share the one isolated data directory, and the
    // registry run's own Vite instance and the Playwright run's dev server
    // would otherwise regenerate the same derived files concurrently.
    const registryOutcome = await runRegistrySuite({ root, env, vitestConfigPath, configDir });
    const playwrightOutcome = await runPlaywrightSuite({ root, env, playwrightConfigPath, configDir });

    const registryMapped = registryOutcome.setupFinding
      ? { findings: [registryOutcome.setupFinding], coverage: {} }
      : mapVitestResults(registryOutcome.report, { root, sourceDataDir });
    const playwrightMapped = playwrightOutcome.setupFinding
      ? { findings: [playwrightOutcome.setupFinding], coverage: {} }
      : mapPlaywrightResults(readPlaywrightEntries(playwrightOutcome.report), { root, sourceDataDir, knownIds });

    return {
      findings: [...registryMapped.findings, ...playwrightMapped.findings],
      coverage: mergeCoverage(registryMapped.coverage, playwrightMapped.coverage),
    };
  } finally {
    cleanup();
  }
}

export function hasHardFailure(findings) {
  return findings.some((f) => HARD_FAILURE_RULES.has(f.rule));
}
