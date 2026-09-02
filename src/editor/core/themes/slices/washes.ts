/**
 * Washes slice — a wash is a translucent layer of color, stored as
 * `{alias, opacity}` and emitted as
 * `color-mix(in srgb, var(<alias>) <pct>%, transparent)`, so it follows its
 * aliased source token (a brand-color shift propagates without re-editing
 * every stop).
 *
 * Two families, opposite jobs. A **scrim** dims what sits behind it, which is
 * what a modal needs. A **tint** shades the surface it sits on, which is what
 * a hover needs. They are not interchangeable: scrims alias a near-black
 * surface, tints alias the text color, so a tint lightens a dark theme and
 * darkens a light one without picking a direction.
 *
 * Defaults diverge from tokens.css by design: the editor starts from a
 * neutral alias and tokens.css continues to win until first edit.
 */
import type { EditorState, WashToken } from '../../store/editorTypes';

export function makeDefaultScrimTokens(): WashToken[] {
  return [
    { variable: '--scrim-low',  label: 'Low',  alias: '--surface-neutral-lowest', opacity: 0.38 },
    { variable: '--scrim',      label: 'Base', alias: '--surface-neutral-lowest', opacity: 0.51 },
    { variable: '--scrim-high', label: 'High', alias: '--surface-neutral-lowest', opacity: 0.64 },
  ];
}

export function makeDefaultTintTokens(): WashToken[] {
  return [
    { variable: '--tint-low',  label: 'Low',  alias: '--text-primary', opacity: 0.05 },
    { variable: '--tint',      label: 'Base', alias: '--text-primary', opacity: 0.1  },
    { variable: '--tint-high', label: 'High', alias: '--text-primary', opacity: 0.15 },
  ];
}

export function makeDefaultWashesState(): EditorState['washes'] {
  return {
    scrims: makeDefaultScrimTokens(),
    tints: makeDefaultTintTokens(),
  };
}

export const WASH_VAR_NAMES = [
  '--scrim-low', '--scrim', '--scrim-high',
  '--tint-low', '--tint', '--tint-high',
] as const;

export function washTokenToCss(t: WashToken): string {
  const pct = Math.round(t.opacity * 100);
  if (pct >= 100) return `var(${t.alias})`;
  return `color-mix(in srgb, var(${t.alias}) ${pct}%, transparent)`;
}

const COLOR_MIX_RE = /^color-mix\(in srgb,\s*var\((--[a-z0-9-]+)\)\s+(\d+)%,\s*transparent\)$/i;
const PLAIN_VAR_RE = /^var\((--[a-z0-9-]+)\)$/i;

export function parseWashCss(raw: string): { alias: string; opacity: number } | null {
  const s = raw.trim();
  const mix = s.match(COLOR_MIX_RE);
  if (mix) {
    const pct = parseInt(mix[2], 10);
    if (!Number.isFinite(pct)) return null;
    return { alias: mix[1], opacity: Math.max(0, Math.min(100, pct)) / 100 };
  }
  const plain = s.match(PLAIN_VAR_RE);
  if (plain) return { alias: plain[1], opacity: 1 };
  return null;
}

export function washesToVars(w: EditorState['washes']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of w.scrims) out[t.variable] = washTokenToCss(t);
  for (const t of w.tints) out[t.variable] = washTokenToCss(t);
  return out;
}

export function applyWashVarsToState(washes: EditorState['washes'], vars: Record<string, string>): void {
  const applyTo = (list: WashToken[]) => {
    for (const t of list) {
      const raw = vars[t.variable];
      if (!raw) continue;
      const parsed = parseWashCss(raw);
      if (!parsed) continue;
      t.alias = parsed.alias;
      t.opacity = parsed.opacity;
    }
  };
  applyTo(washes.scrims);
  applyTo(washes.tints);
}

/**
 * Loader: route wash entries from a freshly-loaded theme's vars bag into
 * `next.washes` and remove them from the bag — but only when the value parses
 * as the new format (color-mix / plain var). Legacy rgba values pass through to
 * the cssVars bag so the DOM still paints them; the user's next edit in the
 * picker promotes them to the typed slice.
 */
export function loadWashesFromVars(
  next: EditorState,
  rawVars: Record<string, string>,
): void {
  applyWashVarsToState(next.washes, rawVars);
  for (const name of WASH_VAR_NAMES) {
    const raw = rawVars[name];
    if (raw && parseWashCss(raw) !== null) delete rawVars[name];
  }
}
