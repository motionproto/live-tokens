import type { ComponentContract } from '../componentContract';

export const imageContract: ComponentContract = {
  id: 'image',
  origin: 'system',
  root: 'root',
  parts: {
    root: '.image',
    img: '.image img',
  },
  properties: [
    {
      paints: {
        root: {
          borderTopColor: '--image-default-border',
          borderTopWidth: '--image-default-border-width',
          borderRadius: '--image-default-radius',
          boxShadow: '--image-default-shadow',
        },
      },
    },
  ],
  states: {
    applicable: false,
    reason: 'the editor renders one token group (image) with no state strip',
  },
  uncovered: {
    '--image-zoom-scale': 'consumed inside transform: scale(), never appears verbatim in a computed style',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--image-default-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
      {
        shape: 'literal',
        control: 'label.zoom-enable:has-text("Use zoom on hover") input',
        variable: '--image-zoom-enabled',
        observe: { part: 'img', css: 'transform' },
      },
    ],
    resetVariable: '--image-default-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--image-default-border-width', '--image-default-radius'],
    unchanged: ['--image-default-shadow', '--image-zoom-scale'],
    aliasedTo: {
      '--image-default-border-width': '--border-width-3',
      '--image-default-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--image-default-border-width' },
  },
  interaction: {
    applicable: false,
    reason: 'a framed picture carries no interactive role; the zoom effect is a hover transform, not an action',
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'root', stroke: '--image-default-border' }],
  },
};
