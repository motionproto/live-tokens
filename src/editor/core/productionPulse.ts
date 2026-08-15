import { writable } from 'svelte/store';
import type { Theme } from './themes/themeTypes';

/**
 * Monotonic counter that ticks every time an Adopt publishes a theme. UI
 * surfaces that need to react to a sibling Adopt subscribe to this so they
 * refresh without per-pair wiring.
 *
 * Bumpers: `ThemePanel.runAdopt`, `ComponentFileManager.handleAdopt`.
 */
export const productionRevision = writable(0);

export function bumpProductionRevision(): void {
  productionRevision.update((n) => n + 1);
}

/**
 * Ticks when a component's live config changes on the server — a save, a
 * preset load, a delete. Saving one is visible through `componentDirty`, but
 * loading a preset with no edit in play changes nothing the Theme panel can
 * observe, and its Components count is derived from exactly that. Bumped by
 * `ComponentFileManager`.
 */
export const componentActiveRevision = writable(0);

export function bumpComponentActiveRevision(): void {
  componentActiveRevision.update((n) => n + 1);
}

/**
 * Last-read production theme — the document `tokens.generated.css` was baked
 * from. The Theme panel and the component file managers live in surfaces that
 * swap in and out of the DOM, so keeping the last answer in a module-level
 * store means a remount renders the correct Adopt state on the first frame
 * instead of flashing through "not in sync" while a fresh fetch resolves.
 */
export const productionTheme = writable<Theme | null>(null);
