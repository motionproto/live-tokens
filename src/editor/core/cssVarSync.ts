/**
 * Central CSS custom-property writer.
 *
 * Writes to document.documentElement and — when running inside a same-origin
 * iframe (the live-preview overlay) — also writes to
 * window.parent.document.documentElement. This lets the overlay editor at
 * /live-tokens/editor drive the host site's :root for ordinary live edits.
 * Complete theme application additionally synchronizes each document's typed
 * Svelte store through `themeDocumentSync`; copying CSS alone would leave an
 * already-open editor disconnected when the load originates in the host.
 *
 * When the editor runs standalone at /live-tokens/editor (not inside the overlay iframe),
 * parentRoot is null and every call is a plain single-root write.
 *
 * Roots are resolved lazily — `init()` (or any setter call) populates them on
 * first use so importing this module does not touch the DOM. This keeps the
 * library importable from SSR / test harnesses and decouples consumers from
 * module-load ordering.
 */

let selfRoot: HTMLElement | null = null;
let parentRoot: HTMLElement | null = null;
let resolved = false;

function resolveParentRoot(): HTMLElement | null {
  if (typeof window === 'undefined') return null;
  try {
    if (window.parent !== window && window.parent?.document) {
      return window.parent.document.documentElement;
    }
  } catch {
    // Cross-origin parent — not expected in dev, but be defensive.
  }
  return null;
}

function ensureResolved(): void {
  if (resolved) return;
  resolved = true;
  selfRoot = typeof document !== 'undefined' ? document.documentElement : null;
  parentRoot = resolveParentRoot();
}

/**
 * Idempotent host hook — call once during boot to eagerly resolve the self
 * and parent document roots. Optional in practice (any setter call resolves
 * lazily), but explicit init makes ordering legible.
 */
export function init(): void {
  ensureResolved();
}

/**
 * Return the self and parent document heads as a tuple, with parent omitted
 * when not in an iframe. Consumers that need to mirror node injection (not
 * just style properties) can iterate this list.
 */
export function getSyncedDocuments(): Document[] {
  ensureResolved();
  if (typeof document === 'undefined') return [];
  const docs: Document[] = [document];
  if (parentRoot && parentRoot.ownerDocument && parentRoot.ownerDocument !== document) {
    docs.push(parentRoot.ownerDocument);
  }
  return docs;
}

export const CSS_VAR_CHANGE_EVENT = 'cssvar:change';
/** One notification for a completed CSS-variable transaction. Internal editor
 * controls use this instead of reacting once per variable during theme loads. */
export const CSS_VARS_CHANGE_EVENT = 'cssvars:change';

export interface CssVarsChangeDetail {
  names: string[];
}

let batchDepth = 0;
const pendingNames = new Set<string>();

function dispatchChanges(names: string[]): void {
  if (typeof document === 'undefined' || names.length === 0) return;
  document.dispatchEvent(new CustomEvent<CssVarsChangeDetail>(CSS_VARS_CHANGE_EVENT, {
    detail: { names },
  }));
  // Preserve the public per-variable contract for consumers. These events are
  // deliberately dispatched only after every write in a batch has landed, so
  // a listener's computed-style read cannot force layout against a half-painted
  // theme.
  for (const name of names) {
    document.dispatchEvent(new CustomEvent(CSS_VAR_CHANGE_EVENT, { detail: { name } }));
  }
}

function notifyChange(name: string): void {
  if (batchDepth > 0) {
    pendingNames.add(name);
    return;
  }
  dispatchChanges([name]);
}

/** Run a group of CSS-variable writes as one observable transaction. DOM
 * styles are still applied synchronously; notifications wait until the outer
 * batch completes. Nested batches coalesce into their parent. */
export function batchCssVarChanges<T>(fn: () => T): T {
  batchDepth += 1;
  try {
    return fn();
  } finally {
    batchDepth -= 1;
    if (batchDepth === 0 && pendingNames.size > 0) {
      const names = Array.from(pendingNames);
      pendingNames.clear();
      dispatchChanges(names);
    }
  }
}

export function setCssVar(name: string, value: string): void {
  ensureResolved();
  selfRoot?.style.setProperty(name, value);
  parentRoot?.style.setProperty(name, value);
  notifyChange(name);
}

export function removeCssVar(name: string): void {
  ensureResolved();
  selfRoot?.style.removeProperty(name);
  parentRoot?.style.removeProperty(name);
  notifyChange(name);
}

/** Apply a map of CSS variables to :root (and the parent :root when in an iframe). */
export function applyCssVariables(variables: Record<string, string>): void {
  batchCssVarChanges(() => {
    for (const [name, value] of Object.entries(variables)) {
      setCssVar(name, value);
    }
  });
}

/** Remove all inline CSS custom properties from :root on both self and parent. */
export function clearAllCssVarOverrides(): void {
  ensureResolved();
  if (selfRoot) clearRoot(selfRoot);
  if (parentRoot) clearRoot(parentRoot);
}

function clearRoot(el: HTMLElement): void {
  const style = el.style;
  const names: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const name = style[i];
    if (name.startsWith('--')) names.push(name);
  }
  for (const name of names) style.removeProperty(name);
}

/** Scrape all inline CSS custom properties currently on self :root. */
export function scrapeCssVariables(): Record<string, string> {
  ensureResolved();
  if (!selfRoot) return {};
  const style = selfRoot.style;
  const variables: Record<string, string> = {};
  for (let i = 0; i < style.length; i++) {
    const name = style[i];
    if (name.startsWith('--')) {
      variables[name] = style.getPropertyValue(name).trim();
    }
  }
  return variables;
}

/** Test-only: forget cached window/document roots so a test can install a
 *  synthetic same-origin parent before the next write resolves them. */
export function __resetCssVarSyncForTests(): void {
  selfRoot = null;
  parentRoot = null;
  resolved = false;
  batchDepth = 0;
  pendingNames.clear();
}
