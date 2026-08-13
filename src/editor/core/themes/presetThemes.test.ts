import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRESET_THEME_FILE_NAMES, layerThemesForList } from './presetThemes';

const file = (fileName: string) => ({ fileName, name: fileName });

describe('layerThemesForList', () => {
  it('drops the shipped presets and keeps the user files', () => {
    const files = [file('default'), file('ocean'), file('my-theme'), file('yuletide')];
    expect(layerThemesForList(files, 'default').map((f) => f.fileName)).toEqual([
      'default',
      'my-theme',
    ]);
  });

  it('keeps a preset-named file while it is the active one', () => {
    const files = [file('default'), file('ocean'), file('sunset')];
    expect(layerThemesForList(files, 'ocean').map((f) => f.fileName)).toEqual([
      'default',
      'ocean',
    ]);
  });

  it('leaves a list with no presets untouched', () => {
    const files = [file('default'), file('brand'), file('brand_01')];
    expect(layerThemesForList(files, 'brand')).toEqual(files);
  });
});

describe('PRESET_THEME_FILE_NAMES', () => {
  it('names every preset theme the package ships', () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), 'package.json'), 'utf8'),
    ) as { files: string[] };
    const shipped = pkg.files
      .filter((f) => f.startsWith('src/live-tokens/data/themes/'))
      .map((f) => f.slice(f.lastIndexOf('/') + 1).replace(/\.json$/, ''))
      .filter((slug) => slug !== 'default');
    expect([...PRESET_THEME_FILE_NAMES].sort()).toEqual(shipped.sort());
  });
});
