import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import sveltePreprocess from 'svelte-preprocess';
import { themeFileApi } from './src/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    svelte({ preprocess: sveltePreprocess() }),
    themeFileApi({ themesDir: 'themes', tokensCssPath: 'src/styles/tokens.css' }),
  ],
});
