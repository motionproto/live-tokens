import { defineTestingConfig } from './src/testing/config';

// The repository is its own consumer: the dev server, the data tree, and the
// components route are all at their defaults, and the suites already default
// to `shippedContracts`, so only the registry setup module is named.
export default defineTestingConfig({
  registrySetup: 'src/editor/component-editor/registry.ts',
});
