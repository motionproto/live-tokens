import { defineTestingConfig } from '@motion-proto/live-tokens/testing/vitest';

export default defineTestingConfig({
  registrySetup: 'src/registerComponents.ts',
  contractsModule: 'tests/contracts.ts',
});
