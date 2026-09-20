import type { Migration } from './index';

/**
 * A scrim's colour and its strength, apart (2026-09-20).
 *
 * `-scrim-surface` held one composed fill, so a theme that wanted a paler
 * screen had to restate the colour to change the strength, and a light scrim
 * meant hand-writing a `color-mix()`. The pair splits them: `-scrim-color`
 * takes any colour, `-scrim-opacity` how much of it covers the page.
 *
 * The three `--scrim-*` stops still exist, composed from the two, so a value
 * that named one maps to that stop's opacity and the scale's colour. Anything
 * else was a hand-written fill: it becomes the colour, at full strength, which
 * preserves what a reader saw when the old value was already opaque and
 * otherwise leaves a value a person chose rather than guessing at its alpha.
 */
const STOPS: Record<string, string> = {
  '--scrim-low': '--scrim-opacity-low',
  '--scrim': '--scrim-opacity',
  '--scrim-high': '--scrim-opacity-high',
};

const SURFACE = /^--(imagelightbox|dialog)-scrim-surface$/;

export const componentMigration_2026_09_20_scrimColorAndOpacity: Migration = {
  id: '2026-09-20-scrim-color-and-opacity',
  fromVersion: 36,
  toVersion: 37,
  appliesTo: 'component-config',
  apply(rawVars) {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      const match = SURFACE.exec(key);
      if (!match) {
        out[key] = value;
        continue;
      }
      const stem = `--${match[1]}-scrim`;
      const stop = STOPS[value];
      out[`${stem}-color`] = stop ? '--scrim-color' : value;
      out[`${stem}-opacity`] = stop ?? '1';
    }
    return out;
  },
};
