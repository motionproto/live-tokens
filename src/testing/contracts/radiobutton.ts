import type { ComponentContract, PaintMap } from '../componentContract';

/**
 * `assertPaintsFromToken` (used by `properties`) drives a controlled probe
 * value, so a percentage dot-size or a unitless line-height round-trips fine.
 * `assertPaintMap` (used by `states`) instead reads the token's real, already
 * -resolved value straight through `normalize()`, which cannot recompute a
 * percentage or a unitless multiplier outside the original layout context.
 * States therefore skip `dotFill.width` and `label.lineHeight`.
 */
function statePaints(s: 'default' | 'hover' | 'active', full: boolean): PaintMap {
  const dotFill: PaintMap[string] = { backgroundColor: `--radiobutton-${s}-dot-fill` };
  if (full) dotFill.width = `--radiobutton-${s}-dot-size`;
  const label: PaintMap[string] = {
    color: `--radiobutton-${s}-label`,
    fontFamily: `--radiobutton-${s}-label-font-family`,
    fontSize: `--radiobutton-${s}-label-font-size`,
    fontWeight: `--radiobutton-${s}-label-font-weight`,
  };
  if (full) label.lineHeight = `--radiobutton-${s}-label-line-height`;
  return {
    dot: {
      borderTopColor: `--radiobutton-${s}-dot-border-color`,
      borderTopWidth: `--radiobutton-${s}-dot-border-width`,
    },
    dotFill,
    label,
  };
}

export const radioButtonContract: ComponentContract = {
  id: 'radiobutton',
  origin: 'system',
  root: 'root',
  parts: {
    root: '.radio-button',
    dot: '.radio-dot',
    dotFill: { selector: '.radio-dot', pseudo: 'after' },
    label: '.radio-label',
  },
  properties: [
    { paints: statePaints('default', true) },
    { state: 'hover', paints: statePaints('hover', true) },
    { state: 'active', paints: statePaints('active', true) },
  ],
  states: [
    { state: 'default' },
    {
      state: 'hover',
      forceClass: 'force-hover',
      paints: statePaints('hover', false),
    },
    {
      state: 'active',
      forceClass: 'active',
      paints: statePaints('active', false),
    },
  ],
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--radiobutton-default-dot-border-width',
        observe: { part: 'dot', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--radiobutton-default-dot-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: [
      '--radiobutton-default-dot-border-width',
      '--radiobutton-hover-dot-border-width',
      '--radiobutton-active-dot-border-width',
    ],
    unchanged: ['--radiobutton-default-label-font-size'],
    aliasedTo: {
      '--radiobutton-default-dot-border-width': '--border-width-4',
    },
    observe: { part: 'dot', css: 'borderTopWidth', variable: '--radiobutton-default-dot-border-width' },
  },
  interaction: {
    part: 'root',
    role: 'button',
    cases: [
      {
        name: 'clicking a radio option focuses it',
        action: { kind: 'click', part: 'root' },
        expect: { kind: 'focused', part: 'root', value: true },
      },
    ],
  },
  sketch: {
    applicable: false,
    reason: 'the sketch layer has no drawable-part entry for radiobutton',
  },
};
