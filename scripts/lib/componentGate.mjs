// Orchestration + assertions for scripts/smoke-component-tests.sh. Pure Node
// (not bash) because most of what this proves is structural: JSON coverage
// shapes, directory-hash equality across a real subprocess boundary, and a
// SIGINT mid-run. Two throwaway consumer projects are built from the real
// tarball; nothing here resolves the library checkout's own node_modules.

import { spawn, spawnSync, execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE_SRC = join(REPO_ROOT, 'scripts/fixtures/component-tests');
const PLAYWRIGHT_VERSION = '^1.62.1';
const VITEST_VERSION = '^4.1.4';
const HAPPY_DOM_VERSION = '^20.9.0';

let failures = 0;
const section = (title) => console.log(`\n→ ${title}`);
const ok = (msg) => console.log(`  ✓ ${msg}`);
const bad = (msg) => {
  failures += 1;
  console.error(`  ✗ ${msg}`);
};

/** Throws nothing; every scenario keeps running so one mismatch doesn't hide
 *  the next. The script's exit code is the sum of `bad()` calls. */
function check(condition, msg) {
  if (condition) ok(msg);
  else bad(msg);
}

/** Throws on a missing directory rather than returning a sentinel: a
 *  before/after pair hashed as two equal sentinels would report "unchanged"
 *  for a directory that never existed either time. */
function hashDir(dir) {
  if (!existsSync(dir)) throw new Error(`hashDir: ${dir} does not exist`);
  const files = [];
  const walk = (d) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      if (entry.name === 'node_modules') continue;
      const p = join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else files.push(p);
    }
  };
  walk(dir);
  files.sort();
  const hash = createHash('sha256');
  for (const f of files) {
    hash.update(relative(dir, f));
    hash.update(readFileSync(f));
  }
  return hash.digest('hex');
}

function npmInstall(dir) {
  execFileSync('npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], {
    cwd: dir,
    stdio: 'inherit',
  });
}

function addPeerDevDeps(dir, tarballPath) {
  const pkgPath = join(dir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.dependencies['@motion-proto/live-tokens'] = `file:${tarballPath}`;
  Object.assign(pkg.devDependencies, {
    '@playwright/test': PLAYWRIGHT_VERSION,
    vitest: VITEST_VERSION,
    'happy-dom': HAPPY_DOM_VERSION,
  });
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
}

function addComponent(dir) {
  const componentsDir = join(dir, 'src/system/components');
  mkdirSync(componentsDir, { recursive: true });
  cpSync(join(FIXTURE_SRC, 'beacon/Beacon.svelte'), join(componentsDir, 'Beacon.svelte'));
  cpSync(join(FIXTURE_SRC, 'beacon/BeaconEditor.svelte'), join(componentsDir, 'BeaconEditor.svelte'));
  cpSync(join(FIXTURE_SRC, 'beacon/register.ts'), join(dir, 'src/live-tokens-components.ts'));
  cpSync(join(FIXTURE_SRC, 'beacon/contracts.ts'), join(dir, 'src/live-tokens-contracts.ts'));
  const mainPath = join(dir, 'src/main.ts');
  const main = readFileSync(mainPath, 'utf8');
  writeFileSync(
    mainPath,
    main.replace(
      "import App from './App.svelte';",
      "import App from './App.svelte';\nimport './live-tokens-components';",
    ),
  );
}

function writeTestingConfig(dir, { dataDir, componentsPath } = {}) {
  const lines = [
    "import { defineTestingConfig } from '@motion-proto/live-tokens/testing';",
    '',
    'export default defineTestingConfig({',
    ...(dataDir ? [`  dataDir: '${dataDir}',`] : []),
    "  registrySetup: 'src/live-tokens-components.ts',",
    "  contractsModule: 'src/live-tokens-contracts.ts',",
    ...(componentsPath ? [`  componentsPath: '${componentsPath}',`] : []),
    '});',
    '',
  ];
  writeFileSync(join(dir, 'live-tokens.testing.ts'), lines.join('\n'));
}

/** Boots the project's own `vite` (no live-tokens CLI involved) just long
 *  enough for themeFileApi's `configureServer` to run its at-startup
 *  `generateDefaultConfig` pass over every discovered component. That is the
 *  same file a normal `npm run dev` would produce; reading it back gives the
 *  defect fixtures below a real component-configs/<id>/default.json, schema
 *  version included, with this script never guessing or duplicating that
 *  number. */
async function seedRealDataDir(dir, port) {
  const child = spawn('npx', ['vite', '--port', String(port)], { cwd: dir, stdio: 'ignore' });
  await sleep(4000);
  child.kill('SIGTERM');
  await sleep(1000);
  try { child.kill('SIGKILL'); } catch { /* already gone */ }
}

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function cliBin(dir) {
  return join(dir, 'node_modules/@motion-proto/live-tokens/bin/cli.mjs');
}

function runCli(dir, args, env = {}) {
  const result = spawnSync(process.execPath, [cliBin(dir), ...args], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  });
  let json = null;
  try { json = JSON.parse(result.stdout); } catch { /* not every case emits JSON on stdout alone */ }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, json };
}

function coverageStatuses(coverage) {
  return Object.values(coverage).flatMap((rules) => Object.values(rules).map((r) => r.status));
}

function findingRules(json) {
  return (json?.findings ?? []).map((f) => f.rule);
}

function clearTestResults(dir) {
  rmSync(join(dir, 'test-results'), { recursive: true, force: true });
}

/** Runs `fn` with `path` replaced by `transform(original)`, restoring the
 *  original content in `finally` regardless of how `fn` returns. Throws if
 *  `transform` had no effect, so a stale string this file no longer contains
 *  fails loudly instead of quietly testing the unmutated original. */
function withMutatedFile(path, transform, fn) {
  const original = readFileSync(path, 'utf8');
  const mutated = transform(original);
  if (mutated === original) throw new Error(`withMutatedFile: transform had no effect on ${path}`);
  writeFileSync(path, mutated);
  try {
    return fn();
  } finally {
    writeFileSync(path, original);
  }
}

// ─── scenarios shared by both fixtures ──────────────────────────────────────

function scenarioCleanPass(dir, id, { expectSketchInapplicable = true, dataDir = 'src/live-tokens/data' } = {}) {
  const before = hashDir(join(dir, dataDir));
  const result = runCli(dir, ['check-component', id, '--tests', '--json']);
  const after = hashDir(join(dir, dataDir));
  clearTestResults(dir);
  check(before === after, `${id}: source data (${dataDir}) unchanged across a passing run`);
  check(result.status === 0, `${id} --tests exits 0 (was ${result.status})`);
  check((result.json?.findings ?? []).length === 0, `${id} --tests reports no findings`);
  const rules = result.json?.coverage?.[id] ?? {};
  const ruleIds = Object.keys(rules);
  check(ruleIds.length === 8, `${id}: coverage names all 8 contract rules (has ${ruleIds.length})`);
  const statuses = Object.entries(rules).map(([rule, e]) => [rule, e.status]);
  const badStatus = statuses.filter(([, s]) => s !== 'passed' && s !== 'inapplicable');
  check(badStatus.length === 0, `${id}: every rule is passed or inapplicable (${JSON.stringify(badStatus)})`);
  if (expectSketchInapplicable) {
    check(
      rules['contract-sketch']?.status === 'inapplicable' && !!rules['contract-sketch']?.reason,
      'beacon: contract-sketch is inapplicable with a reason (Sketch mode has no PART_SPECS entry for a custom component)',
    );
  }
  return result;
}

// ─── fixture A: default configuration, the create-template case ────────────

async function buildFixtureA(workDir, tarballPath) {
  section('Fixture A: live-tokens create + a custom component, default settings');
  const dir = join(workDir, 'fixture-a');
  execFileSync(process.execPath, [join(workDir, 'package/bin/cli.mjs'), 'create', dir], { stdio: 'inherit' });
  addPeerDevDeps(dir, tarballPath);
  npmInstall(dir);
  // The workflow's Chromium install step runs before `npm test`, well before
  // this gate. A CI runner's Playwright browser cache is keyed by browser
  // build, not by which project asked, so installing here is a no-op when
  // the workflow step (or a prior local run) already has it.
  execFileSync('npx', ['playwright', 'install', 'chromium'], { cwd: dir, stdio: 'inherit' });
  ok('scaffolded via the shipped create template and installed the tarball + test tools');
  return dir;
}

async function runFixtureAScenarios(dir) {
  section('Fixture A: zero targets before any component is authored');
  {
    const result = runCli(dir, ['check-component', '--tests', '--json']);
    check(result.status === 1, 'exits 1');
    check(findingRules(result.json).length === 1 && findingRules(result.json)[0] === 'tests-setup', 'reports one tests-setup finding');
    check(
      /no component authored/.test(result.json?.findings?.[0]?.message ?? ''),
      'names the reason: nothing authored yet',
    );
  }

  section('Fixture A: author Beacon, wire registration + testing config');
  addComponent(dir);
  // No dataDir here, unlike fixture B: this is what exercises
  // resolveSourceDataDir's own default branch (settings absent, then
  // live-tokens.config.json absent, then `src/live-tokens/data`). Fixture B
  // covers the plain-string settings assertion for a stated value.
  writeTestingConfig(dir, {});
  const goodTestingConfig = readFileSync(join(dir, 'live-tokens.testing.ts'), 'utf8');
  check(!/dataDir/.test(goodTestingConfig), 'live-tokens.testing.ts names no dataDir, so the default-resolution branch runs');
  {
    const result = spawnSync(process.execPath, [cliBin(dir), 'check-component', 'beacon'], { cwd: dir, encoding: 'utf8' });
    check(result.status === 0 && /passes the live-tokens-create-component contract/.test(result.stdout), 'the static lint (no --tests) passes for beacon');
  }

  section('Fixture A: seed real component-configs from the running dev server');
  await seedRealDataDir(dir, 51730);
  const seededBeacon = JSON.parse(readFileSync(join(dir, 'src/live-tokens/data/component-configs/beacon/default.json'), 'utf8'));
  check(Object.keys(seededBeacon.aliases).length === 24, 'beacon default.json carries all 24 declared aliases');
  const schemaVersion = seededBeacon.schemaVersion;

  section('Fixture A: missing test tool is a finding, not a crash');
  {
    const playwrightDir = join(dir, 'node_modules/@playwright/test');
    const stash = `${playwrightDir}.stash`;
    execFileSync('mv', [playwrightDir, stash]);
    let result;
    try {
      result = runCli(dir, ['check-component', 'beacon', '--tests', '--json']);
    } finally {
      execFileSync('mv', [stash, playwrightDir]);
    }
    check(result.status === 1, 'exits 1');
    check(findingRules(result.json).length === 1 && findingRules(result.json)[0] === 'tests-not-installed', 'reports tests-not-installed');
  }

  section('Fixture A: a dataDir that resolves to nothing is a setup finding');
  {
    const testingPath = join(dir, 'live-tokens.testing.ts');
    writeTestingConfig(dir, { dataDir: 'this-directory-does-not-exist' });
    let result;
    try {
      result = runCli(dir, ['check-component', 'beacon', '--tests', '--json']);
    } finally {
      writeFileSync(testingPath, goodTestingConfig);
    }
    check(result.status === 1, 'exits 1');
    check(findingRules(result.json).length === 1 && findingRules(result.json)[0] === 'tests-setup', 'reports tests-setup');
    check(/No data directory at/.test(result.json?.findings?.[0]?.message ?? ''), 'names the missing directory');
  }

  section('Fixture A: beacon passes end to end (the custom-component + create-template case)');
  scenarioCleanPass(dir, 'beacon');

  section('Fixture A: a shipped component through the same consumer command');
  {
    const before = hashDir(join(dir, 'src/live-tokens/data'));
    const result = runCli(dir, ['check-component', 'toggle', '--tests', '--json']);
    const after = hashDir(join(dir, 'src/live-tokens/data'));
    clearTestResults(dir);
    check(before === after, 'toggle: source data unchanged');
    // A shipped id names no file in a consumer's own tree, so the lint falls
    // back to the package. This is the scenario that caught the missing
    // fallback: it used to report two missing-file findings here while the
    // contract run beside it was green.
    const rules = findingRules(result.json);
    check(
      rules.length === 0,
      `the lint resolves a shipped id against the package (got ${JSON.stringify(rules)})`,
    );
    check(result.status === 0, `toggle --tests exits 0 (was ${result.status})`);
    const toggleCoverage = result.json?.coverage?.toggle ?? {};
    const statuses = Object.values(toggleCoverage).map((e) => e.status);
    check(
      statuses.length === 8 && statuses.every((s) => s === 'passed'),
      'the contract run is fully green for the shipped id',
    );
  }

  // No omitted-id `--tests` batch here. Measured on the 27-component run this
  // wave carried until now: 729 of 800 seconds, re-proving components
  // `npm run test:e2e:contract` already covers here in 2.5 minutes. There is
  // no cheaper substitute: omitted-id reconciliation (bin/contractRunner.mjs's
  // `expectedIds`) merges the consumer's own discovery with
  // `discoverComponents(PKG_ROOT)`, but the browser suites iterate
  // `selectedContracts()`, whose only narrowing input is `LIVE_TOKENS_COMPONENT`
  // (single-id). With that env var unset, `shippedContracts`, the compiled
  // 26-entry array the tarball ships, runs in full; nothing shrinks it for an
  // omitted-id run. (The plain lint's own `check-component --json` batch is
  // not a substitute either: measured at `checked: 1` for this fixture, since
  // `discoverComponents()` reads only the consumer's own src/system/components
  // and never crosses into the package at all.) `expectedIds` reconciliation
  // and `workers: 1` serialization are unit-tested with small, fast fixtures
  // in bin/check-component.test.ts; this gate's single-id beacon and toggle
  // scenarios above already cross the tarball boundary for a custom and a
  // shipped id respectively.

  section('Fixture A: a broken alias on the consumer\'s own component');
  {
    const configPath = join(dir, 'src/live-tokens/data/component-configs/beacon/default.json');
    const good = JSON.parse(readFileSync(configPath, 'utf8'));
    const broken = { ...good, schemaVersion, aliases: { ...good.aliases, '--beacon-track-surface': '--nonexistent-token-xyz' } };
    writeFileSync(configPath, JSON.stringify(broken, null, 2));
    const before = hashDir(join(dir, 'src/live-tokens/data'));
    let result;
    let after;
    try {
      result = runCli(dir, ['check-component', 'beacon', '--tests', '--json']);
      // Hashed here, with the deliberate defect still in place: this is what
      // proves the CLI run itself changed nothing. Restoring first would
      // compare the broken "before" against the restored "after" and always
      // report a mismatch that has nothing to do with the run under test.
      after = hashDir(join(dir, 'src/live-tokens/data'));
    } finally {
      writeFileSync(configPath, JSON.stringify(good, null, 2));
    }
    clearTestResults(dir);
    check(before === after, 'source data unchanged across a failing run');
    check(result.status === 1, 'exits 1');
    const findings = result.json?.findings ?? [];
    check(findings.length === 1 && findings[0].rule === 'contract-alias', `exactly one contract-alias finding (got ${JSON.stringify(findings.map((f) => f.rule))})`);
    check(findings[0]?.file === 'src/live-tokens/data/component-configs/beacon/default.json', 'the finding names the real config file');
    check(typeof findings[0]?.line === 'number' && findings[0].line > 1, 'the finding names a real line, not the line-1 fallback');
    const rules = result.json?.coverage?.beacon ?? {};
    check(rules['contract-alias']?.status === 'failed', 'coverage marks contract-alias failed');
    check(rules['contract-render']?.status === 'passed', 'the separate always-run render suite still passes cleanly');
    for (const rule of ['contract-preview', 'contract-persist', 'contract-theme', 'contract-sketch']) {
      check(rules[rule]?.status === 'incomplete', `describe.serial's cascade marks ${rule} incomplete, not silently missing`);
    }
  }

  section('Fixture A: a duplicate alias name anywhere in the catalogue fails every check');
  {
    const twinPath = join(dir, 'src/system/components/BeaconTwin.svelte');
    cpSync(join(FIXTURE_SRC, 'beacon/BeaconTwin.svelte'), twinPath);
    const before = hashDir(join(dir, 'src/live-tokens/data'));
    let result;
    try {
      result = runCli(dir, ['check-component', 'beacon', '--tests', '--json']);
    } finally {
      rmSync(twinPath);
    }
    const after = hashDir(join(dir, 'src/live-tokens/data'));
    clearTestResults(dir);
    check(before === after, 'source data unchanged across a failing catalogue-wide run');
    check(result.status === 1, 'exits 1');
    const findings = result.json?.findings ?? [];
    check(findings.length === 1, `exactly one finding (got ${findings.length})`);
    check(findings[0]?.rule === 'contract-alias', 'the rule id is contract-alias');
    check(findings[0]?.file === 'package.json', 'no consumer artifact names this failure; the rule id alone identifies it');
    const rules = result.json?.coverage?.beacon ?? {};
    const statuses = Object.values(rules).map((e) => e.status);
    check(
      statuses.length === 8 && statuses.every((s) => s === 'passed' || s === 'inapplicable'),
      'the requested component\'s own coverage stays complete: this finding carries no coverage entry',
    );
  }

  // The three scenarios above all trip contract-alias. bin/contractRunner.mjs
  // resolves a finding's file three different ways depending on the rule
  // (alias|persist|theme to the config JSON, listed to editorPath,
  // render|preview|sketch to runtimePath, per artifactForContractRule at
  // :496-509), and the render/alias suites are told apart in the compiled
  // build only by their own output filename (structuralRule, :519-527). None
  // of that is proven by an alias-only gate. Registry crosses a second child
  // process, report format, and result mapper the alias/render scenarios
  // never touch. Persist and theme are implied by alias's already-proven
  // config-JSON branch. Sketch cannot be tripped on a component Sketch mode
  // does not draw (contract-sketch reads inapplicable for Beacon, above).

  section('Fixture A: a broken registration fails the registry contract');
  {
    const registerPath = join(dir, 'src/live-tokens-components.ts');
    const before = hashDir(join(dir, 'src/live-tokens/data'));
    const result = withMutatedFile(
      registerPath,
      (src) => src.replace(
        "sourceFile: 'src/system/components/Beacon.svelte',",
        "sourceFile: 'src/system/components/DoesNotExist.svelte',",
      ),
      () => runCli(dir, ['check-component', 'beacon', '--tests', '--json']),
    );
    const after = hashDir(join(dir, 'src/live-tokens/data'));
    clearTestResults(dir);
    check(before === after, 'source data unchanged across a failing registry run');
    check(result.status === 1, 'exits 1');
    const findings = result.json?.findings ?? [];
    check(
      findings.length === 1 && findings[0].rule === 'contract-registry',
      `exactly one contract-registry finding (got ${JSON.stringify(findings.map((f) => f.rule))})`,
    );
    check(/does not resolve to a file/.test(findings[0]?.message ?? ''), 'names the unresolved sourceFile');
    const rules = result.json?.coverage?.beacon ?? {};
    check(rules['contract-registry']?.status === 'failed', 'coverage marks contract-registry failed');
    const others = Object.entries(rules).filter(([rule]) => rule !== 'contract-registry');
    check(
      others.length === 7 && others.every(([, e]) => e.status === 'passed' || e.status === 'inapplicable'),
      'every other rule still runs and passes: the defect is isolated to the Vitest child',
    );
  }

  section('Fixture A: a property mapped to the wrong part fails contract-render');
  {
    const contractsPath = join(dir, 'src/live-tokens-contracts.ts');
    const before = hashDir(join(dir, 'src/live-tokens/data'));
    const result = withMutatedFile(
      contractsPath,
      (src) => src.replace(
        "root: { columnGap: '--beacon-gap' },",
        "root: { columnGap: '--beacon-gap', backgroundColor: '--beacon-track-surface' },",
      ),
      () => runCli(dir, ['check-component', 'beacon', '--tests', '--json']),
    );
    const after = hashDir(join(dir, 'src/live-tokens/data'));
    clearTestResults(dir);
    check(before === after, 'source data unchanged across a failing render run');
    check(result.status === 1, 'exits 1');
    const findings = result.json?.findings ?? [];
    check(
      findings.length === 1 && findings[0].rule === 'contract-render',
      `exactly one contract-render finding (got ${JSON.stringify(findings.map((f) => f.rule))})`,
    );
    check(findings[0]?.file === 'src/system/components/Beacon.svelte', 'the finding names the runtime file: the branch this rule takes');
    const rules = result.json?.coverage?.beacon ?? {};
    check(rules['contract-render']?.status === 'failed', 'coverage marks contract-render failed');
    const others = Object.entries(rules).filter(([rule]) => rule !== 'contract-render');
    check(
      others.length === 7 && others.every(([, e]) => e.status === 'passed' || e.status === 'inapplicable'),
      'the editor-suite describe.serial block is untouched: this obligation runs outside it',
    );
  }

  section('Fixture A: the wrong registry group fails contract-listed');
  {
    const contractsPath = join(dir, 'src/live-tokens-contracts.ts');
    const before = hashDir(join(dir, 'src/live-tokens/data'));
    const result = withMutatedFile(
      contractsPath,
      (src) => src.replace("origin: 'custom',", "origin: 'system',"),
      () => runCli(dir, ['check-component', 'beacon', '--tests', '--json']),
    );
    const after = hashDir(join(dir, 'src/live-tokens/data'));
    clearTestResults(dir);
    check(before === after, 'source data unchanged across a failing listed run');
    check(result.status === 1, 'exits 1');
    const findings = result.json?.findings ?? [];
    check(
      findings.length === 1 && findings[0].rule === 'contract-listed',
      `exactly one contract-listed finding (got ${JSON.stringify(findings.map((f) => f.rule))})`,
    );
    check(
      findings[0]?.file === 'src/system/components/BeaconEditor.svelte' && findings[0]?.line === 1,
      'the finding names the editor file at the line-1 fallback: positional index 0 carries no reporter location',
    );
    const rules = result.json?.coverage?.beacon ?? {};
    check(Object.keys(rules).length === 8, 'coverage still names all 8 rules');
    check(rules['contract-listed']?.status === 'failed', 'coverage marks contract-listed failed');
    check(rules['contract-registry']?.status === 'passed', 'the registry check does not read the contract fixture\'s origin');
    check(rules['contract-render']?.status === 'passed', 'the separate always-run render suite is unaffected by origin');
    for (const rule of ['contract-alias', 'contract-preview', 'contract-persist', 'contract-theme', 'contract-sketch']) {
      check(rules[rule]?.status === 'incomplete', `listed is the first obligation in the serial block, so its failure cascades ${rule} to incomplete too`);
    }
  }

  section('Fixture A: interrupting a run cleans up and leaves the source tree untouched');
  {
    const before = hashDir(join(dir, 'src/live-tokens/data'));
    const child = spawn(process.execPath, [cliBin(dir), 'check-component', 'beacon', '--tests', '--json'], { cwd: dir });
    const exited = new Promise((res) => child.once('exit', (code, signal) => res({ code, signal })));
    await sleep(6000);
    // Without this, a run that never got as far as isolating the data
    // directory would still pass the leftover check below: an empty set is
    // vacuously free of live-tokens-check-* entries.
    const midRunTemp = readdirSync(tmpdir()).filter((n) => n.startsWith('live-tokens-check-'));
    check(midRunTemp.length > 0, `the run had created its isolated copy before the signal (found ${midRunTemp.length})`);
    child.kill('SIGINT');
    const outcome = await exited;
    const after = hashDir(join(dir, 'src/live-tokens/data'));
    clearTestResults(dir);
    check(before === after, 'source data unchanged after SIGINT');
    check(outcome.code === 130 || outcome.signal === 'SIGINT', `the process actually stopped (code=${outcome.code}, signal=${outcome.signal})`);
    const leftoverTemp = readdirSync(tmpdir()).filter((n) => n.startsWith('live-tokens-check-'));
    check(leftoverTemp.length === 0, `no leftover live-tokens-check-* temp directories (found ${leftoverTemp.length})`);
  }
}

// ─── fixture B: relocated dataDir + relocated components route ─────────────

async function buildFixtureB(workDir, tarballPath) {
  section('Fixture B: relocated dataDir (plain string) + relocated components route');
  const dir = join(workDir, 'fixture-b');
  execFileSync(process.execPath, [join(workDir, 'package/bin/cli.mjs'), 'create', dir], { stdio: 'inherit' });
  addPeerDevDeps(dir, tarballPath);
  npmInstall(dir);
  addComponent(dir);
  const appPath = join(dir, 'src/App.svelte');
  writeFileSync(appPath, readFileSync(appPath, 'utf8').replace('<LiveTokensRouter {pages} />', "<LiveTokensRouter {pages} editorRoutes={{ components: '/design' }} />"));

  // Seed the DEFAULT (unrelocated) path as a decoy with a broken alias, via a
  // real dev-server boot under the plugin's own default resolution (no
  // live-tokens.testing.ts influences a plain `vite` boot). If the settings
  // resolver's source-text scrape ever falls back to this path instead of the
  // relocated one below, this is what turns that into a loud contract-alias
  // failure instead of a silent pass against the wrong tree.
  await seedRealDataDir(dir, 51740);
  const decoyPath = join(dir, 'src/live-tokens/data/component-configs/beacon/default.json');
  const decoy = JSON.parse(readFileSync(decoyPath, 'utf8'));
  decoy.aliases['--beacon-track-surface'] = '--nonexistent-decoy-token';
  writeFileSync(decoyPath, JSON.stringify(decoy, null, 2));

  mkdirSync(join(dir, 'lt-data-relocated'), { recursive: true });
  writeTestingConfig(dir, { dataDir: 'lt-data-relocated', componentsPath: '/design' });
  ok('scaffolded, decoy default.json seeded at the unrelocated path, relocated path left empty');
  return dir;
}

function runFixtureBScenarios(dir) {
  section('Fixture B: the relocated settings resolve correctly and the decoy is never touched');
  const testingSrc = readFileSync(join(dir, 'live-tokens.testing.ts'), 'utf8');
  check(/dataDir:\s*'lt-data-relocated'/.test(testingSrc), 'live-tokens.testing.ts states the relocated dataDir as a plain string');
  // The decoy, at the default (unrelocated) path, is hashed separately here:
  // scenarioCleanPass below already proves the tree under test (the
  // relocated one) is unchanged, so hashing the decoy there too would just
  // repeat that assertion under a different name. This one is the distinct
  // claim: the decoy was never read in the first place.
  const beforeDecoy = hashDir(join(dir, 'src/live-tokens/data'));
  scenarioCleanPass(dir, 'beacon', { dataDir: 'lt-data-relocated' });
  const afterDecoy = hashDir(join(dir, 'src/live-tokens/data'));
  check(beforeDecoy === afterDecoy, 'the decoy at the default path is untouched: it was never read');
}

// ─── entry point ─────────────────────────────────────────────────────────────

export async function runComponentGate(tarballPath) {
  const workDir = mkdtempSync(join(tmpdir(), 'lt-component-gate-'));
  const cleanup = () => rmSync(workDir, { recursive: true, force: true });
  process.once('exit', cleanup);
  process.once('SIGINT', () => { cleanup(); process.exit(130); });
  process.once('SIGTERM', () => { cleanup(); process.exit(143); });

  try {
    execFileSync('tar', ['-xzf', tarballPath, '-C', workDir]);

    const fixtureA = await buildFixtureA(workDir, tarballPath);
    await runFixtureAScenarios(fixtureA);

    const fixtureB = await buildFixtureB(workDir, tarballPath);
    runFixtureBScenarios(fixtureB);
  } finally {
    cleanup();
  }

  if (failures > 0) {
    console.error(`\n✗ ${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\n✓ Consumer component-tests acceptance gate OK');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tarballPath = process.argv[2];
  if (!tarballPath) {
    console.error('usage: node componentGate.mjs <tarball-path>');
    process.exit(1);
  }
  await runComponentGate(tarballPath);
}
