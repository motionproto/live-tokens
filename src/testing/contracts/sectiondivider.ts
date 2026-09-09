import type { ComponentContract, PaintMap, SetupStep } from '../componentContract';

type Variant = 'lg' | 'md' | 'sm';

/** Only the large variant ships its eyebrow and description visible; the other
 *  two hide them behind the element switches. */
const showOptionalContent: SetupStep[] = [
  { kind: 'control', selector: 'label.element-show-toggle:has-text("Show description") input', check: true },
  { kind: 'control', selector: 'label.element-show-toggle:has-text("Show eyebrow") input', check: true },
];

function variantPaints(v: Variant): PaintMap {
  return {
    root: {
      paddingTop: `--sectiondivider-${v}-padding`,
      borderRadius: `--sectiondivider-${v}-radius`,
      borderTopWidth: `--sectiondivider-${v}-border-width`,
      borderTopColor: `--sectiondivider-${v}-border`,
      boxShadow: `--sectiondivider-${v}-shadow`,
      backgroundImage: `--sectiondivider-${v}-background`,
    },
    titleRow: { paddingTop: `--sectiondivider-${v}-title-padding` },
    title: {
      color: `--sectiondivider-${v}-title`,
      fontFamily: `--sectiondivider-${v}-title-font-family`,
      fontSize: `--sectiondivider-${v}-title-font-size`,
      fontWeight: `--sectiondivider-${v}-title-font-weight`,
      lineHeight: `--sectiondivider-${v}-title-line-height`,
      letterSpacing: `--sectiondivider-${v}-title-letter-spacing`,
    },
    descriptionRow: { paddingTop: `--sectiondivider-${v}-description-padding` },
    description: {
      color: `--sectiondivider-${v}-description`,
      fontFamily: `--sectiondivider-${v}-description-font-family`,
      fontSize: `--sectiondivider-${v}-description-font-size`,
      fontWeight: `--sectiondivider-${v}-description-font-weight`,
      lineHeight: `--sectiondivider-${v}-description-line-height`,
    },
    eyebrow: {
      paddingTop: `--sectiondivider-${v}-eyebrow-padding`,
      color: `--sectiondivider-${v}-eyebrow`,
      fontFamily: `--sectiondivider-${v}-eyebrow-font-family`,
      fontSize: `--sectiondivider-${v}-eyebrow-font-size`,
      fontWeight: `--sectiondivider-${v}-eyebrow-font-weight`,
      letterSpacing: `--sectiondivider-${v}-eyebrow-letter-spacing`,
    },
    hairline: {
      backgroundColor: `--sectiondivider-${v}-hairline-color`,
      height: `--sectiondivider-${v}-hairline-thickness`,
    },
  };
}

export const sectionDividerContract: ComponentContract = {
  id: 'sectiondivider',
  origin: 'system',
  view: { variant: 'Large', setup: showOptionalContent },
  root: 'root',
  parts: {
    root: '.section-divider',
    titleRow: '.title-row',
    title: '.divider-label',
    descriptionRow: '.description-row',
    description: '.divider-description',
    eyebrow: '.divider-eyebrow',
    hairline: '.sd-hairline',
  },
  properties: [
    { variant: 'Large', setup: showOptionalContent, paints: variantPaints('lg') },
    { variant: 'Medium', setup: showOptionalContent, paints: variantPaints('md') },
    { variant: 'Small', setup: showOptionalContent, paints: variantPaints('sm') },
  ],
  states: {
    applicable: false,
    reason: 'each variant is one full preset with one state, so the editor renders no state strip',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--sectiondivider-lg-hairline-color',
        observe: { part: 'hairline', css: 'backgroundColor' },
      },
      {
        shape: 'gradient',
        variable: '--sectiondivider-lg-background',
        observe: { part: 'root', css: 'backgroundColor' },
      },
      {
        shape: 'literal',
        control: '.sd-intrinsic-row:has(.property-label:text-is("alignment")) select',
        variable: '--sectiondivider-lg-align',
        observe: { part: 'root', css: 'textAlign' },
      },
    ],
    resetVariable: '--sectiondivider-lg-hairline-color',
  },
  theme: {
    theme: 'halloween',
    changed: [
      '--sectiondivider-lg-radius',
      '--sectiondivider-lg-border-width',
      '--sectiondivider-lg-hairline-thickness',
      '--sectiondivider-lg-hairline-color',
    ],
    unchanged: [
      '--sectiondivider-lg-padding',
      '--sectiondivider-lg-shadow',
      '--sectiondivider-lg-title',
      '--sectiondivider-lg-border',
      '--sectiondivider-lg-title-font-size',
    ],
    aliasedTo: {
      '--sectiondivider-lg-radius': '--radius-none',
      '--sectiondivider-lg-border-width': '--border-width-3',
      '--sectiondivider-lg-hairline-thickness': '--border-width-3',
    },
    observe: { part: 'root', css: 'borderRadius', variable: '--sectiondivider-lg-radius' },
  },
  interaction: {
    applicable: false,
    reason: 'a divider is a static banner: no interactive role, nothing focusable, no pointer behaviour',
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'hairline', fill: '--sectiondivider-lg-hairline-color' }],
  },
};
