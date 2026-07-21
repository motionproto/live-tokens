import { gamutClamp } from '../../core/palettes/oklch';

// The one gamut-max-chroma helper the wheel disc and the lightness bar share:
// the in-gamut chroma boundary for a hue at a given L (invariant: gamut is
// display-only). GAMUT_PROBE is a chroma the binary search walks inward from —
// any value past the widest sRGB reach works.
const GAMUT_PROBE = 0.5;

export const maxChroma = (l: number, hue: number): number => gamutClamp(l, GAMUT_PROBE, hue).c;
