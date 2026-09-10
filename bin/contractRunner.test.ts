import { describe, it, expect, afterEach } from 'vitest';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import {
  hasHardFailure,
  mapPageResults,
  runPageTests,
  runPlaywrightSuite,
  timeoutFinding,
  writePlaywrightConfig,
} from './contractRunner.mjs';
import { PAGE_RULES } from './check-page.mjs';
import { applyCoverageSeverity } from './lib/findings.mjs';

// `npm test` runs before CI installs Chromium; the real-browser tests near
// the end of this file are guarded on it already being present, same
// reasoning as check-component.test.ts's own round trip.
let hasChromium = false;
try {
  const { chromium } = await import('@playwright/test');
  hasChromium = existsSync(chromium.executablePath());
} catch {
  hasChromium = false;
}

const roots: string[] = [];
function fixtureRoot(): string {
  const dir = mkdtempSync(join(tmpdir(), 'lt-page-check-'));
  roots.push(dir);
  return dir;
}
afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

/** `page-compliance.contract.ts` declares every test as a sibling at the
 *  suite's top level, never inside a describe block, unlike the component
 *  editor suite's per-component grouping. */
function pageReport(specs: Array<Record<string, unknown>>) {
  return { suites: [{ title: 'page-compliance.contract.ts', specs }] };
}

function pageSpec(title: string, test: Record<string, unknown>) {
  return {
    title,
    file: 'page-compliance.contract.ts',
    line: 35,
    tests: [{ status: 'expected', annotations: [], results: [{ status: 'passed', errors: [] }], ...test }],
  };
}

describe('mapPageResults: reading a page suite report', () => {
  it('maps a clean pass to coverage keyed by page@viewport and the bare rule id', () => {
    const report = pageReport([pageSpec('page-component-paint | src/app/Home.svelte | 1280x900', {})]);
    const mapped = mapPageResults(report);
    expect(mapped.findings).toEqual([]);
    expect(mapped.coverage).toEqual({
      'src/app/Home.svelte@1280x900': { 'page-component-paint': { status: 'passed' } },
    });
  });

  it("reads a Playwright test.skip() as inapplicable with its own reason, decision 10's status rather than a silent pass", () => {
    const report = pageReport([
      pageSpec('page-grid | src/app/Home.svelte | 390x844', {
        status: 'skipped',
        annotations: [{ type: 'skip', description: 'below 768px' }],
      }),
    ]);
    const mapped = mapPageResults(report);
    expect(mapped.findings).toEqual([]);
    expect(mapped.coverage['src/app/Home.svelte@390x844']['page-grid']).toEqual({
      status: 'inapplicable',
      reason: 'below 768px',
    });
  });

  it('parses a PageViolation into a finding at the page file and line, never the shipped suite', () => {
    const report = pageReport([
      pageSpec('page-overflow | src/app/Home.svelte | 390x844', {
        status: 'unexpected',
        results: [
          {
            status: 'failed',
            errors: [
              {
                message:
                  'PageViolation: [page-overflow] src/app/Home.svelte:12: the grid container overflows its viewport by 9px',
              },
            ],
          },
        ],
      }),
    ]);
    const mapped = mapPageResults(report);
    expect(mapped.findings).toEqual([
      expect.objectContaining({
        rule: 'page-overflow',
        file: 'src/app/Home.svelte',
        line: 12,
        message: 'the grid container overflows its viewport by 9px',
      }),
    ]);
    expect(mapped.coverage['src/app/Home.svelte@390x844']['page-overflow']).toEqual({ status: 'failed' });
  });

  it('a timeout or an interruption is tests-incomplete, not a page finding', () => {
    const report = pageReport([
      pageSpec('page-contrast | src/app/Home.svelte | 1280x900', {
        status: 'unexpected',
        results: [{ status: 'timedOut', errors: [] }],
      }),
    ]);
    const mapped = mapPageResults(report);
    expect(mapped.findings).toEqual([
      expect.objectContaining({ rule: 'tests-incomplete', message: expect.stringContaining('did not finish (timedOut)') }),
    ]);
    expect(mapped.coverage['src/app/Home.svelte@1280x900']['page-contrast']).toEqual({ status: 'failed' });
  });

  it('a missing browser short-circuits the whole run: one finding, no per-obligation noise, empty coverage', () => {
    const report = pageReport([
      pageSpec('page-grid | src/app/Home.svelte | 1280x900', {
        status: 'unexpected',
        results: [{ status: 'failed', errors: [{ message: "browserType.launch: Executable doesn't exist at /nope" }] }],
      }),
    ]);
    const mapped = mapPageResults(report);
    expect(mapped.findings).toEqual([
      { rule: 'tests-not-installed', file: 'package.json', line: 1, message: 'Chromium is not installed for Playwright. Run `npx playwright install chromium`.' },
    ]);
    expect(mapped.coverage).toEqual({});
  });

  it('zero collected tests, or a report-level error, is tests-incomplete and explains itself', () => {
    const zero = mapPageResults({ suites: [] });
    expect(zero.findings[0].rule).toBe('tests-incomplete');
    expect(zero.explained).toBe(true);

    const withError = mapPageResults({
      suites: [{ title: 'x', specs: [] }],
      errors: [{ message: 'Error: Process from config.webServer was not able to start. Exit code: 1' }],
    });
    expect(withError.findings[0].message).toContain('webServer');
    expect(withError.explained).toBe(true);
  });
});

describe("mapPageResults' coverage keying reaches --off, decision 9", () => {
  it("--off on a bare runtime rule id disables it in page coverage, proving the inner key is the rule PAGE_RULES actually has", () => {
    const report = pageReport([
      pageSpec('page-grid | src/app/Home.svelte | 1280x900', {
        status: 'unexpected',
        results: [{ status: 'failed', errors: [{ message: 'PageViolation: [page-grid] src/app/Home.svelte:9: off the line' }] }],
      }),
    ]);
    const { coverage } = mapPageResults(report);
    const resolved = applyCoverageSeverity(coverage, PAGE_RULES, { off: ['page-grid'] });
    expect(resolved['src/app/Home.svelte@1280x900']['page-grid']).toEqual({ status: 'disabled' });
  });
});

describe('timeoutFinding', () => {
  it('is tests-incomplete, naming the tool and the bound, never tests-setup', () => {
    const finding = timeoutFinding('Playwright', 15 * 60_000);
    expect(finding).toEqual({
      rule: 'tests-incomplete',
      file: 'package.json',
      line: 1,
      message: expect.stringContaining('Playwright did not finish within 15 minute'),
    });
  });
});

describe('writePlaywrightConfig', () => {
  it('carries only the page project selection at the CLI layer — the config itself, and a globalTimeout matching the bound', () => {
    const root = fixtureRoot();
    const configDir = mkdtempSync(join(tmpdir(), 'lt-page-cfg-'));
    try {
      const path = writePlaywrightConfig({ configDir, root, timeoutMs: 42_000 });
      const text = readFileSync(path, 'utf8');
      expect(text).toContain('createPlaywrightConfig');
      expect(text).toContain('globalTimeout: 42000');
    } finally {
      rmSync(configDir, { recursive: true, force: true });
    }
  });
});

describe('runPageTests: fast paths that never spawn a subprocess', () => {
  it('is an error, not a silent skip, when a required tool is missing', async () => {
    const root = fixtureRoot();
    const result = await runPageTests([{ source: 'src/app/Home.svelte', route: '/' }], { root });
    expect(result.findings.map((f: { rule: string }) => f.rule)).toEqual(['tests-not-installed', 'tests-not-installed', 'tests-not-installed']);
    expect(result.coverage).toEqual({});
  });

  it('reports nothing to test rather than guessing, for zero targets', async () => {
    const root = fixtureRoot();
    for (const pkg of ['@playwright/test', 'vitest', 'happy-dom']) {
      mkdirSync(join(root, 'node_modules', pkg), { recursive: true });
    }
    const result = await runPageTests([], { root });
    expect(result.findings).toEqual([
      { rule: 'tests-setup', file: 'package.json', line: 1, message: 'no page renders through a route yet; nothing for --tests to run' },
    ]);
  });

  it("an unrouted target (decision 3's 'no route renders this page') is its own tests-setup finding at the page file, and never reaches the suite", async () => {
    const root = fixtureRoot();
    for (const pkg of ['@playwright/test', 'vitest', 'happy-dom']) {
      mkdirSync(join(root, 'node_modules', pkg), { recursive: true });
    }
    const result = await runPageTests(
      [{ source: 'src/app/Orphan.svelte', route: null, reason: 'no route renders this page.' }],
      { root },
    );
    expect(result.findings).toEqual([
      { rule: 'tests-setup', file: 'src/app/Orphan.svelte', line: 1, message: 'no route renders this page.' },
    ]);
  });

  it('a bad root (no data directory to isolate) is tests-setup, not a raw crash', async () => {
    const root = fixtureRoot();
    for (const pkg of ['@playwright/test', 'vitest', 'happy-dom']) {
      mkdirSync(join(root, 'node_modules', pkg), { recursive: true });
    }
    const result = await runPageTests([{ source: 'src/app/Home.svelte', route: '/' }], { root });
    expect(result.findings).toEqual([expect.objectContaining({ rule: 'tests-setup' })]);
  });
});

describe('hasHardFailure reused for pages, unchanged from the component runner', () => {
  it('never lets --off silence the three shared setup rules', () => {
    expect(hasHardFailure([{ rule: 'tests-not-installed' }])).toBe(true);
    expect(hasHardFailure([{ rule: 'tests-setup' }])).toBe(true);
    expect(hasHardFailure([{ rule: 'tests-incomplete' }])).toBe(true);
    expect(hasHardFailure([{ rule: 'page-grid' }])).toBe(false);
  });
});

describe('runPlaywrightSuite: the deadline, root is this repo\'s own (a real @playwright/test to find)', () => {
  it('is interrupted at the deadline and reported as tests-incomplete rather than hanging the caller', async () => {
    const fixture = fixtureRoot();
    mkdirSync(join(fixture, 'tests'), { recursive: true });
    writeFileSync(join(fixture, 'tests/dummy.spec.ts'), "import { test, expect } from '@playwright/test';\ntest('noop', () => expect(1).toBe(1));\n");
    writeFileSync(
      join(fixture, 'hung.config.ts'),
      // A webServer command that never becomes reachable: Playwright waits on
      // it rather than launching a browser, so this proves the SIGINT/SIGKILL
      // watchdog in `runCli` without needing Chromium at all.
      "export default { testDir: './tests', webServer: { command: 'node -e \"setInterval(() => {}, 1000)\"', url: 'http://127.0.0.1:59987', reuseExistingServer: false, timeout: 60_000 } };\n",
    );
    const configDir = mkdtempSync(join(tmpdir(), 'lt-hung-'));
    try {
      const result = await runPlaywrightSuite({
        root: process.cwd(),
        configDir,
        playwrightConfigPath: join(fixture, 'hung.config.ts'),
        timeoutMs: 1_500,
      });
      expect(result.setupFinding).toEqual(
        expect.objectContaining({ rule: 'tests-incomplete', message: expect.stringContaining('Playwright') }),
      );
    } finally {
      rmSync(configDir, { recursive: true, force: true });
    }
  }, 20_000);
});

// The genuine round trip: real subprocess, real browser, real dev server,
// against this repo's own Home page — the ground truth Wave 2 and Wave 3's
// calibration records already establish (0 failures at 1280x900, one
// page-overflow at 390x844, this repo's twelve-column grid on a phone width).
// A from-scratch fixture project able to boot its own dev server belongs to
// Wave 5's consumer acceptance gate.
describe('runPageTests: real tools, this repo\'s own Home page', () => {
  it.skipIf(!hasChromium)('reports exactly the known page-overflow finding, nothing else', async () => {
    // `outputDir` resolves against `root` (this repo), so a failing test's
    // screenshot lands in the repo's own test-results/ — same seam
    // check-component.test.ts's own real round trip documents. Remove only
    // what this run added.
    const testResultsDir = join(process.cwd(), 'test-results');
    const beforeArtifacts = existsSync(testResultsDir) ? new Set(readdirSync(testResultsDir)) : null;
    try {
      const result = await runPageTests([{ source: 'src/app/Home.svelte', route: '/' }], { root: process.cwd() });
      expect(result.findings.every((f: { rule: string }) => f.rule === 'page-overflow')).toBe(true);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.coverage['src/app/Home.svelte@1280x900']['page-component-paint']).toEqual({ status: 'passed' });
      expect(result.coverage['src/app/Home.svelte@1280x900']['page-text-style']).toEqual(
        expect.objectContaining({ status: 'inapplicable' }),
      );
    } finally {
      if (existsSync(testResultsDir)) {
        for (const entry of readdirSync(testResultsDir)) {
          if (!beforeArtifacts?.has(entry)) rmSync(join(testResultsDir, entry), { recursive: true, force: true });
        }
      }
    }
  }, 120_000);
});
