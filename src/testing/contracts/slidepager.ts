import type { ComponentContract } from '../componentContract';

const behaviorSlides = [
  { src: 'a.webp', alt: 'First slide' },
  { src: 'b.webp', alt: 'Second slide' },
  { src: 'c.webp', alt: 'Third slide' },
];

export const slidePagerContract: ComponentContract = {
  id: 'slidepager',
  origin: 'system',
  root: 'root',
  // The editor renders an `inline` copy of the full-screen read beside the
  // pager, so the overlay and its close button are measurable in place.
  parts: {
    root: '.slidepager',
    frame: '.slidepager .slidepager-frame',
    stage: '.slidepager .slidepager-stage',
    bar: '.slidepager > .slidepager-bar',
    prevControl: '.slidepager > .slidepager-bar [data-nav="prev"]',
    nextControl: '.slidepager > .slidepager-bar [data-nav="next"]',
    controlIcon: '.slidepager > .slidepager-bar [data-nav="next"] svg',
    counter: '.slidepager > .slidepager-bar .slidepager-counter',
    overlay: '.slidepager-modal.inline',
    closeButton: '.slidepager-modal.inline .slidepager-close',
  },
  properties: [
    {
      paints: {
        frame: {
          backgroundColor: '--slidepager-frame-surface',
          borderTopColor: '--slidepager-frame-border',
          borderTopWidth: '--slidepager-frame-border-width',
          borderRadius: '--slidepager-frame-radius',
          boxShadow: '--slidepager-frame-shadow',
        },
        bar: { columnGap: '--slidepager-bar-gap', paddingTop: '--slidepager-bar-padding' },
        nextControl: {
          backgroundColor: '--slidepager-control-surface',
          borderTopColor: '--slidepager-control-border',
          borderTopWidth: '--slidepager-control-border-width',
          borderRadius: '--slidepager-control-radius',
          width: '--slidepager-control-size',
          color: '--slidepager-control-icon',
        },
        controlIcon: { width: '--slidepager-control-icon-size' },
        counter: {
          color: '--slidepager-counter-text',
          fontFamily: '--slidepager-counter-font-family',
          fontSize: '--slidepager-counter-font-size',
          fontWeight: '--slidepager-counter-font-weight',
          lineHeight: '--slidepager-counter-line-height',
          letterSpacing: '--slidepager-counter-letter-spacing',
        },
        overlay: {
          backgroundColor: '--slidepager-scrim-surface',
          paddingTop: '--slidepager-overlay-padding',
        },
        closeButton: { top: '--slidepager-close-margin' },
      },
    },
    // The inline close button has no handler, so the click leaves the pointer
    // resting on it and its real :hover rule applies.
    {
      setup: [{ kind: 'click', part: 'closeButton' }],
      paints: {
        closeButton: {
          backgroundColor: '--slidepager-control-hover-surface',
          borderTopColor: '--slidepager-control-hover-border',
          color: '--slidepager-control-hover-icon',
        },
      },
    },
    // The preview opens on the middle slide, so one click back lands on the
    // first and disables the control under the pointer.
    {
      setup: [{ kind: 'click', part: 'prevControl' }],
      paints: {
        prevControl: {
          backgroundColor: '--slidepager-control-disabled-surface',
          borderTopColor: '--slidepager-control-disabled-border',
          color: '--slidepager-control-disabled-icon',
        },
      },
    },
  ],
  states: [{ state: 'default' }, { state: 'hover' }, { state: 'disabled' }],
  uncovered: {
    '--slidepager-overlay-duration': 'consumed inside the opacity transition shorthand, never a standalone computed value',
    '--slidepager-overlay-easing': 'consumed inside the opacity transition shorthand, never a standalone computed value',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--slidepager-frame-border-width',
        observe: { part: 'frame', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--slidepager-frame-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: [
      '--slidepager-frame-border-width',
      '--slidepager-frame-radius',
      '--slidepager-control-border-width',
      '--slidepager-control-radius',
    ],
    unchanged: ['--slidepager-control-size'],
    aliasedTo: {
      '--slidepager-frame-border-width': '--border-width-3',
      '--slidepager-frame-radius': '--radius-none',
    },
    observe: { part: 'frame', css: 'borderTopWidth', variable: '--slidepager-frame-border-width' },
  },
  interaction: {
    part: 'stage',
    role: 'button',
    cases: [
      {
        name: 'the next chevron moves the frame to the next slide',
        action: { kind: 'click', part: 'nextControl' },
        expect: { kind: 'attribute', part: 'stage', name: 'aria-label', value: 'Open slide 3 full screen' },
      },
    ],
  },
  behavior: {
    cases: [
      {
        name: 'the next chevron reports the slide it moved to',
        props: { slides: behaviorSlides, index: 0 },
        action: { kind: 'click', part: 'nextControl' },
        expect: { kind: 'callback', prop: 'onchange', args: [1] },
      },
      {
        name: 'the previous chevron is silent on the first slide',
        props: { slides: behaviorSlides, index: 0 },
        action: { kind: 'click', part: 'prevControl' },
        expect: { kind: 'no-callback', prop: 'onchange' },
      },
      {
        name: 'the counter names the slide index opens on',
        props: { slides: behaviorSlides, index: 2 },
        expect: { kind: 'text', part: 'counter', value: '3 / 3' },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'frame', fill: '--slidepager-frame-surface', stroke: '--slidepager-frame-border' }],
  },
};
