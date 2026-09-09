import type { ComponentContract } from '../componentContract';

export const panelContract: ComponentContract = {
  id: 'panel',
  origin: 'system',
  root: 'root',
  parts: {
    root: '.panel',
  },
  properties: [
    {
      paints: {
        root: {
          borderTopColor: '--panel-frame-border',
          borderTopWidth: '--panel-frame-border-width',
          borderRadius: '--panel-frame-radius',
          backgroundImage: '--panel-stage-surface',
          paddingTop: '--panel-stage-padding',
          paddingLeft: '--panel-stage-inline-padding',
          columnGap: '--panel-stage-gap',
        },
      },
    },
  ],
  states: {
    applicable: false,
    reason: 'the editor renders one token group (default) with no state strip',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--panel-frame-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
      {
        shape: 'gradient',
        variable: '--panel-stage-surface',
        observe: { part: 'root', css: 'backgroundColor' },
      },
    ],
    resetVariable: '--panel-frame-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--panel-frame-border-width', '--panel-frame-radius', '--panel-stage-inline-padding', '--panel-stage-padding'],
    unchanged: ['--panel-stage-gap'],
    aliasedTo: {
      '--panel-frame-border-width': '--border-width-3',
      '--panel-frame-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--panel-frame-border-width' },
  },
  interaction: {
    applicable: false,
    reason: 'a framed container carries no interactive role',
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'root', fill: '--panel-stage-surface', stroke: '--panel-frame-border' }],
  },
};
