import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // Playwright owns the real-browser specifications. Keeping this explicit
      // prevents Vitest's default **/*.spec.ts glob from importing them into
      // happy-dom and failing before either runner reaches its assertions.
      exclude: ['tests/e2e/**', '**/node_modules/**', '**/.git/**'],
    },
  }),
);
