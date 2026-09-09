import type { ComponentContract, PaintMap } from '../componentContract';

const defaultPaints: PaintMap = {
  root: { columnGap: '--toggle-gap' },
  track: {
    backgroundColor: '--toggle-track-surface',
    borderTopColor: '--toggle-track-border',
    borderTopWidth: '--toggle-track-border-width',
    borderRadius: '--toggle-track-radius',
  },
  thumb: {
    backgroundColor: '--toggle-thumb-surface',
    borderTopColor: '--toggle-thumb-border',
    width: '--toggle-thumb-size',
    left: '--toggle-track-padding',
  },
  label: {
    color: '--toggle-label-text',
    fontFamily: '--toggle-label-font-family',
    fontSize: '--toggle-label-font-size',
    fontWeight: '--toggle-label-font-weight',
  },
};

export const toggleContract: ComponentContract = {
  id: 'toggle',
  origin: 'system',
  root: 'root',
  parts: {
    root: '.toggle',
    track: '.track',
    thumb: '.thumb',
    label: '.label',
  },
  properties: [{ paints: defaultPaints }],
  states: [
    {
      state: 'default',
      attributes: { root: { 'aria-checked': 'false' } },
    },
    {
      state: 'hover',
      forceClass: 'force-hover',
      paints: {
        track: { backgroundColor: '--toggle-hover-track-surface' },
        thumb: { backgroundColor: '--toggle-hover-thumb-surface' },
      },
    },
    {
      state: 'on',
      attributes: { root: { 'aria-checked': 'true' } },
      paints: {
        track: { backgroundColor: '--toggle-on-track-surface', borderTopColor: '--toggle-on-track-border' },
        thumb: { backgroundColor: '--toggle-on-thumb-surface', borderTopColor: '--toggle-on-thumb-border' },
      },
    },
    {
      state: 'on hover',
      forceClass: 'force-hover',
      attributes: { root: { 'aria-checked': 'true' } },
      paints: {
        track: { backgroundColor: '--toggle-on-hover-track-surface' },
        thumb: { backgroundColor: '--toggle-on-hover-thumb-surface' },
      },
    },
    {
      state: 'disabled',
      attributes: { root: { disabled: '' } },
      paints: {
        track: { backgroundColor: '--toggle-disabled-track-surface' },
        thumb: { backgroundColor: '--toggle-disabled-thumb-surface' },
        label: { color: '--toggle-disabled-label-text' },
      },
    },
  ],
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--toggle-track-border-width',
        observe: { part: 'track', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--toggle-track-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--toggle-track-border-width', '--toggle-track-radius'],
    unchanged: ['--toggle-thumb-size', '--toggle-gap'],
    aliasedTo: {
      '--toggle-track-border-width': '--border-width-3',
      '--toggle-track-radius': '--radius-none',
    },
    observe: { part: 'track', css: 'borderTopWidth', variable: '--toggle-track-border-width' },
  },
  interaction: {
    part: 'root',
    role: 'switch',
    cases: [
      {
        name: 'clicking a toggle focuses it',
        action: { kind: 'click', part: 'root' },
        expect: { kind: 'focused', part: 'root', value: true },
      },
      {
        name: 'a disabled toggle refuses focus',
        state: 'disabled',
        action: { kind: 'click', part: 'root' },
        expect: { kind: 'focused', part: 'root', value: false },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'track', fill: '--toggle-track-surface', stroke: '--toggle-track-border' }],
  },
};
