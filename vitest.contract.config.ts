import { createVitestConfig } from './src/testing/vitest';
import viteConfig from './vite.config';
import settings from './live-tokens.testing';

// The shipped registry contract, collected by the factory's own default.
export default createVitestConfig(viteConfig, { registrySetup: settings.registrySetup });
