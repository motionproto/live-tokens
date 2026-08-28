// Dev-server boot for the library's own demo app. Token CSS imports stay
// here (defaults → editor overrides → fonts) because import order matters
// and the consumer's generated.css path is project-relative.
import '../system/styles/tokens.css';
import '../live-tokens/data/tokens.generated.css';
import '../system/styles/fonts.css';

import { bootLiveTokens } from '../editor/bootstrap';
import App from './App.svelte';

/** The sketchstyles saved in this project, registered so they reach a built
    site. The editor re-reads the directory over the dev API; this snapshot is
    what a build has instead. */
const sketchFiles = import.meta.glob<{ name?: string; settings: unknown }>(
  '../live-tokens/data/sketch-styles/*.json',
  { eager: true, import: 'default' },
);

const sketchStyles = Object.entries(sketchFiles).map(([path, file]) => {
  const id = path.split('/').pop()!.replace('.json', '');
  return { id, label: file.name || id, settings: file.settings };
});

bootLiveTokens(App, '#app', { sketchStyles });
