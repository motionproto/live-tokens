import { defineConfig, devices } from '@playwright/test';

const host = '127.0.0.1';
const port = 4173;
const baseURL = `http://${host}:${port}`;
const e2eDataDir = '.playwright-data/live-tokens';

// `discoverDefaultAliases()` in the contract suites reads component configs
// from disk in the test runner's own process (not the browser), so it needs
// this set here too — the `webServer.env` below only reaches the spawned dev
// server.
process.env.LIVE_TOKENS_DATA_DIR = e2eDataDir;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  // One worker is the safe default: the stateful specs share a dev server and
  // a data directory. Only the contract specs opt out, via the worker count
  // their npm script passes.
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  // A shared-server, single-worker suite times out under CI load in ways it
  // never does locally. Without a retry budget one wobble aborts a tagged
  // release, and `Refuse to republish` makes a re-tag the only recovery.
  retries: process.env.CI ? 2 : 0,
  outputDir: 'test-results/playwright',
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // `retain-on-failure` still records every passing test and throws the file
    // away, which costs ~28% CPU. That is free on a workstation with spare
    // cores and not free on a saturated CI runner, where these specs are
    // already frame-rate bound. Match the trace policy instead.
    video: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: '**/contract-defects/**',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Repo-only: proves each obligation fails with the rule it names. Kept
      // out of the shipped project so a consumer never runs the defects.
      name: 'contract-defects',
      testDir: './tests/e2e/contract-defects',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'contract',
      testDir: './src/testing',
      testMatch: '**/component-*.contract.ts',
      // The owned route renders full-page (no overlay chrome shrinking it), so
      // a tall preview's sticky header can cover the property panel below it
      // at the 720px default — verified empirically against every shipped
      // component's tallest view.
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: `npm run prepare:e2e && npm run dev -- --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      LIVE_TOKENS_E2E_DATA_DIR: e2eDataDir,
    },
  },
});
