import { writable } from 'svelte/store';
import { storageKey } from '../store/editorConfig';
import { DEFAULT_EDITOR_PATH } from './ownedRoutes';

function prevKey(): string {
  return storageKey('prev-route');
}

function rememberPrev(current: string) {
  if (current === DEFAULT_EDITOR_PATH) return;
  try { sessionStorage.setItem(prevKey(), current); } catch { /* ignore */ }
}

export const route = writable<string>('/');

// Scroll reset on navigation. The default jumps the native viewport to the top,
// which is invisible to consumers that drive scrolling with a smooth-scroll
// library (Lenis, Locomotive): their internal scroll position is decoupled from
// the window, so `window.scrollTo` leaves the rendered page where it was.
// `setScrollReset` lets such hosts route the reset through their own provider.
let scrollReset = () => window.scrollTo(0, 0);

export function setScrollReset(fn: () => void) {
  scrollReset = fn;
}

let initialised = false;

/**
 * Idempotent host hook — call once during boot to seed the route store from
 * the current location and wire popstate handling. Module import no longer
 * touches `window`, so SSR / test harnesses can import without crashing.
 */
export function init(): void {
  if (initialised) return;
  initialised = true;
  if (typeof window === 'undefined') return;
  const initial = window.location.pathname || '/';
  rememberPrev(initial);
  route.set(initial);
  window.addEventListener('popstate', () => {
    route.set(window.location.pathname || '/');
  });
}

/**
 * Push a new history entry and update the route store. Produces exactly one
 * `route` store update per call — the popstate listener installed in `init()`
 * fires only on browser back/forward, not on synthetic dispatch.
 */
export function navigate(path: string) {
  const [pathname] = path.split('#');
  if (typeof window !== 'undefined') {
    rememberPrev(window.location.pathname || '/');
    history.pushState(null, '', path);
    if (!path.includes('#')) {
      scrollReset();
    }
  }
  route.set(pathname);
}
