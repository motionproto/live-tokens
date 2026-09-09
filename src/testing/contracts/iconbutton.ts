import type { ComponentContract, PaintMap, PropertyExpectation } from '../componentContract';

type Variant = 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning';
const variants: Variant[] = ['primary', 'secondary', 'outline', 'success', 'danger', 'warning'];
const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

function basePaints(v: Variant): PaintMap {
  return {
    root: {
      paddingTop: `--iconbutton-${v}-padding`,
      borderRadius: `--iconbutton-${v}-radius`,
      borderTopWidth: `--iconbutton-${v}-border-width`,
    },
    icon: { fontSize: `--iconbutton-${v}-icon-size` },
  };
}

function statePaints(v: Variant, s: 'default' | 'hover' | 'disabled'): PaintMap {
  const prefix = s === 'default' ? `--iconbutton-${v}` : `--iconbutton-${v}-${s}`;
  const iconVar = s === 'default' ? `--iconbutton-${v}-icon` : `--iconbutton-${v}-${s}-icon`;
  return {
    root: { backgroundColor: `${prefix}-surface`, borderTopColor: `${prefix}-border` },
    icon: { color: iconVar },
  };
}

const otherVariantProperties: PropertyExpectation[] = variants
  .filter((v) => v !== 'primary')
  .flatMap((v) => [
    { variant: cap(v), state: 'base', paints: basePaints(v) },
    { variant: cap(v), state: 'default', paints: statePaints(v, 'default') },
    { variant: cap(v), state: 'hover', paints: statePaints(v, 'hover') },
    { variant: cap(v), state: 'disabled', paints: statePaints(v, 'disabled') },
  ]);

export const iconButtonContract: ComponentContract = {
  id: 'iconbutton',
  origin: 'system',
  view: { variant: 'Primary' },
  root: 'root',
  parts: {
    root: '.icon-button',
    icon: '.icon-button i',
  },
  properties: [
    { variant: 'Primary', state: 'base', paints: basePaints('primary') },
    ...otherVariantProperties,
    { variant: 'Outline', state: 'active', paints: { root: { backgroundColor: '--iconbutton-outline-active-surface' } } },
    {
      setup: [{ kind: 'control', selector: '.preview-actions select', value: 'small' }],
      paints: {
        root: { paddingTop: '--iconbutton-small-padding' },
        icon: { fontSize: '--iconbutton-small-icon-size' },
      },
    },
  ],
  states: [
    { state: 'base' },
    { state: 'default', paints: statePaints('primary', 'default') },
    { state: 'hover', forceClass: 'force-hover', paints: statePaints('primary', 'hover') },
    {
      state: 'disabled',
      attributes: { root: { disabled: '' } },
      paints: statePaints('primary', 'disabled'),
    },
  ],
  uncovered: {
    '--iconbutton-hover-tint': 'consumed inside a background-image tint wash, never appearing verbatim in a computed style',
    '--iconbutton-hover-tint-enabled': 'the gate for the tint wash above, same limitation',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variant: 'Primary',
        state: 'base',
        variable: '--iconbutton-primary-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--iconbutton-primary-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--iconbutton-primary-border-width', '--iconbutton-primary-radius', '--iconbutton-primary-padding'],
    unchanged: ['--iconbutton-primary-icon-size'],
    aliasedTo: {
      '--iconbutton-primary-border-width': '--border-width-3',
      '--iconbutton-primary-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--iconbutton-primary-border-width' },
  },
  interaction: {
    part: 'root',
    role: 'button',
    cases: [
      {
        name: 'clicking an icon button focuses it',
        action: { kind: 'click', part: 'root' },
        expect: { kind: 'focused', part: 'root', value: true },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'root', fill: '--iconbutton-primary-surface', stroke: '--iconbutton-primary-border' }],
  },
};
