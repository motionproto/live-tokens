import type { ComponentContract, PaintMap, SetupStep } from '../componentContract';

/** Both the top-level part tab and its sub-state live in one string, joined by
 *  " / " in the DOM but rendered as two separate strips; reaching a sub-state
 *  other than the first needs an extra click into the sub-strip. */
function sub(label: string): SetupStep[] {
  return [{ kind: 'control', selector: `.tabs-selectors.substrip .state-tab-btn:has-text("${label}")` }];
}

function titlePaints(s: 'default' | 'hover' | 'active'): PaintMap {
  return {
    title: {
      backgroundColor: `--sidenavigation-title-${s}-surface`,
      borderTopColor: `--sidenavigation-title-${s}-border`,
      borderTopWidth: `--sidenavigation-title-${s}-border-width`,
      borderLeftColor: `--sidenavigation-title-${s}-accent`,
      borderLeftWidth: `--sidenavigation-title-${s}-accent-width`,
      paddingTop: `--sidenavigation-title-${s}-padding`,
    },
    titleLabel: {
      color: `--sidenavigation-title-${s}-label`,
      fontFamily: `--sidenavigation-title-${s}-label-font-family`,
      fontSize: `--sidenavigation-title-${s}-label-font-size`,
      fontWeight: `--sidenavigation-title-${s}-label-font-weight`,
      lineHeight: `--sidenavigation-title-${s}-label-line-height`,
    },
  };
}

function togglePaints(s: 'default' | 'hover'): PaintMap {
  return {
    toggle: {
      backgroundColor: `--sidenavigation-toggle-${s}-surface`,
      borderTopColor: `--sidenavigation-toggle-${s}-border`,
      borderTopWidth: `--sidenavigation-toggle-${s}-border-width`,
      borderRadius: `--sidenavigation-toggle-${s}-radius`,
      paddingTop: `--sidenavigation-toggle-${s}-padding`,
      color: `--sidenavigation-toggle-${s}-icon`,
    },
    toggleIcon: { fontSize: `--sidenavigation-toggle-${s}-icon-size` },
  };
}

function sectionPaints(part: string, labelPart: string, s: 'default' | 'hover' | 'active'): PaintMap {
  return {
    [part]: {
      backgroundColor: `--sidenavigation-section-${s}-surface`,
      borderLeftColor: `--sidenavigation-section-${s}-accent`,
      borderLeftWidth: `--sidenavigation-section-${s}-accent-width`,
    },
    [labelPart]: {
      color: `--sidenavigation-section-${s}-text`,
      fontFamily: `--sidenavigation-section-${s}-text-font-family`,
      fontSize: `--sidenavigation-section-${s}-text-font-size`,
      fontWeight: `--sidenavigation-section-${s}-text-font-weight`,
      lineHeight: `--sidenavigation-section-${s}-text-line-height`,
    },
  };
}

function itemPaints(part: string, s: 'default' | 'hover' | 'active'): PaintMap {
  return {
    [part]: {
      backgroundColor: `--sidenavigation-item-${s}-surface`,
      borderLeftColor: `--sidenavigation-item-${s}-accent`,
      borderLeftWidth: `--sidenavigation-item-${s}-accent-width`,
      paddingTop: `--sidenavigation-item-${s}-padding`,
      color: `--sidenavigation-item-${s}-text`,
      fontFamily: `--sidenavigation-item-${s}-text-font-family`,
      fontSize: `--sidenavigation-item-${s}-text-font-size`,
      fontWeight: `--sidenavigation-item-${s}-text-font-weight`,
      lineHeight: `--sidenavigation-item-${s}-text-line-height`,
    },
  };
}

function footerPaints(s: 'default' | 'hover' | 'active'): PaintMap {
  return {
    footer: {
      backgroundColor: `--sidenavigation-footer-${s}-surface`,
      borderLeftColor: `--sidenavigation-footer-${s}-accent`,
      borderLeftWidth: `--sidenavigation-footer-${s}-accent-width`,
      paddingTop: `--sidenavigation-footer-${s}-padding`,
      columnGap: `--sidenavigation-footer-${s}-gap`,
      color: `--sidenavigation-footer-${s}-text`,
      fontFamily: `--sidenavigation-footer-${s}-text-font-family`,
      fontSize: `--sidenavigation-footer-${s}-text-font-size`,
      fontWeight: `--sidenavigation-footer-${s}-text-font-weight`,
      lineHeight: `--sidenavigation-footer-${s}-text-line-height`,
    },
    footerIcon: {
      color: `--sidenavigation-footer-${s}-icon`,
      fontSize: `--sidenavigation-footer-${s}-icon-size`,
    },
  };
}

export const sideNavigationContract: ComponentContract = {
  id: 'sidenavigation',
  origin: 'system',
  // Section has no currentPath-driven active state (unlike Item, whose
  // demo path lands inside section-1): it lights up only through the force
  // mechanism behind the "Active" sub-tab, so the inventory's one view has
  // to land there for `sectionActive` to resolve at all.
  view: { state: 'Section', setup: sub('Active') },
  root: 'root',
  parts: {
    root: '.sidenavigation',
    title: '.sn-title',
    titleLabel: '.sn-title-label',
    toggle: '.sn-toggle',
    toggleIcon: '.sn-toggle i',
    sectionWrap: '.sn-section',
    section: '.sn-section-header:not(.active)',
    sectionLabel: '.sn-section-header:not(.active) .section-label',
    sectionActive: '.sn-section-header.active',
    sectionLabelActive: '.sn-section-header.active .section-label',
    item: '.sn-item:not(.active)',
    itemActive: '.sn-item.active',
    footer: '.sn-footer',
    footerIcon: '.sn-footer i',
  },
  properties: [
    {
      state: 'Panel',
      setup: [],
      paints: {
        root: {
          backgroundColor: '--sidenavigation-panel-surface',
          borderRightColor: '--sidenavigation-panel-border',
          borderRightWidth: '--sidenavigation-panel-border-width',
          paddingTop: '--sidenavigation-panel-padding',
        },
        item: { paddingLeft: '--sidenavigation-panel-item-padding' },
        footer: { marginTop: '--sidenavigation-panel-footer-gap' },
        sectionWrap: { marginTop: '--sidenavigation-panel-section-gap' },
      },
    },
    {
      state: 'Title Block',
      setup: [],
      paints: {
        title: { columnGap: '--sidenavigation-title-gap', borderRadius: '--sidenavigation-title-radius' },
        titleLabel: {
          backgroundColor: '--sidenavigation-title-label-surface',
          borderTopColor: '--sidenavigation-title-label-border',
          borderTopWidth: '--sidenavigation-title-label-border-width',
          borderRadius: '--sidenavigation-title-label-radius',
          paddingTop: '--sidenavigation-title-label-padding',
        },
      },
    },
    { state: 'Title', setup: [], paints: titlePaints('default') },
    { state: 'Title', setup: sub('Hover'), paints: titlePaints('hover') },
    { state: 'Title', setup: sub('Active'), paints: titlePaints('active') },
    { state: 'Toggle', setup: [], paints: togglePaints('default') },
    { state: 'Toggle', setup: sub('Hover'), paints: togglePaints('hover') },
    { state: 'Section', setup: [], paints: sectionPaints('section', 'sectionLabel', 'default') },
    { state: 'Section', setup: sub('Hover'), paints: sectionPaints('section', 'sectionLabel', 'hover') },
    { state: 'Section', setup: sub('Active'), paints: sectionPaints('sectionActive', 'sectionLabelActive', 'active') },
    { state: 'Item', setup: [], paints: itemPaints('item', 'default') },
    { state: 'Item', setup: sub('Hover'), paints: itemPaints('item', 'hover') },
    { state: 'Item', setup: [], paints: itemPaints('itemActive', 'active') },
    { state: 'Footer', setup: [], paints: footerPaints('default') },
    { state: 'Footer', setup: sub('Hover'), paints: footerPaints('hover') },
    { state: 'Footer', setup: sub('Active'), paints: footerPaints('active') },
  ],
  states: [
    { state: 'Panel', setup: [] },
    { state: 'Title', setup: [] },
    { state: 'Title Block', setup: [] },
    { state: 'Toggle', setup: [] },
    { state: 'Section', setup: [] },
    { state: 'Item', setup: [] },
    { state: 'Footer', setup: [] },
    { state: 'Animation', setup: [] },
  ],
  uncovered: {
    '--sidenavigation-open-duration': 'consumed by a width transition, no probe covers duration',
    '--sidenavigation-open-easing': 'consumed by a width transition, no probe covers an easing curve',
    '--sidenavigation-close-duration': 'consumed by a width transition, no probe covers duration',
    '--sidenavigation-close-easing': 'consumed by a width transition, no probe covers an easing curve',
    '--sidenavigation-hover-tint': 'consumed inside a background-image tint wash, never appearing verbatim in a computed style',
    '--sidenavigation-hover-tint-enabled': 'the gate for the tint wash above, same limitation',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        state: 'Panel',
        setup: [],
        variable: '--sidenavigation-panel-border-width',
        observe: { part: 'root', css: 'borderRightWidth' },
      },
    ],
    resetVariable: '--sidenavigation-panel-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--sidenavigation-panel-border-width', '--sidenavigation-title-default-border-width'],
    unchanged: ['--sidenavigation-toggle-default-icon-size'],
    aliasedTo: {
      '--sidenavigation-panel-border-width': '--border-width-3',
      '--sidenavigation-title-default-border-width': '--border-width-3',
    },
    observe: { part: 'root', css: 'borderRightWidth', variable: '--sidenavigation-panel-border-width' },
  },
  interaction: {
    part: 'toggle',
    role: 'button',
    cases: [
      {
        name: 'clicking the toggle collapses the rail',
        action: { kind: 'click', part: 'toggle' },
        expect: { kind: 'attribute', part: 'toggle', name: 'aria-expanded', value: 'false' },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'root', fill: '--sidenavigation-panel-surface', stroke: '--sidenavigation-panel-border' }],
  },
};
