import { defineConfig, devices } from '@playwright/test';

const host = '127.0.0.1';
const port = 4173;
const baseURL = `http://${host}:${port}`;

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
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run prepare:e2e && npm run dev -- --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      LIVE_TOKENS_E2E_DATA_DIR: '.playwright-data/live-tokens',
    },
  },
});
