import { writable } from 'svelte/store';
import { cssColorToOklch, oklchToCss, type Oklch } from '../core/palettes/oklch';
import { isEditable } from '../core/store/editorKeybindings';
import { showCopyPopover } from './copyPopover';

/** The Tokens-view family whose swatch opened last. Every family can hold an
 *  open swatch at once, and copy and paste act on this one alone. */
export const activeSwatchFamily = writable<string | null>(null);

const inTextField = (e: Event) => e.target instanceof HTMLElement && isEditable(e.target);

/** ⌘C on a swatch view. A text field or selected page text keeps the browser's
 *  own copy. Copy rides the key rather than the copy event because Safari fires
 *  no copy event without a text selection. */
export function isSwatchCopy(e: KeyboardEvent): boolean {
  if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey || e.key.toLowerCase() !== 'c') return false;
  return !inTextField(e) && window.getSelection()?.isCollapsed !== false;
}

/** The color a paste carries to a swatch, or null when a text field keeps the
 *  paste or the clipboard holds no hex or `oklch()` color. Paste rides the
 *  event because its clipboardData needs no read permission. */
export function swatchPasteColor(e: ClipboardEvent): Oklch | null {
  if (inTextField(e)) return null;
  return cssColorToOklch(e.clipboardData?.getData('text/plain') ?? '');
}

export function showSwatchColor(color: Oklch, anchor: Element | null): void {
  showCopyPopover(oklchToCss(color.l, color.c, color.h), anchor);
}

export function copySwatchColor(color: Oklch, anchor: Element | null): void {
  navigator.clipboard?.writeText(oklchToCss(color.l, color.c, color.h));
  showSwatchColor(color, anchor);
}
