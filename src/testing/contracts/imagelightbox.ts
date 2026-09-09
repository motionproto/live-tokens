import type { ComponentContract } from '../componentContract';

export const imageLightboxContract: ComponentContract = {
  id: 'imagelightbox',
  origin: 'system',
  view: { setup: [{ kind: 'click', part: 'thumb' }] },
  root: 'root',
  parts: {
    root: '.image-lightbox-wrapper',
    thumb: '.image-lightbox-thumb',
    overlay: { selector: '.image-lightbox-overlay', portal: true },
    stage: { selector: '.image-lightbox-stage', portal: true },
    closeButton: { selector: '.image-lightbox-close', portal: true },
    closeIcon: { selector: '.image-lightbox-close svg', portal: true },
    prevButton: { selector: '.image-lightbox-nav-prev', portal: true },
    nextButton: { selector: '.image-lightbox-nav-next', portal: true },
    counter: { selector: '.image-lightbox-counter', portal: true },
    toolbar: { selector: '.image-lightbox-toolbar', portal: true },
  },
  properties: [
    {
      paints: {
        thumb: {
          backgroundColor: '--imagelightbox-tile-surface',
          borderTopColor: '--imagelightbox-tile-border',
          borderTopWidth: '--imagelightbox-tile-border-width',
          borderRadius: '--imagelightbox-tile-radius',
          boxShadow: '--imagelightbox-tile-shadow',
        },
        overlay: { backgroundColor: '--imagelightbox-overlay-surface' },
        closeButton: {
          backgroundColor: '--imagelightbox-chrome-surface',
          borderTopColor: '--imagelightbox-chrome-border',
          borderTopWidth: '--imagelightbox-chrome-border-width',
          borderRadius: '--imagelightbox-chrome-radius',
          color: '--imagelightbox-chrome-icon',
        },
        closeIcon: { stroke: '--imagelightbox-chrome-icon' },
      },
    },
  ],
  states: [{ state: 'tile' }, { state: 'overlay' }, { state: 'chrome' }],
  uncovered: {
    '--imagelightbox-chrome-hover-surface': 'gates the real :hover pseudo-class on the close/nav buttons; no scripted harness action triggers it',
  },
  persistence: {
    cases: [
      {
        // No `state` here: "tile" is the panel's own default tab, and every
        // `selectView` re-clicks whatever `state` names even when it is
        // already active. While the modal is open, that click's target sits
        // under the overlay's full-viewport hit area, so skipping it avoids
        // an avoidable trip through the same close-on-click behavior `setup`
        // is about to use on purpose. `setup` closes the modal the
        // contract-level view opened so the "tile" token control (behind the
        // still-open overlay otherwise) is reachable. `contractHarness.ts`'s
        // `assertPersistence` reopens the page before replaying this `setup`
        // a third time for the Reset re-drive, so it always starts from the
        // same freshly-opened state this was written against.
        shape: 'token',
        setup: [{ kind: 'click', part: 'closeButton' }],
        variable: '--imagelightbox-tile-border-width',
        observe: { part: 'thumb', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--imagelightbox-tile-border-width',
  },
  theme: {
    // Closes the modal the contract-level setup opened: the Theme Picker
    // trigger lives in the chrome behind it, and the still-open overlay
    // blocks clicks the same way it does for the persistence case above.
    setup: [{ kind: 'click', part: 'closeButton' }],
    theme: 'halloween',
    changed: ['--imagelightbox-tile-border-width', '--imagelightbox-tile-radius', '--imagelightbox-chrome-border-width', '--imagelightbox-chrome-radius'],
    unchanged: ['--imagelightbox-tile-shadow'],
    aliasedTo: {
      '--imagelightbox-tile-border-width': '--border-width-2',
      '--imagelightbox-tile-radius': '--radius-none',
    },
    observe: { part: 'thumb', css: 'borderTopWidth', variable: '--imagelightbox-tile-border-width' },
  },
  interaction: {
    part: 'nextButton',
    role: 'button',
    cases: [
      {
        name: 'clicking the next chevron focuses it',
        action: { kind: 'click', part: 'nextButton' },
        expect: { kind: 'focused', part: 'nextButton', value: true },
      },
    ],
  },
  sketch: {
    applicable: false,
    reason: 'the sketch layer has no drawable-part entry for imagelightbox',
  },
};
