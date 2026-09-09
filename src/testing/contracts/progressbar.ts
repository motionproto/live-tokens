import type { ComponentContract } from '../componentContract';

export const progressBarContract: ComponentContract = {
  id: 'progressbar',
  origin: 'system',
  root: 'root',
  parts: {
    root: '.progress',
    track: '.progress-track',
    fill: '.progress-fill',
    label: '.progress-label > span:not(.progress-value)',
    value: '.progress-value',
  },
  properties: [
    {
      paints: {
        root: { rowGap: '--progressbar-label-gap' },
        track: {
          backgroundColor: '--progressbar-track-surface',
          borderTopColor: '--progressbar-track-border',
          borderTopWidth: '--progressbar-track-border-width',
          borderRadius: '--progressbar-radius',
          height: '--progressbar-track-height',
        },
        fill: { backgroundColor: '--progressbar-fill' },
        label: {
          color: '--progressbar-label',
          fontFamily: '--progressbar-label-font-family',
          fontSize: '--progressbar-label-font-size',
          fontWeight: '--progressbar-label-font-weight',
          lineHeight: '--progressbar-label-line-height',
        },
        value: {
          color: '--progressbar-value',
          fontFamily: '--progressbar-value-font-family',
          fontSize: '--progressbar-value-font-size',
          fontWeight: '--progressbar-value-font-weight',
          lineHeight: '--progressbar-value-line-height',
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
        variable: '--progressbar-track-border-width',
        observe: { part: 'track', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--progressbar-track-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--progressbar-radius', '--progressbar-track-border-width'],
    unchanged: ['--progressbar-track-height'],
    aliasedTo: {
      '--progressbar-radius': '--radius-none',
      '--progressbar-track-border-width': '--border-width-3',
    },
    observe: { part: 'track', css: 'borderTopWidth', variable: '--progressbar-track-border-width' },
  },
  interaction: {
    applicable: false,
    reason: 'a progress readout carries no interactive role',
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'track', fill: '--progressbar-track-surface', stroke: '--progressbar-track-border' }],
  },
};
