import type { ComponentContract, PaintMap } from '../componentContract';

type Variant = 'info' | 'success' | 'warning' | 'danger';
const variants: Variant[] = ['info', 'success', 'warning', 'danger'];

function paintsFor(v: Variant): PaintMap {
  return {
    root: {
      backgroundColor: `--callout-${v}-surface`,
      borderTopColor: `--callout-${v}-border`,
      borderTopWidth: `--callout-${v}-border-width`,
      borderLeftWidth: `--callout-${v}-accent-width`,
      borderRadius: `--callout-${v}-radius`,
      paddingTop: `--callout-${v}-padding`,
    },
    label: {
      color: `--callout-${v}-label`,
      fontFamily: `--callout-${v}-label-font-family`,
      fontSize: `--callout-${v}-label-font-size`,
      fontWeight: `--callout-${v}-label-font-weight`,
      lineHeight: `--callout-${v}-label-line-height`,
    },
    message: {
      color: `--callout-${v}-text`,
      fontFamily: `--callout-${v}-text-font-family`,
      fontSize: `--callout-${v}-text-font-size`,
      fontWeight: `--callout-${v}-text-font-weight`,
      lineHeight: `--callout-${v}-text-line-height`,
    },
  };
}

export const calloutContract: ComponentContract = {
  id: 'callout',
  origin: 'system',
  view: { variant: 'Info' },
  root: 'root',
  parts: {
    root: '.callout',
    label: '.callout-label',
    message: '.callout-message',
  },
  properties: variants.map((v) => ({ variant: v.charAt(0).toUpperCase() + v.slice(1), paints: paintsFor(v) })),
  states: {
    applicable: false,
    reason: 'each variant is one full preset with one state, so the editor renders no state strip',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--callout-info-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--callout-info-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--callout-info-border-width', '--callout-info-radius', '--callout-info-padding'],
    unchanged: ['--callout-info-label-font-size', '--callout-info-text-font-size'],
    aliasedTo: {
      '--callout-info-border-width': '--border-width-3',
      '--callout-info-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--callout-info-border-width' },
  },
  interaction: {
    applicable: false,
    reason: 'a callout is a static box with no interactive role',
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'root', fill: '--callout-info-surface', stroke: '--callout-info-border' }],
  },
};
