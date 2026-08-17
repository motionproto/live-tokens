import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'node:path';
import { themeFileApi } from './vite-plugin';
import { buildPruneReplace, replacePreprocess } from './vite-plugin/pruneMarkers';

const e2eDataDir = process.env.LIVE_TOKENS_E2E_DATA_DIR;

export default defineConfig({
  plugins: [
    svelte({
      // PRUNE_FOR markers — see vite-plugin/pruneMarkers/pruneReplace.ts.
      // The dev branch (`{#if import.meta.env.DEV}`) renders everything;
      // Vite constant-folds it out in prod, leaving the marked else branch
      // which the replace pass below resolves to variant-guarded markup.
      // The prune pass must run first (on raw markup), then vitePreprocess
      // handles TypeScript + scss.
      preprocess: [replacePreprocess(buildPruneReplace()), vitePreprocess()],
    }),
    // Data folders default to `src/live-tokens/data/{colors-and-type,themes,
    // component-configs}`. Override per-folder here or via
    // `live-tokens.config.json` at the project root.
    themeFileApi({
      tokensCssPath: 'src/system/styles/tokens.css',
      ...(e2eDataDir
        ? {
            dataDir: e2eDataDir,
            tokensGeneratedCssPath: path.join(e2eDataDir, 'tokens.generated.css'),
            fontsCssPath: path.join(e2eDataDir, 'fonts.css'),
          }
        : {}),
    }),
  ],
  // Force Svelte's browser-side exports under vitest (happy-dom). Without this,
  // `import { createEventDispatcher } from 'svelte'` resolves to the SSR build
  // where it is a no-op — and component event dispatch silently fails in tests.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
});
