import { writable } from 'svelte/store';
import type { PaletteConfig } from './tokenTypes';

/** Each PaletteEditor pushes its config here keyed by label. Used when saving. */
export const editorConfigs = writable<Record<string, PaletteConfig>>({});

/** Set by the load flow. Each PaletteEditor watches for its label and applies the config. */
export const loadedConfigs = writable<Record<string, PaletteConfig> | null>(null);

/** True when editorConfigs were populated from a token file load or deliberate user edit, not just component defaults. */
export const configsLoadedFromFile = writable<boolean>(false);

/** The file name of the currently active token file. */
export const activeFileName = writable<string>('default');
