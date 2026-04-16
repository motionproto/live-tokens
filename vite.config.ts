import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { tokenFileApi } from './src/vite-plugin';

export default defineConfig({
  plugins: [
    svelte({ preprocess: sveltePreprocess() }),
    tokenFileApi({ tokensDir: 'tokens', variablesCssPath: 'src/styles/variables.css' }),
  ],
});
