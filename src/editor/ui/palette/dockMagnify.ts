/**
 * macOS-dock magnification policy for palette ramps, shared by the palette
 * editor's swatch grid and the Colors view's step strips so the falloff tunes
 * in one place. Layout stays native to each surface (grid tracks vs
 * flex-grow); only the size policy is shared.
 */

const ANCHORED_GROW = 1.7;
const NEIGHBOUR_GROW = 1.2;

/** Size share for a ramp cell: anchored opens widest, immediate neighbours
 *  get a smaller boost, everything else stays 1. Doubles as a flex-grow. */
export function dockGrow(index: number, anchored: number | null): number {
  if (anchored === null) return 1;
  const d = Math.abs(index - anchored);
  return d === 0 ? ANCHORED_GROW : d === 1 ? NEIGHBOUR_GROW : 1;
}

/** Grid track list (`minmax(0, Nfr)` per column) for a `cols`-column ramp. */
export function dockTrackTemplate(cols: number, anchored: number | null): string {
  return Array.from({ length: cols }, (_, i) => `minmax(0, ${dockGrow(i, anchored)}fr)`).join(' ');
}
