import { writable } from 'svelte/store';
import type { FontSource, FontStack } from './tokenTypes';

/** Current project font sources. Written by tokenInit on load and by the
 *  Project Fonts editor during edits. Read by VisualsTab.handleSave to
 *  include in the persisted TokenFile. */
export const fontSources = writable<FontSource[]>([]);

/** Current font stacks (--font-display / --font-sans / --font-serif / --font-mono).
 *  Same load/save semantics as fontSources. */
export const fontStacks = writable<FontStack[]>([]);
