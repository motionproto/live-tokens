/**
 * The single source of truth for a design-token colour carried at reduced
 * opacity. A colour token below 100% opacity serializes as:
 *
 *   color-mix(in srgb, var(--token) NN%, transparent)
 *
 * 100% opacity is NOT represented here — a fully opaque colour collapses to a
 * plain `var(--token)` alias (`CssVarRef` kind `'token'`). Everything that
 * reads, writes, or validates this form must go through `parseColorOpacity` /
 * `formatColorOpacity` so the canonical shape lives in exactly one place.
 *
 * This module is intentionally dependency-free so the dev-server vite plugin
 * (a separate build) can import it the same way it imports `globalRootBlock`.
 */

/** `opacity` is an integer percentage in [0, 100). */
export interface ColorOpacity {
  /** The design-token name, e.g. `--surface-neutral-lower`. */
  name: string;
  /** Integer percentage, 0–99 (100 is not an opacity colour — it's a token). */
  opacity: number;
}

const COLOR_OPACITY_RE =
  /^color-mix\(in srgb,\s*var\((--[a-z0-9-]+)\)\s+(\d+)%,\s*transparent\)$/i;

/**
 * Parse a `color-mix(in srgb, var(--token) NN%, transparent)` string into its
 * token name and integer opacity. Returns null for any other value (plain
 * aliases, raw literals, gradients).
 */
export function parseColorOpacity(value: string): ColorOpacity | null {
  const m = value.trim().match(COLOR_OPACITY_RE);
  if (!m) return null;
  return { name: m[1], opacity: parseInt(m[2], 10) };
}

/** Serialize a token + integer opacity back to the canonical color-mix string. */
export function formatColorOpacity(name: string, opacity: number): string {
  return `color-mix(in srgb, var(${name}) ${opacity}%, transparent)`;
}
