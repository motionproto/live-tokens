import type { ComponentContract } from '../componentContract';

export const segmentedControlContract: ComponentContract = {
  id: 'segmentedcontrol',
  origin: 'system',
  view: { state: 'selected option' },
  root: 'root',
  parts: {
    root: '.segmented-control',
    segment: '.segment',
    icon: '.segment i',
    selectedSegment: '.segment.selected',
    selectedIcon: '.segment.selected i',
    divider: '.segment-divider',
  },
  properties: [
    {
      state: 'control bar',
      paints: {
        root: {
          backgroundColor: '--segmentedcontrol-bar-surface',
          borderTopColor: '--segmentedcontrol-bar-border',
          borderTopWidth: '--segmentedcontrol-bar-border-width',
          borderRadius: '--segmentedcontrol-bar-radius',
          columnGap: '--segmentedcontrol-bar-gap',
          paddingTop: '--segmentedcontrol-bar-padding',
        },
        divider: {
          backgroundColor: '--segmentedcontrol-divider-color',
          width: '--segmentedcontrol-divider-thickness',
          marginTop: '--segmentedcontrol-divider-inset',
        },
      },
    },
    {
      state: 'option base',
      paints: {
        segment: {
          paddingTop: '--segmentedcontrol-option-padding',
          columnGap: '--segmentedcontrol-option-gap',
          borderRadius: '--segmentedcontrol-selected-radius',
        },
        icon: { fontSize: '--segmentedcontrol-option-icon-size' },
      },
    },
    {
      state: 'default option',
      paints: {
        segment: {
          lineHeight: '--segmentedcontrol-option-text-line-height',
        },
      },
    },
    {
      state: 'selected option',
      paints: { selectedSegment: { lineHeight: '--segmentedcontrol-selected-text-line-height' } },
    },
    {
      state: 'disabled option',
      paints: { segment: { lineHeight: '--segmentedcontrol-disabled-text-line-height' } },
    },
    {
      state: 'hover option',
      paints: { segment: { lineHeight: '--segmentedcontrol-option-hover-text-line-height' } },
    },
    {
      setup: [{ kind: 'control', selector: '.preview-actions select', value: 'small' }],
      paints: {
        root: { borderRadius: '--segmentedcontrol-bar-small-radius', paddingTop: '--segmentedcontrol-bar-small-padding' },
        segment: {
          borderRadius: '--segmentedcontrol-selected-small-radius',
          paddingTop: '--segmentedcontrol-option-small-padding',
          columnGap: '--segmentedcontrol-option-small-gap',
          fontSize: '--segmentedcontrol-option-small-text-font-size',
          lineHeight: '--segmentedcontrol-option-small-text-line-height',
        },
        icon: { fontSize: '--segmentedcontrol-option-small-icon-size' },
        divider: { width: '--segmentedcontrol-small-divider-thickness', marginTop: '--segmentedcontrol-small-divider-inset' },
      },
    },
  ],
  states: [
    { state: 'control bar' },
    { state: 'option base' },
    {
      state: 'default option',
      paints: {
        icon: { color: '--segmentedcontrol-option-icon' },
        segment: {
          color: '--segmentedcontrol-option-text',
          fontFamily: '--segmentedcontrol-option-text-font-family',
          fontSize: '--segmentedcontrol-option-text-font-size',
          fontWeight: '--segmentedcontrol-option-text-font-weight',
        },
      },
    },
    {
      state: 'selected option',
      paints: {
        selectedSegment: {
          backgroundColor: '--segmentedcontrol-selected-surface',
          outlineColor: '--segmentedcontrol-selected-border',
          outlineWidth: '--segmentedcontrol-selected-border-width',
          color: '--segmentedcontrol-selected-text',
          fontFamily: '--segmentedcontrol-selected-text-font-family',
          fontSize: '--segmentedcontrol-selected-text-font-size',
          fontWeight: '--segmentedcontrol-selected-text-font-weight',
        },
        selectedIcon: { color: '--segmentedcontrol-selected-icon' },
      },
    },
    {
      state: 'hover option',
      paints: {
        segment: {
          backgroundColor: '--segmentedcontrol-option-hover-surface',
          color: '--segmentedcontrol-option-hover-text',
          fontFamily: '--segmentedcontrol-option-hover-text-font-family',
          fontSize: '--segmentedcontrol-option-hover-text-font-size',
          fontWeight: '--segmentedcontrol-option-hover-text-font-weight',
        },
        icon: { color: '--segmentedcontrol-option-hover-icon' },
      },
    },
    {
      state: 'disabled option',
      attributes: { segment: { disabled: '' } },
      paints: {
        segment: {
          backgroundColor: '--segmentedcontrol-disabled-surface',
          color: '--segmentedcontrol-disabled-text',
          fontFamily: '--segmentedcontrol-disabled-text-font-family',
          fontSize: '--segmentedcontrol-disabled-text-font-size',
          fontWeight: '--segmentedcontrol-disabled-text-font-weight',
        },
        icon: { color: '--segmentedcontrol-disabled-icon' },
      },
    },
  ],
  uncovered: {
    '--segmentedcontrol-hover-tint': 'consumed inside a background-image tint wash, never appearing verbatim in a computed style',
    '--segmentedcontrol-hover-tint-enabled': 'the gate for the tint wash above, same limitation',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        state: 'control bar',
        variable: '--segmentedcontrol-bar-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--segmentedcontrol-bar-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--segmentedcontrol-bar-border-width', '--segmentedcontrol-bar-radius', '--segmentedcontrol-option-padding'],
    unchanged: ['--segmentedcontrol-option-icon-size'],
    aliasedTo: {
      '--segmentedcontrol-bar-border-width': '--border-width-3',
      '--segmentedcontrol-bar-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--segmentedcontrol-bar-border-width' },
  },
  interaction: {
    part: 'segment',
    role: 'radio',
    cases: [
      {
        name: 'clicking a segment checks it',
        action: { kind: 'click', part: 'segment' },
        expect: { kind: 'attribute', part: 'segment', name: 'aria-checked', value: 'true' },
      },
      {
        name: 'a disabled control refuses focus',
        state: 'disabled option',
        action: { kind: 'click', part: 'segment' },
        expect: { kind: 'focused', part: 'segment', value: false },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [
      { part: 'root', fill: '--segmentedcontrol-bar-surface', stroke: '--segmentedcontrol-bar-border' },
      { part: 'selectedSegment', fill: '--segmentedcontrol-selected-surface', stroke: '--segmentedcontrol-selected-border' },
    ],
  },
};
