import type { Migration } from './index';

/**
 * Component-config migration (2026-05-24, segmentedcontrol only):
 * `--segmentedcontrol-divider-height` was retired in favor of
 * `--segmentedcontrol-divider-inset`. The old token set a percentage / pixel
 * height on a centered flex item; with `Full` (100%) it collapsed to zero in
 * auto-sized inline-flex parents. The new token is `margin-block` trimmed
 * from a stretched divider, so Full = 0 inset = bar-height divider.
 *
 * Value semantic flipped (larger old value meant taller divider; larger new
 * value means shorter divider), so the saved customization is dropped rather
 * than copied across. Users fall back to the new default and re-pick once.
 */
export const componentMigration_2026_05_24_segmentedcontrolDividerInset: Migration = {
  id: '2026-05-24-segmentedcontrol-divider-inset',
  fromVersion: 11,
  toVersion: 12,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'segmentedcontrol') return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      if (key === '--segmentedcontrol-divider-height') continue;
      out[key] = value;
    }
    return out;
  },
};
