// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { get } from 'svelte/store';
import {
  editorState,
  componentDirty,
  setComponentAlias,
  clearComponentAlias,
  setComponentConfig,
  clearComponentConfig,
  loadComponentActive,
  markComponentSaved,
  seedComponentsFromApi,
  undo,
  redo,
  __resetForTests,
} from '../store/editorStore';
import { componentConfigFromState } from './componentConfigService';
import { CURRENT_COMPONENT_SCHEMA_VERSION } from '../themes/migrations';

const tokenRef = (name: string) => ({ kind: 'token' as const, name });

beforeEach(() => {
  __resetForTests();
});

describe('component aliases — editor-state round trip', () => {
  it('setComponentAlias → undo restores previous state; redo reapplies', () => {
    setComponentAlias('button', '--button-primary-surface', tokenRef('--surface-success-high'));
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toEqual(tokenRef('--surface-success-high'));

    setComponentAlias('button', '--button-primary-surface', tokenRef('--surface-error-high'));
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toEqual(tokenRef('--surface-error-high'));

    undo();
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toEqual(tokenRef('--surface-success-high'));

    redo();
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toEqual(tokenRef('--surface-error-high'));
  });

  it('clearComponentAlias removes the entry and is undoable', () => {
    setComponentAlias('button', '--button-primary-surface', tokenRef('--surface-success-high'));
    clearComponentAlias('button', '--button-primary-surface');
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toBeUndefined();

    undo();
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toEqual(tokenRef('--surface-success-high'));
  });

  it('setComponentAlias implicitly registers the slice', () => {
    setComponentAlias('card', '--card-radius', tokenRef('--radius-lg'));
    expect(get(editorState).components.card.aliases['--card-radius']).toEqual(tokenRef('--radius-lg'));
    expect(get(editorState).components.card.config).toEqual({});
  });
});

describe('component config — literal-valued knobs', () => {
  it('setComponentConfig stores the value and is undoable', () => {
    setComponentConfig('dialog', '--dialog-confirm-variant', 'danger');
    expect(get(editorState).components.dialog.config['--dialog-confirm-variant']).toBe('danger');

    setComponentConfig('dialog', '--dialog-confirm-variant', 'warning');
    expect(get(editorState).components.dialog.config['--dialog-confirm-variant']).toBe('warning');

    undo();
    expect(get(editorState).components.dialog.config['--dialog-confirm-variant']).toBe('danger');
  });

  it('clearComponentConfig removes the entry', () => {
    setComponentConfig('dialog', '--dialog-confirm-variant', 'danger');
    clearComponentConfig('dialog', '--dialog-confirm-variant');
    expect(get(editorState).components.dialog.config['--dialog-confirm-variant']).toBeUndefined();
  });

  it('setComponentConfig implicitly registers the slice with empty aliases', () => {
    setComponentConfig('dialog', '--dialog-cancel-variant', 'outline');
    expect(get(editorState).components.dialog.aliases).toEqual({});
    expect(get(editorState).components.dialog.config['--dialog-cancel-variant']).toBe('outline');
  });
});

describe('componentDirty — per-component scoping', () => {
  it('marks a component dirty only after its aliases diverge from the saved baseline', () => {
    loadComponentActive('button', { '--button-primary-surface': '--surface-success-high' });
    expect(get(componentDirty).button).toBe(false);

    setComponentAlias('button', '--button-primary-surface', tokenRef('--surface-error-high'));
    expect(get(componentDirty).button).toBe(true);

    markComponentSaved('button');
    expect(get(componentDirty).button).toBe(false);
  });

  it('marks a component dirty when config diverges from the saved baseline', () => {
    loadComponentActive('dialog', {}, { '--dialog-confirm-variant': 'primary' });
    expect(get(componentDirty).dialog).toBe(false);

    setComponentConfig('dialog', '--dialog-confirm-variant', 'danger');
    expect(get(componentDirty).dialog).toBe(true);

    markComponentSaved('dialog');
    expect(get(componentDirty).dialog).toBe(false);
  });

  it('editing one component does not dirty another', () => {
    loadComponentActive('button', { '--button-primary-surface': '--surface-success-high' });
    loadComponentActive('card', { '--card-radius': '--radius-md' });
    expect(get(componentDirty).button).toBe(false);
    expect(get(componentDirty).card).toBe(false);

    setComponentAlias('button', '--button-primary-surface', tokenRef('--surface-error-high'));
    expect(get(componentDirty).button).toBe(true);
    expect(get(componentDirty).card).toBe(false);
  });

  it('undo after a saved state marks dirty again', () => {
    loadComponentActive('button', { '--button-primary-surface': '--surface-success-high' });
    setComponentAlias('button', '--button-primary-surface', tokenRef('--surface-error-high'));
    markComponentSaved('button');
    expect(get(componentDirty).button).toBe(false);

    undo();
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toEqual(tokenRef('--surface-success-high'));
    expect(get(componentDirty).button).toBe(true);
  });
});

describe('loadComponentActive — split-on-load migration', () => {
  it('routes legacy config keys from single-bucket aliases into the config bucket', () => {
    loadComponentActive('dialog', {
      '--dialog-surface': '--surface-neutral-low',
      '--dialog-confirm-variant': 'danger',
    });
    const slice = get(editorState).components.dialog;
    expect(slice.aliases['--dialog-surface']).toEqual(tokenRef('--surface-neutral-low'));
    expect(slice.aliases['--dialog-confirm-variant']).toBeUndefined();
    expect(slice.config['--dialog-confirm-variant']).toBe('danger');
  });

  it('keeps CSS-var-valued aliases (e.g. --button-shimmer → --shimmer-on) in the aliases bucket', () => {
    loadComponentActive('button', {
      '--button-primary-surface': '--surface-success-high',
      '--button-shimmer': '--shimmer-on',
    });
    const slice = get(editorState).components.button;
    expect(slice.aliases['--button-primary-surface']).toEqual(tokenRef('--surface-success-high'));
    expect(slice.aliases['--button-shimmer']).toEqual(tokenRef('--shimmer-on'));
    expect(slice.config['--button-shimmer']).toBeUndefined();
  });

  it('classifies literal alias values as kind "literal"', () => {
    loadComponentActive('myComp', {
      '--my-comp-token': '--some-token',
      '--my-comp-color': 'rebeccapurple',
    });
    const slice = get(editorState).components.myComp;
    expect(slice.aliases['--my-comp-token']).toEqual(tokenRef('--some-token'));
    expect(slice.aliases['--my-comp-color']).toEqual({ kind: 'literal', value: 'rebeccapurple' });
  });

  it('explicit config field wins over legacy alias-bucketed value', () => {
    loadComponentActive(
      'dialog',
      { '--dialog-confirm-variant': 'primary' },
      { '--dialog-confirm-variant': 'danger' },
    );
    expect(get(editorState).components.dialog.config['--dialog-confirm-variant']).toBe('danger');
  });
});

describe('component config — load/save lifecycle', () => {
  it('preserves modern Section Divider aliases when an unversioned config is migrated and saved', () => {
    const diskAliases = {
      '--sectiondivider-md-padding': '--space-4',
      '--sectiondivider-md-title-letter-spacing': '--letter-spacing-normal',
      '--sectiondivider-md-eyebrow-letter-spacing': '--letter-spacing-wide',
      '--sectiondivider-md-title': '--color-brand-700',
      '--sectiondivider-md-hairline-color': 'color-mix(in srgb, var(--color-white) 34%, transparent)',
    };

    // Embedded component snapshots written before schema stamps existed are
    // treated as v0. Saving one must not mutate already-modern token names.
    loadComponentActive('sectiondivider', diskAliases, {}, 0);
    const firstSave = componentConfigFromState(
      get(editorState),
      'sectiondivider',
      'Spring Meadow',
    );

    expect(firstSave.aliases).toEqual(diskAliases);
    expect(firstSave.schemaVersion).toBe(CURRENT_COMPONENT_SCHEMA_VERSION);

    // Once stamped, another load/save pass is byte-shape stable for the
    // component-owned payload (timestamps are intentionally refreshed).
    loadComponentActive(
      'sectiondivider',
      firstSave.aliases,
      firstSave.config,
      firstSave.schemaVersion,
    );
    const secondSave = componentConfigFromState(
      get(editorState),
      'sectiondivider',
      'Spring Meadow',
    );

    expect(secondSave.aliases).toEqual(firstSave.aliases);
    expect(secondSave.config).toEqual(firstSave.config);
    expect(secondSave.schemaVersion).toBe(firstSave.schemaVersion);
  });
});

describe('seedComponentsFromApi — boot-time hydration', () => {
  it('populates state and establishes the clean baseline', () => {
    seedComponentsFromApi({
      button: { aliases: { '--button-primary-surface': '--surface-success-high' } },
    });
    expect(get(editorState).components.button.aliases['--button-primary-surface']).toEqual(tokenRef('--surface-success-high'));
    expect(get(componentDirty).button).toBe(false);
  });

  it('routes config keys when seeding from legacy single-bucket API payload', () => {
    seedComponentsFromApi({
      dialog: {
        aliases: { '--dialog-confirm-variant': 'danger', '--dialog-shadow': '--shadow-2xl' },
      },
    });
    const slice = get(editorState).components.dialog;
    expect(slice.aliases['--dialog-shadow']).toEqual(tokenRef('--shadow-2xl'));
    expect(slice.aliases['--dialog-confirm-variant']).toBeUndefined();
    expect(slice.config['--dialog-confirm-variant']).toBe('danger');
  });

  it('replaces the full components slice', () => {
    setComponentAlias('card', '--card-radius', tokenRef('--radius-md'));
    seedComponentsFromApi({
      button: { aliases: {} },
    });
    expect(get(editorState).components.card).toBeUndefined();
    expect(get(editorState).components.button).toBeDefined();
  });
});
