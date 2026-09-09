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
  if (v === 'divider') {
    header.borderBottomColor = `${p}-hairline-color`;
    header.borderBottomWidth = `${p}-hairline-thickness`;
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
      paints: { body: { backgroundColor: '--collapsiblesection-container-expanded-surface', paddingTop: '--collapsiblesection-container-expanded-padding' } },
    },
    { variant: 'Chromeless', state: 'Header', paints: headerPaints('chromeless', 'default') },
    { variant: 'Chromeless', state: 'Header', setup: clickHover(), paints: headerPaints('chromeless', 'hover') },
    { variant: 'Chromeless', state: 'Body', paints: { body: { paddingTop: '--collapsiblesection-chromeless-expanded-padding' } } },
    { variant: 'With Divider', state: 'Header', paints: headerPaints('divider', 'default') },
    { variant: 'With Divider', state: 'Header', setup: clickHover(), paints: headerPaints('divider', 'hover') },
    { variant: 'With Divider', state: 'Body', paints: { body: { paddingTop: '--collapsiblesection-divider-expanded-padding' } } },
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
    applicable: false,
    reason: 'without an href, the header toggles via a plain clickable div carrying no interactive role (see the a11y-ignore comment in CollapsibleSection.svelte)',
  },
  sketch: {
    style: 'pencil',
    parts: [
      { part: 'root', stroke: '--collapsiblesection-container-frame-border' },
      { part: 'header', fill: '--collapsiblesection-container-default-surface' },
      { part: 'body', fill: '--collapsiblesection-container-expanded-surface' },
    ],
  },
};
