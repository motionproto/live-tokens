import type { ComponentContract, PaintMap } from '../componentContract';

function framePaints(v: 'default' | 'bare'): PaintMap {
  return {
    root: {
      borderTopColor: `--image-${v}-border`,
      borderTopWidth: `--image-${v}-border-width`,
      borderRadius: `--image-${v}-radius`,
      boxShadow: `--image-${v}-shadow`,
    },
  };
}

export const imageContract: ComponentContract = {
  id: 'image',
  origin: 'system',
  view: { variant: 'Default' },
  root: 'root',
  parts: {
    root: '.image',
    img: '.image img',
  },
  properties: [
    { variant: 'Default', paints: framePaints('default') },
    { variant: 'Bare', paints: framePaints('bare') },
  ],
  states: {
    applicable: false,
    reason: 'each variant is one frame preset with one state, so the editor renders no state strip',
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
  behavior: {
    applicable: false,
    reason: 'an image declares no callback prop; zoom is a hover transform the browser paints',
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'root', stroke: '--image-default-border' }],
  },
};
