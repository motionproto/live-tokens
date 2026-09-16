import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { themeFileApi } from '@motion-proto/live-tokens/vite-plugin';

export default defineConfig({
  plugins: [
    svelte({ preprocess: vitePreprocess() }),
    // In dev, persists editor changes to src/system/styles/tokens.css and the
    // JSON under src/live-tokens/data/. In `vite build`, runs the design checks
    // first and stops the build on an error.
    themeFileApi({ tokensCssPath: 'src/system/styles/tokens.css' }),
  ],
});
