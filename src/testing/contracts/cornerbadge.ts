import type { ComponentContract, PaintMap } from '../componentContract';

type Variant =
  | 'primary' | 'accent' | 'neutral' | 'alternate' | 'canvas'
  | 'special' | 'success' | 'warning' | 'danger' | 'info';

const variants: Variant[] = [
  'primary', 'accent', 'neutral', 'alternate', 'canvas',
  'special', 'success', 'warning', 'danger', 'info',
];

function colorPaints(v: Variant): PaintMap {
  return {
    badge: {
      backgroundColor: `--cornerbadge-${v}-surface`,
      borderTopColor: `--cornerbadge-${v}-border`,
      color: `--cornerbadge-${v}-text`,
    },
  };
}

/** Default anchor is bottom-right: TL=inner, TR=v-axis, BR=outer, BL=h-axis. */
const basePaints: PaintMap = {
  root: { bottom: '--cornerbadge-margin' },
  badge: {
    borderTopLeftRadius: '--cornerbadge-inner-radius',
    borderTopRightRadius: '--cornerbadge-v-axis-radius',
    borderBottomRightRadius: '--cornerbadge-outer-radius',
    borderBottomLeftRadius: '--cornerbadge-h-axis-radius',
    paddingTop: '--cornerbadge-padding',
    fontFamily: '--cornerbadge-text-font-family',
    fontSize: '--cornerbadge-text-font-size',
    fontWeight: '--cornerbadge-text-font-weight',
    lineHeight: '--cornerbadge-text-line-height',
  },
};

export const cornerBadgeContract: ComponentContract = {
  id: 'cornerbadge',
  origin: 'system',
  view: { variant: 'Primary' },
  root: 'root',
  parts: {
    root: '.cornerbadge',
    badge: '.cornerbadge .badge',
  },
  properties: [
    {
      variant: 'Primary',
      paints: {
        root: basePaints.root,
        badge: { ...basePaints.badge, ...colorPaints('primary').badge },
      },
    },
    ...variants.filter((v) => v !== 'primary').map((v) => ({
      variant: v.charAt(0).toUpperCase() + v.slice(1),
      paints: colorPaints(v),
    })),
  ],
  states: [{ state: 'base' }, { state: 'colors' }],
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--cornerbadge-outer-radius',
        observe: { part: 'badge', css: 'borderBottomRightRadius' },
      },
    ],
    resetVariable: '--cornerbadge-outer-radius',
  },
  theme: {
    theme: 'ocean',
    changed: ['--cornerbadge-outer-radius', '--cornerbadge-inner-radius', '--cornerbadge-margin'],
    unchanged: ['--cornerbadge-text-font-size'],
    aliasedTo: {
      '--cornerbadge-outer-radius': '--radius-md',
      '--cornerbadge-inner-radius': '--radius-md',
    },
    observe: { part: 'badge', css: 'borderBottomRightRadius', variable: '--cornerbadge-outer-radius' },
  },
  interaction: {
    applicable: false,
    reason: 'a corner badge is a static marker with no interactive role',
  },
  behavior: {
    applicable: false,
    reason: 'a corner badge declares no callback prop and answers no event',
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'badge', fill: '--cornerbadge-primary-surface', stroke: '--cornerbadge-primary-border' }],
  },
};
