import { gamutClamp } from '../../core/palettes/oklch';

// The one gamut-max-chroma helper the wheel disc and the lightness bar share:
// the in-gamut chroma boundary for a hue at a given L (invariant: gamut is
// display-only). GAMUT_PROBE is a chroma the binary search walks inward from —
// any value past the widest sRGB reach works.
const GAMUT_PROBE = 0.5;

export const maxChroma = (l: number, hue: number): number => gamutClamp(l, GAMUT_PROBE, hue).c;

// Transient render intent shared across the bar→wheel boundary during an L
// drag. The wheel renders the active family from this pristine hue/chroma/L
// rather than the round-tripped store hex, so an absolute-mode L drag (where
// chroma clamps toward grey at the extremes and the recovered hue is unstable)
// no longer jitters the dot. Render-only — the colour value still writes
// through the store.
export type LiveColorEdit = { label: string; hue: number; chroma: number; l: number };
