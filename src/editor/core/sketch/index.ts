import { derived, get, type Readable } from 'svelte/store';
import { SKETCH_STYLES, THEME_SKETCH_ID } from './sketchStyles';
import {
  sameLook,
  selectSketchStyle,
  selectThemeSketchStyle,
  setSketchEnabled,
  sketchEnabled,
  sketchStyleName,
  themeSketchStyle,
} from './sketchStore';

export interface SketchLook {
  /** What `setSketch` takes. */
  id: string;
  label: string;
  blurb: string;
}

/** The shipped sketchstyles. A picker adds its own "None" row: off is a state
    of the effect, not one of the looks. A theme's own look is not here either,
    since it is not shipped; `themeSketchLook` carries that one row. */
export const SKETCH_LOOKS: readonly SketchLook[] = Object.entries(SKETCH_STYLES).map(
  ([id, style]) => ({ id, label: style.label, blurb: style.blurb }),
);

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
export const themeSketchLook: Readable<SketchLook | null> = derived(themeSketchStyle, (style) => {
  if (!style) return null;
  if (Object.values(SKETCH_STYLES).some((shipped) => sameLook(shipped, style))) return null;
  return { id: THEME_SKETCH_ID, label: 'Theme', blurb: 'The look this theme carries.' };
});

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
  | { state: 'look'; look: SketchLook }
  | { state: 'adjusted' };

export const sketchPick: Readable<SketchPick> = derived(
  [sketchEnabled, sketchStyleName, themeSketchLook],
  ([on, name, themeLook]): SketchPick => {
    if (!on) return { state: 'off' };
    const look =
      SKETCH_LOOKS.find((l) => l.id === name) ?? (themeLook && themeLook.id === name ? themeLook : undefined);
    return look ? { state: 'look', look } : { state: 'adjusted' };
  },
);

/**
 * Draw the page with one of the shipped looks, or `null` for none.
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
  if (!(id in SKETCH_STYLES)) {
    throw new Error(`Unknown sketchstyle "${id}". Ids come from SKETCH_LOOKS and themeSketchLook.`);
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
