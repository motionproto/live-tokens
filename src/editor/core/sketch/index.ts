import { derived, get, type Readable } from 'svelte/store';
import { THEME_SKETCH_ID } from './sketchStyles';
import { sketchStyleById, sketchStyles, type SketchStyle } from './sketchRegistry';
import {
  sameSketchStyle,
  selectSketchStyle,
  selectUnsavedSketchStyle,
  setSketchEnabled,
  sketchEnabled,
  selectedSketchStyleId,
  themeSketchSettings,
} from './sketchStore';

export { sketchStyles, registerSketchStyle } from './sketchRegistry';
export type { SketchStyle, SketchStyleSource, RegisterSketchStyleInput } from './sketchRegistry';

/** A style as one picker row. The theme's own style is offered this way too, and
    it belongs to no pool entry, so the fields only a pool entry has are off. */
export type SketchStyleRow = Omit<SketchStyle, 'settings' | 'source'>;

/**
 * Sketch settings the open theme carries that no sketchstyle file holds, as one
 * more row for a picker: same shape as a shipped sketchstyle, and `setSketch`
 * takes its id like any other. Null when the theme carries no settings, and
 * null when what it carries matches a sketchstyle, since that file's own row
 * already names it.
 *
 * A theme embeds its sketch settings by value, so it can hold a set that
 * belongs to no file: Save As is what turns one into a sketchstyle. Until then
 * this is the only row that can offer it. Without it the settings are a one-way
 * door, a visitor picks Pencil and nothing can take them back.
 *
 * Labelled "Unsaved" rather than by the settings' own label, which lies: a theme
 * tuned off `marker` still carries the label "Marker", so a row built from it
 * would sit beside the shipped Marker claiming to be it.
 */
export const unsavedSketchStyle: Readable<SketchStyleRow | null> = derived(
  [themeSketchSettings, sketchStyles],
  ([settings, styles]) => {
    if (!settings) return null;
    if (styles.some((style) => sameSketchStyle(style.settings, settings))) return null;
    return {
      id: THEME_SKETCH_ID,
      label: 'Unsaved',
      blurb: 'Sketch settings this theme carries that no sketchstyle holds.',
    };
  },
);

/**
 * What the page is drawing with. Three states, not two: the effect can be on
 * under a style no shipped sketchstyle names — one saved to a file, or one a
 * theme carried — and a picker that collapses that into `off` tells the
 * visitor the page is crisp while it is visibly drawn.
 *
 * A dial moved off a shipped style keeps naming it, which is `selectSketchStyle`'s
 * own rule: the pick says where the style came from, and `sketchDirty` says it
 * has since drifted.
 */
export type SketchPick =
  | { state: 'off' }
  | { state: 'style'; style: SketchStyleRow }
  | { state: 'adjusted' };

export const sketchPick: Readable<SketchPick> = derived(
  [sketchEnabled, selectedSketchStyleId, sketchStyles, unsavedSketchStyle],
  ([on, name, styles, unsaved]): SketchPick => {
    if (!on) return { state: 'off' };
    const style = styles.find((s) => s.id === name) ?? (unsaved?.id === name ? unsaved : undefined);
    return style ? { state: 'style', style: { id: style.id, label: style.label, blurb: style.blurb } } : { state: 'adjusted' };
  },
);

/**
 * Draw the page with one of the styles in the pool, or `null` for none.
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
    if (!get(themeSketchSettings)) {
      throw new Error('No theme sketchstyle to draw with. `unsavedSketchStyle` is null unless a theme carries one.');
    }
    selectUnsavedSketchStyle();
    setSketchEnabled(true);
    return;
  }
  if (!sketchStyleById(id)) {
    throw new Error(`Unknown sketchstyle "${id}". Ids come from sketchStyles and unsavedSketchStyle.`);
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
 * `sketchSettings` field, raw: a built site has no theme API, so it reads its own
 * theme JSON and this hydrates what it finds. Absent, `null`, or anything that
 * is not an object all mean the same thing, which is no sketch.
 *
 * Call it before mounting, the way dev boot does (`bootstrap.ts` awaits
 * `initializeTheme` first), so the style is up on the first frame rather than
 * arriving over a crisp page.
 *
 * A visitor who has recorded a pick of their own keeps it, None included: this
 * seeds an undecided browser and never overwrites a decided one, so it is safe
 * to call on every boot. `unsavedSketchStyle` is populated either way, so a picker
 * can offer the theme's style as a row whether or not this painted it.
 */
export { seedSketchFromTheme } from './sketchStore';

/** The dial set a theme's `sketchSettings` field holds, for a consumer typing the
    value it pulled out of its own theme JSON. `seedSketchFromTheme` takes it
    raw, so nothing has to be cast to hand it over. */
export type { SketchStyleSettings } from './sketchStyles';
