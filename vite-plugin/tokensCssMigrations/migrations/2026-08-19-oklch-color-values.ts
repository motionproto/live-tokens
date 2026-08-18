import type { TokensCssMigration } from '../types';
import { hexToOklch, oklchToCss } from '../../../src/system/internal/oklch';

/**
 * tokens-css migration (2026-08-19): rewrite every `#rrggbb` token value as
 * `oklch()`, matching the serialization the editor now writes for derived
 * colors. Layer-1 primitives are hand-authored and have no palette source, so
 * the conversion happens on the CSS text itself.
 *
 * Only declaration values are touched — the pattern is anchored to
 * `--name:` — so a hex inside a comment or a selector survives untouched.
 * Every value goes through the same conversion the runtime uses. A hex is by
 * definition in sRGB gamut, so no clamping applies and the rendered color is
 * the one the hex named.
 *
 * Idempotent by presence: a second run finds no `#rrggbb` left to match.
 *
 * `breaking` because it rewrites the *value* of names a consumer references.
 * Nothing is renamed or removed, so the name-level contract guard would pass it
 * as additive; the label is what keeps it off the dev plugin's auto-apply path
 * and on an explicit `live-tokens migrate`. Consumers below the modern-browser
 * floor (Chrome 111 / Safari 15.4 / Firefox 113) must not run it.
 */
const HEX_DECLARATION_RE = /(--[a-z0-9-]+:\s*)#([0-9a-f]{6})(?=\s*[;}])/gi;

export const tokensCssMigration_2026_08_19_oklchColorValues: TokensCssMigration = {
  id: '2026-08-19-oklch-color-values',
  kind: 'breaking',
  description: 'Rewrite hex token values as oklch()',
  apply(css) {
    return css.replace(HEX_DECLARATION_RE, (_match, prefix: string, hex: string) => {
      const { l, c, h } = hexToOklch(`#${hex}`);
      return `${prefix}${oklchToCss(l, c, h)}`;
    });
  },
};
