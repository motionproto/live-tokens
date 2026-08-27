/**
 * Keeping a stamp current.
 *
 * A page's polarity moves when the theme changes, and the editor changes a
 * theme by writing inline custom properties on `:root` — no reload, no class
 * flip. One observer watches for that and tells every live watcher to measure
 * again, so a consumer never writes its own.
 */
import {
  BACKDROP_ATTRIBUTE,
  clearStamped,
  markStamped,
  polarityOf,
  polarityOfBackground,
  type Polarity,
} from './backdrop';

export interface BackdropOptions {
  /** Called with each new answer, including the first. */
  onChange?: (polarity: Polarity) => void;
  /** Write `data-backdrop` on the element, so CSS can key on it and
      `light-dark()` inside it resolves the right half. Default true. */
  stamp?: boolean;
}

type Watcher = () => void;

const watchers = new Set<Watcher>();
let themeObserver: MutationObserver | null = null;
let resizeBound = false;

function notify(): void {
  for (const watcher of watchers) watcher();
}

function startListening(): void {
  if (typeof document === 'undefined') return;
  if (!themeObserver) {
    // The editor writes the live theme as inline vars on <html>; a switch to a
    // different stylesheet lands in <head>.
    themeObserver = new MutationObserver(notify);
    themeObserver.observe(document.documentElement, { attributeFilter: ['style', 'class'] });
    themeObserver.observe(document.head, { childList: true });
  }
  if (!resizeBound) {
    window.addEventListener('resize', notify, { passive: true });
    resizeBound = true;
  }
}

function stopListening(): void {
  if (watchers.size) return;
  themeObserver?.disconnect();
  themeObserver = null;
  if (resizeBound) {
    window.removeEventListener('resize', notify);
    resizeBound = false;
  }
}

/**
 * Track the polarity behind `el` until the returned function is called. A
 * `data-backdrop` stated on or above the element wins over measurement, which
 * is what lets a section declare a tone the paint cannot show — art directed
 * over a photograph, or a band whose fill has not rendered yet.
 */
export function watchBackdrop(el: Element, options: BackdropOptions = {}): () => void {
  const { onChange, stamp = true } = options;
  let last: Polarity | null = null;

  const measure = () => {
    const polarity = polarityOf(el);
    if (polarity === last) return;
    last = polarity;
    if (stamp) {
      markStamped(el);
      el.setAttribute(BACKDROP_ATTRIBUTE, polarity);
    }
    onChange?.(polarity);
  };

  watchers.add(measure);
  startListening();
  measure();

  return () => {
    watchers.delete(measure);
    if (stamp) {
      clearStamped(el);
      el.removeAttribute(BACKDROP_ATTRIBUTE);
    }
    stopListening();
  };
}

/** Svelte action: `<section use:backdrop>` stamps the element and keeps the
 *  stamp current. Pass `{ onChange }` when JS needs the answer too. */
export function backdrop(el: Element, options: BackdropOptions = {}) {
  let stop = watchBackdrop(el, options);
  return {
    update(next: BackdropOptions = {}) {
      stop();
      stop = watchBackdrop(el, next);
    },
    destroy() {
      stop();
    },
  };
}

/**
 * Stamp `<html>` from the theme's page canvas, so a rule can key on
 * `[data-backdrop='dark']` anywhere on the page and a section that declares its
 * own tone still overrides it. Call once at boot; returns a stop function.
 */
export function syncDocumentBackdrop(): () => void {
  if (typeof document === 'undefined') return () => {};
  const root = document.documentElement;
  const stated = root.getAttribute(BACKDROP_ATTRIBUTE);
  // A root the page states for itself is the page's answer; leave it alone.
  if (stated === 'light' || stated === 'dark') return () => {};
  const measure = () => {
    const page = getComputedStyle(root).getPropertyValue('--page-bg');
    const polarity = polarityOfBackground(page);
    if (polarity) root.setAttribute(BACKDROP_ATTRIBUTE, polarity);
  };
  // The root's own stamp is an answer, not a declaration — without this every
  // measurement below it would short-circuit on the page's polarity and no
  // local band could ever read as its own.
  markStamped(root);
  watchers.add(measure);
  startListening();
  measure();
  return () => {
    watchers.delete(measure);
    clearStamped(root);
    stopListening();
  };
}
