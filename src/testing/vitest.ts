import { mergeConfig, type UserConfig } from 'vite';
import type { TestUserConfig } from 'vitest/config';

// The barrel (`./index`) re-exports this from `./playwright`, which imports
// `@playwright/test` at module top. A Vitest-only consumer authoring
// `live-tokens.testing.ts` needs `defineTestingConfig` without that import
// ever resolving, so it is reachable from here too.
export { defineTestingConfig, resolveTestingConfig } from './config';
export type { LiveTokensTestingConfig, ResolvedTestingConfig } from './config';

export interface VitestConfigOptions {
  /** Files the run collects. Default: the shipped registry contract, matched
   *  both in this package and in an installed copy of it. */
  include?: string[];
  exclude?: string[];
  setupFiles?: string[];
  /** Default `happy-dom`, which the registry contract needs to mount a store. */
  environment?: TestUserConfig['environment'];
  /** Module the registry contract imports to register the project's
   *  components. Reaches the run as an environment variable because the
   *  contract file resolves the path itself. */
  registrySetup?: string;
}

// Matching both extensions would double-collect the registry contract when a
// developer runs build:lib without cleaning: this module's own URL is `.ts`
// running from source and `.js` once tsup compiles it, so one glob follows it.
const CONTRACT_INCLUDE = [import.meta.url.endsWith('.ts')
  ? '**/src/testing/registry.contract.ts'
  : '**/src/testing-js/registry.contract.js'];

/** Vitest's own default drops everything under `node_modules`, which is where
 *  an installed package's contract file lives. */
const CONTRACT_EXCLUDE = ['**/dist/**', '**/dist-plugin/**', '**/.git/**'];

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
    test: {
      include: options.include ?? CONTRACT_INCLUDE,
      exclude: options.exclude ?? CONTRACT_EXCLUDE,
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
      ...(options.registrySetup ? { env: { LIVE_TOKENS_REGISTRY_SETUP: options.registrySetup } } : {}),
    },
  } satisfies UserConfig);
}
