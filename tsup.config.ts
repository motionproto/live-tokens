import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'vite-plugin/index.ts',
    'vite-plugin/tokensCssMigrations/index.ts',
    'vite-plugin/setColors/index.ts',
    'vite-plugin/setGeometry/index.ts',
    'vite-plugin/setType/index.ts',
    'vite-plugin/migrateData/index.ts',
  ],
  outDir: 'dist-plugin',
  format: ['esm', 'cjs'],
  dts: true,
  external: ['vite'],
  platform: 'node',
  clean: true,
});
