import { defineConfig } from 'tsup';

// Node refuses to strip types from a `.ts` file under `node_modules`, and
// Playwright declines to transform anything there, so a consumer's tool
// configs and the shipped contract suites have to be plain JavaScript. The
// output directory sits beside `src/testing`, not under it, so
// `registry.contract.ts`'s externalized `../editor/...` and `../../bin/...`
// imports resolve at the same depth once compiled.
export default defineConfig({
  entry: [
    'src/testing/index.ts',
    'src/testing/component-render.contract.ts',
    'src/testing/component-alias.contract.ts',
    'src/testing/component-editor.contract.ts',
    'src/testing/registry.contract.ts',
  ],
  outDir: 'src/testing-js',
  format: ['esm'],
  platform: 'node',
  splitting: true,
  sourcemap: true,
  clean: true,
  // The editor tree ships as source and the CLI ships as `.mjs`; both are
  // read by the consumer's own toolchain, not bundled into the compiled
  // suites. Everything else under `src/testing` inlines.
  external: [
    '@playwright/test',
    'vite',
    'vitest',
    /^\.\.\/editor\/component-editor\//,
    /^\.\.\/\.\.\/bin\//,
  ],
  // Only `index.ts` is a module a consumer imports; the four contract files
  // are Playwright/Vitest entry points discovered by path, never imported.
  dts: { entry: { index: 'src/testing/index.ts' } },
});
