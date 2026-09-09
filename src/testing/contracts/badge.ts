import type { ComponentContract, PaintMap } from '../componentContract';

type Variant =
  | 'primary' | 'accent' | 'neutral' | 'alternate' | 'canvas'
  | 'special' | 'success' | 'warning' | 'danger' | 'info';

const variants: Variant[] = [
  'primary', 'accent', 'neutral', 'alternate', 'canvas',
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
  view: { variant: 'Primary' },
  root: 'root',
  parts: {
    root: '.badge',
    icon: '.icon',
  },
  properties: [
    { variant: 'Primary', state: 'base', paints: basePaints('primary') },
    { variant: 'Primary', state: 'colors', paints: colorPaints('primary') },
    ...variants.filter((v) => v !== 'primary').flatMap((v) => [
      { variant: v.charAt(0).toUpperCase() + v.slice(1), state: 'base', paints: basePaints(v) },
      { variant: v.charAt(0).toUpperCase() + v.slice(1), state: 'colors', paints: colorPaints(v) },
    ]),
  ],
  states: [{ state: 'base' }, { state: 'colors' }],
  uncovered: {
    '--badge-primary-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
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
        variant: 'Primary',
        state: 'base',
        variable: '--badge-primary-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--badge-primary-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--badge-primary-border-width', '--badge-primary-radius', '--badge-primary-padding'],
    unchanged: ['--badge-primary-shadow', '--badge-primary-icon-size'],
    aliasedTo: {
      '--badge-primary-border-width': '--border-width-3',
      '--badge-primary-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--badge-primary-border-width' },
  },
  interaction: {
    applicable: false,
    reason: 'a badge is a static label with no interactive role',
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'root', fill: '--badge-primary-surface', stroke: '--badge-primary-border' }],
  },
};
