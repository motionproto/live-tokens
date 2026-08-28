import { derived, get, type Readable } from 'svelte/store';
import { THEME_SKETCH_ID } from './sketchStyles';
import { lookById, sketchLooks, type SketchLook } from './sketchRegistry';
import {
  sameLook,
  selectSketchStyle,
  selectThemeSketchStyle,
  setSketchEnabled,
  sketchEnabled,
  sketchStyleName,
  themeSketchStyle,
} from './sketchStore';

export { sketchLooks, registerSketchLook } from './sketchRegistry';
export type { SketchLook, SketchLookSource, RegisterSketchLookInput } from './sketchRegistry';

/** A look as one picker row. The theme's own look is offered this way too, and
    it belongs to no pool entry, so the fields only a pool entry has are off. */
export type SketchLookRow = Omit<SketchLook, 'settings' | 'source'>;

/**
 * The look the open theme carries, as one more row for a picker: same shape as
 * a shipped look, and `setSketch` takes its id like any other. Null when the
 * theme carries no sketchstyle, and null when what it carries IS one of the
 * shipped looks, since that look's own row already names it.
 *
 * Without this row the theme's look is a one-way door: a visitor lands on it,
 * picks Pencil, and nothing can take them back. It is also the only thing that
 * can name that look, which no shipped label can do honestly. A theme tuned off
 * `marker` still carries the label "Marker", so a row built from the style's
 * own label would sit beside the shipped Marker claiming to be it.
 */
export const themeSketchLook: Readable<SketchLookRow | null> = derived(
  [themeSketchStyle, sketchLooks],
  ([style, looks]) => {
    if (!style) return null;
    if (looks.some((look) => sameLook(look.settings, style))) return null;
    return { id: THEME_SKETCH_ID, label: 'Theme', blurb: 'The look this theme carries.' };
  },
);

/**
 * What the page is drawing with. Three states, not two: the effect can be on
 * under a look no shipped sketchstyle names — one saved to a file, or one a
 * theme carried — and a picker that collapses that into `off` tells the
 * visitor the page is crisp while it is visibly drawn.
 *
 * A dial moved off a shipped look keeps naming it, which is `selectSketchStyle`'s
 * own rule: the pick says where the look came from, and `sketchDirty` says it
 * has since drifted.
 */
export type SketchPick =
  | { state: 'off' }
  | { state: 'look'; look: SketchLookRow }
  | { state: 'adjusted' };

export const sketchPick: Readable<SketchPick> = derived(
  [sketchEnabled, sketchStyleName, sketchLooks, themeSketchLook],
  ([on, name, looks, themeLook]): SketchPick => {
    if (!on) return { state: 'off' };
    const look = looks.find((l) => l.id === name) ?? (themeLook?.id === name ? themeLook : undefined);
    return look ? { state: 'look', look: { id: look.id, label: look.label, blurb: look.blurb } } : { state: 'adjusted' };
  },
);

/**
 * Draw the page with one of the looks in the pool, or `null` for none.
 *
 * The only supported way for a consumer to drive the effect. Reaching for
 * `applySketchLayer` instead paints a stylesheet the store does not know it
 * owns, and every dial in the Sketchstyle view then writes state that reaches
 * nothing — silently, since the page is already drawn.
 */
export function setSketch(id: string | null): void {
  if (id === null) {
    setSketchEnabled(false);
    return;
  }
  if (id === THEME_SKETCH_ID) {
    if (!get(themeSketchStyle)) {
      throw new Error('No theme sketchstyle to draw with. `themeSketchLook` is null unless a theme carries one.');
    }
    selectThemeSketchStyle();
    setSketchEnabled(true);
    return;
  }
  if (!lookById(id)) {
    throw new Error(`Unknown sketchstyle "${id}". Ids come from sketchLooks and themeSketchLook.`);
  }
  selectSketchStyle(id);
  setSketchEnabled(true);
}

/**
 * Whether the store has recorded a decision of its own in this browser.
 *
 * For a consumer carrying visitors over from its own storage key: a one-time
 * carry has to be guarded on this, or it overwrites a pick the visitor has
 * since made in the editor's Sketchstyle view with the stale one. Reading the
 * key directly is not an option worth offering — it is ours to rename.
 */
export { hasPersistedSketchState } from './sketchStore';

/**
 * Draw the page with the sketchstyle a theme carries, unless this browser has
 * already decided for itself.
 *
 * The route from a saved theme to a built page. Hand it the theme's
 * `sketchStyle` field, raw: a built site has no theme API, so it reads its own
 * theme JSON and this hydrates what it finds. Absent, `null`, or anything that
 * is not an object all mean the same thing, which is no sketch.
 *
 * Call it before mounting, the way dev boot does (`bootstrap.ts` awaits
 * `initializeTheme` first), so the look is up on the first frame rather than
 * arriving over a crisp page.
 *
 * A visitor who has recorded a pick of their own keeps it, None included: this
 * seeds an undecided browser and never overwrites a decided one, so it is safe
 * to call on every boot. `themeSketchLook` is populated either way, so a picker
 * can offer the theme's look as a row whether or not this painted it.
 */
export { seedSketchFromTheme } from './sketchStore';

/** The dial set a theme's `sketchStyle` field holds, for a consumer typing the
    value it pulled out of its own theme JSON. `seedSketchFromTheme` takes it
    raw, so nothing has to be cast to hand it over. */
export type { SketchStyle } from './sketchStyles';
