import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/tokens.css';
import './styles/fonts.css';
import './styles/styles-mainsite.css';
import './styles/form-controls.css';
import { initializeTheme } from './lib/themeInit';
import App from './App.svelte';

async function boot() {
  if (import.meta.env.DEV) {
    await initializeTheme();
  }
  new App({ target: document.getElementById('app')! });
}

boot();
