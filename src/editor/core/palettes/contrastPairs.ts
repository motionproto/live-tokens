import { contrastRatio, floorFor, isLargeText, type ContrastRole } from './contrast';

export const PAGE_BG = '--page-bg';

export interface ContrastPair {
  foreground: string;
  /** Component layers behind the foreground, top first. `--page-bg` always sits under the last one. */
  backdrop: string[];
  role: ContrastRole;
  /** Text only. Sets the large-text floor. */
  fontSize?: string;
  /** Text only. Normal weight when absent. */
  fontWeight?: string;
  /** Disabled state: WCAG exempts it, so the pair always passes. */
  inactive?: boolean;
  /** Names the context when one foreground has several pairs ("inline", "zoomed"). */
  context?: string;
}

/** sRGB channels from 0 to 255 and alpha from 0 to 1, as a canvas pixel reads. */
export type Rgba = [r: number, g: number, b: number, a: number];

export function over(front: Rgba, back: Rgba): Rgba {
  const alpha = front[3] + back[3] * (1 - front[3]);
  if (alpha === 0) return [0, 0, 0, 0];
  const mix = (f: number, b: number) => (f * front[3] + b * back[3] * (1 - front[3])) / alpha;
  return [mix(front[0], back[0]), mix(front[1], back[1]), mix(front[2], back[2]), alpha];
}

export interface Resolver {
  /** One color for a solid value, one per stop for a gradient. */
  color(name: string): Rgba[];
  fontPx(name: string): number;
  fontWeight(name: string): number;
}

export interface PairMeasure {
  pair: ContrastPair;
  ratio: number;
  floor: number;
  large: boolean;
  passes: boolean;
}

const NORMAL_WEIGHT = 400;

function hex([r, g, b]: Rgba): string {
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`;
}

export function measurePair(pair: ContrastPair, resolver: Resolver): PairMeasure {
  let behind = resolver.color(PAGE_BG);
  for (const layer of [...pair.backdrop].reverse()) {
    const below = behind;
    behind = resolver.color(layer).flatMap((stop) => below.map((back) => over(stop, back)));
  }
  const fronts = resolver.color(pair.foreground);
  let ratio = Infinity;
  for (const back of behind) {
    for (const front of fronts) {
      ratio = Math.min(ratio, contrastRatio(hex(over(front, back)), hex(back)));
    }
  }
  const large = pair.role === 'text'
    && pair.fontSize !== undefined
    && isLargeText(
      resolver.fontPx(pair.fontSize),
      pair.fontWeight ? resolver.fontWeight(pair.fontWeight) : NORMAL_WEIGHT,
    );
  const floor = floorFor(pair.role, large);
  return { pair, ratio, floor, large, passes: pair.inactive === true || ratio >= floor };
}

/** An inactive pair applies no floor, so it ranks only when every pair is inactive. */
export function closestToFailing(measures: PairMeasure[]): PairMeasure {
  const active = measures.filter((m) => !m.pair.inactive);
  const pool = active.length > 0 ? active : measures;
  return pool.reduce((worst, m) => (m.ratio / m.floor < worst.ratio / worst.floor ? m : worst));
}
