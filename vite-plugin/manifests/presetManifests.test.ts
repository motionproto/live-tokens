/**
 * Gates the nine shipped preset manifests (`npm run generate:preset-manifests`)
 * against the contract a consumer relies on: read doors serve them untouched,
 * they carry only what the shape ops changed, and the tarball ships each one by
 * name.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { normalizeManifest, type ManifestResolvers } from './normalizeManifest';

const REPO_ROOT = process.cwd();
const DATA = path.join(REPO_ROOT, 'src/live-tokens/data');

const PRESETS = [
  'autumn',
  'christmas',
  'halloween',
  'midnight-study',
  'ocean',
  'royal-velvet',
  'saint-patrick',
  'spring-meadow',
  'sunset',
];

const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const manifestOf = (slug: string) => readJson(path.join(DATA, 'manifests', `${slug}.json`));
const themeOf = (slug: string) => readJson(path.join(DATA, 'themes', `${slug}.json`));
const defaultConfigOf = (comp: string) =>
  readJson(path.join(DATA, 'component-configs', comp, 'default.json'));

/** Pass-through means nothing had to be resolved: any lookup here is a bug. */
const strictResolvers: ManifestResolvers = {
  readTheme: (name) => {
    throw new Error(`resolved theme "${name}"`);
  },
  readComponentConfig: (comp, name) => {
    throw new Error(`resolved config "${comp}/${name}"`);
  },
  normalizeTheme: (theme) => {
    throw new Error(`normalised an embedded theme: ${JSON.stringify(theme).slice(0, 40)}`);
  },
};

describe.each(PRESETS)('shipped preset manifest "%s"', (slug) => {
  it('passes through normalizeManifest unchanged', () => {
    const raw = manifestOf(slug);
    const { manifest, dropped, migrated } = normalizeManifest(raw, strictResolvers);

    expect(migrated).toBe(false);
    expect(dropped).toEqual([]);
    expect(manifest).toEqual(raw);
    expect(manifest.schemaVersion).toBe(2);
  });

  it('embeds the preset theme by value under the theme display name', () => {
    const manifest = manifestOf(slug);
    const theme = themeOf(slug);

    expect(manifest.theme).toEqual(theme);
    expect(manifest.name).toBe(theme.name);
  });

  it('carries only the components the shape ops changed, values only', () => {
    const manifest = manifestOf(slug);
    const configs = Object.entries(manifest.componentConfigs) as [string, any][];
    expect(configs.length).toBeGreaterThan(0);

    for (const [comp, config] of configs) {
      const base = defaultConfigOf(comp);
      expect(config.name).toBe(slug);
      expect(config.component).toBe(comp);
      expect(Object.keys(config.aliases)).toEqual(Object.keys(base.aliases));
      expect(config.aliases).not.toEqual(base.aliases);
    }
  });

  it('ships as its own entry in package.json files', () => {
    const { files } = readJson(path.join(REPO_ROOT, 'package.json'));
    expect(files).toContain(`src/live-tokens/data/manifests/${slug}.json`);
    expect(files).not.toContain('src/live-tokens/data/manifests');
    expect(files).not.toContain('src/live-tokens/data/manifests/');
  });
});
