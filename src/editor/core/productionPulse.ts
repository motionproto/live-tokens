import { writable } from 'svelte/store';
import type { ProductionInfo } from './themes/themeService';
import type { ManifestMeta } from './themes/themeTypes';

/**
 * Monotonic counter that ticks every time a production pointer flips —
 * theme production or a component's production. UI surfaces that need to
 * react to a sibling Adopt subscribe to this so they refresh without
 * per-pair wiring.
 *
 * Bumpers: `ColorsTypePart.handleApplyToProduction`,
 * `ThemePanel.deleteLayerFile`,
 * `ComponentFileManager.handleUpdateProduction`. Anyone setting
 * `_production.json` should bump.
 */
export const productionRevision = writable(0);

export function bumpProductionRevision(): void {
  productionRevision.update((n) => n + 1);
}

/**
 * Ticks when a component starts running a different config file. Saving one is
 * visible through `componentDirty`, but loading or deleting a config with no
 * edit in play changes nothing the Theme panel can observe, and its Components
 * count is derived from exactly that. Bumped by `ComponentFileManager`.
 */
export const componentActiveRevision = writable(0);

export function bumpComponentActiveRevision(): void {
  componentActiveRevision.update((n) => n + 1);
}

/**
 * Cached production-state stores. The Theme panel and its parts live in the
 * sidebar footer, swapping in/out of the DOM as the user toggles between the
 * tokens and components views. Keeping the last-known production state in
 * module-level Svelte stores means a remount renders the correct Adopt-button
 * state on the first frame instead of flashing through "not in sync" while a
 * fresh fetch resolves.
 */
export const themeProductionInfo = writable<ProductionInfo | null>(null);

/**
 * Last-known active manifest meta. Bumped by the Theme panel whenever the
 * active manifest changes (load, save, save-as) and whenever a theme or
 * component Adopt completes (the server patches the active manifest as a
 * side-effect, so consumers re-read it on `productionRevision` ticks).
 */
export const activeManifest = writable<ManifestMeta | null>(null);
