import { describe, expect, it } from 'vitest';
import {
  CURRENT_THEME_SCHEMA_VERSION,
  CURRENT_COMPONENT_SCHEMA_VERSION,
  runMigrations,
} from './index';

describe('migration runner — schemaVersion gating', () => {
  it('CURRENT_*_SCHEMA_VERSION are positive (at least one migration registered each)', () => {
    expect(CURRENT_THEME_SCHEMA_VERSION).toBeGreaterThan(0);
    expect(CURRENT_COMPONENT_SCHEMA_VERSION).toBeGreaterThan(0);
  });

  it('legacy theme (schemaVersion: 0) → bg/canvas + legacy-key renames applied; resaved file matches modern shape', () => {
    const legacy = {
      // bg → canvas pattern (exact match + boundary suffix)
      '--surface-bg': '#fff',
      '--text-bg': '#000',
      '--border-bg-strong': '#888',
      // explicit legacy renames
      '--empty': '#111',
      '--empty-attachment': 'fixed',
      // orphan token (silent drop)
      '--border-neutral': '#ccc',
      // unrelated key passes through
      '--text-primary': '#333',
    };
    const migrated = runMigrations('theme', 0, legacy);
    expect(migrated['--surface-canvas']).toBe('#fff');
    expect(migrated['--text-canvas']).toBe('#000');
    expect(migrated['--border-canvas-strong']).toBe('#888');
    expect(migrated['--page-bg']).toBe('#111');
    expect(migrated['--page-bg-attachment']).toBe('fixed');
    expect(migrated['--border-neutral']).toBeUndefined();
    expect(migrated['--text-primary']).toBe('#333');
    // The "drop" old keys are gone
    expect(migrated['--surface-bg']).toBeUndefined();
    expect(migrated['--empty']).toBeUndefined();
  });

  it('file already at current theme version → no migrations run (passthrough)', () => {
    const modern = { '--surface-canvas': '#fff', '--text-primary': '#333' };
    const out = runMigrations('theme', CURRENT_THEME_SCHEMA_VERSION, modern);
    expect(out).toEqual(modern);
    // identity-preserved values
    expect(out['--surface-canvas']).toBe('#fff');
  });

  it('legacy component-config (schemaVersion: 0) → prefix + suffix renames; segmentedcontrol option-disabled flatten', () => {
    const legacy = {
      // abbreviated prefix
      '--segment-option-bg': '#eee',
      // segmentedcontrol option-disabled → disabled flatten
      '--segmentedcontrol-option-disabled-text': '#999',
      // selected-disabled is dropped (impossible state)
      '--segmentedcontrol-selected-disabled-bg': 'red',
      // selected-hover is dropped
      '--segmentedcontrol-selected-hover-bg': 'blue',
      // unrelated key
      '--segment-track-radius': '4px',
    };
    const migrated = runMigrations('component-config', 0, legacy, {
      component: 'segmentedcontrol',
    });
    // Prefix renamed, then option-disabled flattened... actually option-disabled
    // was already on the long-form name, so it goes through the flatten step.
    expect(migrated['--segmentedcontrol-option-bg']).toBe('#eee');
    expect(migrated['--segmentedcontrol-disabled-text']).toBe('#999');
    expect(migrated['--segmentedcontrol-selected-disabled-bg']).toBeUndefined();
    expect(migrated['--segmentedcontrol-selected-hover-bg']).toBeUndefined();
    expect(migrated['--segmentedcontrol-track-radius']).toBe('4px');
  });

  it('component-config file at version 1 → only the >=1 migrations run (segmentedcontrol flatten only)', () => {
    const v1 = {
      // Already on long-form prefix; v1 → v2 step still applies for sc
      '--segmentedcontrol-option-disabled-text': '#999',
      // suffix-rename rules from v0→v1 should NOT re-apply; abbreviated keys
      // present at v1 are user-authored and untouched
      '--segment-something': 'should-pass-through',
    };
    const migrated = runMigrations('component-config', 1, v1, {
      component: 'segmentedcontrol',
    });
    expect(migrated['--segmentedcontrol-disabled-text']).toBe('#999');
    // v0→v1 prefix rename did NOT re-run
    expect(migrated['--segment-something']).toBe('should-pass-through');
    expect(migrated['--segmentedcontrol-something']).toBeUndefined();
  });

  it('component-config at current version → no migrations run', () => {
    const current = { '--button-primary-surface': '--surface-success' };
    const out = runMigrations(
      'component-config',
      CURRENT_COMPONENT_SCHEMA_VERSION,
      current,
      { component: 'button' },
    );
    expect(out).toEqual(current);
  });

  it('runMigrations is pure — does not mutate the input map', () => {
    const input = { '--surface-bg': '#fff' };
    const before = { ...input };
    runMigrations('theme', 0, input);
    expect(input).toEqual(before);
  });
});
