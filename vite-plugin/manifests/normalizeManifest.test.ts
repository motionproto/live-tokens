import { describe, expect, it } from 'vitest';
import { normalizeManifest, type ManifestResolvers } from './normalizeManifest';

const COLORS_AND_TYPE: Record<string, any> = {
  default: { name: 'Default Theme', cssVariables: { '--surface-default': 'white' } },
  'my-theme': { name: 'My Theme', cssVariables: { '--surface-default': 'black' } },
};

const CONFIGS: Record<string, any> = {
  'card/my-card': { name: 'my-card', component: 'card', aliases: { '--card-radius': '8px' } },
};

function resolvers(overrides: Partial<ManifestResolvers> = {}): ManifestResolvers {
  return {
    readColorsAndType: (name) => COLORS_AND_TYPE[name] ?? null,
    readComponentConfig: (comp, name) => CONFIGS[`${comp}/${name}`] ?? null,
    normalizeColorsAndType: (colorsAndType) => colorsAndType,
    ...overrides,
  };
}

const v1 = {
  name: 'My Manifest',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-02T00:00:00.000Z',
  theme: 'my-theme',
  componentConfigs: { card: 'my-card', button: 'default', panel: 'my-panel' },
};

describe('normalizeManifest v1 → v2', () => {
  it('embeds the referenced theme and configs', () => {
    const { manifest, migrated } = normalizeManifest(v1, resolvers());
    expect(migrated).toBe(true);
    expect(manifest.schemaVersion).toBe(2);
    expect(manifest.theme).toEqual(COLORS_AND_TYPE['my-theme']);
    expect(manifest.componentConfigs.card).toEqual(CONFIGS['card/my-card']);
  });

  it('keeps name and timestamps', () => {
    const { manifest } = normalizeManifest(v1, resolvers());
    expect(manifest.name).toBe('My Manifest');
    expect(manifest.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(manifest.updatedAt).toBe('2026-02-02T00:00:00.000Z');
  });

  it('omits components pinned to default', () => {
    const { manifest, dropped } = normalizeManifest(v1, resolvers());
    expect('button' in manifest.componentConfigs).toBe(false);
    expect(dropped).not.toContain('button/default');
  });

  it('drops a config that no longer exists and reports it', () => {
    const { manifest, dropped } = normalizeManifest(v1, resolvers());
    expect('panel' in manifest.componentConfigs).toBe(false);
    expect(dropped).toEqual(['panel/my-panel']);
  });

  it('falls back to the default theme when the named one is gone', () => {
    const { manifest, dropped } = normalizeManifest({ ...v1, theme: 'deleted' }, resolvers());
    expect(manifest.theme).toEqual(COLORS_AND_TYPE.default);
    expect(dropped).toEqual(['theme:deleted', 'panel/my-panel']);
  });

  it('leaves theme null when nothing resolves', () => {
    const { manifest } = normalizeManifest(v1, resolvers({ readColorsAndType: () => null }));
    expect(manifest.theme).toBeNull();
  });

  it('runs the embedded theme through normalizeColorsAndType', () => {
    const { manifest } = normalizeManifest(
      v1,
      resolvers({ normalizeColorsAndType: (colorsAndType) => ({ ...colorsAndType, reconciled: true }) }),
    );
    expect(manifest.theme?.reconciled).toBe(true);
  });
});

describe('normalizeManifest v2', () => {
  const v2 = {
    name: 'Encapsulated',
    createdAt: '2026-03-03T00:00:00.000Z',
    updatedAt: '2026-03-03T00:00:00.000Z',
    schemaVersion: 2,
    theme: { name: 'Embedded', _fileName: 'my-theme' },
    componentConfigs: { card: { name: 'my-card', _fileName: 'my-card' } },
  };

  it('passes embedded data through untouched', () => {
    const { manifest, migrated, dropped } = normalizeManifest(
      v2,
      resolvers({
        readColorsAndType: () => {
          throw new Error('v2 must not read from disk');
        },
      }),
    );
    expect(migrated).toBe(false);
    expect(dropped).toEqual([]);
    expect(manifest.theme?.name).toBe('Embedded');
    expect(manifest.componentConfigs.card.name).toBe('my-card');
  });

  it('strips the server-attached _fileName marker', () => {
    const { manifest } = normalizeManifest(v2, resolvers());
    expect(manifest.theme).not.toHaveProperty('_fileName');
    expect(manifest.componentConfigs.card).not.toHaveProperty('_fileName');
  });
});
