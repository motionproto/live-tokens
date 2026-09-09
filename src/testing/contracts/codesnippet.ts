import type { ComponentContract } from '../componentContract';

export const codeSnippetContract: ComponentContract = {
  id: 'codesnippet',
  origin: 'system',
  root: 'root',
  parts: {
    root: '.codesnippet',
    code: '.code',
    copy: '.copy',
  },
  properties: [
    {
      paints: {
        root: {
          columnGap: '--codesnippet-gap',
          paddingTop: '--codesnippet-padding',
          backgroundColor: '--codesnippet-surface',
          borderTopColor: '--codesnippet-border',
          borderTopWidth: '--codesnippet-border-width',
          borderRadius: '--codesnippet-radius',
        },
        code: {
          color: '--codesnippet-code-text',
          fontFamily: '--codesnippet-code-font-family',
          fontSize: '--codesnippet-code-font-size',
          fontWeight: '--codesnippet-code-font-weight',
          lineHeight: '--codesnippet-code-line-height',
        },
        copy: {
          color: '--codesnippet-icon',
          fontSize: '--codesnippet-icon-size',
        },
      },
    },
  ],
  states: [
    { state: 'default' },
    {
      state: 'hover',
      forceClass: 'force-hover',
      paints: { copy: { color: '--codesnippet-hover-icon' } },
    },
  ],
  uncovered: {
    '--codesnippet-scrollbar-thumb': 'drawn via the ::-webkit-scrollbar-thumb pseudo-element and the scrollbar-color property, neither of which a probe can pin to one part',
    '--codesnippet-scrollbar-border-width': 'drives ::-webkit-scrollbar height, which a probe cannot read back verbatim',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--codesnippet-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--codesnippet-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--codesnippet-border-width', '--codesnippet-radius', '--codesnippet-padding', '--codesnippet-scrollbar-border-width'],
    unchanged: ['--codesnippet-icon-size'],
    aliasedTo: {
      '--codesnippet-border-width': '--border-width-3',
      '--codesnippet-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--codesnippet-border-width' },
  },
  interaction: {
    part: 'copy',
    role: 'button',
    cases: [
      {
        name: 'clicking copy focuses the button',
        action: { kind: 'click', part: 'copy' },
        expect: { kind: 'focused', part: 'copy', value: true },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'root', fill: '--codesnippet-surface', stroke: '--codesnippet-border' }],
  },
};
