import { defineConfig } from 'tsup';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

export default defineConfig({
  entry: ['src/vite-plugin/index.ts'],
  outDir: 'dist-plugin',
  format: ['esm', 'cjs'],
  dts: true,
  external: ['vite'],
  platform: 'node',
  clean: true,
  define: {
    __LIVE_TOKENS_PKG_VERSION__: JSON.stringify(pkg.version),
  },
});
