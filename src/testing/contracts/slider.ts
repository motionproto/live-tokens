import type { ComponentContract } from '../componentContract';

/**
 * The single-thumb variant. Its rows are linked to the range variant's, so an
 * edit here moves both; the range variant's own locators differ only in the
 * thumb count.
 */
export const sliderContract: ComponentContract = {
  id: 'slider',
  origin: 'system',
  view: { variant: 'Single' },
  root: 'root',
  parts: {
    root: '.slider',
    track: '.slider-track',
    fill: '.slider-fill',
    thumb: '.cap',
    input: 'input.thumb',
    label: '.slider-label > span:not(.slider-value)',
    value: '.slider-value',
  },
  properties: [
    {
      paints: {
        root: { rowGap: '--slider-label-gap' },
        track: {
          backgroundColor: '--slider-single-track-surface',
          borderTopColor: '--slider-single-track-border',
          borderTopWidth: '--slider-single-track-border-width',
          borderRadius: '--slider-single-track-radius',
          height: '--slider-single-track-height',
        },
        fill: { backgroundColor: '--slider-single-fill' },
        thumb: {
          backgroundColor: '--slider-single-thumb-surface',
          borderTopColor: '--slider-single-thumb-border',
          borderTopWidth: '--slider-single-thumb-border-width',
          borderRadius: '--slider-single-thumb-radius',
          width: '--slider-single-thumb-size',
          boxShadow: '--slider-single-thumb-shadow',
        },
        label: {
          color: '--slider-label',
          fontFamily: '--slider-label-font-family',
          fontSize: '--slider-label-font-size',
          fontWeight: '--slider-label-font-weight',
          lineHeight: '--slider-label-line-height',
        },
        value: {
          color: '--slider-value',
          fontFamily: '--slider-value-font-family',
          fontSize: '--slider-value-font-size',
          fontWeight: '--slider-value-font-weight',
          lineHeight: '--slider-value-line-height',
        },
      },
    },
  ],
  alias: {
    variables: [
      '--slider-label-gap',
      '--slider-label',
      '--slider-value',
      '--slider-single-track-surface',
      '--slider-single-track-border',
      '--slider-single-track-border-width',
      '--slider-single-track-height',
      '--slider-single-track-radius',
      '--slider-single-fill',
      '--slider-single-thumb-surface',
      '--slider-single-thumb-border',
      '--slider-single-thumb-size',
      '--slider-single-thumb-shadow',
      '--slider-single-hover-thumb-surface',
      '--slider-single-hover-thumb-border',
      '--slider-single-disabled-track-surface',
      '--slider-single-disabled-fill',
      '--slider-single-disabled-thumb-surface',
    ],
  },
  states: [
    {
      state: 'default',
      attributes: { input: { disabled: null } },
      paints: { thumb: { backgroundColor: '--slider-single-thumb-surface' } },
    },
    {
      state: 'hover',
      forceClass: 'force-hover',
      paints: {
        thumb: {
          backgroundColor: '--slider-single-hover-thumb-surface',
          borderTopColor: '--slider-single-hover-thumb-border',
        },
      },
    },
    {
      state: 'disabled',
      attributes: { input: { disabled: '' } },
      paints: {
        track: { backgroundColor: '--slider-single-disabled-track-surface' },
        fill: { backgroundColor: '--slider-single-disabled-fill' },
        thumb: { backgroundColor: '--slider-single-disabled-thumb-surface' },
      },
    },
  ],
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--slider-single-track-surface',
        observe: { part: 'track', css: 'backgroundColor' },
      },
      {
        shape: 'opacity',
        variable: '--slider-single-fill',
        observe: { part: 'fill', css: 'backgroundColor' },
      },
    ],
    resetVariable: '--slider-single-track-surface',
  },
  theme: {
    theme: 'ocean',
    changed: [
      '--slider-single-track-surface',
      '--slider-single-fill',
      '--slider-single-thumb-surface',
    ],
    unchanged: [
      '--slider-single-track-height',
      '--slider-single-track-radius',
      '--slider-single-thumb-size',
      '--slider-single-track-border-width',
    ],
    aliasedTo: {
      '--slider-single-track-surface': '--surface-neutral-lowest',
      '--slider-single-fill': '--surface-brand-high',
    },
    observe: { part: 'track', css: 'backgroundColor', variable: '--slider-single-track-surface' },
  },
  interaction: {
    part: 'input',
    role: 'slider',
    cases: [
      {
        name: 'arrow right raises the value',
        action: { kind: 'press', part: 'input', key: 'ArrowRight' },
        expect: { kind: 'valueMoves', part: 'input', direction: 'up' },
      },
      {
        name: 'arrow left lowers the value',
        action: { kind: 'press', part: 'input', key: 'ArrowLeft' },
        expect: { kind: 'valueMoves', part: 'input', direction: 'down' },
      },
      {
        name: 'dragging the thumb along the track raises the value',
        action: { kind: 'dragTo', part: 'thumb', along: 'track', fraction: 0.85 },
        expect: { kind: 'valueMoves', part: 'input', direction: 'up' },
      },
      {
        name: 'a disabled slider ignores the arrow keys',
        state: 'disabled',
        action: { kind: 'press', part: 'input', key: 'ArrowRight' },
        expect: { kind: 'valueHolds', part: 'input' },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [
      {
        part: 'track',
        fill: '--slider-single-track-surface',
        stroke: '--slider-single-track-border',
      },
      { part: 'fill', fill: '--slider-single-fill' },
    ],
  },
};
