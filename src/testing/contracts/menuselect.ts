import type { ComponentContract, PaintMap } from '../componentContract';

/**
 * `full` adds `lineHeight`. `assertPaintsFromToken` (properties) drives a
 * controlled pixel probe, so a unitless line-height round-trips fine there;
 * `assertPaintMap` (states) reads the token's real, already-resolved value
 * through `normalize()`, which cannot recompute a unitless multiplier outside
 * the item's own font-size context. States skip it; properties cover it.
 */
function itemTextPaints(s: string, full: boolean): PaintMap[string] {
  const paints: PaintMap[string] = {
    color: `--menuselect-${s}-text`,
    fontFamily: `--menuselect-${s}-text-font-family`,
    fontSize: `--menuselect-${s}-text-font-size`,
    fontWeight: `--menuselect-${s}-text-font-weight`,
  };
  if (full) paints.lineHeight = `--menuselect-${s}-text-line-height`;
  return paints;
}

export const menuSelectContract: ComponentContract = {
  id: 'menuselect',
  origin: 'system',
  view: { state: 'selected item' },
  root: 'root',
  parts: {
    root: '.menuselect',
    item: '.menuselect-item',
    icon: '.menuselect-item .menuselect-icon',
    label: '.menuselect-item .menuselect-label',
    selectedItem: '.menuselect-item.selected',
    selectedIcon: '.menuselect-item.selected .menuselect-icon',
    indicator: '.menuselect-indicator',
    disabledItem: '.menuselect-item:disabled',
    disabledIcon: '.menuselect-item:disabled .menuselect-icon',
  },
  properties: [
    {
      state: 'menu',
      paints: {
        root: {
          backgroundColor: '--menuselect-menu-surface',
          borderTopColor: '--menuselect-menu-border',
          borderTopWidth: '--menuselect-menu-border-width',
          borderRadius: '--menuselect-menu-radius',
          boxShadow: '--menuselect-menu-shadow',
          rowGap: '--menuselect-menu-gap',
          paddingTop: '--menuselect-menu-padding',
        },
        item: {
          borderRadius: '--menuselect-item-radius',
          paddingTop: '--menuselect-item-padding',
        },
      },
    },
    { state: 'default item', paints: { item: itemTextPaints('default', true) } },
    { state: 'hover item', paints: { item: itemTextPaints('hover', true) } },
    { state: 'selected item', paints: { selectedItem: itemTextPaints('selected', true) } },
    { state: 'disabled item', paints: { disabledItem: itemTextPaints('disabled', true) } },
  ],
  states: [
    { state: 'menu' },
    {
      state: 'default item',
      paints: {
        item: { backgroundColor: '--menuselect-default-surface', ...itemTextPaints('default', false) },
        icon: { color: '--menuselect-default-icon', fontSize: '--menuselect-default-icon-size' },
      },
    },
    {
      state: 'hover item',
      paints: {
        item: { backgroundColor: '--menuselect-hover-surface', ...itemTextPaints('hover', false) },
        icon: { color: '--menuselect-hover-icon', fontSize: '--menuselect-hover-icon-size' },
      },
    },
    {
      state: 'selected item',
      paints: {
        selectedItem: { backgroundColor: '--menuselect-selected-surface', ...itemTextPaints('selected', false) },
        selectedIcon: { color: '--menuselect-selected-icon', fontSize: '--menuselect-selected-icon-size' },
        indicator: { color: '--menuselect-selected-indicator' },
      },
    },
    {
      state: 'disabled item',
      attributes: { disabledItem: { disabled: '' } },
      paints: {
        disabledItem: { backgroundColor: '--menuselect-disabled-surface', ...itemTextPaints('disabled', false) },
        disabledIcon: { color: '--menuselect-disabled-icon', fontSize: '--menuselect-disabled-icon-size' },
      },
    },
  ],
  uncovered: {
    '--menuselect-hover-tint': 'consumed inside a background-image tint wash, never appearing verbatim in a computed style',
    '--menuselect-hover-tint-enabled': 'the gate for the tint wash above, same limitation',
  },
  persistence: {
    cases: [
      {
        shape: 'token',
        state: 'menu',
        variable: '--menuselect-menu-border-width',
        observe: { part: 'root', css: 'borderTopWidth' },
      },
    ],
    resetVariable: '--menuselect-menu-border-width',
  },
  theme: {
    theme: 'halloween',
    changed: ['--menuselect-menu-border-width', '--menuselect-menu-radius', '--menuselect-item-padding'],
    unchanged: ['--menuselect-default-icon-size', '--menuselect-default-text-font-size'],
    aliasedTo: {
      '--menuselect-menu-border-width': '--border-width-3',
      '--menuselect-menu-radius': '--radius-none',
    },
    observe: { part: 'root', css: 'borderTopWidth', variable: '--menuselect-menu-border-width' },
  },
  interaction: {
    part: 'item',
    role: 'option',
    cases: [
      {
        name: 'clicking an item selects it',
        action: { kind: 'click', part: 'item' },
        expect: { kind: 'attribute', part: 'item', name: 'aria-selected', value: 'true' },
      },
    ],
  },
  sketch: {
    style: 'pencil',
    parts: [{ part: 'root', fill: '--menuselect-menu-surface', stroke: '--menuselect-menu-border' }],
  },
};
