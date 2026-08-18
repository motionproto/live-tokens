import { defineConfig, devices } from '@playwright/test';

const host = '127.0.0.1';
const port = 4173;
const baseURL = `http://${host}:${port}`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
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
    video: 'retain-on-failure',
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
