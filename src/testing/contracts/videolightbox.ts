import type { ComponentContract } from '../componentContract';

export const videoLightboxContract: ComponentContract = {
  id: 'videolightbox',
  origin: 'system',
  root: 'root',
  // The editor renders an `inline` copy of the open lightbox beside the tile,
  // so the overlay and close button are measurable without opening a modal.
  parts: {
    root: '.videolightbox',
    trigger: '.videolightbox-trigger',
    badge: '.videolightbox-badge',
    badgeIcon: '.videolightbox-badge svg',
    overlay: '.videolightbox-modal.inline',
    closeButton: '.videolightbox-modal.inline .videolightbox-close',
    closeIcon: '.videolightbox-modal.inline .videolightbox-close svg',
  },
  properties: [
    {
      paints: {
        root: {
          backgroundColor: '--videolightbox-tile-surface',
          borderTopColor: '--videolightbox-tile-border',
          borderTopWidth: '--videolightbox-tile-border-width',
          borderRadius: '--videolightbox-tile-radius',
          boxShadow: '--videolightbox-tile-shadow',
        },
        overlay: {
          backgroundColor: '--videolightbox-scrim-surface',
          paddingTop: '--videolightbox-overlay-padding',
        },
        closeButton: {
          backgroundColor: '--videolightbox-chrome-surface',
          borderTopColor: '--videolightbox-chrome-border',
          borderTopWidth: '--videolightbox-chrome-border-width',
          borderRadius: '--videolightbox-chrome-radius',
          color: '--videolightbox-chrome-icon',
        },
        closeIcon: { stroke: '--videolightbox-chrome-icon' },
        badge: {
          backgroundColor: '--videolightbox-badge-default-surface',
          borderTopColor: '--videolightbox-badge-default-border',
          borderTopWidth: '--videolightbox-badge-default-border-width',
          width: '--videolightbox-badge-default-size',
          color: '--videolightbox-badge-default-icon',
        },
        badgeIcon: { width: '--videolightbox-badge-default-icon-size' },
      },
    },
    {
      state: 'hover',
      paints: {
        badge: {
          backgroundColor: '--videolightbox-badge-hover-surface',
          borderTopColor: '--videolightbox-badge-hover-border',
          color: '--videolightbox-badge-hover-icon',
        },
      },
    },
    // The inline close button has no handler, so the click leaves the pointer
    // resting on it and its real :hover rule applies.
    {
      setup: [{ kind: 'click', part: 'closeButton' }],
      paints: { closeButton: { backgroundColor: '--videolightbox-chrome-hover-surface' } },
    },
  ],
  states: [{ state: 'default' }, { state: 'hover' }],
  uncovered: {
    '--videolightbox-overlay-duration': 'consumed inside the opacity transition shorthand, never a standalone computed value',
    '--videolightbox-overlay-easing': 'consumed inside the opacity transition shorthand, never a standalone computed value',
    '--videolightbox-badge-duration': 'consumed inside the badge transition shorthand, never a standalone computed value',
    '--videolightbox-badge-easing': 'consumed inside the badge transition shorthand, never a standalone computed value',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--videolightbox-tile-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--videolightbox-tile-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: [
      '--videolightbox-tile-border-width',
      '--videolightbox-tile-radius',
      '--videolightbox-chrome-border-width',
      '--videolightbox-chrome-radius',
    ],
    unchanged: ['--videolightbox-tile-shadow'],
    aliasedTo: {
      '--videolightbox-tile-border-width': '--border-width-2',
      '--videolightbox-tile-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--videolightbox-tile-border-width' },
  },
  interaction: {
    part: 'trigger',
    role: 'button',
    cases: [
      {
        name: 'clicking the still opens the lightbox',
        action: { kind: 'click', part: 'trigger' },
        expect: { kind: 'attribute', part: 'trigger', name: 'aria-expanded', value: 'true' },
      },
    ],
  },
  behavior: {
    applicable: false,
    reason: 'the lightbox declares no callback prop; opening portals a modal and plays media, which happy-dom cannot run',
  },
  sketch: {
    style: 'pencil',
    parts: [
      { part: 'root', fill: '--videolightbox-tile-surface', stroke: '--videolightbox-tile-border' },
    ],
  },
};
