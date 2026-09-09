import { defineTestingConfig } from './src/testing/config';
import { shippedContracts } from './src/testing/contracts';

// The repository is its own consumer: the dev server, the data tree, and the
// components route are all at their defaults, so only the two settings that
// name repository files are set.
export default defineTestingConfig({
  registrySetup: 'src/editor/component-editor/registry.ts',
  contracts: shippedContracts,
});
