import '@fortawesome/fontawesome-free/css/all.min.css';
import './styles/variables.css';
import './styles/fonts.css';
import './styles/styles-mainsite.css';
import './styles/form-controls.css';
import { initializeTokens } from './lib/tokenInit';
import App from './App.svelte';

async function boot() {
  if (import.meta.env.DEV) {
    await initializeTokens();
  }
  new App({ target: document.getElementById('app')! });
}

boot();
