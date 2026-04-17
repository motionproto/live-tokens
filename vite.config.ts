import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { themeFileApi } from './src/vite-plugin';

export default defineConfig({
  plugins: [
    svelte({ preprocess: sveltePreprocess() }),
    themeFileApi({ themesDir: 'themes', tokensCssPath: 'src/styles/tokens.css' }),
  ],
});
