import sveltePreprocess from 'svelte-preprocess';

/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
  preprocess: sveltePreprocess(),
  compilerOptions: {
    // Keeps `new Component({ target, props })` working under Svelte 5.
    // Removed in Step 3 once components migrate to runes.
    compatibility: { componentApi: 4 },
  },
}
