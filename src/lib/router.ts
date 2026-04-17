import { writable } from 'svelte/store';

export const route = writable(window.location.pathname || '/');

export function navigate(path: string) {
  const [pathname] = path.split('#');
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
