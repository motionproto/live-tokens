import type { ComponentContract } from '../componentContract';

export const tableContract: ComponentContract = {
  id: 'table',
  origin: 'system',
  root: 'wrapper',
  parts: {
    wrapper: '.table-wrapper',
    th: '.table-wrapper th',
    td: '.table-wrapper td',
  },
  properties: [
    {
      paints: {
        wrapper: {
          backgroundColor: '--table-default-surface',
          borderTopColor: '--table-default-border',
          borderTopWidth: '--table-default-border-width',
          borderRadius: '--table-default-radius',
          boxShadow: '--table-default-shadow',
        },
        th: {
          backgroundColor: '--table-default-header-surface',
          color: '--table-default-header-text',
          fontFamily: '--table-default-header-font-family',
          fontSize: '--table-default-header-font-size',
          fontWeight: '--table-default-header-font-weight',
          lineHeight: '--table-default-header-line-height',
          borderBottomColor: '--table-default-header-hairline-color',
          borderBottomWidth: '--table-default-header-hairline-width',
          paddingTop: '--table-default-header-padding',
          borderRightColor: '--table-default-column-hairline-color',
          borderRightWidth: '--table-default-column-hairline-width',
        },
        td: {
          backgroundColor: '--table-default-row-surface',
          color: '--table-default-cell-text',
          fontFamily: '--table-default-cell-font-family',
          fontSize: '--table-default-cell-font-size',
          fontWeight: '--table-default-cell-font-weight',
          lineHeight: '--table-default-cell-line-height',
          paddingTop: '--table-default-cell-padding',
          borderBottomColor: '--table-default-row-hairline-color',
          borderBottomWidth: '--table-default-row-hairline-width',
        },
      },
    },
  ],
  states: [
    { state: 'wrapper' },
    { state: 'header' },
    { state: 'cell' },
    { state: 'row' },
    { state: 'column' },
  ],
  uncovered: {
    '--table-default-row-stripe-surface': 'layered as a background-image on every even row; a probe cannot pin a single verbatim computed value to that selector',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--table-default-border-width',
        observe: { part: 'wrapper', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--table-default-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: [
      '--table-default-border-width',
      '--table-default-radius',
      '--table-default-header-hairline-width',
      '--table-default-header-padding',
    ],
    unchanged: ['--table-default-header-font-size'],
    aliasedTo: {
      '--table-default-border-width': '--border-width-4',
      '--table-default-radius': '--radius-none',
    },
    observe: { part: 'wrapper', css: 'borderTopWidth', variable: '--table-default-border-width' },
  },
  interaction: {
    applicable: false,
    reason: 'a styled table wrapper carries no interactive role',
  },
  behavior: {
    applicable: false,
    reason: 'a table wrapper declares no callback prop; its rows arrive as a snippet',
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'wrapper', fill: '--table-default-surface', stroke: '--table-default-border' }],
  },
};
