import type { Migration } from './index';

/**
 * A wash family's colour and its strengths, apart (2026-09-21).
 *
 * A theme stored each `--scrim-*` and `--tint-*` stop as a composed fill,
 * `color-mix(in srgb, var(<colour>) N%, transparent)`, so the colour was
 * restated three times and the fill overrode the one tokens.css composes from
 * `--scrim-color` and `--scrim-opacity-*`. That left Dialog and ImageLightbox,
 * which read the pair, deaf to every theme's scrim.
 *
 * Each family now stores `--<family>-color` and `--<family>-opacity-*`. The
 * base stop gives the colour, falling back to the first stop that parses. A
 * stop that does not parse is a hand-written fill: it stays, so the page keeps
 * painting what the theme's author chose.
 */
const FAMILIES = ['scrim', 'tint'] as const;

const COLOR_MIX_RE = /^color-mix\(in srgb,\s*var\((--[a-z0-9-]+)\)\s+(\d+(?:\.\d+)?)%,\s*transparent\)$/i;
const PLAIN_VAR_RE = /^var\((--[a-z0-9-]+)\)$/i;

function parseFill(raw: string): { color: string; opacity: number } | null {
  const s = raw.trim();
  const mix = s.match(COLOR_MIX_RE);
  if (mix) return { color: mix[1], opacity: Math.min(100, Number(mix[2])) / 100 };
  const plain = s.match(PLAIN_VAR_RE);
  return plain ? { color: plain[1], opacity: 1 } : null;
}

export const colorsAndTypeMigration_2026_09_21_washColorAndOpacity: Migration = {
  id: '2026-09-21-wash-color-and-opacity',
  fromVersion: 8,
  toVersion: 9,
  appliesTo: 'colors-and-type',
  apply(rawVars) {
    const out = { ...rawVars };
    for (const family of FAMILIES) {
      let color: string | null = null;
      for (const suffix of ['', '-low', '-high']) {
        const key = `--${family}${suffix}`;
        const parsed = out[key] === undefined ? null : parseFill(out[key]);
        if (!parsed) continue;
        color ??= parsed.color;
        out[`--${family}-opacity${suffix}`] = String(parsed.opacity);
        delete out[key];
      }
      if (color) out[`--${family}-color`] = `var(${color})`;
    }
    return out;
  },
};
