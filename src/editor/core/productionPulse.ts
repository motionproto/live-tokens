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
 * The live look has moved past the last bake. Only Adopt bakes the CSS, so a
 * buffer write or a theme save after one leaves production a version behind,
 * and no pointer file records when the bake happened. Every surface reads the
 * one signal: a component save has to reach the theme panel's Adopt, and a
 * component editor's Adopt has to clear it for the panel.
 *
 * Set by the client writes that move the live look (`writeWorkingColorsAndType`,
 * `writeWorkingComponentConfig`, `saveActiveTheme`, `saveAsTheme`, and every
 * sketch gesture: `setSketchEnabled`, `updateSketchSettings`,
 * `selectSketchPreset`, `selectUserSketchPreset`, `saveCurrentAsSketchPreset`);
 * cleared by `adoptLook`. Module-level, so it survives the remounts a view
 * switch causes.
 */
export const liveMovedSinceBake = writable(false);

/**
 * Last-read production theme — the document `tokens.generated.css` was baked
 * from. The Theme panel and the component file managers live in surfaces that
 * swap in and out of the DOM, so keeping the last answer in a module-level
 * store means a remount renders the correct Adopt state on the first frame
 * instead of flashing through "not in sync" while a fresh fetch resolves.
 */
export const productionTheme = writable<Theme | null>(null);
