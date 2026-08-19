/** macOS-dock magnification for the Colors view's step strips. The palette
 *  editor's own grid stays even, because its curve editors plot one step per
 *  column. */

const ANCHORED_GROW = 1.7;
const NEIGHBOUR_GROW = 1.2;

/** Flex-grow for a ramp cell: anchored opens widest, immediate neighbours get a
 *  smaller boost, everything else stays 1. */
export function dockGrow(index: number, anchored: number | null): number {
  if (anchored === null) return 1;
  const d = Math.abs(index - anchored);
  return d === 0 ? ANCHORED_GROW : d === 1 ? NEIGHBOUR_GROW : 1;
}
