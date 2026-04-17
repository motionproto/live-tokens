/**
 * Central CSS custom-property writer.
 *
 * Writes to document.documentElement and — when running inside a same-origin
 * iframe (the live-preview overlay) — also writes to
 * window.parent.document.documentElement. This lets the overlay editor at
 * /admin drive the host site's :root in real time without any message-passing
 * infrastructure.
 *
 * When the editor runs standalone at /admin (not inside the overlay iframe),
 * parentRoot is null and every call is a plain single-root write.
 */

function resolveParentRoot(): HTMLElement | null {
  try {
    if (window.parent !== window && window.parent?.document) {
      return window.parent.document.documentElement;
    }
  } catch {
    // Cross-origin parent — not expected in dev, but be defensive.
  }
  return null;
}

const selfRoot: HTMLElement = document.documentElement;
const parentRoot: HTMLElement | null = resolveParentRoot();

/**
 * Return the self and parent document heads as a tuple, with parent omitted
 * when not in an iframe. Consumers that need to mirror node injection (not
 * just style properties) can iterate this list.
 */
export function getSyncedDocuments(): Document[] {
  const docs: Document[] = [document];
  if (parentRoot && parentRoot.ownerDocument && parentRoot.ownerDocument !== document) {
    docs.push(parentRoot.ownerDocument);
  }
  return docs;
}

export function setCssVar(name: string, value: string): void {
  selfRoot.style.setProperty(name, value);
  parentRoot?.style.setProperty(name, value);
}

export function removeCssVar(name: string): void {
  selfRoot.style.removeProperty(name);
  parentRoot?.style.removeProperty(name);
}

/** Apply a map of CSS variables to :root (and the parent :root when in an iframe). */
export function applyCssVariables(variables: Record<string, string>): void {
  for (const [name, value] of Object.entries(variables)) {
    setCssVar(name, value);
  }
}

/** Remove all inline CSS custom properties from :root on both self and parent. */
export function clearAllCssVarOverrides(): void {
  clearRoot(selfRoot);
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
