import { defineTestingConfig } from '@motion-proto/live-tokens/testing';

export default defineTestingConfig({
  dataDir: 'src/live-tokens/data',
  registrySetup: 'src/live-tokens-components.ts',
  contractsModule: 'src/live-tokens-contracts.ts',
});
