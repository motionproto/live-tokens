// Dev-server boot for the library's own demo app. Token CSS imports stay
// here (defaults → editor overrides → fonts) because import order matters
// and the consumer's generated.css path is project-relative.
import '../system/styles/tokens.css';
import '../live-tokens/data/tokens.generated.css';
import '../system/styles/fonts.css';

import { bootLiveTokens } from '../editor/bootstrap';
import App from './App.svelte';

// Smoke-test custom component. DEV-only — Stat.svelte and StatEditor.svelte
// are excluded from the published npm tarball, and `bootLiveTokens` gates
// `registerComponent` on `import.meta.env.DEV` so this entry tree-shakes
// out of production builds.
import StatEditor, { allTokens as statTokens } from '../system/components/StatEditor.svelte';

bootLiveTokens(App, '#app', {
  components: [
    {
      id: 'stat',
      label: 'Stat',
      icon: 'fas fa-chart-simple',
      sourceFile: 'src/system/components/Stat.svelte',
      editorComponent: StatEditor,
      schema: statTokens,
    },
  ],
});
