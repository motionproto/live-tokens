import { describe, expect, it } from 'vitest';
import { migrateComponentConfig } from './migrateComponentConfig';
import { CURRENT_COMPONENT_SCHEMA_VERSION } from './migrations';

describe('migrateComponentConfig', () => {
  it('runs a registered rename migration on a disk-shape alias bag', () => {
    const { aliases } = migrateComponentConfig(
      'progressbar',
      { '--progressbar-track-bg': '--surface-canvas-low' },
      undefined,
      0,
    );
    expect(aliases['--progressbar-track-surface']).toBe('--surface-canvas-low');
    expect(aliases['--progressbar-track-bg']).toBeUndefined();
  });

  it('leaves an alias bag already at the current schema untouched', () => {
    const input = { '--card-radius': '--radius-md' };
    const { aliases, config } = migrateComponentConfig(
      'card',
      input,
      undefined,
      CURRENT_COMPONENT_SCHEMA_VERSION,
    );
    expect(aliases).toEqual(input);
    expect(config).toEqual({});
  });

  it('synthesizes a structured gradient from sectiondivider\'s legacy flat stops, then fans it to lg/md/sm', () => {
    // fileVersion is set past every registered migration so only the two
    // structural passes that run unconditionally (synthesis, then the
    // family→size-variant rename) act on the input.
    const { aliases } = migrateComponentConfig(
      'sectiondivider',
      {
        '--sectiondivider-canvas-gradient-angle': '135deg',
        '--sectiondivider-canvas-gradient-stop-1-color': '--surface-canvas-highest',
        '--sectiondivider-canvas-gradient-stop-1-position': '0%',
        '--sectiondivider-canvas-gradient-stop-2-color': '--surface-canvas-high',
        '--sectiondivider-canvas-gradient-stop-2-position': '100%',
      },
      undefined,
      CURRENT_COMPONENT_SCHEMA_VERSION,
    );
    const synthesized = {
      kind: 'gradient',
      value: {
        type: 'linear',
        angle: 135,
        stops: [
          { position: 0, color: '--surface-canvas-highest' },
          { position: 100, color: '--surface-canvas-high' },
        ],
      },
    };
    expect(aliases['--sectiondivider-lg-background']).toEqual(synthesized);
    expect(aliases['--sectiondivider-md-background']).toEqual(synthesized);
    expect(aliases['--sectiondivider-sm-background']).toEqual(synthesized);
    expect(aliases['--sectiondivider-canvas-gradient']).toBeUndefined();
  });

  it('does not re-synthesize over an already-structured gradient alias before fanning it out', () => {
    const existing = {
      kind: 'gradient' as const,
      value: { type: 'solid' as const, angle: 0, stops: [{ position: 0, color: '--surface-canvas' }] },
    };
    const { aliases } = migrateComponentConfig(
      'sectiondivider',
      {
        '--sectiondivider-canvas-gradient': existing,
        // Flat legacy stops that would synthesize to a *different* gradient
        // if the pre-existing structured alias weren't honored first.
        '--sectiondivider-canvas-gradient-stop-1-color': '--surface-canvas-highest',
        '--sectiondivider-canvas-gradient-stop-2-color': '--surface-canvas-high',
      },
      undefined,
      CURRENT_COMPONENT_SCHEMA_VERSION,
    );
    expect(aliases['--sectiondivider-lg-background']).toEqual(existing);
    expect(aliases['--sectiondivider-md-background']).toEqual(existing);
    expect(aliases['--sectiondivider-sm-background']).toEqual(existing);
  });

  it('fans a canvas-family background gradient across the lg/md/sm variants', () => {
    const canvasGradient = {
      kind: 'gradient' as const,
      value: {
        type: 'linear' as const,
        angle: 90,
        stops: [
          { position: 0, color: '--surface-canvas' },
          { position: 100, color: '--surface-canvas-low' },
        ],
      },
    };
    const { aliases } = migrateComponentConfig(
      'sectiondivider',
      { '--sectiondivider-canvas-background': canvasGradient },
      undefined,
      CURRENT_COMPONENT_SCHEMA_VERSION,
    );
    expect(aliases['--sectiondivider-lg-background']).toEqual(canvasGradient);
    expect(aliases['--sectiondivider-md-background']).toEqual(canvasGradient);
    expect(aliases['--sectiondivider-sm-background']).toEqual(canvasGradient);
    expect(aliases['--sectiondivider-canvas-background']).toBeUndefined();
  });
});
