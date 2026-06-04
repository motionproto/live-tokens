import { describe, it, expect } from 'vitest';
import {
  runTokensCssMigrations,
  validateTokensCss,
  TOKENS_CSS_MIGRATIONS,
} from './index';

// A tokens.css from an older generation: named line-height scale, no
// letter-spacing or easing — the exact shape that strands 0.16.x components.
const LEGACY_TOKENS_CSS = `:root {
  --font-size-md: 1rem;
  --font-weight-normal: 400;
  --line-height-tight: 0.9;
  --line-height-normal: 1.25;
}
`;

describe('runTokensCssMigrations', () => {
  it('adds the typography + motion scales an old tokens.css lacks', () => {
    const { css, applied, changed } = runTokensCssMigrations(LEGACY_TOKENS_CSS);
    expect(changed).toBe(true);
    expect(applied).toContain('2026-05-29-typography-scale-additions');
    for (const t of ['--line-height-xs', '--line-height-md', '--letter-spacing-normal', '--ease-out-quart']) {
      expect(css).toContain(t);
    }
    // Leaves the legacy named scale in place (other tokens may reference it).
    expect(css).toContain('--line-height-tight: 0.9;');
  });

  it('adds the --scale-* transform scale an old tokens.css lacks', () => {
    const { css, applied } = runTokensCssMigrations(LEGACY_TOKENS_CSS);
    expect(applied).toContain('2026-06-03-transform-scale-additions');
    for (const t of ['--scale-sm', '--scale-md', '--scale-lg', '--scale-xl', '--scale-2xl']) {
      expect(css).toContain(t);
    }
  });

  it('adds the full easing scale, color invariants and --font-size-7xl an old tokens.css lacks', () => {
    const { css, applied } = runTokensCssMigrations(LEGACY_TOKENS_CSS);
    expect(applied).toContain('2026-06-04-easing-color-and-typescale-additions');
    // The step Image's zoom transition references, plus a representative spread.
    for (const t of ['--ease-out-cubic', '--ease-linear', '--ease-in-out-back', '--ease-out-bounce']) {
      expect(css).toContain(t);
    }
    expect(css).toContain('--color-white: #ffffff;');
    expect(css).toContain('--color-black: #000000;');
    expect(css).toContain('--font-size-7xl: 4.5rem;');
    // The whole easing family sits under one "Easing" header, not two.
    expect((css.match(/\/\* Easing \*\//g) ?? []).length).toBe(1);
  });

  it('keeps a consumer-retuned easing value instead of overwriting it', () => {
    const tuned = `:root {
  /* Easing */
  --ease-out-cubic: cubic-bezier(0.1, 0.2, 0.3, 0.4);
}
`;
    const { css } = runTokensCssMigrations(tuned);
    expect(css).toContain('--ease-out-cubic: cubic-bezier(0.1, 0.2, 0.3, 0.4);');
    expect(css).not.toContain('--ease-out-cubic: cubic-bezier(0.33, 1, 0.68, 1);');
    expect(css).toContain('--ease-in-sine'); // siblings still backfilled
  });

  it('is idempotent — a second run changes nothing', () => {
    const first = runTokensCssMigrations(LEGACY_TOKENS_CSS).css;
    const second = runTokensCssMigrations(first);
    expect(second.changed).toBe(false);
    expect(second.css).toBe(first);
    expect(second.applied).toEqual([]);
  });

  it('removes legacy --sectiondivider-* tokens not on the lg/md/sm axis', () => {
    const legacy = `:root {
  --sectiondivider-lg-title-color: var(--text-primary);
  --sectiondivider-canvas-title-font-size: var(--font-size-5xl);
  --sectiondivider-title-font-size: var(--font-size-5xl);
  --sectiondivider-accent-padding: var(--space-16);
}
`;
    const { css } = runTokensCssMigrations(legacy);
    expect(css).toContain('--sectiondivider-lg-title-color'); // current axis kept
    expect(css).not.toContain('--sectiondivider-canvas-title-font-size');
    expect(css).not.toContain('--sectiondivider-title-font-size');
    expect(css).not.toContain('--sectiondivider-accent-padding');
  });

  it('removes the dead --size-icon-* scale but keeps live --icon-size-*', () => {
    const legacy = `:root {
  --size-icon-sm: 1rem;
  --size-icon-4xl: 8rem;
  --icon-size-md: 1.125rem;
}
`;
    const { css } = runTokensCssMigrations(legacy);
    expect(css).not.toContain('--size-icon-sm');
    expect(css).not.toContain('--size-icon-4xl');
    expect(css).toContain('--icon-size-md');
  });

  it('every registered migration has a unique dated id', () => {
    const ids = TOKENS_CSS_MIGRATIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^\d{4}-\d{2}-\d{2}-/);
  });
});

describe('validateTokensCss', () => {
  const componentSources = [
    {
      name: 'sectiondivider',
      source: `<style>:global(:root) {
        --sectiondivider-lg-title-line-height: var(--line-height-xs);
        --sectiondivider-lg-title-letter-spacing: var(--letter-spacing-normal);
        --sectiondivider-lg-title-color: var(--text-primary);
      }</style>`,
    },
  ];

  it('reports primitives referenced by components but undefined in the runtime', () => {
    const missing = validateTokensCss({
      tokensCss: `:root { --text-primary: #fff; }`,
      componentSources,
    });
    const tokens = missing.map((m) => m.token);
    expect(tokens).toContain('--line-height-xs');
    expect(tokens).toContain('--letter-spacing-normal');
    expect(tokens).not.toContain('--text-primary'); // defined → fine
    expect(missing.find((m) => m.token === '--line-height-xs')?.referencedBy).toEqual([
      'sectiondivider',
    ]);
  });

  it('treats generated-sidecar definitions as defined', () => {
    const missing = validateTokensCss({
      tokensCss: `:root { --text-primary: #fff; }`,
      generatedCss: `:root:root { --line-height-xs: 1; --letter-spacing-normal: 0; }`,
      componentSources,
    });
    expect(missing).toEqual([]);
  });

  it('clears once the migration has run on tokens.css', () => {
    const migrated = runTokensCssMigrations(`:root { --text-primary: #fff; }`).css;
    const missing = validateTokensCss({ tokensCss: migrated, componentSources });
    expect(missing).toEqual([]);
  });

  it('does not flag component-to-component references', () => {
    const sources = [
      { name: 'a', source: `<style>:global(:root){ --a-x: var(--b-y); }</style>` },
      { name: 'b', source: `<style>:global(:root){ --b-y: var(--text-primary); }</style>` },
    ];
    const missing = validateTokensCss({
      tokensCss: `:root { --text-primary: #fff; }`,
      componentSources: sources,
    });
    expect(missing).toEqual([]);
  });
});
