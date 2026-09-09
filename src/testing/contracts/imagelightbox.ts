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
    // `click({force:true})` leaves the pointer resting on `nextButton`, so the
    // browser's real `.image-lightbox-nav:hover` rule applies afterward.
    // Unlike `closeButton`, clicking it does not close the modal.
    {
      setup: [{ kind: 'click', part: 'nextButton' }],
      paints: { nextButton: { backgroundColor: '--imagelightbox-chrome-hover-surface' } },
    },
  ],
  states: [{ state: 'tile' }, { state: 'overlay' }, { state: 'chrome' }],
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
        // still-open overlay otherwise) is reachable, by pressing Escape on
        // `root` rather than clicking `closeButton`. `assertPersistence`
        // replays `setup` twice back to back (once directly, once inside
        // `driveControl`). Measured against a live page: `closeLightbox`'s
        // `open = false` write happens inside an animation `onfinish`
        // callback that a `settle()` cycle doesn't durably wait out, so
        // `closeButton` — a portaled element that unmounts once that callback
        // fires — can still be gone, still be there, or about to vanish
        // mid-click, depending on exactly when it lands relative to the
        // harness's round trips. A second `closeButton` click inherits that
        // uncertainty. Leading with a `thumb` click to guarantee a target for
        // the `closeButton` click that follows inherits it from the other
        // side instead: `openLightbox`'s own `if (open) return` reads the
        // same not-yet-written flag, so it can no-op rather than reopen, and
        // nothing then re-drives it — reproduced empirically, a deterministic
        // dead end. Escape on `root` avoids both: `root` is never portaled,
        // so the action always has a target, and replaying it before the
        // first press has finished closing re-enters `closeLightbox` rather
        // than skipping it, so every replay drives the component strictly
        // further toward closed. (Escape also collapses the components
        // editor's own drawer, but nothing else this obligation reads lives
        // there, and `reopen()` between obligations restores it.)
        shape: 'token',
        setup: [{ kind: 'press', part: 'root', key: 'Escape' }],
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
    // Unlike that case, `assertThemeProjection` runs `setup` only once, so
    // the double-replay hazard doesn't apply and a plain `closeButton` click
    // is enough — and it has to be a click, not the Escape this contract's
    // persistence case uses, because Escape also collapses the drawer this
    // obligation's own `.theme-name-trigger` lives in.
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
