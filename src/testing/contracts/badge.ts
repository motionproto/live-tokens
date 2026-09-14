import type { ComponentContract, PaintMap } from '../componentContract';

type Variant =
  | 'brand' | 'accent' | 'neutral' | 'alternate' | 'canvas'
  | 'special' | 'success' | 'warning' | 'danger' | 'info';

const variants: Variant[] = [
  'brand', 'accent', 'neutral', 'alternate', 'canvas',
  'special', 'success', 'warning', 'danger', 'info',
];

function basePaints(v: Variant): PaintMap {
  return {
    root: {
      paddingTop: `--badge-${v}-padding`,
      borderRadius: `--badge-${v}-radius`,
      borderTopWidth: `--badge-${v}-border-width`,
      boxShadow: `--badge-${v}-shadow`,
      fontFamily: `--badge-${v}-text-font-family`,
      fontSize: `--badge-${v}-text-font-size`,
      fontWeight: `--badge-${v}-text-font-weight`,
      lineHeight: `--badge-${v}-text-line-height`,
    },
    icon: { fontSize: `--badge-${v}-icon-size` },
  };
}

function colorPaints(v: Variant): PaintMap {
  return {
    root: {
      backgroundColor: `--badge-${v}-surface`,
      borderTopColor: `--badge-${v}-border`,
      color: `--badge-${v}-text`,
    },
  };
}

export const badgeContract: ComponentContract = {
  id: 'badge',
  origin: 'system',
  view: { variant: 'Brand' },
  root: 'root',
  parts: {
    root: '.badge',
    icon: '.icon',
  },
  properties: [
    { variant: 'Brand', state: 'base', paints: basePaints('brand') },
    { variant: 'Brand', state: 'colors', paints: colorPaints('brand') },
    ...variants.filter((v) => v !== 'brand').flatMap((v) => [
      { variant: v.charAt(0).toUpperCase() + v.slice(1), state: 'base', paints: basePaints(v) },
      { variant: v.charAt(0).toUpperCase() + v.slice(1), state: 'colors', paints: colorPaints(v) },
    ]),
  ],
  states: [{ state: 'base' }, { state: 'colors' }],
  uncovered: {
    '--badge-brand-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
    '--badge-accent-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
    '--badge-neutral-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
    '--badge-alternate-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
    '--badge-canvas-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
    '--badge-special-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
    '--badge-success-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
    '--badge-warning-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
    '--badge-danger-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
    '--badge-info-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variant: 'Brand',
        state: 'base',
        variable: '--badge-brand-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--badge-brand-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--badge-brand-border-width', '--badge-brand-radius', '--badge-brand-padding'],
    unchanged: ['--badge-brand-shadow', '--badge-brand-icon-size'],
    aliasedTo: {
      '--badge-brand-border-width': '--border-width-3',
      '--badge-brand-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--badge-brand-border-width' },
  },
  interaction: {
    applicable: false,
    reason: 'a badge is a static label with no interactive role',
  },
  behavior: {
    applicable: false,
    reason: 'a badge declares no callback prop and answers no event: its props select paint, which the render obligation reads',
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'root', fill: '--badge-brand-surface', stroke: '--badge-brand-border' }],
  },
};
