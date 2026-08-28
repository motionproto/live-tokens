import { describe, expect, it } from 'vitest';
import type { ThemeMeta, ColorsAndTypeMeta } from './themeTypes';
import { buildLoadRows, colorsOnlyIsForced, isColorsOnly, loadRowId } from './loadRows';

const theme = (fileName: string, isProtected = false): ThemeMeta => ({
  name: fileName,
  fileName,
  updatedAt: '',
  isActive: false,
  isProduction: false,
  isProtected,
});

const layer = (fileName: string, isPackage: boolean): ColorsAndTypeMeta => ({
  name: fileName,
  fileName,
  updatedAt: '',
  isPackage,
});

describe('buildLoadRows', () => {
  it('lists every theme, then the layer files a local copy backs', () => {
    const rows = buildLoadRows(
      [theme('default', true), theme('ocean')],
      [layer('default', true), layer('ocean', true), layer('my-colors', false)],
    );
    expect(rows.map((r) => r.fileName)).toEqual(['theme:default', 'theme:ocean', 'layer:my-colors']);
  });

  it('keeps a local copy of a preset layer, which holds the user edits', () => {
    const rows = buildLoadRows([theme('ocean')], [layer('ocean', false), layer('sunset', true)]);
    expect(rows.map((r) => r.fileName)).toEqual(['theme:ocean', 'layer:ocean']);
  });

  it('puts the protected default theme first', () => {
    const rows = buildLoadRows([theme('autumn'), theme('default', true), theme('ocean')], []);
    expect(rows.map((r) => r.fileName)).toEqual(['theme:default', 'theme:autumn', 'theme:ocean']);
  });

  it('carries the protected flag on themes and never on layers', () => {
    const rows = buildLoadRows([theme('default', true)], [layer('default', false)]);
    expect(rows.map((r) => r.isProtected)).toEqual([true, false]);
  });

  it('keeps the slug alongside the namespaced id', () => {
    const [row] = buildLoadRows([theme('ocean')], []);
    expect(row.slug).toBe('ocean');
    expect(row.fileName).toBe(loadRowId('theme', 'ocean'));
  });
});

describe('isColorsOnly', () => {
  const themeRow = buildLoadRows([theme('ocean')], [])[0];
  const layerRow = buildLoadRows([], [layer('my-colors', false)])[0];

  it('follows the toggle for a theme', () => {
    expect(isColorsOnly(themeRow, false)).toBe(false);
    expect(isColorsOnly(themeRow, true)).toBe(true);
  });

  it('is always on for a layer file', () => {
    expect(isColorsOnly(layerRow, false)).toBe(true);
    expect(colorsOnlyIsForced(layerRow)).toBe(true);
    expect(colorsOnlyIsForced(themeRow)).toBe(false);
  });

  it('keeps the user setting with nothing picked', () => {
    expect(isColorsOnly(null, true)).toBe(true);
    expect(colorsOnlyIsForced(null)).toBe(false);
  });
});
