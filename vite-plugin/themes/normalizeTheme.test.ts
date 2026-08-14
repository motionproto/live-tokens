import { describe, expect, it } from 'vitest';
import { normalizeTheme, type ThemeResolvers } from './normalizeTheme';

const COLORS_AND_TYPE: Record<string, any> = {
  default: { name: 'Default Theme', cssVariables: { '--surface-default': 'white' } },
  'my-theme': { name: 'My Theme', cssVariables: { '--surface-default': 'black' } },
};

const CONFIGS: Record<string, any> = {
  'card/my-card': { name: 'my-card', component: 'card', aliases: { '--card-radius': '8px' } },
};

function resolvers(overrides: Partial<ThemeResolvers> = {}): ThemeResolvers {
  return {
    readColorsAndType: (name) => COLORS_AND_TYPE[name] ?? null,
    readComponentConfig: (comp, name) => CONFIGS[`${comp}/${name}`] ?? null,
    normalizeColorsAndType: (colorsAndType) => colorsAndType,
    ...overrides,
  };
}

const v1 = {
  name: 'My Theme',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-02-02T00:00:00.000Z',
  theme: 'my-theme',
  componentConfigs: { card: 'my-card', button: 'default', panel: 'my-panel' },
};

describe('normalizeTheme v1 → v3', () => {
  it('embeds the referenced colors and type and configs', () => {
    const { theme, migrated } = normalizeTheme(v1, resolvers());
    expect(migrated).toBe(true);
    expect(theme.schemaVersion).toBe(3);
    expect(theme.colorsAndType).toEqual(COLORS_AND_TYPE['my-theme']);
    expect(theme.componentConfigs.card).toEqual(CONFIGS['card/my-card']);
  });

  it('keeps name and timestamps', () => {
    const { theme } = normalizeTheme(v1, resolvers());
    expect(theme.name).toBe('My Theme');
    expect(theme.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(theme.updatedAt).toBe('2026-02-02T00:00:00.000Z');
  });

  it('omits components pinned to default', () => {
    const { theme, dropped } = normalizeTheme(v1, resolvers());
    expect('button' in theme.componentConfigs).toBe(false);
    expect(dropped).not.toContain('button/default');
  });

  it('drops a config that no longer exists and reports it', () => {
    const { theme, dropped } = normalizeTheme(v1, resolvers());
    expect('panel' in theme.componentConfigs).toBe(false);
    expect(dropped).toEqual(['panel/my-panel']);
  });

  it('falls back to the default colors and type when the named one is gone', () => {
    const { theme, dropped } = normalizeTheme({ ...v1, theme: 'deleted' }, resolvers());
    expect(theme.colorsAndType).toEqual(COLORS_AND_TYPE.default);
    expect(dropped).toEqual(['colors-and-type:deleted', 'panel/my-panel']);
  });

  it('leaves the colors and type null when nothing resolves', () => {
    const { theme } = normalizeTheme(v1, resolvers({ readColorsAndType: () => null }));
    expect(theme.colorsAndType).toBeNull();
  });

  it('runs the embedded colors and type through normalizeColorsAndType', () => {
    const { theme } = normalizeTheme(
      v1,
      resolvers({ normalizeColorsAndType: (colorsAndType) => ({ ...colorsAndType, reconciled: true }) }),
    );
    expect(theme.colorsAndType?.reconciled).toBe(true);
  });
});

describe('normalizeTheme v2 → v3', () => {
  const v2 = {
    name: 'Encapsulated',
    createdAt: '2026-03-03T00:00:00.000Z',
    updatedAt: '2026-03-03T00:00:00.000Z',
    schemaVersion: 2,
    theme: { name: 'Embedded' },
    componentConfigs: { card: { name: 'my-card' } },
  };

  it('renames the embedded key, resolving nothing', () => {
    const { theme, migrated, dropped } = normalizeTheme(
      v2,
      resolvers({
        readColorsAndType: () => {
          throw new Error('embedded data must not read from disk');
        },
      }),
    );
    expect(migrated).toBe(true);
    expect(dropped).toEqual([]);
    expect(theme.schemaVersion).toBe(3);
    expect(theme.colorsAndType?.name).toBe('Embedded');
    expect(theme.componentConfigs.card.name).toBe('my-card');
  });
});

describe('normalizeTheme v3', () => {
  const v3 = {
    name: 'Encapsulated',
    createdAt: '2026-03-03T00:00:00.000Z',
    updatedAt: '2026-03-03T00:00:00.000Z',
    schemaVersion: 3,
    colorsAndType: { name: 'Embedded', _fileName: 'my-theme' },
    componentConfigs: { card: { name: 'my-card', _fileName: 'my-card' } },
  };

  it('passes embedded data through untouched', () => {
    const { theme, migrated, dropped } = normalizeTheme(
      v3,
      resolvers({
        readColorsAndType: () => {
          throw new Error('v3 must not read from disk');
        },
      }),
    );
    expect(migrated).toBe(false);
    expect(dropped).toEqual([]);
    expect(theme.colorsAndType?.name).toBe('Embedded');
    expect(theme.componentConfigs.card.name).toBe('my-card');
  });

  it('strips the server-attached _fileName marker', () => {
    const { theme } = normalizeTheme(v3, resolvers());
    expect(theme.colorsAndType).not.toHaveProperty('_fileName');
    expect(theme.componentConfigs.card).not.toHaveProperty('_fileName');
  });
});
