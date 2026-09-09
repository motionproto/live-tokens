import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  defineConfig,
  devices,
  type PlaywrightTestConfig,
  type PlaywrightTestProject,
} from '@playwright/test';
import {
  COMPONENT_ENV,
  COMPONENTS_PATH_ENV,
  devServerCommand,
  resolveTestingConfig,
  type LiveTokensTestingConfig,
} from './config';
import { CONTRACTS_MODULE_ENV } from './contracts';
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

/**
 * The contract project, its dev server, and the data isolation the two share.
 *
 * Isolation runs here rather than in a global setup because the config is the
 * first thing every process in the run evaluates: the environment it leaves
 * behind reaches the workers and the dev server, and nothing in the run can
 * observe the state before it.
 */
export async function createPlaywrightConfig(
  options: PlaywrightConfigOptions = {},
): Promise<PlaywrightTestConfig> {
  const settings = resolveTestingConfig(options, options.root);
  const { dataDir } = isolateDataDir(settings.dataDir);
  const port = resolvePort(settings.port);
  const baseURL = `http://${HOST}:${port}`;

  process.env[COMPONENTS_PATH_ENV] = settings.componentsPath;
  if (settings.contractsModule) process.env[CONTRACTS_MODULE_ENV] = settings.contractsModule;

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
    // Absolute and rooted at the consumer project, not the config file's own
    // directory: `check-component --tests`'s generated config lives in a
    // temporary directory that gets removed on completion, and a relative
    // `outputDir` would put every trace and screenshot in there too.
    outputDir: path.join(settings.root, 'test-results/playwright'),
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
        // `.tabs-preview` now caps its sticky band at 50vh, which is enough for
        // image, panel, card and sidenavigation to pass alone at 1280x720. A
        // full parallel run still fails panel's gradient radio there, so the
        // band can cover a control at some scroll positions. Until that is
        // fixed the suite runs taller. See docs/contract-test-defects.md.
        use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
      },
    ],
    webServer: {
      command: devServerCommand(settings.devCommand, HOST, port),
      // Otherwise defaults to the config file's own directory. A generated
      // config that lives outside the consumer root (`check-component
      // --tests`'s temporary config) would run `npm run dev` from wherever
      // that happens to be instead.
      cwd: settings.root,
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
