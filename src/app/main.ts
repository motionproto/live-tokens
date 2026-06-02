// Dev-server boot for the library's own demo app. Token CSS imports stay
// here (defaults → editor overrides → fonts) because import order matters
// and the consumer's generated.css path is project-relative.
import '../system/styles/tokens.css';
import '../live-tokens/data/tokens.generated.css';
import '../system/styles/fonts.css';

import { bootLiveTokens } from '../editor/bootstrap';
import App from './App.svelte';

bootLiveTokens(App, '#app');
