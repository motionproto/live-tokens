import type { ComponentContract } from '../componentContract';

export const videoFrameContract: ComponentContract = {
  id: 'videoframe',
  origin: 'system',
  root: 'root',
  parts: {
    root: '.videoframe-frame',
    clip: '.videoframe-clip',
    trigger: '.videoframe-trigger',
    badge: '.videoframe-badge',
    badgeIcon: '.videoframe-badge svg',
  },
  properties: [
    {
      paints: {
        root: {
          backgroundColor: '--videoframe-frame-surface',
          borderTopColor: '--videoframe-frame-border',
          borderTopWidth: '--videoframe-frame-border-width',
          borderRadius: '--videoframe-frame-radius',
        },
        clip: { backgroundColor: '--videoframe-clip-surface' },
        badge: {
          backgroundColor: '--videoframe-badge-default-surface',
          borderTopColor: '--videoframe-badge-default-border',
          borderTopWidth: '--videoframe-badge-default-border-width',
          width: '--videoframe-badge-default-size',
          color: '--videoframe-badge-default-icon',
        },
        badgeIcon: { width: '--videoframe-badge-default-icon-size' },
      },
    },
    {
      state: 'hover',
      paints: {
        badge: {
          backgroundColor: '--videoframe-badge-hover-surface',
          borderTopColor: '--videoframe-badge-hover-border',
          color: '--videoframe-badge-hover-icon',
        },
      },
    },
  ],
  states: [{ state: 'default' }, { state: 'hover' }],
  uncovered: {
    '--videoframe-badge-duration': 'consumed inside the badge transition shorthand, never a standalone computed value',
    '--videoframe-badge-easing': 'consumed inside the badge transition shorthand, never a standalone computed value',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--videoframe-frame-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--videoframe-frame-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--videoframe-frame-border-width', '--videoframe-frame-radius'],
    unchanged: ['--videoframe-badge-default-size'],
    aliasedTo: {
      '--videoframe-frame-border-width': '--border-width-3',
      '--videoframe-frame-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--videoframe-frame-border-width' },
  },
  interaction: {
    part: 'trigger',
    role: 'button',
    cases: [
      {
        name: 'clicking the poster starts the clip',
        action: { kind: 'click', part: 'trigger' },
        expect: { kind: 'attribute', part: 'root', name: 'data-playing', value: 'true' },
      },
    ],
  },
  behavior: {
    applicable: false,
    reason: 'the frame declares no callback prop; playback is the browser\'s own media element',
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'root', fill: '--videoframe-frame-surface', stroke: '--videoframe-frame-border' }],
  },
};
