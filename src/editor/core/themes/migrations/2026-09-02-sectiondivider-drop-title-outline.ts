import type { Migration } from './index';

/**
 * SectionDivider title outline, removed (2026-09-02).
 *
 * The outline was a decorative stroke around the title's glyphs, and the only
 * reason the title was an SVG `<text>` behind a `feMorphology` filter rather
 * than an element. That SVG cost a `getBBox()` viewBox, a per-instance
 * MutationObserver on the document's inline style (filter primitives cannot
 * read a CSS var), font-load listeners to re-measure, and a title that was not
 * selectable or findable. It shipped transparent in the default and in all
 * eight presets, and the trap-out it was built for is done by the layout: the
 * `through-label` hairlines flank the title in a flex row, so no rule ever runs
 * behind the glyphs.
 *
 * Dropping the keys rather than rebinding them: nothing reads the values now.
 */
const DROPPED = new Set(
  ['lg', 'md', 'sm'].flatMap((v) => [
    `--sectiondivider-${v}-title-outline-width`,
    `--sectiondivider-${v}-title-outline-color`,
  ]),
);

export const componentMigration_2026_09_02_sectiondividerDropTitleOutline: Migration = {
  id: '2026-09-02-sectiondivider-drop-title-outline',
  fromVersion: 25,
  toVersion: 26,
  appliesTo: 'component-config',
  apply(rawVars, meta) {
    if (meta.component !== 'sectiondivider') return { ...rawVars };
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(rawVars)) {
      if (DROPPED.has(key)) continue;
      out[key] = value;
    }
    return out;
  },
};
