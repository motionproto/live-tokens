import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/styles-mainsite.css';
import './styles/form-controls.css';
import { initializeTheme } from './lib/themeInit';
import * as cssVarSync from './lib/cssVarSync';
import * as columnsOverlay from './lib/columnsOverlay';
import * as router from './lib/router';
import * as editorStore from './lib/editorStore';
import App from './App.svelte';

/**
 * Single boot orchestration point — call each module's idempotent `init()`
 * once. Module-load side effects (DOM reads, storage subscriptions, eager
 * hydrate) used to spread across these files; now they only fire when the
 * host explicitly opts in via `boot()`. Library consumers that want
 * different ordering can replicate this orchestration with a custom prefix
 * via `configureEditor` before calling the inits.
 */
async function boot() {
  cssVarSync.init();
  router.init();
  columnsOverlay.init();
  editorStore.init();

  if (import.meta.env.DEV) {
    await initializeTheme();
  }
  new App({ target: document.getElementById('app')! });
}

boot();
