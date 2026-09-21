/**
 * Washes slice — a wash is a translucent layer of color. Each family holds one
 * colour, aliased to a theme token, and three opacity stops. The theme emits
 * the colour and the stops; tokens.css composes the `--scrim-*` and `--tint-*`
 * fills from them, so the strength moves without restating the colour.
 *
 * Two families, opposite jobs. A **scrim** dims what sits behind it, which is
 * what a modal needs, so its stops run dark. A **tint** shades the surface it
 * sits on, which is what a hover needs, so its stops run faint. Scrims alias a
 * near-black surface and tints the text color, so a tint lightens a dark theme
 * and darkens a light one without picking a direction.
 */
import type { EditorState, WashScale } from '../../store/editorTypes';

export type WashFamily = 'scrim' | 'tint';

export const WASH_FAMILIES: readonly WashFamily[] = ['scrim', 'tint'];

export function makeDefaultWashScale(family: WashFamily): WashScale {
  if (family === 'scrim') {
    return {
      color: '--surface-neutral-lowest',
      stops: [
        { variable: '--scrim-opacity-low',  label: 'Low',  opacity: 0.7 },
        { variable: '--scrim-opacity',      label: 'Base', opacity: 0.8 },
        { variable: '--scrim-opacity-high', label: 'High', opacity: 0.9 },
      ],
    };
  }
  return {
    color: '--text-primary',
    stops: [
      { variable: '--tint-opacity-low',  label: 'Low',  opacity: 0.05 },
      { variable: '--tint-opacity',      label: 'Base', opacity: 0.1  },
      { variable: '--tint-opacity-high', label: 'High', opacity: 0.15 },
    ],
  };
}

export function makeDefaultWashesState(): EditorState['washes'] {
  return {
    scrim: makeDefaultWashScale('scrim'),
    tint: makeDefaultWashScale('tint'),
  };
}

export const washColorVar = (family: WashFamily) => `--${family}-color`;

export const WASH_VAR_NAMES: readonly string[] = WASH_FAMILIES.flatMap((family) => [
  washColorVar(family),
  ...makeDefaultWashScale(family).stops.map((s) => s.variable),
]);

const PLAIN_VAR_RE = /^var\((--[a-z0-9-]+)\)$/i;

export function washesToVars(w: EditorState['washes']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const family of WASH_FAMILIES) {
    out[washColorVar(family)] = `var(${w[family].color})`;
    for (const s of w[family].stops) out[s.variable] = String(s.opacity);
  }
  return out;
}

/**
 * Loader: route a freshly-loaded theme's wash entries into `next.washes` and
 * remove them from the bag. A colour that is not a plain `var()` stays in the
 * bag so the DOM still paints it.
 */
export function loadWashesFromVars(
  next: EditorState,
  rawVars: Record<string, string>,
): void {
  for (const family of WASH_FAMILIES) {
    const scale = next.washes[family];
    const colorVar = washColorVar(family);
    const color = rawVars[colorVar]?.trim().match(PLAIN_VAR_RE);
    if (color) {
      scale.color = color[1];
      delete rawVars[colorVar];
    }
    for (const s of scale.stops) {
      const n = Number(rawVars[s.variable]);
      if (rawVars[s.variable] === undefined || !Number.isFinite(n)) continue;
      s.opacity = Math.max(0, Math.min(1, n));
      delete rawVars[s.variable];
    }
  }
}
