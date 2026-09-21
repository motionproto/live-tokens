import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeConfig, type UserConfig } from 'vite';
import type { TestUserConfig } from 'vitest/config';
import { CONTRACTS_MODULE_ENV } from './contracts';

// The barrel (`./index`) re-exports this from `./playwright`, which imports
// `@playwright/test` at module top. A Vitest-only consumer authoring
// `live-tokens.testing.ts` needs `defineTestingConfig` without that import
// ever resolving, so it is reachable from here too.
export { defineTestingConfig, resolveTestingConfig } from './config';
export type { LiveTokensTestingConfig, ResolvedTestingConfig } from './config';

export interface VitestConfigOptions {
  /** Files the run collects, relative to the project root. Default: the
   *  registry and behavior contracts in this module's own directory. */
  include?: string[];
  exclude?: string[];
  setupFiles?: string[];
  /** Default `happy-dom`, which the registry contract needs to mount a store. */
  environment?: TestUserConfig['environment'];
  /** Module the registry contract imports to register the project's
   *  components. Reaches the run as an environment variable because the
   *  contract file resolves the path itself. */
  registrySetup?: string;
  /** Module `selectedContracts()` imports a project's own `ComponentContract[]`
   *  from, same env-var seam as `registrySetup` and mirroring
   *  `createPlaywrightConfig`'s own use of it: the behavior contract's
   *  `describe.each` runs at module top, before a test can resolve anything
   *  for it. */
  contractsModule?: string;
}

const CONTRACT_INCLUDE = ['registry.contract.{ts,js}', 'component-behavior.contract.{ts,js}'];

// A root-wide glob also collects the stale package copy inside any nested
// project's node_modules, which then fails against this project's registry.
const CONTRACT_DIR = path.dirname(fileURLToPath(import.meta.url));

/**
 * The project's Vite config plus what the registry contract needs on top.
 *
 * The package ships Svelte and TypeScript source and imports a FontAwesome
 * stylesheet. Left external, Node meets that `.css` and stops with
 * `Unknown file extension ".css"` before a single test runs, so both are
 * inlined for Vite to transform.
 */
export function createVitestConfig(
  viteConfig: UserConfig,
  options: VitestConfigOptions = {},
): UserConfig {
  return mergeConfig(viteConfig, {
    // `svelte`'s package exports resolve to `index-server.js` without it, whose
    // `mount` throws `lifecycle_function_unavailable`, and whose
    // `createEventDispatcher` is a silent no-op. A project's own vite config
    // states the condition for its build, not for a test run under happy-dom.
    resolve: { conditions: ['browser'] },
    test: {
      ...(options.include ? { include: options.include } : { dir: CONTRACT_DIR, include: CONTRACT_INCLUDE }),
      // Vitest's own default drops everything under `node_modules`, which is
      // where an installed package's contract file lives.
      exclude: options.exclude ?? [],
      ...(options.setupFiles ? { setupFiles: options.setupFiles } : {}),
      environment: options.environment ?? 'happy-dom',
      environmentOptions: {
        happyDOM: {
          settings: {
            // fontLoader injects <link rel=stylesheet> for the theme's font
            // sources, which happy-dom would fetch from Google and Typekit for
            // real. That puts the public internet on the release gate's
            // critical path; treat the load as satisfied instead.
            disableCSSFileLoading: true,
            handleDisabledFileLoadingAsSuccess: true,
          },
        },
      },
      server: { deps: { inline: [/@motion-proto\/live-tokens/, /@fortawesome/] } },
      // Vitest's default preview truncates a failed array-equality assertion
      // to `[ Array(1) ]`, which drops `checkRegistryEntry`'s actual violation
      // text. `check-component --tests` reads that text out of the JSON
      // reporter's `failureMessages` to attribute a finding, so nothing here
      // can afford to be summarized away.
      chaiConfig: { truncateThreshold: 0 },
      ...(options.registrySetup || options.contractsModule
        ? {
            env: {
              ...(options.registrySetup ? { LIVE_TOKENS_REGISTRY_SETUP: options.registrySetup } : {}),
              ...(options.contractsModule ? { [CONTRACTS_MODULE_ENV]: options.contractsModule } : {}),
            },
          }
        : {}),
    },
  } satisfies UserConfig);
}
