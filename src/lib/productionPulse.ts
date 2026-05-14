import { writable } from 'svelte/store';
import type { ProductionInfo } from './themeService';
import type { ProductionComparison } from './presetService';

/**
 * Monotonic counter that ticks every time a production pointer flips —
 * theme production, a component's production, or a preset applied to
 * production. UI surfaces that compare against current production state
 * (notably `PresetFileManager`) subscribe to this so an Adopt click in a
 * sibling manager refreshes their derived status without per-pair wiring.
 *
 * Bumpers: `ThemeFileManager.handleApplyToProduction`,
 * `ComponentFileManager.handleUpdateProduction`,
 * `presetService.applyPresetToProduction` (called from `PresetFileManager`).
 * Anyone setting `_production.json` should bump.
 */
export const productionRevision = writable(0);

export function bumpProductionRevision(): void {
  productionRevision.update((n) => n + 1);
}

/**
 * Cached production-state stores. The Theme and Preset file managers live in
 * the sidebar footer, swapping in/out of the DOM as the user toggles between
 * the tokens and components views. Keeping the last-known production state in
 * module-level Svelte stores means a remount renders the correct Adopt-button
 * state on the first frame instead of flashing through "not in sync" while a
 * fresh fetch resolves.
 */
export const themeProductionInfo = writable<ProductionInfo | null>(null);
export const presetProductionComparison = writable<ProductionComparison | null>(null);
