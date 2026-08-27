import type { TokensCssMigration } from '../types';

const MARKER = "[data-backdrop='dark']";

const RULES = `/* BACKDROP POLARITY — one attribute says which way a surface leans. State it
   in markup (\`<section data-backdrop="dark">\`) or let \`use:backdrop\` measure
   and stamp it. Either way \`light-dark()\` inside resolves the right half, and
   a rule can key on the attribute for what colour alone cannot carry. */

[data-backdrop='light'] {
  color-scheme: light;
}

[data-backdrop='dark'] {
  color-scheme: dark;
}
`;

/**
 * tokens-css migration (2026-08-27): teach a vendored `tokens.css` the
 * backdrop attribute.
 *
 * `data-backdrop` is the one channel for polarity — stated in markup or
 * stamped by `use:backdrop` — and these two rules are what turn it into
 * `color-scheme`, so `light-dark()` under it resolves the half that reads.
 * Without them the attribute still selects, but every `light-dark()` on the
 * page answers to the theme's root scheme alone.
 *
 * Idempotent by presence of the dark selector. Inserted before the first
 * `:root` block so the file still opens with the token vocabulary.
 */
export const tokensCssMigration_2026_08_27_backdropPolarity: TokensCssMigration = {
  id: '2026-08-27-backdrop-polarity',
  kind: 'additive',
  description: "Add the [data-backdrop] → color-scheme rules",
  apply(css) {
    if (css.includes(MARKER)) return css;
    const at = css.indexOf(':root');
    if (at === -1) return `${css.trimEnd()}\n\n${RULES}`;
    return `${css.slice(0, at)}${RULES}\n${css.slice(at)}`;
  },
};
