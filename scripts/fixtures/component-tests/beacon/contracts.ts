// The gate's fixture contract, named by live-tokens.testing.ts's
// contractsModule. Mirrors the shipped toggleContract's shape (same parts,
// states, and interaction cases) since Beacon is Toggle's fixture twin.
import type { ComponentContract, PaintMap } from '@motion-proto/live-tokens/testing';

const defaultPaints: PaintMap = {
  root: { columnGap: '--beacon-gap' },
  track: {
    backgroundColor: '--beacon-track-surface',
    borderTopColor: '--beacon-track-border',
    borderTopWidth: '--beacon-track-border-width',
    borderRadius: '--beacon-track-radius',
  },
  thumb: {
    backgroundColor: '--beacon-thumb-surface',
    borderTopColor: '--beacon-thumb-border',
    width: '--beacon-thumb-size',
    left: '--beacon-track-padding',
  },
  label: {
    color: '--beacon-label-text',
    fontFamily: '--beacon-label-font-family',
    fontSize: '--beacon-label-font-size',
    fontWeight: '--beacon-label-font-weight',
  },
};

export const beaconContract: ComponentContract = {
  id: 'beacon',
  origin: 'custom',
  root: 'root',
  parts: {
    root: '.beacon',
    track: '.beacon-track',
    thumb: '.beacon-thumb',
    label: '.beacon-label',
  },
  properties: [{ paints: defaultPaints }],
  states: [
    { state: 'default', attributes: { root: { 'aria-checked': 'false' } } },
    {
      state: 'hover',
      forceClass: 'force-hover',
      paints: {
        track: { backgroundColor: '--beacon-hover-track-surface' },
        thumb: { backgroundColor: '--beacon-hover-thumb-surface' },
      },
    },
    {
      state: 'on',
      attributes: { root: { 'aria-checked': 'true' } },
      paints: {
        track: { backgroundColor: '--beacon-on-track-surface', borderTopColor: '--beacon-on-track-border' },
        thumb: { backgroundColor: '--beacon-on-thumb-surface', borderTopColor: '--beacon-on-thumb-border' },
      },
    },
    {
      state: 'on hover',
      forceClass: 'force-hover',
      attributes: { root: { 'aria-checked': 'true' } },
      paints: {
        track: { backgroundColor: '--beacon-on-hover-track-surface' },
        thumb: { backgroundColor: '--beacon-on-hover-thumb-surface' },
      },
    },
    {
      state: 'disabled',
      attributes: { root: { disabled: '' } },
      paints: {
        track: { backgroundColor: '--beacon-disabled-track-surface' },
        thumb: { backgroundColor: '--beacon-disabled-thumb-surface' },
        label: { color: '--beacon-disabled-label-text' },
      },
    },
  ],
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--beacon-track-border-width',
        observe: { part: 'track', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--beacon-track-border-width',
  },
  theme: {
    theme: 'halloween',
    // Beacon carries no per-theme componentConfig override (only shipped
    // components do), so a theme can only move a value the *design token
    // itself* resolves differently under, never the alias name. Surface
    // colors are palette-derived; the geometry scale steps are fixed
    // constants (componentContract.ts's own guidance on `unchanged`).
    changed: ['--beacon-track-surface'],
    unchanged: ['--beacon-thumb-size', '--beacon-gap'],
    aliasedTo: { '--beacon-track-surface': '--surface-neutral' },
    observe: { part: 'track', css: 'backgroundColor', variable: '--beacon-track-surface' },
  },
  interaction: {
    part: 'root',
    role: 'switch',
    cases: [
      {
        name: 'clicking a beacon focuses it',
        action: { kind: 'click', part: 'root' },
        expect: { kind: 'focused', part: 'root', value: true },
      },
      {
        name: 'a disabled beacon refuses focus',
        state: 'disabled',
        action: { kind: 'click', part: 'root' },
        expect: { kind: 'focused', part: 'root', value: false },
      },
    ],
  },
  // Sketch mode's PART_SPECS (src/editor/core/sketch/sketchLayer.ts) is a
  // fixed, shipped list of selectors; a runtime-registered custom component
  // has no entry in it and so is never drawn. Same reason the shipped
  // imagelightbox/radiobutton/inlineeditactions contracts mark this
  // inapplicable.
  sketch: { applicable: false, reason: 'Beacon carries no entry in sketchLayer.ts\'s PART_SPECS; custom components are not Sketch-paintable today.' },
};

export default [beaconContract];
