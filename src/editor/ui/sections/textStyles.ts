/**
 * Registry of the eight v1 semantic text styles rendered by TextStylesSection.
 * Each style is a bundle of alias tokens declared in tokens.css; the prefix
 * joins with a kind suffix (`-font-family`, `-font-size`, …) to form each
 * axis variable the editor's pickers target.
 *
 * Editable axes (family/size/weight/letter-spacing) are constant across every
 * style and always get a picker. `lockedAxes` names the axes rendered
 * read-only: line-height is locked in v1 for every style; eyebrow additionally
 * locks text-transform, the only axis that exists on just one style.
 */

export type TextStyleAxis =
  | 'font-family'
  | 'font-size'
  | 'font-weight'
  | 'letter-spacing'
  | 'line-height'
  | 'text-transform';

export interface TextStyle {
  name: string;
  label: string;
  /** Variable prefix, e.g. `--heading-xl`; suffixes form each axis var. */
  prefix: string;
  /** Element (or class) this style is the default for. */
  defaultElement: string;
  preview: string;
  lockedAxes: TextStyleAxis[];
}

export const TEXT_STYLES: TextStyle[] = [
  {
    name: 'heading-xl',
    label: 'Heading XL',
    prefix: '--heading-xl',
    defaultElement: 'h1',
    preview: 'Page title',
    lockedAxes: ['line-height'],
  },
  {
    name: 'heading-lg',
    label: 'Heading LG',
    prefix: '--heading-lg',
    defaultElement: 'h2',
    preview: 'Section heading',
    lockedAxes: ['line-height'],
  },
  {
    name: 'heading-md',
    label: 'Heading MD',
    prefix: '--heading-md',
    defaultElement: 'h3',
    preview: 'Subsection heading',
    lockedAxes: ['line-height'],
  },
  {
    name: 'heading-sm',
    label: 'Heading SM',
    prefix: '--heading-sm',
    defaultElement: 'h4',
    preview: 'Minor heading',
    lockedAxes: ['line-height'],
  },
  {
    name: 'body-md',
    label: 'Body MD',
    prefix: '--body-md',
    defaultElement: 'p',
    preview: 'Body copy for comfortable reading.',
    lockedAxes: ['line-height'],
  },
  {
    name: 'body-sm',
    label: 'Body SM',
    prefix: '--body-sm',
    defaultElement: 'small',
    preview: 'Captions and secondary text.',
    lockedAxes: ['line-height'],
  },
  {
    name: 'code',
    label: 'Code',
    prefix: '--code',
    defaultElement: 'code',
    preview: 'const total = sum(items);',
    lockedAxes: ['line-height'],
  },
  {
    name: 'eyebrow',
    label: 'Eyebrow',
    prefix: '--eyebrow',
    defaultElement: 'eyebrow',
    preview: 'Overline label',
    lockedAxes: ['line-height', 'text-transform'],
  },
];
