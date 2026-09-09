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
    // `click({force:true})` leaves the pointer resting on `root`, so the
    // browser's real `.card:hover` rule applies afterward, no InteractionCase
    // needed. The editor's `.force-hover` reads these same gated tokens, so
    // the state entry below and this one have to agree.
    {
      setup: [{ kind: 'click', part: 'root' }],
      paints: {
        root: { borderTopColor: '--card-hover-border-enabled', boxShadow: '--card-hover-shadow-enabled' },
      },
    },
    // The per-side entry above drives `-padding-top` directly, which passes
    // regardless of what it's aliased to. This drives the base token instead,
    // proving the `-padding-top: var(--card-default-*-padding)` link itself.
    {
      paints: {
        header: { paddingTop: '--card-default-header-padding' },
        body: { paddingTop: '--card-default-body-padding' },
      },
    },
  ],
  states: [
    { state: 'default' },
    // The gate is off by default, so the hover tab has to show the resting
    // card. Naming the gated tokens is what pins that: `--card-hover-border`
    // resolves to `--border-neutral-strong` and would not match.
    {
      state: 'hover',
      forceClass: 'force-hover',
      paints: {
        root: { borderTopColor: '--card-hover-border-enabled', boxShadow: '--card-hover-shadow-enabled' },
      },
    },
  ],
  uncovered: {
    '--card-default-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
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
