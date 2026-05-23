import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { themeFileApi } from './vite-plugin';
import { buildPruneReplace } from './vite-plugin/pruneMarkers';

export default defineConfig({
  plugins: [
    svelte({
      preprocess: sveltePreprocess({
        // PRUNE_FOR markers — see vite-plugin/pruneMarkers/pruneReplace.ts.
        // The dev branch (`{#if import.meta.env.DEV}`) renders everything;
        // Vite constant-folds it out in prod, leaving the marked else branch
        // which the replace pass below resolves to variant-guarded markup.
        replace: buildPruneReplace(),
      }),
    }),
    themeFileApi({ themesDir: 'themes', tokensCssPath: 'src/system/styles/tokens.css' }),
  ],
  // Force Svelte's browser-side exports under vitest (happy-dom). Without this,
  // `import { createEventDispatcher } from 'svelte'` resolves to the SSR build
  // where it is a no-op — and component event dispatch silently fails in tests.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
});
