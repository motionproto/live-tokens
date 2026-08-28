import { derived, type Readable } from 'svelte/store';
import { SKETCH_STYLES } from './sketchStyles';
import { selectSketchStyle, setSketchEnabled, sketchEnabled, sketchStyleName } from './sketchStore';

export interface SketchLook {
  /** What `setSketch` takes. */
  id: string;
  label: string;
  blurb: string;
}

/** The shipped sketchstyles. A picker adds its own "None" row: off is a state
    of the effect, not one of the looks. */
export const SKETCH_LOOKS: readonly SketchLook[] = Object.entries(SKETCH_STYLES).map(
  ([id, style]) => ({ id, label: style.label, blurb: style.blurb }),
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
  | { state: 'look'; look: SketchLook }
  | { state: 'adjusted' };

export const sketchPick: Readable<SketchPick> = derived(
  [sketchEnabled, sketchStyleName],
  ([on, name]): SketchPick => {
    if (!on) return { state: 'off' };
    const look = SKETCH_LOOKS.find((l) => l.id === name);
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
  if (!(id in SKETCH_STYLES)) {
    throw new Error(`Unknown sketchstyle "${id}". Ids come from SKETCH_LOOKS.`);
  }
  selectSketchStyle(id);
  setSketchEnabled(true);
}
