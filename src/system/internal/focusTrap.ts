const TABBABLE = [
  '[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]',
]
  .map((selector) => `${selector}:not([tabindex="-1"])`)
  .join(', ');

export function tabbables(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(TABBABLE)];
}

/** Keeps Tab and Shift+Tab cycling through `container`'s tabbable elements.
 *  Focus on the container itself or outside it enters at the near end.
 *  Returns false when the container holds none, so the caller picks where
 *  focus rests. */
export function trapTab(container: HTMLElement, e: KeyboardEvent): boolean {
  const stops = tabbables(container);
  if (stops.length === 0) return false;
  const first = stops[0];
  const last = stops[stops.length - 1];
  const active = document.activeElement as HTMLElement | null;
  const inside = active !== null && active !== container && container.contains(active);
  if (e.shiftKey && (!inside || active === first)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (!inside || active === last)) {
    e.preventDefault();
    first.focus();
  }
  return true;
}
