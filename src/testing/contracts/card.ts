import type { ComponentContract } from '../componentContract';

export const cardContract: ComponentContract = {
  id: 'card',
  origin: 'system',
  root: 'root',
  parts: {
    root: '.card',
    header: '.card-header',
    icon: '.card-icon',
    title: '.card-title',
    body: '.card-body',
  },
  properties: [
    {
      paints: {
        root: {
          backgroundColor: '--card-default-surface',
          borderTopColor: '--card-default-border',
          borderTopWidth: '--card-default-border-width',
          borderRadius: '--card-default-radius',
          boxShadow: '--card-default-shadow',
        },
        header: {
          backgroundColor: '--card-default-header-surface',
          columnGap: '--card-default-header-gap',
          paddingTop: '--card-default-header-padding-top',
          paddingRight: '--card-default-header-padding-right',
          paddingBottom: '--card-default-header-padding-bottom',
          paddingLeft: '--card-default-header-padding-left',
        },
        icon: { fontSize: '--card-default-icon-size' },
        title: {
          color: '--card-default-title',
          fontFamily: '--card-default-title-font-family',
          fontSize: '--card-default-title-font-size',
          fontWeight: '--card-default-title-font-weight',
          lineHeight: '--card-default-title-line-height',
        },
        body: {
          color: '--card-default-body',
          fontFamily: '--card-default-body-font-family',
          fontSize: '--card-default-body-font-size',
          fontWeight: '--card-default-body-font-weight',
          lineHeight: '--card-default-body-line-height',
          paddingTop: '--card-default-body-padding-top',
          paddingRight: '--card-default-body-padding-right',
          paddingBottom: '--card-default-body-padding-bottom',
          paddingLeft: '--card-default-body-padding-left',
        },
      },
    },
  ],
  states: [
    { state: 'default' },
    {
      state: 'hover',
      forceClass: 'force-hover',
      paints: {
        root: { borderTopColor: '--card-hover-border', boxShadow: '--card-hover-shadow' },
      },
    },
  ],
  uncovered: {
    '--card-default-header-padding': 'shipped pre-aliased to its four per-side overrides (paddingTop/Right/Bottom/Left), which carry direct coverage',
    '--card-default-body-padding': 'shipped pre-aliased to its four per-side overrides (paddingTop/Right/Bottom/Left), which carry direct coverage',
    '--card-default-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
    // Confirmed, not assumed: Card.svelte's own comment says the force-hover
    // rule paints `--card-hover-border`/`-shadow` "ignoring the on/off gate" —
    // it is a *different* rule from `.card:hover`, which is the only one that
    // reads the `-enabled` gate tokens below. Card's own interaction is
    // inapplicable (a static container, no role), so the InteractionCase
    // mechanism that could drive a real pointer is unavailable here regardless,
    // and no other 2a action (press/click/type/dragTo) produces a bare
    // `:hover` without also clicking or dragging. These two tokens have no
    // test coverage anywhere in this suite, not merely in this contract.
    '--card-hover-border-enabled': 'gates the real .card:hover pseudo-class; force-hover bypasses the gate by design and no 2a action can produce a real hover on a component whose interaction is inapplicable, so this token is untested anywhere in the suite',
    '--card-hover-shadow-enabled': 'gates the real .card:hover pseudo-class; force-hover bypasses the gate by design and no 2a action can produce a real hover on a component whose interaction is inapplicable, so this token is untested anywhere in the suite',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--card-default-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--card-default-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--card-default-border-width', '--card-default-radius'],
    unchanged: ['--card-default-icon-size'],
    aliasedTo: {
      '--card-default-border-width': '--border-width-3',
      '--card-default-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--card-default-border-width' },
  },
  interaction: {
    applicable: false,
    reason: 'a card is a static container with no interactive role',
  },
  sketch: {
    style: 'pencil',
    parts: [
      { part: 'root', fill: '--card-default-surface', stroke: '--card-default-border' },
      { part: 'header', fill: '--card-default-header-surface' },
    ],
  },
};
