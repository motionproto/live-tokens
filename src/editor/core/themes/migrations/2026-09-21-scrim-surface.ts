import type { Migration } from './index';

/**
 * A screen's scrim is one fill again (2026-09-21).
 *
 * From 0.84.0 Dialog and ImageLightbox read `-scrim-color` and
 * `-scrim-opacity` and mixed them where they painted. The theme now composes
 * `--scrim-low`, `--scrim`, and `--scrim-high` from its own colour and
 * strengths, so a screen picks one of those stops as `-scrim-surface`, the way
 * a hover picks a `--tint-*` stop.
 *
 * The scale's colour at one of its strengths becomes that stop. Any other pair
 * becomes the `color-mix()` the screen used to paint, so the page looks the
 * same.
 */
const STOPS: Record<string, string> = {
  '--scrim-opacity-low': '--scrim-low',
  '--scrim-opacity': '--scrim',
  '--scrim-opacity-high': '--scrim-high',
};

const PAIR = /^--(imagelightbox|dialog)-scrim-(color|opacity)$/;

const ref = (value: string) => (value.startsWith('--') ? `var(${value})` : value);

function fill(color: string, opacity: string): string {
  if (color === '--scrim-color' && STOPS[opacity]) return STOPS[opacity];
  if (opacity === '1') return color;
  const pct = Number.isFinite(Number(opacity))
    ? `${Number(opacity) * 100}%`
    : `calc(${ref(opacity)} * 100%)`;
  return `color-mix(in srgb, ${ref(color)} ${pct}, transparent)`;
}

export const componentMigration_2026_09_21_scrimSurface: Migration = {
  id: '2026-09-21-scrim-surface',
  fromVersion: 37,
  toVersion: 38,
  appliesTo: 'component-config',
  apply(rawVars) {
    const out: Record<string, string> = {};
    const pairs: Record<string, { color?: string; opacity?: string }> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      const match = PAIR.exec(key);
      if (!match) {
        out[key] = value;
        continue;
      }
      (pairs[match[1]] ??= {})[match[2] as 'color' | 'opacity'] = value;
    }
    for (const [id, { color = '--scrim-color', opacity = '--scrim-opacity-high' }] of Object.entries(pairs)) {
      out[`--${id}-scrim-surface`] = fill(color, opacity);
    }
    return out;
  },
};
