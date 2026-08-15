/**
 * The heal on a tree from 0.47.1 or earlier: `themes/` still holds the colors
 * and type, `manifests/` still holds the whole-look files, and
 * `colors-and-type/` does not exist. The directories have to be renamed before
 * a single theme is read, or every saved palette reads as a corrupt theme.
 */
import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrateData } from './migrateData';

const roots: string[] = [];
const DATA = 'src/live-tokens/data';

/** A v1 colors-and-type file: content at the top level, no inner-layer key. */
const SUNSET_COLORS = {
  name: 'Sunset',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  schemaVersion: 1,
  editorConfigs: {},
  cssVariables: { '--surface-default': '#fff5e6' },
};

/** A v2 one, and the user's own: it matches no theme, so it survives. */
const HAND_TUNED_COLORS = {
  name: 'Hand tuned',
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  schemaVersion: 2,
  editorConfigs: {},
  cssVariables: { '--surface-default': '#010203' },
};

const DEFAULT_COLORS = {
  name: 'Default',
  schemaVersion: 2,
  editorConfigs: {},
  cssVariables: { '--surface-default': '#ffffff' },
};

const BUTTON_DEFAULT = { name: 'default', component: 'button', aliases: { '--button-radius': '--radius-md' } };
const BUTTON_SUNSET = { name: 'sunset', component: 'button', aliases: { '--button-radius': '--radius-xl' } };
const CARD_DEFAULT = { name: 'default', component: 'card', aliases: { '--card-radius': '--radius-md' } };
const CARD_DRIFTED = { name: 'drifted', component: 'card', aliases: { '--card-radius': '--radius-none' } };

function writeJson(file: string, data: unknown) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function dirs(root: string) {
  return {
    dataDir: path.join(root, DATA),
    colorsAndTypeDir: path.join(root, DATA, 'colors-and-type'),
    componentConfigsDir: path.join(root, DATA, 'component-configs'),
    themesDir: path.join(root, DATA, 'themes'),
  };
}

/**
 * The sunset look was applied under the old model and then the card was left
 * off it, so the card's live state has drifted from what the manifest carries.
 */
function preRenameTree(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lt-prerename-'));
  roots.push(root);
  const data = path.join(root, DATA);

  const themes = path.join(data, 'themes');
  writeJson(path.join(themes, 'default.json'), DEFAULT_COLORS);
  writeJson(path.join(themes, 'sunset.json'), SUNSET_COLORS);
  writeJson(path.join(themes, 'hand-tuned.json'), HAND_TUNED_COLORS);
  writeJson(path.join(themes, '_active.json'), { activeFile: 'sunset' });
  writeJson(path.join(themes, '_production.json'), { productionFile: 'sunset' });

  const manifests = path.join(data, 'manifests');
  writeJson(path.join(manifests, 'default.json'), {
    name: 'Default',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    theme: 'default',
    componentConfigs: {},
  });
  writeJson(path.join(manifests, 'sunset.json'), {
    name: 'Sunset',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    theme: 'sunset',
    componentConfigs: { button: 'sunset' },
  });
  writeJson(path.join(manifests, '_active.json'), { activeFile: 'sunset' });

  const configs = path.join(data, 'component-configs');
  writeJson(path.join(configs, 'button', 'default.json'), BUTTON_DEFAULT);
  writeJson(path.join(configs, 'button', 'sunset.json'), BUTTON_SUNSET);
  writeJson(path.join(configs, 'button', '_active.json'), { activeFile: 'sunset' });
  writeJson(path.join(configs, 'button', '_production.json'), { productionFile: 'sunset' });

  writeJson(path.join(configs, 'card', 'default.json'), CARD_DEFAULT);
  writeJson(path.join(configs, 'card', 'drifted.json'), CARD_DRIFTED);
  writeJson(path.join(configs, 'card', '_active.json'), { activeFile: 'drifted' });
  writeJson(path.join(configs, 'card', '_production.json'), { productionFile: 'default' });

  fs.writeFileSync(path.join(data, 'tokens.generated.css'), ':root:root { --surface-default: #fff5e6; }\n');
  return root;
}

function snapshot(root: string): Map<string, string> {
  const entries = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        entries.set(p, '<dir>');
        walk(p);
      } else {
        entries.set(p, fs.readFileSync(p, 'utf-8'));
      }
    }
  };
  walk(root);
  return entries;
}

function changedSince(before: Map<string, string>, after: Map<string, string>): string[] {
  const changed = [...after].filter(([p, content]) => before.get(p) !== content).map(([p]) => p);
  const removed = [...before.keys()].filter((p) => !after.has(p));
  return [...changed, ...removed];
}

const heal = (root: string, check = false) => migrateData({ ...dirs(root), check });
const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf-8'));
const at = (root: string, ...rest: string[]) => path.join(root, DATA, ...rest);
const exists = (root: string, ...rest: string[]) => fs.existsSync(at(root, ...rest));

afterEach(() => {
  while (roots.length) fs.rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('migrateData on a pre-0.48 layout', () => {
  it('prints the rename plan and the derived production without touching disk', () => {
    const root = preRenameTree();
    const before = snapshot(root);

    const result = heal(root, true);

    expect(result.status).toBe('planned');
    expect(result.renames).toEqual([
      { from: at(root, 'themes'), to: at(root, 'colors-and-type') },
      { from: at(root, 'manifests'), to: at(root, 'themes') },
    ]);
    expect(result.production).toEqual({ slug: 'sunset', how: 'matched' });
    // Planned paths name where the files land, not where the plan read them.
    expect(result.deletedFiles).toContain(at(root, 'colors-and-type', 'sunset.json'));
    expect(result.keptUserFiles).toEqual([
      at(root, 'colors-and-type', 'hand-tuned.json'),
      at(root, 'component-configs', 'card', 'drifted.json'),
    ]);
    expect(result.workingWritten).toEqual([at(root, 'component-configs', 'card', '_working.json')]);
    expect(changedSince(before, snapshot(root))).toEqual([]);
  });

  it('renames the directories, then heals what is inside them', () => {
    const root = preRenameTree();

    const result = heal(root);

    expect(result.status).toBe('healed');
    expect(result.renames).toHaveLength(2);
    expect(exists(root, 'manifests')).toBe(false);
    expect(readJson(at(root, 'colors-and-type', 'default.json'))).toEqual(DEFAULT_COLORS);
    expect(readJson(at(root, 'themes', 'sunset.json')).colorsAndType.cssVariables).toEqual(
      SUNSET_COLORS.cssVariables,
    );
  });

  it('derives production from the pointer manifest rather than changing it', () => {
    const root = preRenameTree();

    const result = heal(root);

    expect(result.production).toEqual({ slug: 'sunset', how: 'matched' });
    expect(result.recoveredThemePath).toBeNull();
    expect(readJson(at(root, 'themes', '_production.json')).productionFile).toBe('sunset');
  });

  it('carries the pointer manifests to v3 by value', () => {
    const root = preRenameTree();

    const result = heal(root);

    expect(result.upgradedThemes.sort()).toEqual([
      at(root, 'themes', 'default.json'),
      at(root, 'themes', 'sunset.json'),
    ]);
    const theme = readJson(at(root, 'themes', 'sunset.json'));
    expect(theme.schemaVersion).toBe(3);
    expect(theme.componentConfigs.button.aliases['--button-radius']).toBe('--radius-xl');
  });

  it('buffers only the component whose live state had drifted', () => {
    const root = preRenameTree();

    const result = heal(root);

    expect(result.workingWritten).toEqual([at(root, 'component-configs', 'card', '_working.json')]);
    expect(readJson(at(root, 'component-configs', 'card', '_working.json')).aliases).toEqual(
      CARD_DRIFTED.aliases,
    );
    expect(exists(root, 'colors-and-type', '_working.json')).toBe(false);
    expect(exists(root, 'component-configs', 'button', '_working.json')).toBe(false);
  });

  it('deletes the copies a theme carries and keeps the palettes the user saved', () => {
    const root = preRenameTree();

    const result = heal(root);

    expect(exists(root, 'colors-and-type', 'sunset.json')).toBe(false);
    expect(exists(root, 'component-configs', 'button', 'sunset.json')).toBe(false);
    expect(exists(root, 'colors-and-type', 'hand-tuned.json')).toBe(true);
    expect(readJson(at(root, 'colors-and-type', 'hand-tuned.json'))).toEqual(HAND_TUNED_COLORS);
    expect(result.keptUserFiles).toContain(at(root, 'colors-and-type', 'hand-tuned.json'));
    expect(result.deletedPointers).toHaveLength(6);
    for (const p of result.deletedPointers) expect(fs.existsSync(p)).toBe(false);
  });

  it('leaves the generated CSS to the dev server', () => {
    const root = preRenameTree();
    const before = fs.readFileSync(at(root, 'tokens.generated.css'), 'utf-8');

    heal(root);

    expect(fs.readFileSync(at(root, 'tokens.generated.css'), 'utf-8')).toBe(before);
  });

  it('is clean on a second run', () => {
    const root = preRenameTree();
    heal(root);

    const second = heal(root);

    expect(second.status).toBe('clean');
    expect(second.renames).toEqual([]);
    expect(second.deletedFiles).toEqual([]);
    expect(second.deletedPointers).toEqual([]);
  });

  it('names a reference the pointer manifest lost rather than embedding the default in silence', () => {
    const root = preRenameTree();
    fs.rmSync(at(root, 'themes', 'sunset.json'));

    const result = heal(root);

    expect(result.droppedRefs).toEqual([
      'theme "sunset": the reference colors-and-type:sunset resolved to nothing, so it carries the shipped default instead',
    ]);
  });

  it('refuses to guess when the retired manifestsDir key names a custom path', () => {
    const root = preRenameTree();
    const moved = path.join(root, 'looks');
    fs.renameSync(at(root, 'manifests'), moved);

    expect(() => migrateData({ ...dirs(root), legacyManifestsDir: moved })).toThrow(
      /"manifestsDir" key/,
    );
    expect(fs.existsSync(moved)).toBe(true);
    expect(exists(root, 'themes', 'sunset.json')).toBe(true);
  });

  it('refuses when the configured directories make the mapping ambiguous', () => {
    const root = preRenameTree();

    expect(() =>
      migrateData({ ...dirs(root), colorsAndTypeDir: path.join(root, 'elsewhere/colors') }),
    ).toThrow(/custom paths/);
    expect(exists(root, 'manifests')).toBe(true);
  });

  it('refuses rather than merging into a destination that already holds files', () => {
    const root = preRenameTree();
    fs.mkdirSync(at(root, 'colors-and-type'), { recursive: true });
    fs.writeFileSync(at(root, 'colors-and-type', 'NOTES.md'), 'half moved by hand\n');

    expect(() => heal(root)).toThrow(/already exists and holds/);
    expect(exists(root, 'themes', 'sunset.json')).toBe(true);
  });
});
