import type { ComponentContract, PaintMap, PropertyExpectation } from '../componentContract';

type Variant = 'primary' | 'secondary' | 'outline' | 'success' | 'danger' | 'warning';
const variants: Variant[] = ['primary', 'secondary', 'outline', 'success', 'danger', 'warning'];
const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

function basePaints(v: Variant): PaintMap {
  return {
    root: {
      paddingTop: `--button-${v}-padding`,
      borderRadius: `--button-${v}-radius`,
      borderTopWidth: `--button-${v}-border-width`,
      fontFamily: `--button-${v}-text-font-family`,
      fontSize: `--button-${v}-text-font-size`,
      fontWeight: `--button-${v}-text-font-weight`,
      lineHeight: `--button-${v}-text-line-height`,
    },
    icon: { fontSize: `--button-${v}-icon-size` },
  };
}

function statePaints(v: Variant, s: 'default' | 'hover' | 'disabled'): PaintMap {
  const prefix = s === 'default' ? `--button-${v}` : `--button-${v}-${s}`;
  const textVar = s === 'default' ? `--button-${v}-text` : `--button-${v}-${s}-text`;
  return {
    root: {
      backgroundColor: `${prefix}-surface`,
      borderTopColor: `${prefix}-border`,
      color: textVar,
    },
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

export const buttonContract: ComponentContract = {
  id: 'button',
  origin: 'system',
  view: { variant: 'Primary' },
  root: 'root',
  parts: {
    root: '.button',
    icon: '.button i',
  },
  properties: [
    { variant: 'Primary', state: 'base', paints: basePaints('primary') },
    ...otherVariantProperties,
    { variant: 'Outline', state: 'active', paints: { root: { backgroundColor: '--button-outline-active-surface' } } },
    {
      setup: [{ kind: 'control', selector: '.preview-actions select', value: 'small' }],
      paints: {
        root: {
          paddingTop: '--button-small-padding',
          fontSize: '--button-small-text-font-size',
          fontWeight: '--button-small-text-font-weight',
          lineHeight: '--button-small-text-line-height',
        },
        icon: { fontSize: '--button-small-icon-size' },
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
    '--button-shimmer': 'gates the ::before sweep with a display toggle, which no probe covers',
    '--button-hover-tint': 'consumed inside a background-image tint wash, never appearing verbatim in a computed style',
    '--button-hover-tint-enabled': 'the gate for the tint wash above, same limitation',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variant: 'Primary',
        state: 'base',
        variable: '--button-primary-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--button-primary-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--button-primary-border-width', '--button-primary-radius', '--button-primary-padding'],
    unchanged: ['--button-primary-icon-size'],
    aliasedTo: {
      '--button-primary-border-width': '--border-width-3',
      '--button-primary-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--button-primary-border-width' },
  },
  interaction: {
    part: 'root',
    role: 'button',
    cases: [
      {
        name: 'clicking a button focuses it',
        action: { kind: 'click', part: 'root' },
        expect: { kind: 'focused', part: 'root', value: true },
      },
      {
        name: 'a disabled button refuses focus',
        state: 'disabled',
        action: { kind: 'click', part: 'root' },
        expect: { kind: 'focused', part: 'root', value: false },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'root', fill: '--button-primary-surface', stroke: '--button-primary-border' }],
  },
};
