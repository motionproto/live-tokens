import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { themeFileApi } from '@motion-proto/live-tokens/vite-plugin';

export default defineConfig({
  plugins: [
    svelte({ preprocess: vitePreprocess() }),
    // Dev-only: persists editor changes to src/system/styles/tokens.css and
    // the JSON under src/live-tokens/data/. No effect on `vite build`.
    themeFileApi({ tokensCssPath: 'src/system/styles/tokens.css' }),
  ],
});
