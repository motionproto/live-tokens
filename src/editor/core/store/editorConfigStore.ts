import { writable } from 'svelte/store';

/** Slug of the theme the editor has open — the document every edit belongs to. */
export const openThemeSlug = writable<string>('default');
