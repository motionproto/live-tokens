/**
 * Editing-state machine for the PaletteEditor.
 *
 * A single discriminated union replaces several independent `let` decls so
 * the type-checker enforces field validity per mode.
 *
 * Modes:
 * - `idle` — no edit panel open.
 * - `editingBase` — header swatch is active; the user is dragging the base
 *   hex. No payload: the swatch renders from `baseColor` and cancel restores
 *   via the session scope.
 * - `editingStep` — a non-base swatch is active (palette step / derived-scale
 *   step / override slot). `stepKey` is the dot-keyed identifier; `snapshot`
 *   is the value at panel-open; `draft` is the live working colour (drives
 *   the swatch preview before commit).
 *
 * Locked-anchor state (`lockedLightnessIdx`, `lockedSaturationIdx`) and
 * the per-toggle injected flags (`injectedLightness`, `injectedSaturation`)
 * remain separate `let` decls in the parent because they are anchor-
 * management state, not edit-session state — they persist across
 * idle/edit transitions and have their own lifecycle tied to
 * `setAnchorToBase()`.
 */

import type { Scope } from '../../core/store/editorStore';

/** Sentinel key for the base swatch (used as `editingKey === BASE_KEY`). */
export const BASE_KEY = '__base__';

export type EditingState =
  | { kind: 'idle' }
  | { kind: 'editingBase' }
  | {
      kind: 'editingStep';
      stepKey: string;
      snapshot: string;
      draft: string;
    };

export const idleState: EditingState = { kind: 'idle' };

export function isIdle(s: EditingState): s is { kind: 'idle' } {
  return s.kind === 'idle';
}

export function isEditingBase(s: EditingState): s is Extract<EditingState, { kind: 'editingBase' }> {
  return s.kind === 'editingBase';
}

export function isEditingStep(s: EditingState): s is Extract<EditingState, { kind: 'editingStep' }> {
  return s.kind === 'editingStep';
}

/**
 * The currently-active edit key, or null when idle. `editingBase` returns
 * the BASE_KEY sentinel so call sites that compare against `editingKey`
 * (e.g. `editingKey === stepKey('Surfaces', 'low')`) keep working.
 */
export function activeKey(s: EditingState): string | null {
  if (s.kind === 'idle') return null;
  if (s.kind === 'editingBase') return BASE_KEY;
  return s.stepKey;
}

/** The current draft hex (for editingStep) or null. editingBase draws from baseColor directly. */
export function activeDraft(s: EditingState): string | null {
  return s.kind === 'editingStep' ? s.draft : null;
}

/** Aggregate session handle: holds the `Scope` returned by `beginScope` so confirmEdit/cancelEdit can commit/cancel. */
export interface PaletteEditSession {
  state: EditingState;
  scope: Scope | null;
}

export const idleSession: PaletteEditSession = { state: idleState, scope: null };
