import { get, writable } from 'svelte/store';
import { setEditorView } from './editorViewStore';
import { navigate, route } from '../routing/router';
import { DEFAULT_COLORS_PATH, DEFAULT_EDITOR_PATH } from '../routing/ownedRoutes';

/** The palette family the Colors view has selected. Shared so the Tokens view
 *  can hand a family over to the wheel. */
export const selectedPalette = writable<string>('Brand');

/** One-shot: the family whose Tokens-view editor should open and scroll into
 *  view. The `PaletteEditor` that matches clears it. */
export const pendingPaletteFocus = writable<string | null>(null);

export function openPaletteInWheel(label: string) {
  selectedPalette.set(label);
  setEditorView('colors');
}

export function openPaletteInTokens(label: string) {
  selectedPalette.set(label);
  pendingPaletteFocus.set(label);
  setEditorView('tokens');
  // The standalone Colors page has no Tokens surface to switch to, so the view
  // flip alone would go nowhere.
  if (get(route) === DEFAULT_COLORS_PATH) navigate(DEFAULT_EDITOR_PATH);
}
