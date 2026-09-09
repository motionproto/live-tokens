import type { ComponentContract, PaintMap } from '../componentContract';

type Variant = 'info' | 'success' | 'warning' | 'danger';
const variants: Variant[] = ['info', 'success', 'warning', 'danger'];

function paintsFor(v: Variant): PaintMap {
  return {
    root: {
      borderTopColor: `--notification-${v}-border`,
      borderTopWidth: `--notification-${v}-border-width`,
      borderRadius: `--notification-${v}-radius`,
      color: `--notification-${v}-text`,
      fontFamily: `--notification-${v}-text-font-family`,
      fontSize: `--notification-${v}-text-font-size`,
      fontWeight: `--notification-${v}-text-font-weight`,
      lineHeight: `--notification-${v}-text-line-height`,
    },
    header: {
      backgroundColor: `--notification-${v}-surface`,
      paddingTop: `--notification-${v}-padding`,
    },
    icon: {
      color: `--notification-${v}-icon`,
      fontSize: `--notification-${v}-icon-size`,
    },
    title: {
      color: `--notification-${v}-title`,
      fontFamily: `--notification-${v}-title-font-family`,
      fontSize: `--notification-${v}-title-font-size`,
      fontWeight: `--notification-${v}-title-font-weight`,
      lineHeight: `--notification-${v}-title-line-height`,
    },
    actionBackdrop: { backgroundColor: `--notification-${v}-action-surface` },
  };
}

export const notificationContract: ComponentContract = {
  id: 'notification',
  origin: 'system',
  view: {
    variant: 'Info',
    setup: [{ kind: 'control', selector: '.toolbar-check:has-text("Header button") input', check: true }],
  },
  root: 'root',
  parts: {
    root: '.notification',
    header: '.notification-header',
    icon: '.notification-header i',
    title: '.notification-title',
    actionBackdrop: '.action-button-backdrop',
    actionButton: '.action-button-backdrop button',
  },
  properties: variants.map((v) => ({ variant: v.charAt(0).toUpperCase() + v.slice(1), paints: paintsFor(v) })),
  states: [{ state: 'base' }, { state: 'colors' }],
  persistence: {
    cases: [
      {
        shape: 'token',
        variable: '--notification-info-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--notification-info-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--notification-info-border-width', '--notification-info-radius', '--notification-info-padding'],
    unchanged: ['--notification-info-icon-size'],
    aliasedTo: {
      '--notification-info-border-width': '--border-width-3',
      '--notification-info-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--notification-info-border-width' },
  },
  interaction: {
    part: 'actionButton',
    role: 'button',
    cases: [
      {
        name: 'clicking the header action focuses it',
        action: { kind: 'click', part: 'actionButton' },
        expect: { kind: 'focused', part: 'actionButton', value: true },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [
      { part: 'root', stroke: '--notification-info-border' },
      { part: 'header', fill: '--notification-info-surface' },
    ],
  },
};
