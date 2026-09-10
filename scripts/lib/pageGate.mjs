// Orchestration + assertions for scripts/smoke-page-tests.sh. Pure Node, same
// reasoning as scripts/lib/componentGate.mjs: one throwaway consumer project
// is built from the real tarball, and what this proves is structural (JSON
// findings/coverage shapes, a directory hash unchanged across a passing and a
// failing run) rather than anything a shell pipeline is a good fit for.
//
// Kept to the template's own Home page in one clean state and one deliberately
// overridden state: scripts/lib/componentGate.mjs already measured what a
// full-catalogue batch costs, and this gate reuses that lesson rather than
// re-learning it.

import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

const PLAYWRIGHT_VERSION = '^1.62.1';
const VITEST_VERSION = '^4.1.4';
const HAPPY_DOM_VERSION = '^20.9.0';
const PAGE_SOURCE = 'src/pages/Home.svelte';

// Bounds the whole gate rather than any one child process: a hung `npm
// install` or a webServer that never becomes ready would otherwise hold a
// caller (this script has none today, but `prepublishOnly` does) open
// indefinitely. `LIVE_TOKENS_TESTS_TIMEOUT` (bin/contractRunner.mjs) already
// bounds the Playwright child inside `check-page --tests` itself; this is
// the outer bound on everything around it: npm install, chromium install,
// and the two CLI invocations together.
const GATE_DEADLINE_MS = 20 * 60_000;

let failures = 0;
let currentSection = 'startup';
const section = (title) => {
  currentSection = title;
  console.log(`\n→ ${title}`);
};
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

function cliBin(dir) {
  return join(dir, 'node_modules/@motion-proto/live-tokens/bin/cli.mjs');
}

function runCli(dir, args) {
  const result = spawnSync(process.execPath, [cliBin(dir), ...args], { cwd: dir, encoding: 'utf8' });
  let json = null;
  try { json = JSON.parse(result.stdout); } catch { /* not every case emits JSON on stdout alone */ }
  return { status: result.status, stdout: result.stdout, stderr: result.stderr, json };
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

async function buildFixture(workDir, tarballPath) {
  section('Scaffold: live-tokens create, the default settings');
  const dir = join(workDir, 'fixture');
  execFileSync(process.execPath, [join(workDir, 'package/bin/cli.mjs'), 'create', dir], { stdio: 'inherit' });
  addPeerDevDeps(dir, tarballPath);
  npmInstall(dir);
  // The workflow's Chromium install step runs before this gate; a runner
  // whose cache already has this build treats this as a no-op, the same
  // reasoning scripts/lib/componentGate.mjs records for its own call.
  execFileSync('npx', ['playwright', 'install', 'chromium'], { cwd: dir, stdio: 'inherit' });
  ok('scaffolded via the shipped create template and installed the tarball + test tools');
  return dir;
}

function runFixtureScenarios(dir) {
  section("The template's own Home page passes clean");
  {
    const before = hashDir(join(dir, 'src/live-tokens/data'));
    const result = runCli(dir, ['check-page', PAGE_SOURCE, '--tests', '--json']);
    const after = hashDir(join(dir, 'src/live-tokens/data'));
    clearTestResults(dir);
    check(before === after, 'source data (src/live-tokens/data) unchanged across a passing run');
    check(result.status === 0, `check-page --tests exits 0 (was ${result.status})`);
    check((result.json?.findings ?? []).length === 0, 'check-page --tests reports no findings');
    const coverage = result.json?.coverage ?? {};
    const keys = Object.keys(coverage);
    check(keys.length === 2, `coverage names the page at both viewports (has ${JSON.stringify(keys)})`);
    const statuses = Object.values(coverage).flatMap((rules) => Object.values(rules).map((r) => r.status));
    const badStatus = statuses.filter((s) => s !== 'passed' && s !== 'inapplicable');
    check(badStatus.length === 0, `every runtime rule is passed or inapplicable (${JSON.stringify(badStatus)})`);
  }

  section('A site.css override reaching past a Button fails page-component-paint');
  {
    const sitePath = join(dir, 'src/styles/site.css');
    const before = hashDir(join(dir, 'src/live-tokens/data'));
    let result;
    let after;
    try {
      result = withMutatedFile(
        sitePath,
        (src) => `${src}\n/* deliberate: the gate's own override defect */\nbutton {\n  border-top-width: var(--border-width-8) !important;\n}\n`,
        () => runCli(dir, ['check-page', PAGE_SOURCE, '--tests', '--json']),
      );
      // Hashed here, with the deliberate site.css override still restored by
      // withMutatedFile's own finally: site.css is not part of this hash, so
      // this is purely the isolated-copy invariant, not a repeat of it.
      after = hashDir(join(dir, 'src/live-tokens/data'));
    } finally {
      clearTestResults(dir);
    }
    check(before === after, 'source data unchanged across a failing run');
    check(result.status === 1, `check-page --tests exits 1 (was ${result.status})`);
    const findings = result.json?.findings ?? [];
    check(
      findings.length > 0 && findings.every((f) => f.rule === 'page-component-paint'),
      `every finding is page-component-paint (got ${JSON.stringify(findings.map((f) => f.rule))})`,
    );
    check(
      findings.every((f) => f.file === PAGE_SOURCE),
      `every finding anchors on the page file, not site.css (got ${JSON.stringify(findings.map((f) => f.file))})`,
    );
    const restored = readFileSync(sitePath, 'utf8');
    check(!restored.includes('deliberate: the gate'), 'site.css is restored to its shipped content after the run');
  }
}

// ─── entry point ─────────────────────────────────────────────────────────────

export async function runPageGate(tarballPath) {
  const workDir = mkdtempSync(join(tmpdir(), 'lt-page-gate-'));
  const cleanup = () => rmSync(workDir, { recursive: true, force: true });
  process.once('exit', cleanup);
  process.once('SIGINT', () => { cleanup(); process.exit(130); });
  process.once('SIGTERM', () => { cleanup(); process.exit(143); });

  const deadline = setTimeout(() => {
    console.error(`\n✗ Page gate exceeded its ${GATE_DEADLINE_MS / 60_000}-minute deadline during: ${currentSection}`);
    process.exit(1);
  }, GATE_DEADLINE_MS);

  try {
    execFileSync('tar', ['-xzf', tarballPath, '-C', workDir]);

    const dir = await buildFixture(workDir, tarballPath);
    runFixtureScenarios(dir);
  } finally {
    clearTimeout(deadline);
    cleanup();
  }

  if (failures > 0) {
    console.error(`\n✗ ${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log('\n✓ Consumer page-tests acceptance gate OK');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tarballPath = process.argv[2];
  if (!tarballPath) {
    console.error('usage: node pageGate.mjs <tarball-path>');
    process.exit(1);
  }
  await runPageGate(tarballPath);
}
