import { createVitestConfig } from './src/testing/vitest';
import viteConfig from './vite.config';

export default createVitestConfig(viteConfig, {
  // The repository suite is mixed: each file that needs a document says so with
  // a `@vitest-environment happy-dom` docblock.
  environment: 'node',
  include: ['**/*.{test,spec}.?(c|m)[jt]s?(x)'],
  // Playwright owns the real-browser specifications. Keeping this explicit
  // prevents Vitest's default **/*.spec.ts glob from importing them into
  // happy-dom and failing before either runner reaches its assertions.
  exclude: ['tests/e2e/**', '**/node_modules/**', '**/.git/**'],
  setupFiles: ['./vitest.setup.ts'],
})
