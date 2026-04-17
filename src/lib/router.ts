import { writable } from 'svelte/store';

const PREV_KEY = 'lt-prev-route';

function rememberPrev(current: string) {
  if (current === '/admin') return;
  try { sessionStorage.setItem(PREV_KEY, current); } catch { /* ignore */ }
}

const initial = window.location.pathname || '/';
rememberPrev(initial);
export const route = writable(initial);

export function navigate(path: string) {
  const [pathname] = path.split('#');
  rememberPrev(window.location.pathname || '/');
  history.pushState(null, '', path);
  route.set(pathname);
  window.dispatchEvent(new PopStateEvent('popstate'));
  if (!path.includes('#')) {
    window.scrollTo(0, 0);
  }
}

window.addEventListener('popstate', () => {
  route.set(window.location.pathname || '/');
});
