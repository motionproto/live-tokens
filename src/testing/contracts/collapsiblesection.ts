import type { ComponentContract, PaintMap, SetupStep } from '../componentContract';

function clickHover(): SetupStep[] {
  return [{ kind: 'control', selector: '.tabs-selectors.substrip .state-tab-btn:has-text("Hover")' }];
}

function headerPaints(v: string, s: 'default' | 'hover'): PaintMap {
  const p = `--collapsiblesection-${v}-${s}`;
  const header: PaintMap[string] = {
    backgroundColor: `${p}-surface`,
    paddingTop: `${p}-padding`,
  };
  if (v === 'hairline') {
    header.borderBottomColor = `${p}-hairline-color`;
    header.borderBottomWidth = `${p}-hairline-width`;
  }
  return {
    header,
    label: {
      color: `${p}-label`,
      fontFamily: `${p}-label-font-family`,
      fontSize: `${p}-label-font-size`,
      fontWeight: `${p}-label-font-weight`,
      lineHeight: `${p}-label-line-height`,
    },
    icon: { color: `${p}-icon`, fontSize: `${p}-icon-size` },
  };
}

export const collapsibleSectionContract: ComponentContract = {
  id: 'collapsiblesection',
  origin: 'system',
  view: { variant: 'Container', state: 'Body' },
  root: 'root',
  parts: {
    root: '.es-root',
    header: '.section-header',
    label: '.section-label',
    icon: '.toggle-icon',
    body: '.section-content',
    toggleButton: '.section-toggle-button',
  },
  properties: [
    {
      variant: 'Container',
      state: 'Container',
      paints: {
        root: {
          borderTopColor: '--collapsiblesection-container-frame-border',
          borderTopWidth: '--collapsiblesection-container-frame-border-width',
          borderRadius: '--collapsiblesection-container-frame-radius',
        },
      },
    },
    { variant: 'Container', state: 'Header', paints: headerPaints('container', 'default') },
    { variant: 'Container', state: 'Header', setup: clickHover(), paints: headerPaints('container', 'hover') },
    {
      variant: 'Container',
      state: 'Body',
      paints: { body: { backgroundColor: '--collapsiblesection-container-open-surface', paddingTop: '--collapsiblesection-container-open-padding' } },
    },
    { variant: 'Chromeless', state: 'Header', paints: headerPaints('chromeless', 'default') },
    { variant: 'Chromeless', state: 'Header', setup: clickHover(), paints: headerPaints('chromeless', 'hover') },
    { variant: 'Chromeless', state: 'Body', paints: { body: { paddingTop: '--collapsiblesection-chromeless-open-padding' } } },
    { variant: 'With Hairline', state: 'Header', paints: headerPaints('hairline', 'default') },
    { variant: 'With Hairline', state: 'Header', setup: clickHover(), paints: headerPaints('hairline', 'hover') },
    { variant: 'With Hairline', state: 'Body', paints: { body: { paddingTop: '--collapsiblesection-hairline-open-padding' } } },
  ],
  states: [{ state: 'Container' }, { state: 'Header' }, { state: 'Body' }],
  persistence: {
    cases: [
      {
        shape: 'token',
        variant: 'Container',
        state: 'Container',
        variable: '--collapsiblesection-container-frame-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--collapsiblesection-container-frame-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--collapsiblesection-container-frame-border-width', '--collapsiblesection-container-frame-radius'],
    unchanged: ['--collapsiblesection-container-default-icon-size'],
    aliasedTo: {
      '--collapsiblesection-container-frame-border-width': '--border-width-3',
      '--collapsiblesection-container-frame-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--collapsiblesection-container-frame-border-width' },
  },
  interaction: {
    part: 'toggleButton',
    role: 'button',
    // No activation case: CollapsibleSectionEditor's preview drives `open`
    // off the active state tab and never wires `ontoggle` back to it, so
    // clicking the real button here can't move `aria-expanded` (same
    // constraint documented on ToggleEditor in toggle.ts).
    cases: [
      {
        name: 'clicking the header padding focuses the toggle button',
        action: { kind: 'click', part: 'header' },
        expect: { kind: 'focused', part: 'toggleButton', value: true },
      },
      {
        name: 'clicking the label focuses the toggle button',
        action: { kind: 'click', part: 'label' },
        expect: { kind: 'focused', part: 'toggleButton', value: true },
      },
      {
        name: 'clicking the toggle button focuses it',
        action: { kind: 'click', part: 'toggleButton' },
        expect: { kind: 'focused', part: 'toggleButton', value: true },
      },
    ],
  },
  behavior: {
    cases: [
      {
        name: 'clicking the chevron asks to toggle',
        props: { label: 'Details' },
        action: { kind: 'click', part: 'toggleButton' },
        expect: { kind: 'callback', prop: 'ontoggle', args: [] },
      },
      {
        name: 'open drives the chevron',
        props: { label: 'Details', open: true },
        expect: { kind: 'attribute', part: 'toggleButton', name: 'aria-expanded', value: 'true' },
      },
      {
        name: 'clicking leaves the section where the prop put it',
        props: { label: 'Details' },
        action: { kind: 'click', part: 'toggleButton' },
        expect: { kind: 'attribute', part: 'toggleButton', name: 'aria-expanded', value: 'false' },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [
      { part: 'root', stroke: '--collapsiblesection-container-frame-border' },
      { part: 'header', fill: '--collapsiblesection-container-default-surface' },
      { part: 'body', fill: '--collapsiblesection-container-open-surface' },
    ],
  },
};
