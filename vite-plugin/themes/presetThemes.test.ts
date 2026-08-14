/**
 * Gates the nine shipped preset themes (`npm run generate:preset-themes`)
 * against the contract a consumer relies on: read doors serve them untouched,
 * they carry only what the shape ops changed, each look reads as its own shape
 * and type, and the tarball ships each one by name.
 */
import { describe, expect, it } from 'vitest';
import fs from 'fs';
import path from 'path';
import { normalizeTheme, type ThemeResolvers } from './normalizeTheme';
import { parseGoogleFontsUrl } from '../../src/editor/core/fonts/fontParse';
import { PRESET_FONTS } from '../../scripts/lib/presetFonts.mjs';

const REPO_ROOT = process.cwd();
const DATA = path.join(REPO_ROOT, 'src/live-tokens/data');

const PRESETS = [
  'autumn',
  'halloween',
  'midnight-study',
  'ocean',
  'royal-velvet',
  'spring-meadow',
  'sunset',
];

const readJson = (p: string) => JSON.parse(fs.readFileSync(p, 'utf-8'));
const themeOf = (slug: string) => readJson(path.join(DATA, 'themes', `${slug}.json`));
const colorsAndTypeOf = (slug: string) => readJson(path.join(DATA, 'colors-and-type', `${slug}.json`));
const defaultConfigOf = (comp: string) =>
  readJson(path.join(DATA, 'component-configs', comp, 'default.json'));

/** Prefix `stampPresetFonts` writes; everything else in a preset's
    fontSources came from the default colors and type it branched off. */
const STAMPED = 'src_preset_';

const stackOf = (colorsAndType: any, variable: string) =>
  colorsAndType.fontStacks.find((s: any) => s.variable === variable);
const stampedSourcesOf = (colorsAndType: any) =>
  colorsAndType.fontSources.filter((s: any) => s.id.startsWith(STAMPED));
const aliasesOf = (slug: string, comp: string) =>
  themeOf(slug).componentConfigs[comp]?.aliases ?? defaultConfigOf(comp).aliases;

/** Pass-through means nothing had to be resolved: any lookup here is a bug. */
const strictResolvers: ThemeResolvers = {
  readColorsAndType: (name) => {
    throw new Error(`resolved colors and type "${name}"`);
  },
  readComponentConfig: (comp, name) => {
    throw new Error(`resolved config "${comp}/${name}"`);
  },
  normalizeColorsAndType: (colorsAndType) => {
    throw new Error(`normalised embedded colors and type: ${JSON.stringify(colorsAndType).slice(0, 40)}`);
  },
};

describe.each(PRESETS)('shipped preset theme "%s"', (slug) => {
  it('passes through normalizeTheme unchanged', () => {
    const raw = themeOf(slug);
    const { theme, dropped, migrated } = normalizeTheme(raw, strictResolvers);

    expect(migrated).toBe(false);
    expect(dropped).toEqual([]);
    expect(theme).toEqual(raw);
    expect(theme.schemaVersion).toBe(3);
  });

  it('embeds the preset colors and type by value under their display name', () => {
    const theme = themeOf(slug);
    const colorsAndType = colorsAndTypeOf(slug);

    expect(theme.colorsAndType).toEqual(colorsAndType);
    expect(theme.name).toBe(colorsAndType.name);
  });

  it('carries only the components the shape ops changed, values only', () => {
    const theme = themeOf(slug);
    const configs = Object.entries(theme.componentConfigs) as [string, any][];
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
    const colorsAndType = themeOf(slug).colorsAndType;
    const pairing = PRESET_FONTS[slug];
    const stamped = stampedSourcesOf(colorsAndType);

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
    expect(stackOf(colorsAndType, '--font-display').slots[0].familyId).toBe(stamped[0].families[0].id);
    expect(stackOf(colorsAndType, '--font-sans').slots[0].familyId).toBe(stamped[1].families[0].id);
  });

  it('rewrites only the project slot, leaving serif and mono at the default', () => {
    const colorsAndType = themeOf(slug).colorsAndType;
    const base = readJson(path.join(DATA, 'colors-and-type', 'default.json'));
    const fallbacks = (t: any, v: string) =>
      stackOf(t, v).slots.filter((s: any) => s.kind !== 'project');

    for (const variable of ['--font-display', '--font-sans']) {
      expect(fallbacks(colorsAndType, variable)).toEqual(fallbacks(base, variable));
      expect(stackOf(colorsAndType, variable).slots.filter((s: any) => s.kind === 'project')).toHaveLength(1);
    }
    for (const variable of ['--font-serif', '--font-mono']) {
      expect(stackOf(colorsAndType, variable)).toEqual(stackOf(base, variable));
    }
  });

  it('ships as its own entry in package.json files', () => {
    const { files } = readJson(path.join(REPO_ROOT, 'package.json'));
    expect(files).toContain(`src/live-tokens/data/themes/${slug}.json`);
    expect(files).not.toContain('src/live-tokens/data/themes');
    expect(files).not.toContain('src/live-tokens/data/themes/');
  });

  it('ships its colors-and-type file as its own entry in package.json files', () => {
    const { files } = readJson(path.join(REPO_ROOT, 'package.json'));
    expect(files).toContain(`src/live-tokens/data/colors-and-type/${slug}.json`);
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
