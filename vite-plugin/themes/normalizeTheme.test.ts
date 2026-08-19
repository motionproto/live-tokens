import { describe, expect, it } from 'vitest';
import { normalizeTheme, type ThemeResolvers } from './normalizeTheme';
import { CURRENT_COMPONENT_SCHEMA_VERSION } from '../../src/editor/core/themes/migrations';

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

// Wave 1 of docs/plans/theme-completeness.md: an embedded component config is
// migrated wherever a theme is read, off the theme-level
// `componentSchemaVersion` (never a per-entry stamp — RJC 9).
describe('normalizeTheme component-config migration', () => {
  const v3WithStaleAlias = {
    name: 'Progress',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: 3,
    colorsAndType: { name: 'Embedded' },
    componentConfigs: {
      progressbar: {
        name: 'my-progressbar',
        component: 'progressbar',
        aliases: { '--progressbar-track-bg': '--surface-canvas-low' },
      },
    },
  };

  it('migrates an embedded config off componentSchemaVersion ?? 0, dropping the stale key', () => {
    const { theme } = normalizeTheme(v3WithStaleAlias, resolvers());
    const aliases = theme.componentConfigs.progressbar.aliases as Record<string, unknown>;
    expect(aliases['--progressbar-track-surface']).toBe('--surface-canvas-low');
    expect(aliases['--progressbar-track-bg']).toBeUndefined();
    expect(theme.componentSchemaVersion).toBe(CURRENT_COMPONENT_SCHEMA_VERSION);
  });

  it('ignores and strips a per-entry schemaVersion inside a theme (RJC 9)', () => {
    const withEntryStamp = {
      ...v3WithStaleAlias,
      componentConfigs: {
        progressbar: {
          ...v3WithStaleAlias.componentConfigs.progressbar,
          // A hand-authored or stale per-entry stamp claiming "already
          // current" must not suppress the theme-level migration pass.
          schemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
        },
      },
    };
    const { theme } = normalizeTheme(withEntryStamp, resolvers());
    const aliases = theme.componentConfigs.progressbar.aliases as Record<string, unknown>;
    expect(aliases['--progressbar-track-surface']).toBe('--surface-canvas-low');
    expect(theme.componentConfigs.progressbar).not.toHaveProperty('schemaVersion');
  });

  it('passes a theme already at the current component schema through byte-identical', () => {
    const current = {
      name: 'Progress',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      schemaVersion: 3,
      colorsAndType: { name: 'Embedded' },
      componentConfigs: {
        progressbar: {
          name: 'my-progressbar',
          component: 'progressbar',
          aliases: { '--progressbar-track-surface': '--surface-canvas-low' },
        },
      },
      componentSchemaVersion: CURRENT_COMPONENT_SCHEMA_VERSION,
    };
    const { theme, migrated } = normalizeTheme(current, resolvers());
    expect(migrated).toBe(false);
    expect(theme).toEqual(current);
  });
});

// Reviewer should-fix on Wave 1 (docs/plans/theme-completeness.md): the client
// always follows `migrateComponentConfig` with `splitAliasesAndConfig`, which
// routes `KNOWN_COMPONENT_CONFIG_KEYS` matches back into `config`. The server
// has no such follow-up of its own and must do the same routing, in disk
// shape, or a KNOWN key ends up persisted in the wrong bucket.
describe('normalizeTheme routes KNOWN_COMPONENT_CONFIG_KEYS back into config', () => {
  const withConfigBucket = {
    name: 'Dialog Theme',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: 3,
    colorsAndType: { name: 'Embedded' },
    componentConfigs: {
      dialog: {
        name: 'my-dialog',
        component: 'dialog',
        aliases: { '--dialog-radius': '--radius-md' },
        config: { '--dialog-confirm-variant': 'primary' },
      },
    },
  };

  it('keeps a KNOWN key in config, not aliases, when it arrives in the config bucket', () => {
    const { theme } = normalizeTheme(withConfigBucket, resolvers());
    const dialog = theme.componentConfigs.dialog as Record<string, unknown>;
    expect(dialog.config).toEqual({ '--dialog-confirm-variant': 'primary' });
    expect(dialog.aliases).not.toHaveProperty('--dialog-confirm-variant');
    expect((dialog.aliases as Record<string, unknown>)['--dialog-radius']).toBe('--radius-md');
  });

  it('round-trips byte-identical on a second normalize', () => {
    const { theme: first } = normalizeTheme(withConfigBucket, resolvers());
    const { theme: second } = normalizeTheme(first, resolvers());
    expect(second).toEqual(first);
  });

  const withConfigKeyInAliasBucket = {
    name: 'Dialog Theme Legacy',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    schemaVersion: 3,
    colorsAndType: { name: 'Embedded' },
    componentConfigs: {
      dialog: {
        name: 'my-dialog',
        component: 'dialog',
        // A legacy single-bucket file: the KNOWN key arrives alongside real
        // aliases in the same bag, no separate `config` field at all.
        aliases: {
          '--dialog-radius': '--radius-md',
          '--dialog-confirm-variant': 'primary',
        },
      },
    },
  };

  it('routes a KNOWN key out of the alias bucket into config when it arrives there instead', () => {
    const { theme } = normalizeTheme(withConfigKeyInAliasBucket, resolvers());
    const dialog = theme.componentConfigs.dialog as Record<string, unknown>;
    expect(dialog.config).toEqual({ '--dialog-confirm-variant': 'primary' });
    expect(dialog.aliases).not.toHaveProperty('--dialog-confirm-variant');
    expect((dialog.aliases as Record<string, unknown>)['--dialog-radius']).toBe('--radius-md');
  });

  it('round-trips byte-identical on a second normalize from the alias-bucket source', () => {
    const { theme: first } = normalizeTheme(withConfigKeyInAliasBucket, resolvers());
    const { theme: second } = normalizeTheme(first, resolvers());
    expect(second).toEqual(first);
  });

  it('lets an explicit config-bucket value win over a same-key alias-bucket collision', () => {
    const bothBuckets = {
      ...withConfigBucket,
      componentConfigs: {
        dialog: {
          ...withConfigBucket.componentConfigs.dialog,
          aliases: {
            '--dialog-radius': '--radius-md',
            '--dialog-confirm-variant': 'stale-legacy-value',
          },
        },
      },
    };
    const { theme } = normalizeTheme(bothBuckets, resolvers());
    const dialog = theme.componentConfigs.dialog as Record<string, unknown>;
    expect(dialog.config).toEqual({ '--dialog-confirm-variant': 'primary' });
  });
});
