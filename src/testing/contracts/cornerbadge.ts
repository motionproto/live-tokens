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
      backgroundColor: `--corner-badge-${v}-surface`,
      borderTopColor: `--corner-badge-${v}-border`,
      color: `--corner-badge-${v}-text`,
    },
  };
}

/** Default anchor is bottom-right: TL=inner, TR=v-axis, BR=outer, BL=h-axis. */
const basePaints: PaintMap = {
  root: { bottom: '--corner-badge-margin' },
  badge: {
    borderTopLeftRadius: '--corner-badge-inner-radius',
    borderTopRightRadius: '--corner-badge-v-axis-radius',
    borderBottomRightRadius: '--corner-badge-outer-radius',
    borderBottomLeftRadius: '--corner-badge-h-axis-radius',
    paddingTop: '--corner-badge-padding',
    fontFamily: '--corner-badge-text-font-family',
    fontSize: '--corner-badge-text-font-size',
    fontWeight: '--corner-badge-text-font-weight',
    lineHeight: '--corner-badge-text-line-height',
  },
};

export const cornerBadgeContract: ComponentContract = {
  id: 'cornerbadge',
  origin: 'system',
  view: { variant: 'Primary' },
  root: 'root',
  parts: {
    root: '.corner-badge',
    badge: '.corner-badge .badge',
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
        variable: '--corner-badge-outer-radius',
        observe: { part: 'badge', css: 'borderBottomRightRadius' },
      },
    ],
    resetVariable: '--corner-badge-outer-radius',
  },
  theme: {
    theme: 'ocean',
    changed: ['--corner-badge-outer-radius', '--corner-badge-inner-radius', '--corner-badge-margin'],
    unchanged: ['--corner-badge-text-font-size'],
    aliasedTo: {
      '--corner-badge-outer-radius': '--radius-md',
      '--corner-badge-inner-radius': '--radius-md',
    },
    observe: { part: 'badge', css: 'borderBottomRightRadius', variable: '--corner-badge-outer-radius' },
  },
  interaction: {
    applicable: false,
    reason: 'a corner badge is a static marker with no interactive role',
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'badge', fill: '--corner-badge-primary-surface', stroke: '--corner-badge-primary-border' }],
  },
};
