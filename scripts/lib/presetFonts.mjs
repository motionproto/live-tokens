// Google Fonts pairing per preset theme, from the plan's addendum 2. Called by
// seed-preset-theme.mjs, which stamps the pairing into the preset's
// colors-and-type file before embedding it in the theme — so applying either
// the colors and type alone or the whole theme changes the type.
//
// Every URL below was checked against fonts.googleapis.com. Note that a 200 is
// not proof of weight coverage: the API drops enumerated weights a family
// lacks and still answers 200, and only rejects a range its axis cannot serve.
// `live-tokens set-type` negotiates URLs from the returned CSS instead.

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const STAMP_PREFIX = 'src_preset_';

// Loaded only by `stampPresetFonts`: the table above is imported by a vitest
// suite and by `check:preset-themes`, both of which run before the plugin is
// built in CI.
const ENGINE = resolve(dirname(fileURLToPath(import.meta.url)), '../../dist-plugin/setType/index.js');
async function loadEngine() {
  if (!existsSync(ENGINE)) {
    throw new Error(`font pairing engine not found at ${ENGINE}. Build the plugin first (npm run build:plugin).`);
  }
  return import(ENGINE);
}

export const PRESET_FONTS = {
  autumn: {
    display: { name: 'Fraunces', url: 'https://fonts.googleapis.com/css2?family=Fraunces:wght@400..900&display=swap' },
    body: { name: 'Nunito Sans', url: 'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300..800&display=swap' },
  },
  halloween: {
    display: { name: 'Mystery Quest', url: 'https://fonts.googleapis.com/css2?family=Mystery+Quest&display=swap' },
    body: { name: 'Karla', url: 'https://fonts.googleapis.com/css2?family=Karla:wght@300..800&display=swap' },
  },
  'midnight-study': {
    display: { name: 'EB Garamond', url: 'https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400..800&display=swap' },
    body: { name: 'Montserrat', url: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300..800&display=swap' },
  },
  ocean: {
    display: { name: 'Quicksand', url: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@300..700&display=swap' },
    body: { name: 'Mulish', url: 'https://fonts.googleapis.com/css2?family=Mulish:wght@300..800&display=swap' },
  },
  'royal-velvet': {
    display: { name: 'Cinzel', url: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400..900&display=swap' },
    body: { name: 'Lato', url: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&display=swap' },
  },
  'spring-meadow': {
    display: { name: 'Comfortaa', url: 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@300..700&display=swap' },
    body: { name: 'Figtree', url: 'https://fonts.googleapis.com/css2?family=Figtree:wght@300..900&display=swap' },
  },
  sunset: {
    display: { name: 'DM Serif Display', url: 'https://fonts.googleapis.com/css2?family=DM+Serif+Display&display=swap' },
    body: { name: 'Jost', url: 'https://fonts.googleapis.com/css2?family=Jost:wght@300..700&display=swap' },
  },
  // Sketchy is hand-authored rather than seeded, so this entry records the
  // pairing already in the file instead of supplying one to stamp. It is here
  // because `check:preset-themes` reads the table to pin each preset's faces
  // and to hold the pairings distinct; `seed-preset-theme.mjs` has no slug for
  // it and cannot rebuild it.
  sketchy: {
    display: { name: 'Cabin Sketch', url: 'https://fonts.googleapis.com/css2?family=Cabin+Sketch:wght@400;700&display=swap' },
    body: { name: 'Shantell Sans', url: 'https://fonts.googleapis.com/css2?family=Shantell+Sans:ital,wght@0,300..800;1,300..800&display=swap' },
  },
};

/**
 * Stamp the preset's pairing into `colorsAndType` in place. Returns whether
 * anything moved, so the caller can skip the write and the `updatedAt` bump.
 */
export async function stampPresetFonts(colorsAndType, slug) {
  const pairing = PRESET_FONTS[slug];
  if (!pairing) throw new Error(`no font pairing for preset "${slug}"`);

  const { applyFontPairing } = await loadEngine();
  const { colorsAndType: next, report } = applyFontPairing(colorsAndType, pairing, {
    idPrefix: STAMP_PREFIX,
  });
  colorsAndType.fontSources = next.fontSources;
  colorsAndType.fontStacks = next.fontStacks;
  return report.changed;
}
