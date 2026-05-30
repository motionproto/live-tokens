/**
 * The single classifier + renderer for `CssVarRef`. Every place that turns a
 * CSS value string into a ref, or a ref back into CSS, routes through here so
 * the three ref kinds (`token`, `literal`, `gradient`) are interpreted
 * identically across the disk loader, the live-edit path, the registry, and the
 * component renderer.
 *
 * A `token` may carry an optional `opacity` (a colour below 100%). Opacity
 * serialization is delegated to `parsers/colorOpacity`, the one place that knows
 * the `color-mix(in srgb, var(--token) NN%, transparent)` shape.
 */
import type { CssVarRef } from './editorTypes';
import type { AliasDiskValue } from '../themes/themeTypes';
import { formatGradientValue } from '../themes/slices/gradients';
import { formatColorOpacity, parseColorOpacity } from '../themes/parsers/colorOpacity';

/** True when a token carries a non-trivial opacity (a colour below 100%). */
function hasOpacity(opacity: number | undefined): opacity is number {
  return opacity != null && opacity < 100;
}

/** Render a ref to the CSS value string written to a custom property. */
export function refToCss(ref: CssVarRef): string {
  switch (ref.kind) {
    case 'token':
      return hasOpacity(ref.opacity) ? formatColorOpacity(ref.name, ref.opacity) : `var(${ref.name})`;
    case 'literal':
      return ref.value;
    case 'gradient':
      return formatGradientValue(ref.value);
  }
}

/**
 * Classify a CSS value string into a ref. Accepts a bare token name (`--x`,
 * the disk convention), a wrapped alias (`var(--x)`, the declared-value form),
 * a colour-opacity expression, or anything else (a raw literal). Never produces
 * a gradient — gradients are stored as structured objects, not strings.
 */
export function cssStringToRef(value: string): CssVarRef {
  const op = parseColorOpacity(value);
  if (op) return { kind: 'token', name: op.name, opacity: op.opacity };
  if (value.startsWith('--')) return { kind: 'token', name: value };
  const wrapped = value.match(/^var\((--[a-z0-9-]+)\)$/);
  if (wrapped) return { kind: 'token', name: wrapped[1] };
  return { kind: 'literal', value };
}

/**
 * Serialize a ref to its on-disk `AliasDiskValue`. Mirrors `refToCss` except a
 * token is stored as its bare name (`--x`, not `var(--x)`) — the editor's disk
 * convention — and a gradient is a structured object rather than a CSS string.
 */
export function refToDiskValue(ref: CssVarRef): AliasDiskValue {
  switch (ref.kind) {
    case 'token':
      return hasOpacity(ref.opacity) ? formatColorOpacity(ref.name, ref.opacity) : ref.name;
    case 'literal':
      return ref.value;
    case 'gradient':
      return { kind: 'gradient', value: ref.value };
  }
}

/** Structural equality across all ref kinds. */
export function cssVarRefEqual(a: CssVarRef | undefined, b: CssVarRef | undefined): boolean {
  if (!a || !b) return a === b;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'token') {
    const bt = b as { kind: 'token'; name: string; opacity?: number };
    return a.name === bt.name && (a.opacity ?? 100) === (bt.opacity ?? 100);
  }
  if (a.kind === 'literal') return a.value === (b as { kind: 'literal'; value: string }).value;
  const av = a.value;
  const bv = (b as { kind: 'gradient'; value: typeof a.value }).value;
  if (av.type !== bv.type || av.angle !== bv.angle || av.stops.length !== bv.stops.length) return false;
  if ((av.aspectX ?? 1) !== (bv.aspectX ?? 1)) return false;
  if ((av.aspectY ?? 1) !== (bv.aspectY ?? 1)) return false;
  for (let i = 0; i < av.stops.length; i++) {
    const sa = av.stops[i];
    const sb = bv.stops[i];
    if (sa.position !== sb.position || sa.color !== sb.color || (sa.opacity ?? 100) !== (sb.opacity ?? 100)) {
      return false;
    }
  }
  return true;
}
