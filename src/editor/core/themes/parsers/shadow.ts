/**
 * The single source of truth for the CSS form of a shadow scale token:
 *
 *   <x>px <y>px <blur>px [<spread>px] hsla(<h>, <s>%, <l>%, <a>)
 *
 * The spread slot is written only when it is non-zero. A three-length shadow is
 * legal in `box-shadow` (spread defaults to 0) and in `filter: drop-shadow()`,
 * which has no spread slot at all — so one token dresses both, and a component
 * casting from an image's alpha reads the same variable as one casting from a
 * box. Dial a spread and the token grows its fourth length: still a shadow,
 * no longer a filter.
 *
 * Everything that reads or writes that form goes through `parseShadowCss` /
 * `shadowTokenCss`, so the theme generator (Node, no store) and the editor
 * (store, DOM) agree on the shape without sharing a graph.
 */
import type { ShadowToken } from '../../store/editorTypes';

export const SHADOW_VAR_NAMES = [
  '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl', '--shadow-2xl',
] as const;

/** What the CSS form needs; `ShadowToken` adds the editor's polar controls. */
export type ShadowValue = Omit<ShadowToken, 'variable' | 'angle' | 'distance'>;

export function computeShadowXY(angle: number, distance: number): { x: number; y: number } {
  const rad = angle * (Math.PI / 180);
  return {
    x: Math.round(-distance * Math.cos(rad)),
    y: Math.round(distance * Math.sin(rad)),
  };
}

export function computeAngleDistance(x: number, y: number): { angle: number; distance: number } {
  const distance = Math.round(Math.sqrt(x * x + y * y));
  if (distance === 0) return { angle: 135, distance: 0 };
  let angle = Math.atan2(y, -x) * (180 / Math.PI);
  if (angle < 0) angle += 360;
  return { angle: Math.round(angle), distance };
}

export function shadowTokenCss(t: ShadowValue): string {
  const spread = t.spread ? `${t.spread}px ` : '';
  return `${t.x}px ${t.y}px ${t.blur}px ${spread}hsla(${t.hue}, ${t.saturation}%, ${t.lightness}%, ${t.opacity})`;
}

export function parseShadowCss(variable: string, raw: string): ShadowToken | null {
  const m = raw.trim().match(/^(-?\d+)px\s+(-?\d+)px\s+(\d+)px\s+(?:(-?\d+)px\s+)?hsla\(([\d.]+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)$/);
  if (!m) return null;
  const x = parseInt(m[1], 10);
  const y = parseInt(m[2], 10);
  const blur = parseInt(m[3], 10);
  const spread = m[4] === undefined ? 0 : parseInt(m[4], 10);
  const hue = Math.round(parseFloat(m[5]));
  const saturation = Math.round(parseFloat(m[6]));
  const lightness = Math.round(parseFloat(m[7]));
  const opacity = parseFloat(m[8]);
  const { angle, distance } = computeAngleDistance(x, y);
  return { variable, x, y, blur, spread, opacity, hue, saturation, lightness, angle, distance };
}
