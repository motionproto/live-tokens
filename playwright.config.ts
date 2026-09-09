import { devices } from '@playwright/test';
import { createPlaywrightConfig } from './src/testing';
import settings from './live-tokens.testing';

// The contract project, the dev server, and the isolated data copy come from
// the shipped factory, so every run here exercises what a consumer runs. The
// two projects below are repository-only.
export default createPlaywrightConfig({
  ...settings,
  testDir: './tests/e2e',
  extraProjects: [
    {
      name: 'chromium',
      testIgnore: '**/contract-defects/**',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      // Proves each obligation fails with the rule it names. Kept out of the
      // shipped project so a consumer never runs the defects.
      name: 'contract-defects',
      testDir: './tests/e2e/contract-defects',
      testMatch: '**/*.spec.ts',
      // The persistence fixtures save and reset one component's working
      // buffer; two of them at once would read each other's writes.
      workers: 1,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
});
