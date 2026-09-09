import { mergeConfig, type UserConfig } from 'vite';
import type { TestUserConfig } from 'vitest/config';

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

const CONTRACT_INCLUDE = ['**/src/testing/registry.contract.ts'];

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
      ...(options.registrySetup ? { env: { LIVE_TOKENS_REGISTRY_SETUP: options.registrySetup } } : {}),
    },
  } satisfies UserConfig);
}
