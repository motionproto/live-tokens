import type { ComponentContract } from '../componentContract';

export const dialogContract: ComponentContract = {
  id: 'dialog',
  origin: 'system',
  root: 'root',
  parts: {
    backdrop: '.dialog-backdrop',
    root: '.dialog',
    header: '.dialog-header',
    title: '.dialog-title',
    closeButton: '.dialog-close',
    body: '.dialog-body',
    footer: '.dialog-footer',
    confirmButton: '.dialog-footer-buttons button:last-of-type',
    cancelButton: '.dialog-footer-buttons button:first-of-type',
  },
  properties: [
    {
      paints: {
        backdrop: { backgroundColor: '--dialog-scrim-surface' },
        root: {
          backgroundColor: '--dialog-surface',
          borderTopColor: '--dialog-border',
          borderTopWidth: '--dialog-border-width',
          borderRadius: '--dialog-radius',
          boxShadow: '--dialog-shadow',
        },
        header: {
          backgroundColor: '--dialog-header-surface',
          borderBottomColor: '--dialog-header-divider',
          borderBottomWidth: '--dialog-header-divider-width',
          paddingTop: '--dialog-header-padding',
        },
        title: {
          color: '--dialog-title',
          fontFamily: '--dialog-title-font-family',
          fontSize: '--dialog-title-font-size',
          fontWeight: '--dialog-title-font-weight',
          lineHeight: '--dialog-title-line-height',
        },
        closeButton: {
          color: '--dialog-close-icon',
          fontSize: '--dialog-close-icon-size',
        },
        body: {
          paddingTop: '--dialog-body-padding',
          color: '--dialog-body',
          fontFamily: '--dialog-body-font-family',
          fontSize: '--dialog-body-font-size',
          fontWeight: '--dialog-body-font-weight',
          lineHeight: '--dialog-body-line-height',
        },
        footer: {
          borderTopColor: '--dialog-footer-divider',
          borderTopWidth: '--dialog-footer-divider-width',
          paddingTop: '--dialog-footer-padding',
        },
      },
    },
  ],
  states: [
    { state: 'scrim' },
    { state: 'dialog' },
    { state: 'header' },
    { state: 'body' },
    { state: 'footer' },
  ],
  uncovered: {
    '--dialog-blur': 'consumed via backdrop-filter: blur(), which no probe covers',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        state: 'dialog',
        variable: '--dialog-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
      {
        shape: 'config',
        state: 'footer',
        control: '.button-variant-row:has(.property-label:text-is("right button")) select',
        configKey: '--dialog-confirm-variant',
        observe: { part: 'confirmButton', css: 'backgroundColor' },
      },
      {
        shape: 'config',
        state: 'footer',
        control: '.button-variant-row:has(.property-label:text-is("left button")) select',
        configKey: '--dialog-cancel-variant',
        observe: { part: 'cancelButton', css: 'backgroundColor' },
      },
    ],
    resetVariable: '--dialog-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--dialog-border-width', '--dialog-radius', '--dialog-header-padding', '--dialog-footer-padding'],
    unchanged: ['--dialog-close-icon-size', '--dialog-title-font-size'],
    aliasedTo: {
      '--dialog-border-width': '--border-width-4',
      '--dialog-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--dialog-border-width' },
  },
  interaction: {
    part: 'closeButton',
    role: 'button',
    cases: [
      {
        name: 'clicking the close icon focuses it',
        action: { kind: 'click', part: 'closeButton' },
        expect: { kind: 'focused', part: 'closeButton', value: true },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [
      { part: 'root', fill: '--dialog-surface', stroke: '--dialog-border' },
      { part: 'header', fill: '--dialog-header-surface' },
    ],
  },
};
