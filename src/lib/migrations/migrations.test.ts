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

  it('component-config at version 2 → collapsiblesection state tokens namespace into container; v3→v4 cleanup applies on top', () => {
    const v2 = {
      '--collapsiblesection-default-surface': '--surface-canvas-high',
      '--collapsiblesection-hover-icon': '--text-primary',
      '--collapsiblesection-active-border': '--color-primary-400',
      '--collapsiblesection-expanded-padding': '--space-4',
      '--collapsiblesection-default-label-font-family': '--font-sans',
    };
    const migrated = runMigrations('component-config', 2, v2, {
      component: 'collapsiblesection',
    });
    // Old, unscoped keys are gone after v2→v3
    expect(migrated['--collapsiblesection-default-surface']).toBeUndefined();
    expect(migrated['--collapsiblesection-hover-icon']).toBeUndefined();
    // Surviving header tokens land in the container namespace
    expect(migrated['--collapsiblesection-container-default-surface']).toBe('--surface-canvas-high');
    expect(migrated['--collapsiblesection-container-hover-icon']).toBe('--text-primary');
    expect(migrated['--collapsiblesection-container-default-label-font-family']).toBe('--font-sans');
    expect(migrated['--collapsiblesection-container-expanded-padding']).toBe('--space-4');
    // v3→v4 drops container active-border (frame owns chrome now); the
    // pre-existing default-surface is also seeded into the new frame namespace.
    expect(migrated['--collapsiblesection-container-active-border']).toBeUndefined();
    expect(migrated['--collapsiblesection-container-frame-surface']).toBe('--surface-canvas-high');
  });

  it('component-config v2 namespace migration only fires for collapsiblesection', () => {
    const v2 = { '--button-primary-surface': '--surface-success' };
    const out = runMigrations('component-config', 2, v2, { component: 'button' });
    expect(out).toEqual(v2);
  });

  it('component-config at version 3 → collapsiblesection container chrome moves into frame, dead per-state tokens drop', () => {
    const v3 = {
      // Container default-state chrome → frame (values preserved).
      '--collapsiblesection-container-default-surface': '--surface-canvas-high',
      '--collapsiblesection-container-default-border': '--color-primary-400',
      '--collapsiblesection-container-default-border-width': '--border-width-3',
      '--collapsiblesection-container-default-radius': '--radius-md',
      '--collapsiblesection-container-default-padding': '--space-4',
      // Container hover/active border tokens drop (frame owns chrome).
      '--collapsiblesection-container-hover-border': '--color-primary-500',
      '--collapsiblesection-container-hover-border-width': '--border-width-3',
      '--collapsiblesection-container-active-radius': '--radius-md',
      '--collapsiblesection-container-active-surface': '--surface-canvas-low',
      // Chromeless per-state border / radius drop.
      '--collapsiblesection-chromeless-default-border': '--color-primary-400',
      '--collapsiblesection-chromeless-hover-border-width': '--border-width-1',
      '--collapsiblesection-chromeless-active-radius': '--radius-none',
      '--collapsiblesection-chromeless-default-padding': '--space-4',
      // Divider radius drops; divider border-* survives (paints bottom rule).
      '--collapsiblesection-divider-default-border': '--border-neutral-faint',
      '--collapsiblesection-divider-default-border-width': '--border-width-1',
      '--collapsiblesection-divider-default-radius': '--radius-none',
      // Expanded panel: only padding for chromeless/divider; surface + padding for container.
      '--collapsiblesection-chromeless-expanded-border': '--color-primary-400',
      '--collapsiblesection-chromeless-expanded-surface': '--surface-canvas',
      '--collapsiblesection-chromeless-expanded-padding': '--space-4',
      '--collapsiblesection-container-expanded-radius': '--radius-md',
      '--collapsiblesection-container-expanded-surface': '--surface-canvas-low',
      '--collapsiblesection-container-expanded-padding': '--space-4',
    };
    const migrated = runMigrations('component-config', 3, v3, {
      component: 'collapsiblesection',
    });
    // Container frame-* seeded from old default-state tokens
    expect(migrated['--collapsiblesection-container-frame-surface']).toBe('--surface-canvas-high');
    expect(migrated['--collapsiblesection-container-frame-border']).toBe('--color-primary-400');
    expect(migrated['--collapsiblesection-container-frame-border-width']).toBe('--border-width-3');
    expect(migrated['--collapsiblesection-container-frame-radius']).toBe('--radius-md');
    // Container default-state surface + padding survive (still drive header strip)
    expect(migrated['--collapsiblesection-container-default-surface']).toBe('--surface-canvas-high');
    expect(migrated['--collapsiblesection-container-default-padding']).toBe('--space-4');
    // Container default-state border / radius dropped (frame owns them now)
    expect(migrated['--collapsiblesection-container-default-border']).toBeUndefined();
    expect(migrated['--collapsiblesection-container-default-border-width']).toBeUndefined();
    expect(migrated['--collapsiblesection-container-default-radius']).toBeUndefined();
    // Container hover/active border tokens dropped
    expect(migrated['--collapsiblesection-container-hover-border']).toBeUndefined();
    expect(migrated['--collapsiblesection-container-hover-border-width']).toBeUndefined();
    expect(migrated['--collapsiblesection-container-active-radius']).toBeUndefined();
    // Container hover/active surface survives (header strip)
    expect(migrated['--collapsiblesection-container-active-surface']).toBe('--surface-canvas-low');
    // Chromeless per-state border / radius dropped; padding stays
    expect(migrated['--collapsiblesection-chromeless-default-border']).toBeUndefined();
    expect(migrated['--collapsiblesection-chromeless-hover-border-width']).toBeUndefined();
    expect(migrated['--collapsiblesection-chromeless-active-radius']).toBeUndefined();
    expect(migrated['--collapsiblesection-chromeless-default-padding']).toBe('--space-4');
    // Divider border / border-width survive; radius drops
    expect(migrated['--collapsiblesection-divider-default-border']).toBe('--border-neutral-faint');
    expect(migrated['--collapsiblesection-divider-default-border-width']).toBe('--border-width-1');
    expect(migrated['--collapsiblesection-divider-default-radius']).toBeUndefined();
    // Expanded panel cleanup
    expect(migrated['--collapsiblesection-chromeless-expanded-border']).toBeUndefined();
    expect(migrated['--collapsiblesection-chromeless-expanded-surface']).toBeUndefined();
    expect(migrated['--collapsiblesection-chromeless-expanded-padding']).toBe('--space-4');
    expect(migrated['--collapsiblesection-container-expanded-radius']).toBeUndefined();
    expect(migrated['--collapsiblesection-container-expanded-surface']).toBe('--surface-canvas-low');
    expect(migrated['--collapsiblesection-container-expanded-padding']).toBe('--space-4');
  });

  it('component-config at version 4 → sectiondivider gradient stops migrate to angle + stop-{n}-{color,position}', () => {
    const v4 = {
      '--sectiondivider-canvas-padding': '--space-16',
      '--sectiondivider-canvas-gradient-stop-1': '--surface-canvas-highest',
      '--sectiondivider-canvas-gradient-stop-2': '--surface-canvas-higher',
      '--sectiondivider-canvas-gradient-stop-3': '--surface-canvas-high',
      '--sectiondivider-canvas-gradient-stop-4': '--surface-canvas',
      '--sectiondivider-primary-gradient-stop-1': '--color-primary-300',
      '--sectiondivider-primary-gradient-stop-2': '--color-primary-500',
      '--sectiondivider-primary-gradient-stop-4': '--color-primary-800',
    };
    const migrated = runMigrations('component-config', 4, v4, { component: 'sectiondivider' });
    // Old keys gone
    expect(migrated['--sectiondivider-canvas-gradient-stop-1']).toBeUndefined();
    expect(migrated['--sectiondivider-canvas-gradient-stop-3']).toBeUndefined();
    expect(migrated['--sectiondivider-canvas-gradient-stop-4']).toBeUndefined();
    // Unrelated tokens preserved
    expect(migrated['--sectiondivider-canvas-padding']).toBe('--space-16');
    // Canvas: colors mapped from old 1, 2, 4
    expect(migrated['--sectiondivider-canvas-gradient-angle']).toBe('--gradient-angle-diagonal');
    expect(migrated['--sectiondivider-canvas-gradient-stop-1-color']).toBe('--surface-canvas-highest');
    expect(migrated['--sectiondivider-canvas-gradient-stop-1-position']).toBe('--gradient-stop-start');
    expect(migrated['--sectiondivider-canvas-gradient-stop-2-color']).toBe('--surface-canvas-higher');
    expect(migrated['--sectiondivider-canvas-gradient-stop-2-position']).toBe('--gradient-stop-mid');
    expect(migrated['--sectiondivider-canvas-gradient-stop-3-color']).toBe('--surface-canvas');
    expect(migrated['--sectiondivider-canvas-gradient-stop-3-position']).toBe('--gradient-stop-end');
    // Primary: user-tuned colors carry across
    expect(migrated['--sectiondivider-primary-gradient-stop-1-color']).toBe('--color-primary-300');
    expect(migrated['--sectiondivider-primary-gradient-stop-2-color']).toBe('--color-primary-500');
    expect(migrated['--sectiondivider-primary-gradient-stop-3-color']).toBe('--color-primary-800');
    // Variants the file didn't set still gain default colors and angle/positions
    expect(migrated['--sectiondivider-special-gradient-angle']).toBe('--gradient-angle-diagonal');
    expect(migrated['--sectiondivider-special-gradient-stop-1-color']).toBe('--surface-special-highest');
    expect(migrated['--sectiondivider-special-gradient-stop-3-position']).toBe('--gradient-stop-end');
  });

  it('component-config v4 sectiondivider migration only fires for sectiondivider', () => {
    const v4 = { '--button-primary-gradient-stop-1': '--color-primary-300' };
    const out = runMigrations('component-config', 4, v4, { component: 'button' });
    expect(out).toEqual(v4);
  });

  it('component-config v4 sectiondivider migration is idempotent on the new shape', () => {
    const newShape = {
      '--sectiondivider-canvas-gradient-angle': '--gradient-angle-horizontal',
      '--sectiondivider-canvas-gradient-stop-1-color': '--color-primary-200',
      '--sectiondivider-canvas-gradient-stop-1-position': '10%',
      '--sectiondivider-canvas-gradient-stop-2-color': '--color-primary-500',
      '--sectiondivider-canvas-gradient-stop-2-position': '40%',
      '--sectiondivider-canvas-gradient-stop-3-color': '--color-primary-900',
      '--sectiondivider-canvas-gradient-stop-3-position': '85%',
    };
    const out = runMigrations('component-config', 4, newShape, { component: 'sectiondivider' });
    // User-tuned values for canvas survive; other variants get scale defaults.
    expect(out['--sectiondivider-canvas-gradient-angle']).toBe('--gradient-angle-horizontal');
    expect(out['--sectiondivider-canvas-gradient-stop-1-color']).toBe('--color-primary-200');
    expect(out['--sectiondivider-canvas-gradient-stop-1-position']).toBe('10%');
    expect(out['--sectiondivider-canvas-gradient-stop-2-position']).toBe('40%');
    expect(out['--sectiondivider-canvas-gradient-stop-3-position']).toBe('85%');
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
