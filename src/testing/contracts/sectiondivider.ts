import type { ComponentContract } from '../componentContract';

/**
 * The large variant, which is the only one that ships its eyebrow and
 * description visible, so every painted part is in the preview at once.
 */
export const sectionDividerContract: ComponentContract = {
  id: 'sectiondivider',
  origin: 'system',
  view: { variant: 'Large' },
  root: 'root',
  parts: {
    root: '.section-divider',
    title: '.divider-label',
    description: '.divider-description',
    eyebrow: '.divider-eyebrow',
    hairline: '.sd-hairline',
  },
  properties: [
    {
      paints: {
        root: {
          paddingTop: '--sectiondivider-lg-padding',
          borderRadius: '--sectiondivider-lg-radius',
          borderTopWidth: '--sectiondivider-lg-border-width',
          borderTopColor: '--sectiondivider-lg-border',
          boxShadow: '--sectiondivider-lg-shadow',
          backgroundImage: '--sectiondivider-lg-background',
        },
        title: {
          color: '--sectiondivider-lg-title',
          fontFamily: '--sectiondivider-lg-title-font-family',
          fontSize: '--sectiondivider-lg-title-font-size',
          fontWeight: '--sectiondivider-lg-title-font-weight',
          lineHeight: '--sectiondivider-lg-title-line-height',
          letterSpacing: '--sectiondivider-lg-title-letter-spacing',
        },
        description: {
          color: '--sectiondivider-lg-description',
          fontSize: '--sectiondivider-lg-description-font-size',
          fontWeight: '--sectiondivider-lg-description-font-weight',
        },
        eyebrow: {
          color: '--sectiondivider-lg-eyebrow',
          fontSize: '--sectiondivider-lg-eyebrow-font-size',
          letterSpacing: '--sectiondivider-lg-eyebrow-letter-spacing',
        },
        hairline: {
          backgroundColor: '--sectiondivider-lg-hairline-color',
          height: '--sectiondivider-lg-hairline-thickness',
        },
      },
    },
  ],
  alias: {
    variables: [
      '--sectiondivider-lg-padding',
      '--sectiondivider-lg-radius',
      '--sectiondivider-lg-border',
      '--sectiondivider-lg-border-width',
      '--sectiondivider-lg-shadow',
      '--sectiondivider-lg-background',
      '--sectiondivider-lg-hairline-color',
      '--sectiondivider-lg-hairline-thickness',
      '--sectiondivider-lg-title',
      '--sectiondivider-lg-title-font-size',
      '--sectiondivider-lg-description',
      '--sectiondivider-lg-eyebrow',
    ],
  },
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
        shape: 'config',
        control: '.sd-intrinsic-row:has(.property-label:text-is("alignment")) select',
        configKey: '--sectiondivider-lg-align',
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
