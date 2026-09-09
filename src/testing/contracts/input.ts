import type { ComponentContract, SetupStep } from '../componentContract';

// The contract-level setup checks "Error" so `errorMsg` resolves at the
// baseline view. `.invalid` beats `.force-focus` on outline color/width (the
// error state wins the combination), so any check of the plain focused
// outline has to undo it explicitly — `setup` replaces, it does not merge.
const noError: SetupStep[] = [
  { kind: 'control', selector: '.canvas-toolbar-select', value: 'password' },
  { kind: 'control', selector: '.toolbar-check:has-text("Error") input', check: false },
];

export const inputContract: ComponentContract = {
  id: 'input',
  origin: 'system',
  view: {
    setup: [
      { kind: 'control', selector: '.canvas-toolbar-select', value: 'password' },
      { kind: 'control', selector: '.toolbar-check:has-text("Error") input', check: true },
    ],
  },
  root: 'root',
  parts: {
    root: '.input-field',
    field: '.input-control',
    label: '.input-label',
    icon: '.input-icon',
    toggleButton: '.input-icon-button',
    hint: '.input-hint',
    errorMsg: '.input-error',
  },
  properties: [
    {
      paints: {
        root: { rowGap: '--input-gap' },
        field: {
          borderRadius: '--input-radius',
          borderTopWidth: '--input-border-width',
          paddingTop: '--input-padding',
          backgroundColor: '--input-default-surface',
          borderTopColor: '--input-default-border',
          color: '--input-default-text',
          fontFamily: '--input-default-text-font-family',
          fontSize: '--input-default-text-font-size',
          fontWeight: '--input-default-text-font-weight',
          lineHeight: '--input-default-text-line-height',
        },
        icon: {
          color: '--input-default-icon',
          fontSize: '--input-default-icon-size',
        },
        label: {
          color: '--input-label',
          fontFamily: '--input-label-font-family',
          fontSize: '--input-label-font-size',
          fontWeight: '--input-label-font-weight',
          lineHeight: '--input-label-line-height',
        },
        hint: {
          color: '--input-hint',
          fontFamily: '--input-hint-font-family',
          fontSize: '--input-hint-font-size',
          fontWeight: '--input-hint-font-weight',
          lineHeight: '--input-hint-line-height',
        },
      },
    },
    // `assertPaintsFromToken` (here) drives a controlled pixel probe, so a
    // unitless line-height round-trips fine. `assertPaintMap` (states, below)
    // reads the real, already-resolved value through `normalize()`, which
    // cannot recompute a unitless multiplier outside the field's own
    // font-size context, so these three stay out of `states`.
    {
      state: 'focused',
      setup: noError,
      paints: { field: { lineHeight: '--input-focused-text-line-height' } },
    },
    {
      state: 'disabled',
      setup: noError,
      paints: { field: { lineHeight: '--input-disabled-text-line-height' } },
    },
    {
      state: 'error',
      paints: { errorMsg: { lineHeight: '--input-error-line-height' } },
    },
  ],
  states: [
    { state: 'field' },
    { state: 'default' },
    {
      state: 'focused',
      forceClass: 'force-focus',
      setup: noError,
      paints: {
        field: {
          backgroundColor: '--input-focused-surface',
          outlineColor: '--input-focused-border',
          outlineWidth: '--input-focused-border-width',
          color: '--input-focused-text',
          fontFamily: '--input-focused-text-font-family',
          fontSize: '--input-focused-text-font-size',
          fontWeight: '--input-focused-text-font-weight',
        },
        icon: { color: '--input-focused-icon', fontSize: '--input-focused-icon-size' },
      },
    },
    {
      state: 'disabled',
      attributes: { field: { disabled: '' } },
      paints: {
        field: {
          backgroundColor: '--input-disabled-surface',
          borderTopColor: '--input-disabled-border',
          color: '--input-disabled-text',
          fontFamily: '--input-disabled-text-font-family',
          fontSize: '--input-disabled-text-font-size',
          fontWeight: '--input-disabled-text-font-weight',
        },
        icon: { color: '--input-disabled-icon', fontSize: '--input-disabled-icon-size' },
      },
    },
    { state: 'label' },
    { state: 'hint' },
    {
      state: 'error',
      paints: {
        field: { outlineColor: '--input-error-border', outlineWidth: '--input-error-border-width' },
        errorMsg: {
          color: '--input-error',
          fontFamily: '--input-error-font-family',
          fontSize: '--input-error-font-size',
          fontWeight: '--input-error-font-weight',
        },
      },
    },
  ],
  uncovered: {
    '--input-default-placeholder': 'painted on the ::placeholder pseudo-element, which getComputedStyle does not reliably expose for probing',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--input-border-width',
        observe: { part: 'field', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--input-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--input-border-width', '--input-radius', '--input-padding'],
    unchanged: ['--input-label-font-size', '--input-default-icon-size'],
    aliasedTo: {
      '--input-border-width': '--border-width-3',
      '--input-radius': '--radius-none',
    },
    observe: { part: 'field', css: 'borderTopWidth', variable: '--input-border-width' },
  },
  interaction: {
    part: 'field',
    role: 'textbox',
    cases: [
      {
        name: 'typing writes into the field',
        action: { kind: 'type', part: 'field', text: 'probe' },
        expect: { kind: 'valueChanges', part: 'field' },
      },
      {
        name: 'clicking the reveal toggle presses it',
        action: { kind: 'click', part: 'toggleButton' },
        expect: { kind: 'attribute', part: 'toggleButton', name: 'aria-pressed', value: 'true' },
      },
      {
        name: 'a disabled field refuses focus',
        state: 'disabled',
        action: { kind: 'click', part: 'field' },
        expect: { kind: 'focused', part: 'field', value: false },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'field', fill: '--input-default-surface', stroke: '--input-default-border' }],
  },
};
