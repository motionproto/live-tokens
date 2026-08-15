import { describe, expect, it } from 'vitest';
import type { ThemeMeta, ColorsAndTypeMeta } from './themeTypes';
import { buildLoadRows, colorsOnlyIsForced, isColorsOnly, loadRowId } from './loadRows';

const look = (fileName: string, isProtected = false): ThemeMeta => ({
  name: fileName,
  fileName,
  updatedAt: '',
  isActive: false,
  isProtected,
});

const layer = (fileName: string, isPackage: boolean): ColorsAndTypeMeta => ({
  name: fileName,
  fileName,
  updatedAt: '',
  isActive: false,
  isPackage,
});

describe('buildLoadRows', () => {
  it('lists every look, then the layer files a local copy backs', () => {
    const rows = buildLoadRows(
      [look('default', true), look('ocean')],
      [layer('default', true), layer('ocean', true), layer('my-colors', false)],
    );
    expect(rows.map((r) => r.fileName)).toEqual(['look:default', 'look:ocean', 'layer:my-colors']);
  });

  it('keeps a local copy of a preset layer, which holds the user edits', () => {
    const rows = buildLoadRows([look('ocean')], [layer('ocean', false), layer('sunset', true)]);
    expect(rows.map((r) => r.fileName)).toEqual(['look:ocean', 'layer:ocean']);
  });

  it('puts the protected default look first', () => {
    const rows = buildLoadRows([look('autumn'), look('default', true), look('ocean')], []);
    expect(rows.map((r) => r.fileName)).toEqual(['look:default', 'look:autumn', 'look:ocean']);
  });

  it('carries the protected flag on looks and never on layers', () => {
    const rows = buildLoadRows([look('default', true)], [layer('default', false)]);
    expect(rows.map((r) => r.isProtected)).toEqual([true, false]);
  });

  it('keeps the slug alongside the namespaced id', () => {
    const [row] = buildLoadRows([look('ocean')], []);
    expect(row.slug).toBe('ocean');
    expect(row.fileName).toBe(loadRowId('look', 'ocean'));
  });
});

describe('isColorsOnly', () => {
  const lookRow = buildLoadRows([look('ocean')], [])[0];
  const layerRow = buildLoadRows([], [layer('my-colors', false)])[0];

  it('follows the toggle for a look', () => {
    expect(isColorsOnly(lookRow, false)).toBe(false);
    expect(isColorsOnly(lookRow, true)).toBe(true);
  });

  it('is always on for a layer file', () => {
    expect(isColorsOnly(layerRow, false)).toBe(true);
    expect(colorsOnlyIsForced(layerRow)).toBe(true);
    expect(colorsOnlyIsForced(lookRow)).toBe(false);
  });

  it('keeps the user setting with nothing picked', () => {
    expect(isColorsOnly(null, true)).toBe(true);
    expect(colorsOnlyIsForced(null)).toBe(false);
  });
});
