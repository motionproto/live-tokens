import type { TokensCssMigration } from '../types';
import { appendMediaBlock, collectTokenValues, ensureScale, setTokenValue, type ScaleEntry } from '../cssTokenOps';

/**
 * tokens-css migration (2026-10-15): the column grid holds a gutter and a
 * margin per viewport.
 *
 * `--columns-{desktop,tablet,phone}-{gutter,margin}` hold the values.
 * `--columns-gutter` and `--columns-margin` keep their names and point at the
 * desktop values, and a 767px and a 480px block re-point them at the tablet
 * and phone values. The 767px block goes before the 480px block, since both
 * apply on a phone and the later block wins. `--columns-count` stays one
 * value at every width, and the migration leaves it alone.
 *
 * A consumer's edits carry over. A structural name whose value differs from
 * the one 0.94.3 shipped moves into its desktop name. A shipped value takes
 * the new desktop default, so the shipped `clamp()` gutter and the shipped `0`
 * margin both become `32px`.
 *
 * `breaking`: it rewrites the value of both structural names.
 *
 * The entries freeze the column defaults of 2026-10-15.
 */
interface DesktopValue {
  structural: string;
  desktop: string;
  /** The value 0.94.3 shipped. */
  shipped: string;
  value: string;
}

const DESKTOP: DesktopValue[] = [
  {
    structural: '--columns-gutter',
    desktop: '--columns-desktop-gutter',
    shipped: 'clamp(0.5rem, 1.5vw, 1.5rem)',
    value: '32px',
  },
  { structural: '--columns-margin', desktop: '--columns-desktop-margin', shipped: '0', value: '32px' },
];

const SMALLER: ScaleEntry[] = [
  { name: '--columns-tablet-gutter', value: '24px' },
  { name: '--columns-tablet-margin', value: '24px' },
  { name: '--columns-phone-gutter', value: '16px' },
  { name: '--columns-phone-margin', value: '16px' },
];

const repoints = (viewport: string): ScaleEntry[] =>
  DESKTOP.map(({ structural }) => ({
    name: structural,
    value: `var(${structural.replace('--columns-', `--columns-${viewport}-`)})`,
  }));

export const tokensCssMigration_2026_10_15_responsiveColumns: TokensCssMigration = {
  id: '2026-10-15-responsive-columns',
  kind: 'breaking',
  description:
    'Give the column grid a gutter and margin per viewport, and re-point --columns-gutter and --columns-margin at them',
  apply(css) {
    const values = collectTokenValues(css);
    const pending = DESKTOP.filter(({ desktop }) => !values.has(desktop));
    let out = ensureScale(css, {
      anchorPrefixes: ['--columns-'],
      entries: [
        ...pending.map(({ structural, desktop, shipped, value }) => {
          const current = values.get(structural);
          return { name: desktop, value: current === undefined || current === shipped ? value : current };
        }),
        ...SMALLER,
      ],
    });
    for (const { structural, desktop } of pending) out = setTokenValue(out, structural, `var(${desktop})`);
    out = ensureScale(out, { anchorPrefixes: ['--columns-'], entries: repoints('desktop') });
    out = appendMediaBlock(out, '(max-width: 767px)', repoints('tablet'), { before: '(max-width: 480px)' });
    return appendMediaBlock(out, '(max-width: 480px)', repoints('phone'));
  },
};
