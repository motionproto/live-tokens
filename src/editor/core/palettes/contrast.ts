// WCAG 2.1 contrast math + an OKLCH-lightness solver.
//
// The solver is the engine behind the "Derive accessible text" action: given a
// surface hex and a target ratio, it finds the lightness (at fixed hue) whose
// gamut-clamped color clears the ratio. Contrast is monotonic in L only on one
// side of the surface's own lightness, so `direction` selects the branch.

import { hexToOklch, oklchToHex, gamutClamp } from './oklch';

export const AA_BODY = 4.5;
export const AA_LARGE = 3.0;

function linearizeChannel(v8: number): number {
  const s = v8 / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const r = linearizeChannel(parseInt(hex.slice(1, 3), 16));
  const g = linearizeChannel(parseInt(hex.slice(3, 5), 16));
  const b = linearizeChannel(parseInt(hex.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

export interface FindLOptions {
  against: string;
  ratio: number;
  direction: 'lighter' | 'darker';
  c: number;
  h: number;
  margin?: number;
  /** Reachable-L window. The Text derivation multiplies seed L by a curve
   *  factor clamped to [0,2], so a family can only reach L ∈ [0, min(1,2·seedL)].
   *  The solver passes that ceiling as `lMax` so the returned L is realisable. */
  lMin?: number;
  lMax?: number;
}

export interface FindLResult {
  l: number;
  c: number;
  hex: string;
}

/**
 * Binary-search OKLCH lightness for a color that clears `ratio` against
 * `against`, staying on the `direction` side of the surface (the monotonic
 * branch). If the ratio is unreachable at chroma `c` within the window, decay
 * chroma toward 0 and retry — achromatic extremes reach the full 1..21 range.
 * The result is re-verified with `contrastRatio` after the hex round-trip and
 * nudged one step if 8-bit quantization ate the margin (Global invariant 8).
 */
export function findLForContrast(opts: FindLOptions): FindLResult {
  const { against, ratio, direction, c, h } = opts;
  const margin = opts.margin ?? 0.05;
  const lMin = opts.lMin ?? 0;
  const lMax = opts.lMax ?? 1;
  const target = ratio + margin;
  const againstL = hexToOklch(against).l;

  const evalAt = (l: number, cc: number) => {
    const g = gamutClamp(l, cc, h);
    const hex = oklchToHex(g.l, g.c, g.h);
    return { hex, chroma: g.c, ratio: contrastRatio(hex, against) };
  };

  // Returns the boundary solution at a fixed chroma, or null if `target` is
  // unreachable within the window at that chroma. `extreme` is the window end
  // with the most contrast (top L for lighter, bottom L for darker).
  const solveAtChroma = (cc: number): { l: number; hex: string; chroma: number } | null => {
    const lighter = direction === 'lighter';
    const lo0 = lighter ? Math.max(lMin, againstL) : lMin;
    const hi0 = lighter ? lMax : Math.min(lMax, againstL);
    if (lo0 >= hi0) return null; // no room to move to the requested side within the window
    const extreme = lighter ? hi0 : lo0;
    if (evalAt(extreme, cc).ratio < target) return null;
    let lo = lo0;
    let hi = hi0;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      const meets = evalAt(mid, cc).ratio >= target;
      // Contrast rises toward `extreme`; keep the half that still meets target.
      if (lighter ? meets : !meets) hi = mid;
      else lo = mid;
    }
    const at = lighter ? hi : lo;
    const e = evalAt(at, cc);
    return { l: at, hex: e.hex, chroma: e.chroma };
  };

  let sol = solveAtChroma(c);
  if (!sol) {
    if (!solveAtChroma(0)) {
      // Even achromatic can't reach the target within the window — return the
      // extreme (best effort); the caller reports it as unmet.
      const extremeL = direction === 'lighter' ? lMax : lMin;
      const e = evalAt(extremeL, 0);
      return { l: extremeL, c: 0, hex: e.hex };
    }
    let lo = 0;
    let hi = c;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (solveAtChroma(mid)) lo = mid;
      else hi = mid;
    }
    sol = solveAtChroma(lo)!;
  }

  let { l, hex, chroma } = sol;
  const step = direction === 'lighter' ? 0.004 : -0.004;
  for (let k = 0; k < 12 && contrastRatio(hex, against) < ratio; k++) {
    l = Math.min(lMax, Math.max(lMin, l + step));
    const g = gamutClamp(l, chroma, h);
    l = g.l;
    chroma = g.c;
    hex = oklchToHex(g.l, g.c, g.h);
  }
  return { l, c: chroma, hex };
}
