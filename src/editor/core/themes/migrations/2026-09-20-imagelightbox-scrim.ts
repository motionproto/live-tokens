import type { Migration } from './index';

/**
 * One word for the layer that dims the page (2026-09-20).
 *
 * Dialog called it a scrim and read the `--scrim-*` scale; ImageLightbox called
 * the same layer an overlay and mixed its own colour. The token scale settles
 * the word, so the key reads `-scrim-surface`. The chrome tokens keep their own
 * names: they paint the toolbar, not the layer behind it.
 */
const RENAMES: Record<string, string> = {
  '--imagelightbox-overlay-surface': '--imagelightbox-scrim-surface',
};

export const componentMigration_2026_09_20_imagelightboxScrim: Migration = {
  id: '2026-09-20-imagelightbox-scrim',
  fromVersion: 35,
  toVersion: 36,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'imagelightbox') return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      out[RENAMES[key] ?? key] = value;
    }
    return out;
  },
};
