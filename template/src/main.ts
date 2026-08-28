// Token CSS order matters: defaults → editor overrides → fonts. The first two
// are project-local (the dev plugin writes to them); fonts ship with the package.
import './system/styles/tokens.css';
import './live-tokens/data/tokens.generated.css';
import '@motion-proto/live-tokens/app/fonts.css';

import { bootLiveTokens, configureEditor } from '@motion-proto/live-tokens';
import App from './App.svelte';

configureEditor({ storagePrefix: 'app-' });

/** The sketchstyles saved in this project, registered so they reach a built
    site. The editor re-reads the directory over the dev API; this snapshot is
    what a build has instead. */
const sketchFiles = import.meta.glob<{ name?: string; settings: unknown }>(
  './live-tokens/data/sketch-styles/*.json',
  { eager: true, import: 'default' },
);

const sketchLooks = Object.entries(sketchFiles).map(([path, file]) => {
  const id = path.split('/').pop()!.replace('.json', '');
  return { id, label: file.name || id, settings: file.settings };
});

bootLiveTokens(App, '#app', { sketchLooks });
