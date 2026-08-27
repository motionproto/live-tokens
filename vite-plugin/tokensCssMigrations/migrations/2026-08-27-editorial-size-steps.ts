import type { TokensCssMigration } from '../types';
import { ensureScale, renameToken } from '../cssTokenOps';

/**
 * tokens-css migration (2026-08-27): give the editorial role its own size steps.
 *
 * The role shipped with a single unsized bundle (`--editorial-*`), so an
 * editorial surface could only take the body size. It now reads as a pair,
 * matching body: `--editorial-md-*` and `--editorial-sm-*`. The rename maps the
 * shipped bundle onto the medium step, and `ensureScale` backfills both steps so
 * a consumer who never had the role still ends up with every axis.
 *
 * Each step mirrors its body counterpart apart from the family, keeping the
 * role's original promise: a project that never repoints `--font-editorial`
 * renders exactly as it did.
 *
 * `breaking` because token names are public API — it never auto-applies and
 * rides an explicit `live-tokens migrate` during an upgrade.
 */
const AXES = ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing'];

const BUNDLE = [
  { name: '--editorial-md-font-family', value: 'var(--font-editorial)' },
  { name: '--editorial-md-font-size', value: 'var(--font-size-md)' },
  { name: '--editorial-md-font-weight', value: 'var(--font-weight-normal)' },
  { name: '--editorial-md-line-height', value: 'var(--line-height-normal)' },
  { name: '--editorial-md-letter-spacing', value: 'var(--letter-spacing-normal)' },
  { name: '--editorial-sm-font-family', value: 'var(--font-editorial)' },
  { name: '--editorial-sm-font-size', value: 'var(--font-size-sm)' },
  { name: '--editorial-sm-font-weight', value: 'var(--font-weight-normal)' },
  { name: '--editorial-sm-line-height', value: 'var(--line-height-tight)' },
  { name: '--editorial-sm-letter-spacing', value: 'var(--letter-spacing-normal)' },
];

export const tokensCssMigration_2026_08_27_editorialSizeSteps: TokensCssMigration = {
  id: '2026-08-27-editorial-size-steps',
  kind: 'breaking',
  description: 'Split the editorial bundle into --editorial-md-* and --editorial-sm-* steps',
  apply(css) {
    let out = css;
    for (const axis of AXES) {
      out = renameToken(out, `--editorial-${axis}`, `--editorial-md-${axis}`);
    }
    return ensureScale(out, {
      sectionComment: 'Editorial — the long-reading role, body face until repointed',
      anchorPrefixes: [
        '--eyebrow-',
        '--code-',
        '--body-',
        '--heading-',
        '--letter-spacing-',
        '--line-height-',
        '--font-weight-',
        '--font-size-',
        '--font-',
      ],
      entries: BUNDLE,
    });
  },
};
