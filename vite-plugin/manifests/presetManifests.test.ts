/**
 * Gates the nine shipped preset manifests (`npm run generate:preset-manifests`)
 * against the contract a consumer relies on: read doors serve them untouched,
 * they carry only what the shape ops changed, each look reads as its own shape
 * and type, and the tarball ships each one by name.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { normalizeManifest, type ManifestResolvers } from './normalizeManifest';
import { parseGoogleFontsUrl } from '../../src/editor/core/fonts/fontParse';
import { PRESET_FONTS } from '../../scripts/lib/presetFonts.mjs';

const REPO_ROOT = process.cwd();
const DATA = path.join(REPO_ROOT, 'src/live-tokens/data');

const PRESETS = [
  'autumn',
  'yuletide',
  'halloween',
  'midnight-study',
  'ocean',
  'royal-velvet',
  'leprechaun',
  'spring-meadow',
  'sunset',
];

const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const manifestOf = (slug: string) => readJson(path.join(DATA, 'manifests', `${slug}.json`));
const themeOf = (slug: string) => readJson(path.join(DATA, 'themes', `${slug}.json`));
const defaultConfigOf = (comp: string) =>
  readJson(path.join(DATA, 'component-configs', comp, 'default.json'));

/** Prefix `stampPresetFonts` writes; everything else in a preset theme's
    fontSources came from the default theme it was branched off. */
const STAMPED = 'src_preset_';

const stackOf = (theme: any, variable: string) =>
  theme.fontStacks.find((s: any) => s.variable === variable);
const stampedSourcesOf = (theme: any) =>
  theme.fontSources.filter((s: any) => s.id.startsWith(STAMPED));
const aliasesOf = (slug: string, comp: string) =>
  manifestOf(slug).componentConfigs[comp]?.aliases ?? defaultConfigOf(comp).aliases;

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

  it('carries the pairing as two google sources the display and body stacks use', () => {
    const theme = manifestOf(slug).theme;
    const pairing = PRESET_FONTS[slug];
    const stamped = stampedSourcesOf(theme);

    expect(stamped.map((s: any) => s.families[0].name)).toEqual([
      pairing.display.name,
      pairing.body.name,
    ]);
    for (const source of stamped) {
      expect(source.kind).toBe('google');
      const [family] = source.families;
      const [parsed] = parseGoogleFontsUrl(source.url)!;
      expect(parsed.name).toBe(family.name);
      expect(family.weights).toEqual(parsed.weights);
    }
    expect(stackOf(theme, '--font-display').slots[0].familyId).toBe(stamped[0].families[0].id);
    expect(stackOf(theme, '--font-sans').slots[0].familyId).toBe(stamped[1].families[0].id);
  });

  it('rewrites only the project slot, leaving serif and mono at the default theme', () => {
    const theme = manifestOf(slug).theme;
    const base = readJson(path.join(DATA, 'themes', 'default.json'));
    const fallbacks = (t: any, v: string) =>
      stackOf(t, v).slots.filter((s: any) => s.kind !== 'project');

    for (const variable of ['--font-display', '--font-sans']) {
      expect(fallbacks(theme, variable)).toEqual(fallbacks(base, variable));
      expect(stackOf(theme, variable).slots.filter((s: any) => s.kind === 'project')).toHaveLength(1);
    }
    for (const variable of ['--font-serif', '--font-mono']) {
      expect(stackOf(theme, variable)).toEqual(stackOf(base, variable));
    }
  });

  it('ships as its own entry in package.json files', () => {
    const { files } = readJson(path.join(REPO_ROOT, 'package.json'));
    expect(files).toContain(`src/live-tokens/data/manifests/${slug}.json`);
    expect(files).not.toContain('src/live-tokens/data/manifests');
    expect(files).not.toContain('src/live-tokens/data/manifests/');
  });

  it('ships its theme file as its own entry in package.json files', () => {
    const { files } = readJson(path.join(REPO_ROOT, 'package.json'));
    expect(files).toContain(`src/live-tokens/data/themes/${slug}.json`);
  });
});

describe('the nine presets read as nine different looks', () => {
  const duplicates = (label: (slug: string) => string) => {
    const seen = new Map<string, string>();
    const clashes: string[] = [];
    for (const slug of PRESETS) {
      const key = label(slug);
      if (seen.has(key)) clashes.push(`${slug} and ${seen.get(key)} both land on ${key}`);
      seen.set(key, slug);
    }
    return clashes;
  };

  it('gives no two presets the same card radius and button padding', () => {
    expect(
      duplicates(
        (slug) =>
          `${aliasesOf(slug, 'card')['--card-default-radius']} + ` +
          `${aliasesOf(slug, 'button')['--button-primary-padding']}`,
      ),
    ).toEqual([]);
  });

  it('gives every preset its own display and body family', () => {
    expect(duplicates((slug) => PRESET_FONTS[slug].display.name)).toEqual([]);
    expect(duplicates((slug) => PRESET_FONTS[slug].body.name)).toEqual([]);
  });
});
