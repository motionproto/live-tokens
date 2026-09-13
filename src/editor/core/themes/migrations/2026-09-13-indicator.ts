import type { Migration } from './index';

/**
 * One indicator (2026-09-13).
 *
 * `accent` named three different things: the accent color family on Badge and
 * CornerBadge, the bar beside SideNavigation's current item, and the stripe on
 * Callout's leading edge. The bar and the stripe are indicators, the word
 * MenuSelect and TabBar already use, so the color reads `-indicator` and the
 * width `-indicator-width`. Values are unchanged, so this is a pure key
 * rename.
 */
const SIDENAVIGATION_PARTS = ['title', 'section', 'item', 'footer'];
const SIDENAVIGATION_STATES = ['default', 'hover', 'selected'];
const CALLOUT_VARIANTS = ['info', 'success', 'warning', 'danger'];

const RENAMES: Record<string, Record<string, string>> = {
  sidenavigation: Object.fromEntries(
    SIDENAVIGATION_PARTS.flatMap((part) =>
      SIDENAVIGATION_STATES.flatMap((state) => [
        [
          `--sidenavigation-${part}-${state}-accent`,
          `--sidenavigation-${part}-${state}-indicator`,
        ],
        [
          `--sidenavigation-${part}-${state}-accent-width`,
          `--sidenavigation-${part}-${state}-indicator-width`,
        ],
      ]),
    ),
  ),
  callout: Object.fromEntries(
    CALLOUT_VARIANTS.map((v) => [
      `--callout-${v}-accent-width`,
      `--callout-${v}-indicator-width`,
    ]),
  ),
};

export const componentMigration_2026_09_13_indicator: Migration = {
  id: '2026-09-13-indicator',
  fromVersion: 29,
  toVersion: 30,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    const renames = meta.component ? RENAMES[meta.component] : undefined;
    if (!renames) return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      out[renames[key] ?? key] = value;
    }
    return out;
  },
};
