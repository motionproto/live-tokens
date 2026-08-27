/**
 * Registry of the semantic text styles rendered by TextStylesSection.
 * Each style is a bundle of alias tokens declared in tokens.css; the prefix
 * joins with a kind suffix (`-font-family`, `-font-size`, …) to form each
 * axis variable the editor's pickers target.
 *
 * Family/size/weight/letter-spacing/line-height are editable on every style.
 * `hasTextTransform` marks the one style (eyebrow) that also exposes a
 * text-transform picker — the only axis that exists on just one style.
 */

export interface TextStyle {
  name: string;
  label: string;
  /** Variable prefix, e.g. `--heading-xl`; suffixes form each axis var. */
  prefix: string;
  /** Element (or class) this style is the default for. */
  defaultElement: string;
  preview: string;
  /** Whether this style exposes an editable `-text-transform` axis. */
  hasTextTransform?: boolean;
}

export const TEXT_STYLES: TextStyle[] = [
  {
    name: 'heading-xl',
    label: 'Heading XL',
    prefix: '--heading-xl',
    defaultElement: 'h1',
    preview: 'Page title',
  },
  {
    name: 'heading-lg',
    label: 'Heading LG',
    prefix: '--heading-lg',
    defaultElement: 'h2',
    preview: 'Section heading',
  },
  {
    name: 'heading-md',
    label: 'Heading MD',
    prefix: '--heading-md',
    defaultElement: 'h3',
    preview: 'Subsection heading',
  },
  {
    name: 'heading-sm',
    label: 'Heading SM',
    prefix: '--heading-sm',
    defaultElement: 'h4',
    preview: 'Minor heading',
  },
  {
    name: 'body-md',
    label: 'Body MD',
    prefix: '--body-md',
    defaultElement: 'p',
    preview: 'Body copy for comfortable reading.',
  },
  {
    name: 'body-sm',
    label: 'Body SM',
    prefix: '--body-sm',
    defaultElement: 'small',
    preview: 'Captions and secondary text.',
  },
  {
    name: 'editorial-xl',
    label: 'Editorial XL',
    prefix: '--editorial-xl',
    defaultElement: 'editorial-xl',
    preview: 'Pull quotes and opening statements.',
  },
  {
    name: 'editorial-lg',
    label: 'Editorial LG',
    prefix: '--editorial-lg',
    defaultElement: 'editorial-lg',
    preview: 'Standfirsts and section ledes.',
  },
  {
    name: 'editorial-md',
    label: 'Editorial MD',
    prefix: '--editorial-md',
    defaultElement: 'editorial-md',
    preview: 'Long-form reading, set in the editorial face.',
  },
  {
    name: 'editorial-sm',
    label: 'Editorial SM',
    prefix: '--editorial-sm',
    defaultElement: 'editorial-sm',
    preview: 'Captions, credits, and asides.',
  },
  {
    name: 'code',
    label: 'Code',
    prefix: '--code',
    defaultElement: 'code',
    preview: 'const total = sum(items);',
  },
  {
    name: 'eyebrow',
    label: 'Eyebrow',
    prefix: '--eyebrow',
    defaultElement: 'eyebrow',
    preview: 'Overline label',
    hasTextTransform: true,
  },
];
