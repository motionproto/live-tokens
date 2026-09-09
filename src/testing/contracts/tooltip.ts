import type { ComponentContract } from '../componentContract';

export const tooltipContract: ComponentContract = {
  id: 'tooltip',
  origin: 'system',
  root: 'root',
  parts: {
    root: '.tooltip',
    arrow: { selector: '.tooltip', pseudo: '::after' },
  },
  properties: [
    {
      paints: {
        root: {
          backgroundColor: '--tooltip-surface',
          color: '--tooltip-text',
          borderTopColor: '--tooltip-border',
          borderTopWidth: '--tooltip-border-width',
          borderRadius: '--tooltip-radius',
          paddingTop: '--tooltip-padding',
          boxShadow: '--tooltip-shadow',
          fontFamily: '--tooltip-text-font-family',
          fontSize: '--tooltip-text-font-size',
          fontWeight: '--tooltip-text-font-weight',
          lineHeight: '--tooltip-text-line-height',
        },
        arrow: {
          borderRightColor: '--tooltip-border',
          borderRightWidth: '--tooltip-border-width',
        },
      },
    },
  ],
  states: {
    applicable: false,
    reason: 'the editor renders one token group (tooltip) with no state strip',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--tooltip-border',
        observe: { part: 'root', css: 'borderTopColor' },
      },
    ],
    resetVariable: '--tooltip-border',
  },
  theme: {
    theme: 'halloween',
    changed: ['--tooltip-border-width', '--tooltip-padding', '--tooltip-radius'],
    unchanged: ['--tooltip-text-font-size'],
    aliasedTo: {
      '--tooltip-border-width': '--border-width-3',
      '--tooltip-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--tooltip-border-width' },
  },
  interaction: {
    applicable: false,
    reason: 'a hint carries no interactive role; visibility follows the trigger element\'s hover or focus, which this component does not own',
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'root', fill: '--tooltip-surface' }],
  },
};
