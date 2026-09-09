import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  defineConfig,
  devices,
  type PlaywrightTestConfig,
  type PlaywrightTestProject,
} from '@playwright/test';
import type { ComponentContract } from './componentContract';
import {
  COMPONENT_ENV,
  COMPONENTS_PATH_ENV,
  devServerCommand,
  resolveTestingConfig,
  type LiveTokensTestingConfig,
} from './config';
import { DATA_DIR_ENV, TEST_DATA_DIR_ENV, isolateDataDir } from './isolation';
import { resolvePort } from './port';

const HOST = '127.0.0.1';

/** The shipped suites, wherever the package is installed. */
const CONTRACT_TEST_DIR = path.dirname(fileURLToPath(import.meta.url));

export interface PlaywrightConfigOptions extends LiveTokensTestingConfig {
  /** Project root the settings resolve against. Default `process.cwd()`. */
  root?: string;
  /** Projects that run beside the contract project. */
  extraProjects?: PlaywrightTestProject[];
  /** Where projects that declare no `testDir` of their own look. */
  testDir?: string;
}

function requireContractFor(component: string, contracts: ComponentContract[]): void {
  if (contracts.some((contract) => contract.id === component)) return;
  throw new Error(
    `${COMPONENT_ENV}=${component} names a component with no contract. `
    + `Declared: ${contracts.map((contract) => contract.id).sort().join(', ')}`,
  );
}

/**
 * The contract project, its dev server, and the data isolation the two share.
 *
 * Isolation runs here rather than in a global setup because the config is the
 * first thing every process in the run evaluates: the environment it leaves
 * behind reaches the workers and the dev server, and nothing in the run can
 * observe the state before it.
 */
export function createPlaywrightConfig(options: PlaywrightConfigOptions = {}): PlaywrightTestConfig {
  const settings = resolveTestingConfig(options, options.root);
  const { dataDir } = isolateDataDir(settings.dataDir);
  const port = resolvePort(settings.port);
  const baseURL = `http://${HOST}:${port}`;

  process.env[COMPONENTS_PATH_ENV] = settings.componentsPath;

  const requested = process.env[COMPONENT_ENV];
  if (requested && settings.contracts) requireContractFor(requested, settings.contracts);

  return defineConfig({
    testDir: options.testDir ?? CONTRACT_TEST_DIR,
    // The component suites carry their serial and parallel intent per file:
    // `component-editor.contract.ts` runs each component's save and reset
    // cycles in order against one data tree. Turning this on would interleave
    // them.
    fullyParallel: false,
    // One worker is the safe default: the specs share a dev server and a data
    // directory. A run that can afford more passes a worker count on the
    // command line.
    workers: 1,
    timeout: 30_000,
    expect: { timeout: 5_000 },
    // A shared-server suite times out under CI load in ways it never does
    // locally, and without a retry budget one wobble aborts a tagged release.
    retries: process.env.CI ? 2 : 0,
    outputDir: 'test-results/playwright',
    reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
    use: {
      baseURL,
      // Unset, both of these are unbounded: a locator that never resolves waits
      // out the whole test timeout and reports nothing about where it stopped.
      actionTimeout: 10_000,
      navigationTimeout: 30_000,
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      // `retain-on-failure` still records every passing test and throws the
      // file away, which costs ~28% CPU. Match the trace policy instead.
      video: 'on-first-retry',
    },
    projects: [
      ...(options.extraProjects ?? []),
      {
        name: 'contract',
        testDir: CONTRACT_TEST_DIR,
        // `.ts` in this repo, `.js` once tsup compiles the shipped build into
        // `src/testing-js`; matching both here needs no build-time swap.
        testMatch: '**/component-*.contract.{ts,js}',
        use: {
          ...devices['Desktop Chrome'],
          // `.tabs-preview` in VariantGroup.svelte has no max-height, so a tall
          // preview's sticky band covers the property controls below it at the
          // 720px default. The fix is that max-height; until then the taller
          // viewport clears every shipped component's tallest view.
          viewport: { width: 1280, height: 900 },
        },
      },
    ],
    webServer: {
      command: devServerCommand(settings.devCommand, HOST, port),
      url: baseURL,
      // A server this run did not start carries none of these variables, so it
      // would write the project's own data tree.
      reuseExistingServer: false,
      timeout: 120_000,
      env: {
        ...process.env,
        [TEST_DATA_DIR_ENV]: dataDir,
        [DATA_DIR_ENV]: dataDir,
      },
    },
  });
}
