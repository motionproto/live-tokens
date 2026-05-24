import type { Migration } from './index';

/**
 * Component-config migration (2026-05-24, button + segmentedcontrol):
 *
 * Promotes shape/icon-size properties that don't actually vary per state into
 * their own "base" part. The editor's per-state shape rows were dead UI — the
 * runtime treated them as separate tokens that were always linked anyway. The
 * runtime CSS now reads the default-state token in hover/disabled rules, so
 * the per-state tokens are dropped entirely.
 *
 * Saved per-state overrides are dropped (rare case; users re-customize once).
 * The default-state value remains the authoritative one.
 *
 *   button         drops --button-{v}-{hover|disabled}-{padding|radius|border-width}
 *                  for v in primary/secondary/outline/success/danger/warning.
 *
 *   segmentedcontrol drops --segmentedcontrol-{selected|option-hover|disabled}-icon-size.
 */

const BUTTON_VARIANTS = ['primary', 'secondary', 'outline', 'success', 'danger', 'warning'] as const;
const BUTTON_STATES = ['hover', 'disabled'] as const;
const BUTTON_PROPS = ['padding', 'radius', 'border-width'] as const;

const buttonDeadKeys = new Set<string>(
  BUTTON_VARIANTS.flatMap((v) =>
    BUTTON_STATES.flatMap((s) =>
      BUTTON_PROPS.map((p) => `--button-${v}-${s}-${p}`),
    ),
  ),
);

const segmentedcontrolDeadKeys = new Set<string>([
  '--segmentedcontrol-selected-icon-size',
  '--segmentedcontrol-option-hover-icon-size',
  '--segmentedcontrol-disabled-icon-size',
]);

export const componentMigration_2026_05_24_promoteStateSharedTokens: Migration = {
  id: '2026-05-24-promote-state-shared-tokens',
  fromVersion: 12,
  toVersion: 13,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    const dead =
      meta.component === 'button'
        ? buttonDeadKeys
        : meta.component === 'segmentedcontrol'
          ? segmentedcontrolDeadKeys
          : null;
    if (!dead) return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      if (dead.has(key)) continue;
      out[key] = value;
    }
    return out;
  },
};
