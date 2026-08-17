/**
 * Fonts slice — sources + stacks. The editor renderer projects both from the
 * store: stacks become `--font-*` vars and sources become mirrored
 * <link>/<style> nodes. Callers only mutate data; undo/redo and hydration then
 * use the exact same reactive path as the initial edit.
 */
import type { FontSource, FontStack } from '../themeTypes';
import { store, mutate, persist } from '../../store/editorCore';

export function setFontSources(sources: FontSource[]): void {
  mutate('update font sources', (s) => { s.fonts.sources = sources; });
}

export function setFontStacks(stacks: FontStack[]): void {
  mutate('update font stacks', (s) => { s.fonts.stacks = stacks; });
}

/**
 * Populate fonts from the server's active theme at boot. Does not push
 * a history entry — the boot load is a starting point, not an edit.
 */
export function seedFontsFromColorsAndType(sources: FontSource[], stacks: FontStack[]): void {
  store.update((s) => {
    s.fonts.sources = structuredClone(sources);
    s.fonts.stacks = structuredClone(stacks);
    return s;
  });
  persist();
}
