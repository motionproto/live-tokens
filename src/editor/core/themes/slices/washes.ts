/**
 * Overlays slice — overlay + hover stops, each stored as `{alias, opacity}`.
 * Emits as `color-mix(in srgb, var(<alias>) <pct>%, transparent)` so the
 * overlay tints automatically follow the aliased source token (a brand-color
 * shift propagates without re-editing every overlay).
 *
 * Defaults diverge from tokens.css by design: the editor starts from a
 * neutral alias and tokens.css continues to win until first edit (see
 * `overlaysEqualsDefault`).
 */
import type { EditorState, OverlayToken } from '../../store/editorTypes';

export function makeDefaultOverlayTokens(): OverlayToken[] {
  return [
    { variable: '--overlay-low',  label: 'Low',  alias: '--surface-neutral-lowest', opacity: 0.38 },
    { variable: '--overlay',      label: 'Base', alias: '--surface-neutral-lowest', opacity: 0.51 },
    { variable: '--overlay-high', label: 'High', alias: '--surface-neutral-lowest', opacity: 0.64 },
  ];
}

export function makeDefaultHoverTokens(): OverlayToken[] {
  return [
    { variable: '--hover-low',  label: 'Low',  alias: '--text-primary', opacity: 0.05 },
    { variable: '--hover',      label: 'Base', alias: '--text-primary', opacity: 0.1  },
    { variable: '--hover-high', label: 'High', alias: '--text-primary', opacity: 0.15 },
  ];
}

export function makeDefaultOverlaysState(): EditorState['overlays'] {
  return {
    tokens: makeDefaultOverlayTokens(),
    hoverTokens: makeDefaultHoverTokens(),
  };
}

export const OVERLAY_VAR_NAMES = [
  '--overlay-low', '--overlay', '--overlay-high',
  '--hover-low', '--hover', '--hover-high',
] as const;

export function overlayTokenToCss(t: OverlayToken): string {
  const pct = Math.round(t.opacity * 100);
  if (pct >= 100) return `var(${t.alias})`;
  return `color-mix(in srgb, var(${t.alias}) ${pct}%, transparent)`;
}

const COLOR_MIX_RE = /^color-mix\(in srgb,\s*var\((--[a-z0-9-]+)\)\s+(\d+)%,\s*transparent\)$/i;
const PLAIN_VAR_RE = /^var\((--[a-z0-9-]+)\)$/i;

export function parseOverlayCss(raw: string): { alias: string; opacity: number } | null {
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

export function overlaysToVars(o: EditorState['overlays']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const t of o.tokens) out[t.variable] = overlayTokenToCss(t);
  for (const t of o.hoverTokens) out[t.variable] = overlayTokenToCss(t);
  return out;
}

export function applyOverlayVarsToState(overlays: EditorState['overlays'], vars: Record<string, string>): void {
  const applyTo = (list: OverlayToken[]) => {
    for (const t of list) {
      const raw = vars[t.variable];
      if (!raw) continue;
      const parsed = parseOverlayCss(raw);
      if (!parsed) continue;
      t.alias = parsed.alias;
      t.opacity = parsed.opacity;
    }
  };
  applyTo(overlays.tokens);
  applyTo(overlays.hoverTokens);
}

/**
 * Loader: route overlay/hover entries from a freshly-loaded theme's vars
 * bag into `next.overlays` and remove them from the bag — but only when the
 * value parses as the new format (color-mix / plain var). Legacy rgba values
 * pass through to the cssVars bag so the DOM still paints them; the user's
 * next edit in the picker promotes them to the typed slice.
 */
export function loadOverlaysFromVars(
  next: EditorState,
  rawVars: Record<string, string>,
): void {
  applyOverlayVarsToState(next.overlays, rawVars);
  for (const name of OVERLAY_VAR_NAMES) {
    const raw = rawVars[name];
    if (raw && parseOverlayCss(raw) !== null) delete rawVars[name];
  }
}
