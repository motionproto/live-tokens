// Token CSS order matters: defaults → editor overrides → fonts. The first two
// are project-local (the dev plugin writes to them); fonts ship with the package.
import './system/styles/tokens.css';
import './live-tokens/data/tokens.generated.css';
import '@motion-proto/live-tokens/app/fonts.css';

import { bootLiveTokens, configureEditor } from '@motion-proto/live-tokens';
import App from './App.svelte';

configureEditor({ storagePrefix: 'app-' });

bootLiveTokens(App, '#app');
