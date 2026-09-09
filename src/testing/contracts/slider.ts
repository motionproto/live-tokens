import type { ComponentContract, PaintMap, StateExpectation } from '../componentContract';

type Variant = 'single' | 'range';

function variantPaints(v: Variant): PaintMap {
  return {
    track: {
      backgroundColor: `--slider-${v}-track-surface`,
      borderTopColor: `--slider-${v}-track-border`,
      borderTopWidth: `--slider-${v}-track-border-width`,
      borderRadius: `--slider-${v}-track-radius`,
      height: `--slider-${v}-track-height`,
    },
    fill: { backgroundColor: `--slider-${v}-fill` },
    thumb: {
      backgroundColor: `--slider-${v}-thumb-surface`,
      borderTopColor: `--slider-${v}-thumb-border`,
      borderTopWidth: `--slider-${v}-thumb-border-width`,
      borderRadius: `--slider-${v}-thumb-radius`,
      width: `--slider-${v}-thumb-size`,
      boxShadow: `--slider-${v}-thumb-shadow`,
    },
  };
}

function variantStates(v: Variant, variant: string): StateExpectation[] {
  return [
    {
      variant,
      state: 'default',
      attributes: { input: { disabled: null } },
      paints: { thumb: { backgroundColor: `--slider-${v}-thumb-surface` } },
    },
    {
      variant,
      state: 'hover',
      forceClass: 'force-hover',
      paints: {
        thumb: {
          backgroundColor: `--slider-${v}-hover-thumb-surface`,
          borderTopColor: `--slider-${v}-hover-thumb-border`,
        },
      },
    },
    {
      variant,
      state: 'disabled',
      attributes: { input: { disabled: '' } },
      paints: {
        track: { backgroundColor: `--slider-${v}-disabled-track-surface` },
        fill: { backgroundColor: `--slider-${v}-disabled-fill` },
        thumb: {
          backgroundColor: `--slider-${v}-disabled-thumb-surface`,
          borderTopColor: `--slider-${v}-disabled-thumb-border`,
        },
      },
    },
  ];
}

/**
 * Both variants. Their rows are linked by default, so an edit to one moves the
 * other until a user unlinks them; the locators are the same and only the
 * token prefix differs.
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
      variant: 'Single',
      paints: {
        ...variantPaints('single'),
        root: { rowGap: '--slider-label-gap' },
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
    { variant: 'Range', paints: variantPaints('range') },
  ],
  states: [
    ...variantStates('single', 'Single'),
    ...variantStates('range', 'Range'),
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
        name: 'Home takes the value to the floor',
        action: { kind: 'press', part: 'input', key: 'Home' },
        expect: { kind: 'valueBecomes', part: 'input', value: '0' },
      },
      {
        name: 'dragging the thumb along the track raises the value',
        action: { kind: 'dragTo', part: 'thumb', along: 'track', fraction: 0.85 },
        expect: { kind: 'valueMoves', part: 'input', direction: 'up' },
      },
      {
        name: 'taking hold of the thumb focuses the slider',
        action: { kind: 'dragTo', part: 'thumb', along: 'track', fraction: 0.5 },
        expect: { kind: 'focused', part: 'input', value: true },
      },
      {
        name: 'a disabled slider ignores the arrow keys',
        state: 'disabled',
        action: { kind: 'press', part: 'input', key: 'ArrowRight' },
        expect: { kind: 'valueHolds', part: 'input' },
      },
      {
        name: 'a disabled slider refuses focus',
        state: 'disabled',
        action: { kind: 'dragTo', part: 'thumb', along: 'track', fraction: 0.5 },
        expect: { kind: 'focused', part: 'input', value: false },
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
