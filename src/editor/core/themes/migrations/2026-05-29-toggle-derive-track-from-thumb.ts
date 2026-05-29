import type { Migration } from './index';

/**
 * Component-config migration (2026-05-29, toggle):
 *
 * Drops the explicit track dimensions and replaces them with a single
 * `track-padding` knob. The runtime CSS now derives:
 *
 *   track-width  = thumb-size * 2 + track-padding * 2
 *   track-height = thumb-size     + track-padding * 2
 *
 * so width and thickness are no longer authorable — they're a function of
 * thumb-size (picked from the font-size scale) and the new padding token.
 *
 *   --toggle-track-width      → dropped (derived)
 *   --toggle-track-thickness  → dropped (derived)
 *   --toggle-track-padding    → seeded with --space-2 if absent
 *
 * `--toggle-thumb-size` is left untouched. Pre-existing `--space-*` values
 * still render as valid lengths; the editor's font-size picker just won't
 * highlight them as a known entry until the user re-picks.
 */

export const componentMigration_2026_05_29_toggleDeriveTrackFromThumb: Migration = {
  id: '2026-05-29-toggle-derive-track-from-thumb',
  fromVersion: 19,
  toVersion: 20,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'toggle') return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      if (key === '--toggle-track-width' || key === '--toggle-track-thickness') continue;
      out[key] = value;
    }
    if (!('--toggle-track-padding' in out)) {
      out['--toggle-track-padding'] = '--space-2';
    }
    return out;
  },
};
