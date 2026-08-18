import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Playwright owns the real-browser specifications. Keeping this explicit
      // prevents Vitest's default **/*.spec.ts glob from importing them into
      // happy-dom and failing before either runner reaches its assertions.
      exclude: ['tests/e2e/**', '**/node_modules/**', '**/.git/**'],
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
    },
  }),
);
