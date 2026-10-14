import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { themeFileApi } from '@motion-proto/live-tokens/vite-plugin';

export default defineConfig({
  plugins: [
    svelte({ preprocess: vitePreprocess() }),
    // In dev, persists editor changes to the JSON under src/live-tokens/data/,
    // and Adopt writes src/live-tokens/data/tokens.generated.css. In
    // `vite build`, runs the design checks
    // first and stops the build on an error, then writes each token whose value
    // never changes at runtime as its value. `productionCss: false` keeps every
    // token a variable, and `productionCss: { keep: [...] }` keeps the names a
    // script assembles at runtime.
    themeFileApi({ tokensCssPath: 'src/system/styles/tokens.css' }),
  ],
});
