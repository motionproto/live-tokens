// Registers the gate's fixture component. Imported from both the app's
// main.ts (so the running dev server has it) and live-tokens.testing.ts's
// registrySetup (so the registry contract sees it too), one list serving
// both, per the live-tokens-create-component contract-tests recipe.
import { registerComponent } from '@motion-proto/live-tokens';
import BeaconEditor, { allTokens } from './system/components/BeaconEditor.svelte';

registerComponent({
  id: 'beacon',
  label: 'Beacon',
  icon: 'fas fa-broadcast-tower',
  sourceFile: 'src/system/components/Beacon.svelte',
  editorComponent: BeaconEditor,
  schema: allTokens,
});
