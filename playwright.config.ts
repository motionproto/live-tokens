import { devices } from '@playwright/test';
import { createPlaywrightConfig } from './src/testing';
import { A11Y_THEMES_ENV } from './src/testing/config';
import settings from './live-tokens.testing';

// Decision 7 of docs/plans/a11y-testing.md: the preset sweep runs here alone.
process.env[A11Y_THEMES_ENV] ??= 'all';

// The contract project, the dev server, and the isolated data copy come from
// the shipped factory, so every run here exercises what a consumer runs. The
// two projects below are repository-only.
export default createPlaywrightConfig({
  ...settings,
  // The preset sweep above runs the accessibility suite under every theme,
  // which takes the contract run past the shipped fifteen minutes on CI's two
  // workers. Publish waits forty minutes on Verify, so this stays under it.
  globalTimeout: 30 * 60_000,
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
    {
      // One page per rule, each written to fail it, and the exceptions each
      // rule reserves. Kept out of the shipped project so a consumer never
      // opens a page carrying a deliberate defect.
      name: 'page-defects',
      testDir: './tests/e2e/page-defects',
      testMatch: '**/*.spec.ts',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
