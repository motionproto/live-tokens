import type { TokensCssMigration } from '../types';
import {
  appendMediaBlock,
  collectTokenValues,
  ensureScale,
  renameToken,
  setTokenValue,
  type ScaleEntry,
} from '../cssTokenOps';

/**
 * tokens-css migration (2026-10-08): text styles become five type scales.
 *
 * Display, heading, body, code and editorial each own a face, a weight, a base
 * and a ratio. The base and ratio set seven steps, 2xs to 2xl, and each step
 * declares a desktop, a tablet and a phone size. A step's `-font-size` keeps
 * its public name: it points at the desktop size, and the 768px and 480px
 * blocks re-point it at the tablet and phone sizes.
 *
 * A consumer's edits carry over. A 0.91.2 step whose `-font-size` differs from
 * the shipped value keeps that value as its desktop size, and a face or weight
 * that differs from the shipped value stays in place of the link to its usage.
 * A carried rem or px size, or an alias that resolves to one, sets the step's
 * tablet and phone sizes by the editor's rule for an edited size. Any other
 * carried size, such as a `calc()`, keeps the scale's tablet and phone sizes.
 * A step 0.91.2 did not ship whose `-font-size` the file already declares,
 * such as a hand-added `--heading-2xl-font-size`, carries as an edit.
 *
 * `breaking`: it renames `--code-font-size`, `--code-line-height` and
 * `--code-letter-spacing` to `--code-md-*`, and it rewrites every 0.91.2
 * step's `-font-size`.
 *
 * The entries freeze the type-scale defaults of 2026-10-08. A 0.91.2 file
 * lists code before editorial, so the usages run in that order and each new
 * block lands beside the declarations it joins.
 */
const RENAMES: [from: string, to: string][] = [
  ['--code-font-size', '--code-md-font-size'],
  ['--code-line-height', '--code-md-line-height'],
  ['--code-letter-spacing', '--code-md-letter-spacing'],
];

interface CarriedStep {
  prefix: string;
  /** The `-font-size` 0.91.2 shipped, absent for a step it did not ship. */
  size?: string;
  /** Face and weight re-points, each applied only while the value is the one 0.91.2 shipped. */
  links: { name: string; from: string; to: string }[];
}

const CARRIED: CarriedStep[] = [
  {
    prefix: '--heading-xl',
    size: 'var(--font-size-4xl)',
    links: [
      { name: '--heading-xl-font-family', from: 'var(--font-display)', to: 'var(--heading-font-family)' },
      { name: '--heading-xl-font-weight', from: 'var(--font-weight-semibold)', to: 'var(--heading-font-weight)' },
    ],
  },
  {
    prefix: '--heading-lg',
    size: 'var(--font-size-2xl)',
    links: [
      { name: '--heading-lg-font-family', from: 'var(--font-display)', to: 'var(--heading-font-family)' },
      { name: '--heading-lg-font-weight', from: 'var(--font-weight-semibold)', to: 'var(--heading-font-weight)' },
    ],
  },
  {
    prefix: '--heading-md',
    size: 'var(--font-size-xl)',
    links: [
      { name: '--heading-md-font-family', from: 'var(--font-display)', to: 'var(--heading-font-family)' },
      { name: '--heading-md-font-weight', from: 'var(--font-weight-semibold)', to: 'var(--heading-font-weight)' },
    ],
  },
  {
    // heading-sm keeps the sans face it shipped with, so only its weight links.
    prefix: '--heading-sm',
    size: 'var(--font-size-lg)',
    links: [
      { name: '--heading-sm-font-weight', from: 'var(--font-weight-semibold)', to: 'var(--heading-font-weight)' },
    ],
  },
  {
    prefix: '--body-md',
    size: 'var(--font-size-md)',
    links: [
      { name: '--body-md-font-family', from: 'var(--font-sans)', to: 'var(--body-font-family)' },
      { name: '--body-md-font-weight', from: 'var(--font-weight-normal)', to: 'var(--body-font-weight)' },
    ],
  },
  {
    prefix: '--body-sm',
    size: 'var(--font-size-sm)',
    links: [
      { name: '--body-sm-font-family', from: 'var(--font-sans)', to: 'var(--body-font-family)' },
      { name: '--body-sm-font-weight', from: 'var(--font-weight-normal)', to: 'var(--body-font-weight)' },
    ],
  },
  {
    // 0.91.2 had no code-md face or weight: `--code-font-family` and
    // `--code-font-weight` keep their names as the code usage's settings.
    prefix: '--code-md',
    size: 'var(--font-size-sm)',
    links: [],
  },
  {
    prefix: '--editorial-xl',
    size: 'var(--font-size-xl)',
    links: [
      { name: '--editorial-xl-font-family', from: 'var(--font-editorial)', to: 'var(--editorial-font-family)' },
      { name: '--editorial-xl-font-weight', from: 'var(--font-weight-normal)', to: 'var(--editorial-font-weight)' },
    ],
  },
  {
    prefix: '--editorial-lg',
    size: 'var(--font-size-lg)',
    links: [
      { name: '--editorial-lg-font-family', from: 'var(--font-editorial)', to: 'var(--editorial-font-family)' },
      { name: '--editorial-lg-font-weight', from: 'var(--font-weight-normal)', to: 'var(--editorial-font-weight)' },
    ],
  },
  {
    prefix: '--editorial-md',
    size: 'var(--font-size-md)',
    links: [
      { name: '--editorial-md-font-family', from: 'var(--font-editorial)', to: 'var(--editorial-font-family)' },
      { name: '--editorial-md-font-weight', from: 'var(--font-weight-normal)', to: 'var(--editorial-font-weight)' },
    ],
  },
  {
    prefix: '--editorial-sm',
    size: 'var(--font-size-sm)',
    links: [
      { name: '--editorial-sm-font-family', from: 'var(--font-editorial)', to: 'var(--editorial-font-family)' },
      { name: '--editorial-sm-font-weight', from: 'var(--font-weight-normal)', to: 'var(--editorial-font-weight)' },
    ],
  },
  {
    prefix: '--eyebrow',
    size: 'var(--font-size-sm)',
    links: [
      { name: '--eyebrow-font-family', from: 'var(--font-sans)', to: 'var(--body-font-family)' },
      { name: '--eyebrow-font-weight', from: 'var(--font-weight-normal)', to: 'var(--body-font-weight)' },
    ],
  },
];

interface UsageBlock {
  usage: string;
  comment: string;
  /** `--{follows}-` declarations precede this usage in a migrated 0.91.2 file, so missing settings go after them. */
  follows: string;
  settings: ScaleEntry[];
  /** Steps 2xl to 2xs, each with its declarations in tokens.css order. */
  steps: { prefix: string; entries: ScaleEntry[] }[];
}

const COMPRESSION: ScaleEntry[] = [
  { name: '--type-tablet-scale-compression', value: '0.75' },
  { name: '--type-phone-scale-compression', value: '0.63' },
];

const COMPRESSED_VIEWPORTS = ['tablet', 'phone'] as const;

function literalRem(size: string): number | null {
  const m = /^(-?\d*\.?\d+)(rem|px)$/.exec(size.trim());
  if (!m) return null;
  return m[2] === 'rem' ? Number(m[1]) : Number(m[1]) / 16;
}

const ALIAS = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i;

/** Follows `var()` aliases through the file's top-level declarations, which hold the desktop values. */
function resolvedRem(size: string, values: ReadonlyMap<string, string>): number | null {
  const seen = new Set<string>();
  let value = size.trim();
  for (let ref = ALIAS.exec(value); ref; ref = ALIAS.exec(value)) {
    const next = values.get(ref[1]);
    if (next === undefined || seen.has(ref[1])) return null;
    seen.add(ref[1]);
    value = next.trim();
  }
  return literalRem(value);
}

/** Frozen from the editor's `recommendedEditedExpression`. */
function editedSizes(prefix: string, rem: number): ScaleEntry[] {
  const count = String(Number(rem.toFixed(4)));
  return COMPRESSED_VIEWPORTS.map((viewport) => ({
    name: `${prefix}-${viewport}-font-size`,
    value: `min(var(${prefix}-desktop-font-size), calc(pow(${count}, var(--type-${viewport}-scale-compression)) * 1rem))`,
  }));
}

const USAGES: UsageBlock[] = [
  {
    usage: 'display',
    comment: 'Display: type outside the page outline, such as heroes, section titles and big numbers',
    follows: 'type',
    settings: [
      { name: '--display-font-family', value: 'var(--font-display)' },
      { name: '--display-font-weight', value: 'var(--font-weight-semibold)' },
      { name: '--display-scale-base', value: '3' },
      { name: '--display-scale-ratio', value: '1.2' },
    ],
    steps: [
      {
        prefix: '--display-2xl',
        entries: [
          { name: '--display-2xl-font-family', value: 'var(--display-font-family)' },
          { name: '--display-2xl-desktop-font-size', value: 'calc(var(--display-scale-base) * pow(var(--display-scale-ratio), 3) * 1rem)' },
          { name: '--display-2xl-tablet-font-size', value: 'min(var(--display-2xl-desktop-font-size), calc(pow(var(--display-scale-base) * pow(var(--display-scale-ratio), 3), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--display-2xl-phone-font-size', value: 'min(var(--display-2xl-desktop-font-size), calc(pow(var(--display-scale-base) * pow(var(--display-scale-ratio), 3), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--display-2xl-font-size', value: 'var(--display-2xl-desktop-font-size)' },
          { name: '--display-2xl-font-weight', value: 'var(--display-font-weight)' },
          { name: '--display-2xl-line-height', value: 'var(--line-height-tightest)' },
          { name: '--display-2xl-letter-spacing', value: 'var(--letter-spacing-tight)' },
        ],
      },
      {
        prefix: '--display-xl',
        entries: [
          { name: '--display-xl-font-family', value: 'var(--display-font-family)' },
          { name: '--display-xl-desktop-font-size', value: 'calc(var(--display-scale-base) * pow(var(--display-scale-ratio), 2) * 1rem)' },
          { name: '--display-xl-tablet-font-size', value: 'min(var(--display-xl-desktop-font-size), calc(pow(var(--display-scale-base) * pow(var(--display-scale-ratio), 2), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--display-xl-phone-font-size', value: 'min(var(--display-xl-desktop-font-size), calc(pow(var(--display-scale-base) * pow(var(--display-scale-ratio), 2), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--display-xl-font-size', value: 'var(--display-xl-desktop-font-size)' },
          { name: '--display-xl-font-weight', value: 'var(--display-font-weight)' },
          { name: '--display-xl-line-height', value: 'var(--line-height-tightest)' },
          { name: '--display-xl-letter-spacing', value: 'var(--letter-spacing-tight)' },
        ],
      },
      {
        prefix: '--display-lg',
        entries: [
          { name: '--display-lg-font-family', value: 'var(--display-font-family)' },
          { name: '--display-lg-desktop-font-size', value: 'calc(var(--display-scale-base) * pow(var(--display-scale-ratio), 1) * 1rem)' },
          { name: '--display-lg-tablet-font-size', value: 'min(var(--display-lg-desktop-font-size), calc(pow(var(--display-scale-base) * pow(var(--display-scale-ratio), 1), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--display-lg-phone-font-size', value: 'min(var(--display-lg-desktop-font-size), calc(pow(var(--display-scale-base) * pow(var(--display-scale-ratio), 1), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--display-lg-font-size', value: 'var(--display-lg-desktop-font-size)' },
          { name: '--display-lg-font-weight', value: 'var(--display-font-weight)' },
          { name: '--display-lg-line-height', value: 'var(--line-height-tightest)' },
          { name: '--display-lg-letter-spacing', value: 'var(--letter-spacing-tight)' },
        ],
      },
      {
        prefix: '--display-md',
        entries: [
          { name: '--display-md-font-family', value: 'var(--display-font-family)' },
          { name: '--display-md-desktop-font-size', value: 'calc(var(--display-scale-base) * 1rem)' },
          { name: '--display-md-tablet-font-size', value: 'min(var(--display-md-desktop-font-size), calc(pow(var(--display-scale-base), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--display-md-phone-font-size', value: 'min(var(--display-md-desktop-font-size), calc(pow(var(--display-scale-base), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--display-md-font-size', value: 'var(--display-md-desktop-font-size)' },
          { name: '--display-md-font-weight', value: 'var(--display-font-weight)' },
          { name: '--display-md-line-height', value: 'var(--line-height-tightest)' },
          { name: '--display-md-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--display-sm',
        entries: [
          { name: '--display-sm-font-family', value: 'var(--display-font-family)' },
          { name: '--display-sm-desktop-font-size', value: 'calc(var(--display-scale-base) * pow(var(--display-scale-ratio), -1) * 1rem)' },
          { name: '--display-sm-tablet-font-size', value: 'min(var(--display-sm-desktop-font-size), calc(pow(var(--display-scale-base) * pow(var(--display-scale-ratio), -1), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--display-sm-phone-font-size', value: 'min(var(--display-sm-desktop-font-size), calc(pow(var(--display-scale-base) * pow(var(--display-scale-ratio), -1), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--display-sm-font-size', value: 'var(--display-sm-desktop-font-size)' },
          { name: '--display-sm-font-weight', value: 'var(--display-font-weight)' },
          { name: '--display-sm-line-height', value: 'var(--line-height-tighter)' },
          { name: '--display-sm-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--display-xs',
        entries: [
          { name: '--display-xs-font-family', value: 'var(--display-font-family)' },
          { name: '--display-xs-desktop-font-size', value: 'calc(var(--display-scale-base) * pow(var(--display-scale-ratio), -2) * 1rem)' },
          { name: '--display-xs-tablet-font-size', value: 'min(var(--display-xs-desktop-font-size), calc(pow(var(--display-scale-base) * pow(var(--display-scale-ratio), -2), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--display-xs-phone-font-size', value: 'min(var(--display-xs-desktop-font-size), calc(pow(var(--display-scale-base) * pow(var(--display-scale-ratio), -2), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--display-xs-font-size', value: 'var(--display-xs-desktop-font-size)' },
          { name: '--display-xs-font-weight', value: 'var(--display-font-weight)' },
          { name: '--display-xs-line-height', value: 'var(--line-height-tighter)' },
          { name: '--display-xs-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--display-2xs',
        entries: [
          { name: '--display-2xs-font-family', value: 'var(--display-font-family)' },
          { name: '--display-2xs-desktop-font-size', value: 'calc(var(--display-scale-base) * pow(var(--display-scale-ratio), -3) * 1rem)' },
          { name: '--display-2xs-tablet-font-size', value: 'min(var(--display-2xs-desktop-font-size), calc(pow(var(--display-scale-base) * pow(var(--display-scale-ratio), -3), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--display-2xs-phone-font-size', value: 'min(var(--display-2xs-desktop-font-size), calc(pow(var(--display-scale-base) * pow(var(--display-scale-ratio), -3), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--display-2xs-font-size', value: 'var(--display-2xs-desktop-font-size)' },
          { name: '--display-2xs-font-weight', value: 'var(--display-font-weight)' },
          { name: '--display-2xs-line-height', value: 'var(--line-height-tighter)' },
          { name: '--display-2xs-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
    ],
  },
  {
    usage: 'heading',
    comment: 'Heading: the page outline, h1 at xl down to h6 at 2xs',
    follows: 'display',
    settings: [
      { name: '--heading-font-family', value: 'var(--font-display)' },
      { name: '--heading-font-weight', value: 'var(--font-weight-semibold)' },
      { name: '--heading-scale-base', value: '1.5' },
      { name: '--heading-scale-ratio', value: '1.25' },
    ],
    steps: [
      {
        prefix: '--heading-2xl',
        entries: [
          { name: '--heading-2xl-font-family', value: 'var(--heading-font-family)' },
          { name: '--heading-2xl-desktop-font-size', value: 'calc(var(--heading-scale-base) * pow(var(--heading-scale-ratio), 3) * 1rem)' },
          { name: '--heading-2xl-tablet-font-size', value: 'min(var(--heading-2xl-desktop-font-size), calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), 3), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--heading-2xl-phone-font-size', value: 'min(var(--heading-2xl-desktop-font-size), calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), 3), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--heading-2xl-font-size', value: 'var(--heading-2xl-desktop-font-size)' },
          { name: '--heading-2xl-font-weight', value: 'var(--heading-font-weight)' },
          { name: '--heading-2xl-line-height', value: 'var(--line-height-tightest)' },
          { name: '--heading-2xl-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--heading-xl',
        entries: [
          { name: '--heading-xl-font-family', value: 'var(--heading-font-family)' },
          { name: '--heading-xl-desktop-font-size', value: 'calc(var(--heading-scale-base) * pow(var(--heading-scale-ratio), 2) * 1rem)' },
          { name: '--heading-xl-tablet-font-size', value: 'min(var(--heading-xl-desktop-font-size), calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), 2), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--heading-xl-phone-font-size', value: 'min(var(--heading-xl-desktop-font-size), calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), 2), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--heading-xl-font-size', value: 'var(--heading-xl-desktop-font-size)' },
          { name: '--heading-xl-font-weight', value: 'var(--heading-font-weight)' },
          { name: '--heading-xl-line-height', value: 'var(--line-height-tightest)' },
          { name: '--heading-xl-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--heading-lg',
        entries: [
          { name: '--heading-lg-font-family', value: 'var(--heading-font-family)' },
          { name: '--heading-lg-desktop-font-size', value: 'calc(var(--heading-scale-base) * pow(var(--heading-scale-ratio), 1) * 1rem)' },
          { name: '--heading-lg-tablet-font-size', value: 'min(var(--heading-lg-desktop-font-size), calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), 1), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--heading-lg-phone-font-size', value: 'min(var(--heading-lg-desktop-font-size), calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), 1), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--heading-lg-font-size', value: 'var(--heading-lg-desktop-font-size)' },
          { name: '--heading-lg-font-weight', value: 'var(--heading-font-weight)' },
          { name: '--heading-lg-line-height', value: 'var(--line-height-tightest)' },
          { name: '--heading-lg-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--heading-md',
        entries: [
          { name: '--heading-md-font-family', value: 'var(--heading-font-family)' },
          { name: '--heading-md-desktop-font-size', value: 'calc(var(--heading-scale-base) * 1rem)' },
          { name: '--heading-md-tablet-font-size', value: 'min(var(--heading-md-desktop-font-size), calc(pow(var(--heading-scale-base), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--heading-md-phone-font-size', value: 'min(var(--heading-md-desktop-font-size), calc(pow(var(--heading-scale-base), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--heading-md-font-size', value: 'var(--heading-md-desktop-font-size)' },
          { name: '--heading-md-font-weight', value: 'var(--heading-font-weight)' },
          { name: '--heading-md-line-height', value: 'var(--line-height-tighter)' },
          { name: '--heading-md-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--heading-sm',
        entries: [
          { name: '--heading-sm-font-family', value: 'var(--font-sans)' },
          { name: '--heading-sm-desktop-font-size', value: 'calc(var(--heading-scale-base) * pow(var(--heading-scale-ratio), -1) * 1rem)' },
          { name: '--heading-sm-tablet-font-size', value: 'min(var(--heading-sm-desktop-font-size), calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), -1), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--heading-sm-phone-font-size', value: 'min(var(--heading-sm-desktop-font-size), calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), -1), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--heading-sm-font-size', value: 'var(--heading-sm-desktop-font-size)' },
          { name: '--heading-sm-font-weight', value: 'var(--heading-font-weight)' },
          { name: '--heading-sm-line-height', value: 'var(--line-height-tighter)' },
          { name: '--heading-sm-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--heading-xs',
        entries: [
          { name: '--heading-xs-font-family', value: 'var(--font-sans)' },
          { name: '--heading-xs-desktop-font-size', value: 'calc(var(--heading-scale-base) * pow(var(--heading-scale-ratio), -2) * 1rem)' },
          { name: '--heading-xs-tablet-font-size', value: 'min(var(--heading-xs-desktop-font-size), calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), -2), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--heading-xs-phone-font-size', value: 'min(var(--heading-xs-desktop-font-size), calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), -2), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--heading-xs-font-size', value: 'var(--heading-xs-desktop-font-size)' },
          { name: '--heading-xs-font-weight', value: 'var(--heading-font-weight)' },
          { name: '--heading-xs-line-height', value: 'var(--line-height-tight)' },
          { name: '--heading-xs-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--heading-2xs',
        entries: [
          { name: '--heading-2xs-font-family', value: 'var(--font-sans)' },
          { name: '--heading-2xs-desktop-font-size', value: 'calc(var(--heading-scale-base) * pow(var(--heading-scale-ratio), -3) * 1rem)' },
          { name: '--heading-2xs-tablet-font-size', value: 'min(var(--heading-2xs-desktop-font-size), calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), -3), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--heading-2xs-phone-font-size', value: 'min(var(--heading-2xs-desktop-font-size), calc(pow(var(--heading-scale-base) * pow(var(--heading-scale-ratio), -3), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--heading-2xs-font-size', value: 'var(--heading-2xs-desktop-font-size)' },
          { name: '--heading-2xs-font-weight', value: 'var(--heading-font-weight)' },
          { name: '--heading-2xs-line-height', value: 'var(--line-height-tight)' },
          { name: '--heading-2xs-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
    ],
  },
  {
    usage: 'body',
    comment: 'Body: interface text and short copy',
    follows: 'heading',
    settings: [
      { name: '--body-font-family', value: 'var(--font-sans)' },
      { name: '--body-font-weight', value: 'var(--font-weight-normal)' },
      { name: '--body-scale-base', value: '1' },
      { name: '--body-scale-ratio', value: '1.125' },
    ],
    steps: [
      {
        prefix: '--body-2xl',
        entries: [
          { name: '--body-2xl-font-family', value: 'var(--body-font-family)' },
          { name: '--body-2xl-desktop-font-size', value: 'calc(var(--body-scale-base) * pow(var(--body-scale-ratio), 3) * 1rem)' },
          { name: '--body-2xl-tablet-font-size', value: 'min(var(--body-2xl-desktop-font-size), calc(pow(var(--body-scale-base) * pow(var(--body-scale-ratio), 3), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--body-2xl-phone-font-size', value: 'min(var(--body-2xl-desktop-font-size), calc(pow(var(--body-scale-base) * pow(var(--body-scale-ratio), 3), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--body-2xl-font-size', value: 'var(--body-2xl-desktop-font-size)' },
          { name: '--body-2xl-font-weight', value: 'var(--body-font-weight)' },
          { name: '--body-2xl-line-height', value: 'var(--line-height-tighter)' },
          { name: '--body-2xl-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--body-xl',
        entries: [
          { name: '--body-xl-font-family', value: 'var(--body-font-family)' },
          { name: '--body-xl-desktop-font-size', value: 'calc(var(--body-scale-base) * pow(var(--body-scale-ratio), 2) * 1rem)' },
          { name: '--body-xl-tablet-font-size', value: 'min(var(--body-xl-desktop-font-size), calc(pow(var(--body-scale-base) * pow(var(--body-scale-ratio), 2), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--body-xl-phone-font-size', value: 'min(var(--body-xl-desktop-font-size), calc(pow(var(--body-scale-base) * pow(var(--body-scale-ratio), 2), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--body-xl-font-size', value: 'var(--body-xl-desktop-font-size)' },
          { name: '--body-xl-font-weight', value: 'var(--body-font-weight)' },
          { name: '--body-xl-line-height', value: 'var(--line-height-tighter)' },
          { name: '--body-xl-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--body-lg',
        entries: [
          { name: '--body-lg-font-family', value: 'var(--body-font-family)' },
          { name: '--body-lg-desktop-font-size', value: 'calc(var(--body-scale-base) * pow(var(--body-scale-ratio), 1) * 1rem)' },
          { name: '--body-lg-tablet-font-size', value: 'min(var(--body-lg-desktop-font-size), calc(pow(var(--body-scale-base) * pow(var(--body-scale-ratio), 1), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--body-lg-phone-font-size', value: 'min(var(--body-lg-desktop-font-size), calc(pow(var(--body-scale-base) * pow(var(--body-scale-ratio), 1), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--body-lg-font-size', value: 'var(--body-lg-desktop-font-size)' },
          { name: '--body-lg-font-weight', value: 'var(--body-font-weight)' },
          { name: '--body-lg-line-height', value: 'var(--line-height-tight)' },
          { name: '--body-lg-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--body-md',
        entries: [
          { name: '--body-md-font-family', value: 'var(--body-font-family)' },
          { name: '--body-md-desktop-font-size', value: 'calc(var(--body-scale-base) * 1rem)' },
          { name: '--body-md-tablet-font-size', value: 'min(var(--body-md-desktop-font-size), calc(pow(var(--body-scale-base), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--body-md-phone-font-size', value: 'min(var(--body-md-desktop-font-size), calc(pow(var(--body-scale-base), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--body-md-font-size', value: 'var(--body-md-desktop-font-size)' },
          { name: '--body-md-font-weight', value: 'var(--body-font-weight)' },
          { name: '--body-md-line-height', value: 'var(--line-height-normal)' },
          { name: '--body-md-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--body-sm',
        entries: [
          { name: '--body-sm-font-family', value: 'var(--body-font-family)' },
          { name: '--body-sm-desktop-font-size', value: 'calc(var(--body-scale-base) * pow(var(--body-scale-ratio), -1) * 1rem)' },
          { name: '--body-sm-tablet-font-size', value: 'min(var(--body-sm-desktop-font-size), calc(pow(var(--body-scale-base) * pow(var(--body-scale-ratio), -1), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--body-sm-phone-font-size', value: 'min(var(--body-sm-desktop-font-size), calc(pow(var(--body-scale-base) * pow(var(--body-scale-ratio), -1), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--body-sm-font-size', value: 'var(--body-sm-desktop-font-size)' },
          { name: '--body-sm-font-weight', value: 'var(--body-font-weight)' },
          { name: '--body-sm-line-height', value: 'var(--line-height-tight)' },
          { name: '--body-sm-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--body-xs',
        entries: [
          { name: '--body-xs-font-family', value: 'var(--body-font-family)' },
          { name: '--body-xs-desktop-font-size', value: 'calc(var(--body-scale-base) * pow(var(--body-scale-ratio), -2) * 1rem)' },
          { name: '--body-xs-tablet-font-size', value: 'min(var(--body-xs-desktop-font-size), calc(pow(var(--body-scale-base) * pow(var(--body-scale-ratio), -2), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--body-xs-phone-font-size', value: 'min(var(--body-xs-desktop-font-size), calc(pow(var(--body-scale-base) * pow(var(--body-scale-ratio), -2), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--body-xs-font-size', value: 'var(--body-xs-desktop-font-size)' },
          { name: '--body-xs-font-weight', value: 'var(--body-font-weight)' },
          { name: '--body-xs-line-height', value: 'var(--line-height-tight)' },
          { name: '--body-xs-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--body-2xs',
        entries: [
          { name: '--body-2xs-font-family', value: 'var(--body-font-family)' },
          { name: '--body-2xs-desktop-font-size', value: 'calc(var(--body-scale-base) * pow(var(--body-scale-ratio), -3) * 1rem)' },
          { name: '--body-2xs-tablet-font-size', value: 'min(var(--body-2xs-desktop-font-size), calc(pow(var(--body-scale-base) * pow(var(--body-scale-ratio), -3), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--body-2xs-phone-font-size', value: 'min(var(--body-2xs-desktop-font-size), calc(pow(var(--body-scale-base) * pow(var(--body-scale-ratio), -3), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--body-2xs-font-size', value: 'var(--body-2xs-desktop-font-size)' },
          { name: '--body-2xs-font-weight', value: 'var(--body-font-weight)' },
          { name: '--body-2xs-line-height', value: 'var(--line-height-tight)' },
          { name: '--body-2xs-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
    ],
  },
  {
    usage: 'code',
    comment: 'Code: code blocks and inline code',
    follows: 'body',
    settings: [
      { name: '--code-font-family', value: 'var(--font-mono)' },
      { name: '--code-font-weight', value: 'var(--font-weight-normal)' },
      { name: '--code-scale-base', value: '0.875' },
      { name: '--code-scale-ratio', value: '1.125' },
    ],
    steps: [
      {
        prefix: '--code-2xl',
        entries: [
          { name: '--code-2xl-font-family', value: 'var(--code-font-family)' },
          { name: '--code-2xl-desktop-font-size', value: 'calc(var(--code-scale-base) * pow(var(--code-scale-ratio), 3) * 1rem)' },
          { name: '--code-2xl-tablet-font-size', value: 'min(var(--code-2xl-desktop-font-size), calc(pow(var(--code-scale-base) * pow(var(--code-scale-ratio), 3), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--code-2xl-phone-font-size', value: 'min(var(--code-2xl-desktop-font-size), calc(pow(var(--code-scale-base) * pow(var(--code-scale-ratio), 3), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--code-2xl-font-size', value: 'var(--code-2xl-desktop-font-size)' },
          { name: '--code-2xl-font-weight', value: 'var(--code-font-weight)' },
          { name: '--code-2xl-line-height', value: 'var(--line-height-normal)' },
          { name: '--code-2xl-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--code-xl',
        entries: [
          { name: '--code-xl-font-family', value: 'var(--code-font-family)' },
          { name: '--code-xl-desktop-font-size', value: 'calc(var(--code-scale-base) * pow(var(--code-scale-ratio), 2) * 1rem)' },
          { name: '--code-xl-tablet-font-size', value: 'min(var(--code-xl-desktop-font-size), calc(pow(var(--code-scale-base) * pow(var(--code-scale-ratio), 2), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--code-xl-phone-font-size', value: 'min(var(--code-xl-desktop-font-size), calc(pow(var(--code-scale-base) * pow(var(--code-scale-ratio), 2), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--code-xl-font-size', value: 'var(--code-xl-desktop-font-size)' },
          { name: '--code-xl-font-weight', value: 'var(--code-font-weight)' },
          { name: '--code-xl-line-height', value: 'var(--line-height-normal)' },
          { name: '--code-xl-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--code-lg',
        entries: [
          { name: '--code-lg-font-family', value: 'var(--code-font-family)' },
          { name: '--code-lg-desktop-font-size', value: 'calc(var(--code-scale-base) * pow(var(--code-scale-ratio), 1) * 1rem)' },
          { name: '--code-lg-tablet-font-size', value: 'min(var(--code-lg-desktop-font-size), calc(pow(var(--code-scale-base) * pow(var(--code-scale-ratio), 1), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--code-lg-phone-font-size', value: 'min(var(--code-lg-desktop-font-size), calc(pow(var(--code-scale-base) * pow(var(--code-scale-ratio), 1), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--code-lg-font-size', value: 'var(--code-lg-desktop-font-size)' },
          { name: '--code-lg-font-weight', value: 'var(--code-font-weight)' },
          { name: '--code-lg-line-height', value: 'var(--line-height-normal)' },
          { name: '--code-lg-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--code-md',
        entries: [
          { name: '--code-md-font-family', value: 'var(--code-font-family)' },
          { name: '--code-md-desktop-font-size', value: 'calc(var(--code-scale-base) * 1rem)' },
          { name: '--code-md-tablet-font-size', value: 'min(var(--code-md-desktop-font-size), calc(pow(var(--code-scale-base), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--code-md-phone-font-size', value: 'min(var(--code-md-desktop-font-size), calc(pow(var(--code-scale-base), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--code-md-font-size', value: 'var(--code-md-desktop-font-size)' },
          { name: '--code-md-font-weight', value: 'var(--code-font-weight)' },
          { name: '--code-md-line-height', value: 'var(--line-height-normal)' },
          { name: '--code-md-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--code-sm',
        entries: [
          { name: '--code-sm-font-family', value: 'var(--code-font-family)' },
          { name: '--code-sm-desktop-font-size', value: 'calc(var(--code-scale-base) * pow(var(--code-scale-ratio), -1) * 1rem)' },
          { name: '--code-sm-tablet-font-size', value: 'min(var(--code-sm-desktop-font-size), calc(pow(var(--code-scale-base) * pow(var(--code-scale-ratio), -1), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--code-sm-phone-font-size', value: 'min(var(--code-sm-desktop-font-size), calc(pow(var(--code-scale-base) * pow(var(--code-scale-ratio), -1), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--code-sm-font-size', value: 'var(--code-sm-desktop-font-size)' },
          { name: '--code-sm-font-weight', value: 'var(--code-font-weight)' },
          { name: '--code-sm-line-height', value: 'var(--line-height-normal)' },
          { name: '--code-sm-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--code-xs',
        entries: [
          { name: '--code-xs-font-family', value: 'var(--code-font-family)' },
          { name: '--code-xs-desktop-font-size', value: 'calc(var(--code-scale-base) * pow(var(--code-scale-ratio), -2) * 1rem)' },
          { name: '--code-xs-tablet-font-size', value: 'min(var(--code-xs-desktop-font-size), calc(pow(var(--code-scale-base) * pow(var(--code-scale-ratio), -2), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--code-xs-phone-font-size', value: 'min(var(--code-xs-desktop-font-size), calc(pow(var(--code-scale-base) * pow(var(--code-scale-ratio), -2), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--code-xs-font-size', value: 'var(--code-xs-desktop-font-size)' },
          { name: '--code-xs-font-weight', value: 'var(--code-font-weight)' },
          { name: '--code-xs-line-height', value: 'var(--line-height-normal)' },
          { name: '--code-xs-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--code-2xs',
        entries: [
          { name: '--code-2xs-font-family', value: 'var(--code-font-family)' },
          { name: '--code-2xs-desktop-font-size', value: 'calc(var(--code-scale-base) * pow(var(--code-scale-ratio), -3) * 1rem)' },
          { name: '--code-2xs-tablet-font-size', value: 'min(var(--code-2xs-desktop-font-size), calc(pow(var(--code-scale-base) * pow(var(--code-scale-ratio), -3), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--code-2xs-phone-font-size', value: 'min(var(--code-2xs-desktop-font-size), calc(pow(var(--code-scale-base) * pow(var(--code-scale-ratio), -3), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--code-2xs-font-size', value: 'var(--code-2xs-desktop-font-size)' },
          { name: '--code-2xs-font-weight', value: 'var(--code-font-weight)' },
          { name: '--code-2xs-line-height', value: 'var(--line-height-normal)' },
          { name: '--code-2xs-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
    ],
  },
  {
    usage: 'editorial',
    comment: 'Editorial: the long-reading role',
    follows: 'code',
    settings: [
      { name: '--editorial-font-family', value: 'var(--font-editorial)' },
      { name: '--editorial-font-weight', value: 'var(--font-weight-normal)' },
      { name: '--editorial-scale-base', value: '1' },
      { name: '--editorial-scale-ratio', value: '1.125' },
    ],
    steps: [
      {
        prefix: '--editorial-2xl',
        entries: [
          { name: '--editorial-2xl-font-family', value: 'var(--editorial-font-family)' },
          { name: '--editorial-2xl-desktop-font-size', value: 'calc(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), 3) * 1rem)' },
          { name: '--editorial-2xl-tablet-font-size', value: 'min(var(--editorial-2xl-desktop-font-size), calc(pow(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), 3), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--editorial-2xl-phone-font-size', value: 'min(var(--editorial-2xl-desktop-font-size), calc(pow(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), 3), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--editorial-2xl-font-size', value: 'var(--editorial-2xl-desktop-font-size)' },
          { name: '--editorial-2xl-font-weight', value: 'var(--editorial-font-weight)' },
          { name: '--editorial-2xl-line-height', value: 'var(--line-height-tightest)' },
          { name: '--editorial-2xl-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--editorial-xl',
        entries: [
          { name: '--editorial-xl-font-family', value: 'var(--editorial-font-family)' },
          { name: '--editorial-xl-desktop-font-size', value: 'calc(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), 2) * 1rem)' },
          { name: '--editorial-xl-tablet-font-size', value: 'min(var(--editorial-xl-desktop-font-size), calc(pow(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), 2), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--editorial-xl-phone-font-size', value: 'min(var(--editorial-xl-desktop-font-size), calc(pow(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), 2), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--editorial-xl-font-size', value: 'var(--editorial-xl-desktop-font-size)' },
          { name: '--editorial-xl-font-weight', value: 'var(--editorial-font-weight)' },
          { name: '--editorial-xl-line-height', value: 'var(--line-height-tighter)' },
          { name: '--editorial-xl-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--editorial-lg',
        entries: [
          { name: '--editorial-lg-font-family', value: 'var(--editorial-font-family)' },
          { name: '--editorial-lg-desktop-font-size', value: 'calc(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), 1) * 1rem)' },
          { name: '--editorial-lg-tablet-font-size', value: 'min(var(--editorial-lg-desktop-font-size), calc(pow(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), 1), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--editorial-lg-phone-font-size', value: 'min(var(--editorial-lg-desktop-font-size), calc(pow(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), 1), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--editorial-lg-font-size', value: 'var(--editorial-lg-desktop-font-size)' },
          { name: '--editorial-lg-font-weight', value: 'var(--editorial-font-weight)' },
          { name: '--editorial-lg-line-height', value: 'var(--line-height-tight)' },
          { name: '--editorial-lg-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--editorial-md',
        entries: [
          { name: '--editorial-md-font-family', value: 'var(--editorial-font-family)' },
          { name: '--editorial-md-desktop-font-size', value: 'calc(var(--editorial-scale-base) * 1rem)' },
          { name: '--editorial-md-tablet-font-size', value: 'min(var(--editorial-md-desktop-font-size), calc(pow(var(--editorial-scale-base), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--editorial-md-phone-font-size', value: 'min(var(--editorial-md-desktop-font-size), calc(pow(var(--editorial-scale-base), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--editorial-md-font-size', value: 'var(--editorial-md-desktop-font-size)' },
          { name: '--editorial-md-font-weight', value: 'var(--editorial-font-weight)' },
          { name: '--editorial-md-line-height', value: 'var(--line-height-normal)' },
          { name: '--editorial-md-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--editorial-sm',
        entries: [
          { name: '--editorial-sm-font-family', value: 'var(--editorial-font-family)' },
          { name: '--editorial-sm-desktop-font-size', value: 'calc(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), -1) * 1rem)' },
          { name: '--editorial-sm-tablet-font-size', value: 'min(var(--editorial-sm-desktop-font-size), calc(pow(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), -1), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--editorial-sm-phone-font-size', value: 'min(var(--editorial-sm-desktop-font-size), calc(pow(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), -1), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--editorial-sm-font-size', value: 'var(--editorial-sm-desktop-font-size)' },
          { name: '--editorial-sm-font-weight', value: 'var(--editorial-font-weight)' },
          { name: '--editorial-sm-line-height', value: 'var(--line-height-tight)' },
          { name: '--editorial-sm-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--editorial-xs',
        entries: [
          { name: '--editorial-xs-font-family', value: 'var(--editorial-font-family)' },
          { name: '--editorial-xs-desktop-font-size', value: 'calc(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), -2) * 1rem)' },
          { name: '--editorial-xs-tablet-font-size', value: 'min(var(--editorial-xs-desktop-font-size), calc(pow(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), -2), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--editorial-xs-phone-font-size', value: 'min(var(--editorial-xs-desktop-font-size), calc(pow(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), -2), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--editorial-xs-font-size', value: 'var(--editorial-xs-desktop-font-size)' },
          { name: '--editorial-xs-font-weight', value: 'var(--editorial-font-weight)' },
          { name: '--editorial-xs-line-height', value: 'var(--line-height-tighter)' },
          { name: '--editorial-xs-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
      {
        prefix: '--editorial-2xs',
        entries: [
          { name: '--editorial-2xs-font-family', value: 'var(--editorial-font-family)' },
          { name: '--editorial-2xs-desktop-font-size', value: 'calc(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), -3) * 1rem)' },
          { name: '--editorial-2xs-tablet-font-size', value: 'min(var(--editorial-2xs-desktop-font-size), calc(pow(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), -3), var(--type-tablet-scale-compression)) * 1rem))' },
          { name: '--editorial-2xs-phone-font-size', value: 'min(var(--editorial-2xs-desktop-font-size), calc(pow(var(--editorial-scale-base) * pow(var(--editorial-scale-ratio), -3), var(--type-phone-scale-compression)) * 1rem))' },
          { name: '--editorial-2xs-font-size', value: 'var(--editorial-2xs-desktop-font-size)' },
          { name: '--editorial-2xs-font-weight', value: 'var(--editorial-font-weight)' },
          { name: '--editorial-2xs-line-height', value: 'var(--line-height-tighter)' },
          { name: '--editorial-2xs-letter-spacing', value: 'var(--letter-spacing-normal)' },
        ],
      },
    ],
  },
];

const EYEBROW: ScaleEntry[] = [
  { name: '--eyebrow-font-family', value: 'var(--body-font-family)' },
  { name: '--eyebrow-desktop-font-size', value: 'var(--body-sm-desktop-font-size)' },
  { name: '--eyebrow-tablet-font-size', value: 'var(--body-sm-tablet-font-size)' },
  { name: '--eyebrow-phone-font-size', value: 'var(--body-sm-phone-font-size)' },
  { name: '--eyebrow-font-size', value: 'var(--eyebrow-desktop-font-size)' },
  { name: '--eyebrow-font-weight', value: 'var(--body-font-weight)' },
  { name: '--eyebrow-line-height', value: 'var(--line-height-normal)' },
  { name: '--eyebrow-letter-spacing', value: 'var(--letter-spacing-normal)' },
  { name: '--eyebrow-text-transform', value: 'none' },
];

const MEDIA: { query: string; entries: ScaleEntry[] }[] = [
  {
    query: '(max-width: 768px)',
    entries: [
      { name: '--display-2xl-font-size', value: 'var(--display-2xl-tablet-font-size)' },
      { name: '--display-xl-font-size', value: 'var(--display-xl-tablet-font-size)' },
      { name: '--display-lg-font-size', value: 'var(--display-lg-tablet-font-size)' },
      { name: '--display-md-font-size', value: 'var(--display-md-tablet-font-size)' },
      { name: '--display-sm-font-size', value: 'var(--display-sm-tablet-font-size)' },
      { name: '--display-xs-font-size', value: 'var(--display-xs-tablet-font-size)' },
      { name: '--display-2xs-font-size', value: 'var(--display-2xs-tablet-font-size)' },
      { name: '--heading-2xl-font-size', value: 'var(--heading-2xl-tablet-font-size)' },
      { name: '--heading-xl-font-size', value: 'var(--heading-xl-tablet-font-size)' },
      { name: '--heading-lg-font-size', value: 'var(--heading-lg-tablet-font-size)' },
      { name: '--heading-md-font-size', value: 'var(--heading-md-tablet-font-size)' },
      { name: '--heading-sm-font-size', value: 'var(--heading-sm-tablet-font-size)' },
      { name: '--heading-xs-font-size', value: 'var(--heading-xs-tablet-font-size)' },
      { name: '--heading-2xs-font-size', value: 'var(--heading-2xs-tablet-font-size)' },
      { name: '--body-2xl-font-size', value: 'var(--body-2xl-tablet-font-size)' },
      { name: '--body-xl-font-size', value: 'var(--body-xl-tablet-font-size)' },
      { name: '--body-lg-font-size', value: 'var(--body-lg-tablet-font-size)' },
      { name: '--body-md-font-size', value: 'var(--body-md-tablet-font-size)' },
      { name: '--body-sm-font-size', value: 'var(--body-sm-tablet-font-size)' },
      { name: '--body-xs-font-size', value: 'var(--body-xs-tablet-font-size)' },
      { name: '--body-2xs-font-size', value: 'var(--body-2xs-tablet-font-size)' },
      { name: '--editorial-2xl-font-size', value: 'var(--editorial-2xl-tablet-font-size)' },
      { name: '--editorial-xl-font-size', value: 'var(--editorial-xl-tablet-font-size)' },
      { name: '--editorial-lg-font-size', value: 'var(--editorial-lg-tablet-font-size)' },
      { name: '--editorial-md-font-size', value: 'var(--editorial-md-tablet-font-size)' },
      { name: '--editorial-sm-font-size', value: 'var(--editorial-sm-tablet-font-size)' },
      { name: '--editorial-xs-font-size', value: 'var(--editorial-xs-tablet-font-size)' },
      { name: '--editorial-2xs-font-size', value: 'var(--editorial-2xs-tablet-font-size)' },
      { name: '--code-2xl-font-size', value: 'var(--code-2xl-tablet-font-size)' },
      { name: '--code-xl-font-size', value: 'var(--code-xl-tablet-font-size)' },
      { name: '--code-lg-font-size', value: 'var(--code-lg-tablet-font-size)' },
      { name: '--code-md-font-size', value: 'var(--code-md-tablet-font-size)' },
      { name: '--code-sm-font-size', value: 'var(--code-sm-tablet-font-size)' },
      { name: '--code-xs-font-size', value: 'var(--code-xs-tablet-font-size)' },
      { name: '--code-2xs-font-size', value: 'var(--code-2xs-tablet-font-size)' },
      { name: '--eyebrow-font-size', value: 'var(--eyebrow-tablet-font-size)' },
    ],
  },
  {
    query: '(max-width: 480px)',
    entries: [
      { name: '--display-2xl-font-size', value: 'var(--display-2xl-phone-font-size)' },
      { name: '--display-xl-font-size', value: 'var(--display-xl-phone-font-size)' },
      { name: '--display-lg-font-size', value: 'var(--display-lg-phone-font-size)' },
      { name: '--display-md-font-size', value: 'var(--display-md-phone-font-size)' },
      { name: '--display-sm-font-size', value: 'var(--display-sm-phone-font-size)' },
      { name: '--display-xs-font-size', value: 'var(--display-xs-phone-font-size)' },
      { name: '--display-2xs-font-size', value: 'var(--display-2xs-phone-font-size)' },
      { name: '--heading-2xl-font-size', value: 'var(--heading-2xl-phone-font-size)' },
      { name: '--heading-xl-font-size', value: 'var(--heading-xl-phone-font-size)' },
      { name: '--heading-lg-font-size', value: 'var(--heading-lg-phone-font-size)' },
      { name: '--heading-md-font-size', value: 'var(--heading-md-phone-font-size)' },
      { name: '--heading-sm-font-size', value: 'var(--heading-sm-phone-font-size)' },
      { name: '--heading-xs-font-size', value: 'var(--heading-xs-phone-font-size)' },
      { name: '--heading-2xs-font-size', value: 'var(--heading-2xs-phone-font-size)' },
      { name: '--body-2xl-font-size', value: 'var(--body-2xl-phone-font-size)' },
      { name: '--body-xl-font-size', value: 'var(--body-xl-phone-font-size)' },
      { name: '--body-lg-font-size', value: 'var(--body-lg-phone-font-size)' },
      { name: '--body-md-font-size', value: 'var(--body-md-phone-font-size)' },
      { name: '--body-sm-font-size', value: 'var(--body-sm-phone-font-size)' },
      { name: '--body-xs-font-size', value: 'var(--body-xs-phone-font-size)' },
      { name: '--body-2xs-font-size', value: 'var(--body-2xs-phone-font-size)' },
      { name: '--editorial-2xl-font-size', value: 'var(--editorial-2xl-phone-font-size)' },
      { name: '--editorial-xl-font-size', value: 'var(--editorial-xl-phone-font-size)' },
      { name: '--editorial-lg-font-size', value: 'var(--editorial-lg-phone-font-size)' },
      { name: '--editorial-md-font-size', value: 'var(--editorial-md-phone-font-size)' },
      { name: '--editorial-sm-font-size', value: 'var(--editorial-sm-phone-font-size)' },
      { name: '--editorial-xs-font-size', value: 'var(--editorial-xs-phone-font-size)' },
      { name: '--editorial-2xs-font-size', value: 'var(--editorial-2xs-phone-font-size)' },
      { name: '--code-2xl-font-size', value: 'var(--code-2xl-phone-font-size)' },
      { name: '--code-xl-font-size', value: 'var(--code-xl-phone-font-size)' },
      { name: '--code-lg-font-size', value: 'var(--code-lg-phone-font-size)' },
      { name: '--code-md-font-size', value: 'var(--code-md-phone-font-size)' },
      { name: '--code-sm-font-size', value: 'var(--code-sm-phone-font-size)' },
      { name: '--code-xs-font-size', value: 'var(--code-xs-phone-font-size)' },
      { name: '--code-2xs-font-size', value: 'var(--code-2xs-phone-font-size)' },
      { name: '--eyebrow-font-size', value: 'var(--eyebrow-phone-font-size)' },
    ],
  },
];

const DECLARED = new Map(
  USAGES.flatMap((u) => u.steps.flatMap((s) => s.entries))
    .concat(EYEBROW)
    .map((e): [string, string] => [e.name, e.value]),
);

const TYPE_PRIMITIVES = ['--letter-spacing-', '--line-height-', '--font-weight-', '--font-size-', '--font-'];

const CARRIED_PREFIXES = new Set(CARRIED.map((step) => step.prefix));

/** Steps 0.91.2 did not ship that the file declares by hand. A desktop size means a step is already migrated. */
function handDeclaredSteps(values: ReadonlyMap<string, string>): CarriedStep[] {
  return USAGES.flatMap((u) => u.steps)
    .filter(
      ({ prefix }) =>
        !CARRIED_PREFIXES.has(prefix) &&
        values.has(`${prefix}-font-size`) &&
        !values.has(`${prefix}-desktop-font-size`),
    )
    .map(({ prefix }) => ({ prefix, links: [] }));
}

export const tokensCssMigration_2026_10_08_typeScales: TokensCssMigration = {
  id: '2026-10-08-type-scales',
  kind: 'breaking',
  description:
    'Rebuild the text styles as five type scales with per-viewport sizes, and rename --code-font-size, --code-line-height and --code-letter-spacing to --code-md-*',
  apply(css) {
    let out = css;
    for (const [from, to] of RENAMES) out = renameToken(out, from, to);

    const values = collectTokenValues(out);
    for (const step of [...CARRIED, ...handDeclaredSteps(values)]) {
      const size = values.get(`${step.prefix}-font-size`);
      if (size === undefined) continue;
      const desktop = `${step.prefix}-desktop-font-size`;
      const edited = size !== step.size;
      const rem = edited ? resolvedRem(size, values) : null;
      out = ensureScale(out, {
        anchorPrefixes: [`${step.prefix}-font-family`, `${step.prefix}-`],
        entries: [
          { name: desktop, value: edited ? size : DECLARED.get(desktop)! },
          ...(rem === null ? [] : editedSizes(step.prefix, rem)),
        ],
      });
      out = setTokenValue(out, `${step.prefix}-font-size`, `var(${desktop})`);
      for (const link of step.links) out = setTokenValue(out, link.name, link.to, { from: link.from });
    }

    out = ensureScale(out, {
      sectionComment: 'Text styles: the compression that sets each tablet and phone size',
      anchorPrefixes: ['--type-', ...TYPE_PRIMITIVES],
      entries: COMPRESSION,
    });
    for (const block of USAGES) {
      const fallback = [`--${block.usage}-scale-`, `--${block.follows}-`, '--type-'];
      out = ensureScale(out, { sectionComment: block.comment, anchorPrefixes: fallback, entries: block.settings });
      block.steps.forEach((step, i) => {
        const above = block.steps.slice(0, i).reverse().map((s) => `${s.prefix}-`);
        out = ensureScale(out, {
          anchorPrefixes: [
            `${step.prefix}-desktop-font-size`,
            `${step.prefix}-font-family`,
            `${step.prefix}-`,
            ...above,
            ...fallback,
          ],
          entries: step.entries,
        });
      });
    }
    out = ensureScale(out, {
      anchorPrefixes: ['--eyebrow-desktop-font-size', '--eyebrow-font-family', '--eyebrow-', '--editorial-'],
      entries: EYEBROW,
    });

    for (const media of MEDIA) out = appendMediaBlock(out, media.query, media.entries);
    return out;
  },
};
