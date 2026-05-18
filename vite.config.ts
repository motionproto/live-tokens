import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { themeFileApi } from './vite-plugin';

export default defineConfig({
  plugins: [
    svelte({ preprocess: sveltePreprocess() }),
    themeFileApi({ themesDir: 'themes', tokensCssPath: 'src/system/styles/tokens.css' }),
  ],
  // Force Svelte's browser-side exports under vitest (happy-dom). Without this,
  // `import { createEventDispatcher } from 'svelte'` resolves to the SSR build
  // where it is a no-op — and component event dispatch silently fails in tests.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
});
