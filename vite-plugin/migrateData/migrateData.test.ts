import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrateData } from './migrateData';
import { THEME_SCHEMA_VERSION } from '../themes/normalizeTheme';

const roots: string[] = [];

const COLORS = {
  name: 'Sunset',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  editorConfigs: {},
  cssVariables: { '--surface-default': '#fff5e6' },
};

const BUTTON = { name: 'sunset', component: 'button', aliases: { '--button-radius': '--radius-xl' } };
const BUTTON_DEFAULT = { name: 'default', component: 'button', aliases: { '--button-radius': '--radius-md' } };
const CARD_DEFAULT = { name: 'default', component: 'card', aliases: { '--card-radius': '--radius-md' } };

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/** A tree on the pre-working-set model: the sunset theme was applied, so its
 *  copies sit under its own slug and every pointer names them. */
function legacyTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lt-heal-'));
  roots.push(root);
  const d = dirs(root);

  writeJson(path.join(d.colorsAndTypeDir, 'default.json'), { name: 'Default', cssVariables: {} });
  writeJson(path.join(d.colorsAndTypeDir, 'sunset.json'), COLORS);
  writeJson(path.join(d.colorsAndTypeDir, '_active.json'), { activeFile: 'sunset' });
  writeJson(path.join(d.colorsAndTypeDir, '_production.json'), { productionFile: 'sunset' });

  writeJson(path.join(d.componentConfigsDir, 'button', 'default.json'), BUTTON_DEFAULT);
  writeJson(path.join(d.componentConfigsDir, 'button', 'sunset.json'), BUTTON);
  writeJson(path.join(d.componentConfigsDir, 'button', '_active.json'), { activeFile: 'sunset' });
  writeJson(path.join(d.componentConfigsDir, 'button', '_production.json'), { productionFile: 'sunset' });

  writeJson(path.join(d.componentConfigsDir, 'card', 'default.json'), CARD_DEFAULT);
  writeJson(path.join(d.componentConfigsDir, 'card', '_active.json'), { activeFile: 'default' });
  writeJson(path.join(d.componentConfigsDir, 'card', '_production.json'), { productionFile: 'default' });

  // Already-current fixtures (schema version, and every component this fixture
  // tree has — button and card): a heal over an already-encapsulated theme
  // must not count it as "migrated" on the strength of the Wave 2 completeness
  // bump alone (docs/plans/theme-completeness.md).
  writeJson(path.join(d.themesDir, 'default.json'), {
    name: 'Default',
    schemaVersion: THEME_SCHEMA_VERSION,
    colorsAndType: { name: 'Default', cssVariables: {} },
    componentConfigs: { button: BUTTON_DEFAULT, card: CARD_DEFAULT },
  });
  writeJson(path.join(d.themesDir, 'sunset.json'), {
    name: 'Sunset',
    schemaVersion: THEME_SCHEMA_VERSION,
    colorsAndType: COLORS,
    componentConfigs: { button: BUTTON, card: CARD_DEFAULT },
  });
  writeJson(path.join(d.themesDir, '_active.json'), { activeFile: 'sunset' });
  return root;
}

/** The package layout, so a test can point `packageDataDir` at the tree itself
 *  — the library repo, where local and package are one directory. */
const DATA = 'src/live-tokens/data';

function dirs(root: string) {
  return {
    dataDir: path.join(root, DATA),
    colorsAndTypeDir: path.join(root, DATA, 'colors-and-type'),
    componentConfigsDir: path.join(root, DATA, 'component-configs'),
    themesDir: path.join(root, DATA, 'themes'),
  };
}

const heal = (root: string, check = false) => migrateData({ ...dirs(root), check });
const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf-8'));
const exists = (root: string, ...rest: string[]) => fs.existsSync(path.join(root, DATA, ...rest));

afterEach(() => {
  while (roots.length) fs.rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('migrateData', () => {
  it('does nothing to a tree with no retired pointers', () => {
    const root = legacyTree();
    heal(root);

    const second = heal(root);
    expect(second.status).toBe('clean');
    expect(second.deletedFiles).toEqual([]);
  });

  it('names the theme the retired production pointers resolved to', () => {
    const root = legacyTree();
    const result = heal(root);

    expect(result.production).toEqual({ slug: 'sunset', how: 'matched' });
    expect(readJson(path.join(root, DATA, 'themes', '_production.json')).productionFile).toBe('sunset');
    expect(result.recoveredThemePath).toBeNull();
  });

  it('names the default when every retired pointer did', () => {
    const root = legacyTree();
    const d = dirs(root);
    writeJson(path.join(d.colorsAndTypeDir, '_production.json'), { productionFile: 'default' });
    writeJson(path.join(d.componentConfigsDir, 'button', '_production.json'), { productionFile: 'default' });

    expect(heal(root).production).toEqual({ slug: 'default', how: 'all-default' });
  });

  it('captures a production state no theme matches rather than changing it', () => {
    const root = legacyTree();
    const d = dirs(root);
    writeJson(path.join(d.colorsAndTypeDir, 'hand-tuned.json'), {
      ...COLORS,
      cssVariables: { '--surface-default': '#010203' },
    });
    writeJson(path.join(d.colorsAndTypeDir, '_production.json'), { productionFile: 'hand-tuned' });

    const result = heal(root);

    expect(result.production).toEqual({ slug: 'recovered-production', how: 'recovered' });
    const recovered = readJson(path.join(root, DATA, 'themes', 'recovered-production.json'));
    expect(recovered.colorsAndType.cssVariables['--surface-default']).toBe('#010203');
    expect(recovered.componentConfigs.button.aliases['--button-radius']).toBe('--radius-xl');
    // `card`'s production pointer names its own default: a recovered theme is
    // a complete document (docs/plans/theme-completeness.md, Wave 3), so it is
    // still embedded, byte-equal to the default it points at.
    expect(recovered.componentConfigs.card).toEqual(CARD_DEFAULT);
    expect(readJson(path.join(root, DATA, 'themes', '_production.json')).productionFile).toBe('recovered-production');
  });

  it('leaves the buffers empty when the live state is the open theme', () => {
    const root = legacyTree();
    const result = heal(root);

    expect(result.workingWritten).toEqual([]);
    expect(exists(root, 'colors-and-type', '_working.json')).toBe(false);
    expect(exists(root, 'component-configs', 'button', '_working.json')).toBe(false);
  });

  it('fills a buffer where the live state had drifted from the open theme', () => {
    const root = legacyTree();
    const d = dirs(root);
    writeJson(path.join(d.colorsAndTypeDir, 'sunset.json'), {
      ...COLORS,
      updatedAt: '2026-02-02T00:00:00.000Z',
      cssVariables: { '--surface-default': '#edited' },
      _fileName: 'sunset',
      _source: 'file',
    });

    const result = heal(root);

    expect(result.workingWritten).toHaveLength(1);
    const buffer = readJson(path.join(root, DATA, 'colors-and-type', '_working.json'));
    expect(buffer.cssVariables['--surface-default']).toBe('#edited');
    expect(buffer).not.toHaveProperty('_fileName');
    expect(buffer).not.toHaveProperty('_source');
  });

  it('ignores updatedAt when deciding whether the live state drifted', () => {
    const root = legacyTree();
    writeJson(path.join(root, DATA, 'colors-and-type', 'sunset.json'), {
      ...COLORS,
      updatedAt: '2026-09-09T00:00:00.000Z',
    });

    expect(heal(root).workingWritten).toEqual([]);
  });

  it('keeps a buffer the editor already owns', () => {
    const root = legacyTree();
    const buffer = { ...COLORS, cssVariables: { '--surface-default': '#newer' } };
    writeJson(path.join(root, DATA, 'colors-and-type', '_working.json'), buffer);
    writeJson(path.join(root, DATA, 'colors-and-type', 'sunset.json'), {
      ...COLORS,
      cssVariables: { '--surface-default': '#older' },
    });

    const result = heal(root);

    expect(result.workingWritten).toEqual([]);
    expect(result.workingKept).toHaveLength(1);
    expect(readJson(path.join(root, DATA, 'colors-and-type', '_working.json')).cssVariables['--surface-default']).toBe(
      '#newer',
    );
  });

  it('deletes the copies a theme carries and retires the pointers', () => {
    const root = legacyTree();
    const result = heal(root);

    expect(exists(root, 'colors-and-type', 'sunset.json')).toBe(false);
    expect(exists(root, 'component-configs', 'button', 'sunset.json')).toBe(false);
    expect(result.deletedFiles).toHaveLength(2);

    expect(result.deletedPointers).toHaveLength(6);
    for (const p of result.deletedPointers) expect(fs.existsSync(p)).toBe(false);
    expect(exists(root, 'colors-and-type', 'default.json')).toBe(true);
    expect(exists(root, 'component-configs', 'button', 'default.json')).toBe(true);
  });

  it('keeps a named file whose content matches no theme', () => {
    const root = legacyTree();
    writeJson(path.join(root, DATA, 'colors-and-type', 'my-colors.json'), {
      ...COLORS,
      cssVariables: { '--surface-default': '#123456' },
    });

    const result = heal(root);

    expect(exists(root, 'colors-and-type', 'my-colors.json')).toBe(true);
    expect(result.keptUserFiles).toHaveLength(1);
    expect(result.keptUserFiles[0]).toContain('my-colors.json');
  });

  it('never deletes a preset the package ships from the package tree itself', () => {
    const root = legacyTree();
    writeJson(path.join(root, 'package.json'), {
      name: '@motion-proto/live-tokens',
      files: [`${DATA}/colors-and-type/sunset.json`],
    });

    migrateData({ ...dirs(root), packageDataDir: path.join(root, DATA) });

    expect(exists(root, 'colors-and-type', 'sunset.json')).toBe(true);
    // The package ships no component configs, so nothing there is shipped and
    // the sweep still reaches the copies the theme carries.
    expect(exists(root, 'component-configs', 'button', 'sunset.json')).toBe(false);
  });

  it('names the file when one a retired pointer names will not parse', () => {
    const root = legacyTree();
    fs.writeFileSync(path.join(root, DATA, 'colors-and-type', 'sunset.json'), '{ not json');

    expect(() => heal(root)).toThrow(/sunset\.json will not parse/);
  });

  it('deletes a local shadow of a shipped preset', () => {
    const root = legacyTree();
    const packageDataDir = path.join(root, 'pkg', DATA);
    writeJson(path.join(root, 'pkg', 'package.json'), {
      name: '@motion-proto/live-tokens',
      files: [`${DATA}/colors-and-type/sunset.json`],
    });
    writeJson(path.join(packageDataDir, 'colors-and-type', 'sunset.json'), COLORS);

    migrateData({ ...dirs(root), packageDataDir });

    expect(exists(root, 'colors-and-type', 'sunset.json')).toBe(false);
  });

  it('carries a pre-v3 theme by value before the copies it names are deleted', () => {
    const root = legacyTree();
    writeJson(path.join(root, DATA, 'themes', 'sunset.json'), {
      name: 'Sunset',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      theme: 'sunset',
      componentConfigs: { button: 'sunset' },
    });

    const result = heal(root);

    expect(result.upgradedThemes).toHaveLength(1);
    const theme = readJson(path.join(root, DATA, 'themes', 'sunset.json'));
    expect(theme.schemaVersion).toBe(THEME_SCHEMA_VERSION);
    expect(theme.colorsAndType.cssVariables['--surface-default']).toBe('#fff5e6');
    expect(theme.componentConfigs.button.aliases['--button-radius']).toBe('--radius-xl');
    expect(exists(root, 'colors-and-type', 'sunset.json')).toBe(false);
  });

  it('does not read a stray empty manifests directory as the old layout', () => {
    const root = legacyTree();
    fs.mkdirSync(path.join(root, DATA, 'manifests'), { recursive: true });

    const result = heal(root);

    expect(result.renames).toEqual([]);
    expect(readJson(path.join(root, DATA, 'themes', 'sunset.json')).colorsAndType).toBeDefined();
  });

  it('reads past a colors-and-type file left among the themes', () => {
    const root = legacyTree();
    const stray = path.join(root, DATA, 'themes', 'stray.json');
    writeJson(stray, COLORS);

    const result = heal(root);

    expect(result.notThemes).toEqual([stray]);
    expect(readJson(stray)).toEqual(COLORS);
    expect(result.production).toEqual({ slug: 'sunset', how: 'matched' });
  });

  it('reports a local default that shadows the one the package ships', () => {
    const root = legacyTree();
    const packageDataDir = path.join(root, 'pkg', DATA);
    writeJson(path.join(packageDataDir, 'colors-and-type', 'default.json'), {
      name: 'Default',
      cssVariables: { '--surface-default': '#moved-on' },
    });

    const result = migrateData({ ...dirs(root), packageDataDir });

    expect(result.shadowedDefaults).toEqual([path.join(root, DATA, 'colors-and-type', 'default.json')]);
    expect(exists(root, 'colors-and-type', 'default.json')).toBe(true);
  });

  it('says nothing when the local default still matches the package', () => {
    const root = legacyTree();
    const packageDataDir = path.join(root, 'pkg', DATA);
    writeJson(path.join(packageDataDir, 'colors-and-type', 'default.json'), {
      name: 'Default',
      cssVariables: {},
      updatedAt: '2026-09-09T00:00:00.000Z',
    });

    expect(migrateData({ ...dirs(root), packageDataDir }).shadowedDefaults).toEqual([]);
  });

  it('plans without writing under check', () => {
    const root = legacyTree();
    const result = heal(root, true);

    expect(result.status).toBe('planned');
    expect(result.deletedFiles).toHaveLength(2);
    expect(result.deletedPointers).toHaveLength(6);
    expect(exists(root, 'colors-and-type', 'sunset.json')).toBe(true);
    expect(exists(root, 'colors-and-type', '_active.json')).toBe(true);
    expect(exists(root, 'themes', '_production.json')).toBe(false);
  });
});
