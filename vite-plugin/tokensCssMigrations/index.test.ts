import { describe, it, expect } from 'vitest';
import {
  runTokensCssMigrations,
  runAdditiveTokensCssMigrations,
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

describe('editorial type role', () => {
  // The role is two inserts in one migration: the stack among the font
  // families, the bundle among the text styles.
  const BEFORE = `:root {
  --font-sans: "Manrope", sans-serif;
  --font-mono: "fira-code", monospace;
  --font-size-md: 1rem;
  --font-weight-normal: 400;
  --line-height-normal: 1.5;
  --letter-spacing-normal: 0;
  --code-font-family: var(--font-mono);
}
`;

  it('adds the stack and both size steps to a tokens.css that predates the role', () => {
    const { css, applied } = runTokensCssMigrations(BEFORE);
    expect(applied).toContain('2026-08-25-editorial-type-role');
    expect(applied).toContain('2026-08-27-editorial-size-steps');
    expect(css).toContain('--font-editorial: var(--font-sans);');
    expect(css).toContain('--editorial-md-font-family: var(--font-editorial);');
    expect(css).toContain('--editorial-md-line-height: var(--line-height-normal);');
    expect(css).toContain('--editorial-sm-font-size: var(--font-size-sm);');
  });

  it('carries a shipped unsized bundle onto the medium step, values intact', () => {
    const sized = BEFORE.replace(
      '--code-font-family: var(--font-mono);',
      '--code-font-family: var(--font-mono);\n  --editorial-font-family: var(--font-editorial);\n  --editorial-font-size: var(--font-size-lg);',
    );
    const { css } = runTokensCssMigrations(sized);
    expect(css).toContain('--editorial-md-font-size: var(--font-size-lg);');
    expect(css).not.toContain('--editorial-font-size:');
  });

  it('defaults to the body face, so a consumer who ignores it renders unchanged', () => {
    const { css } = runTokensCssMigrations(BEFORE);
    const stack = css.match(/--font-editorial:\s*([^;]+);/)?.[1];
    expect(stack).toBe('var(--font-sans)');
  });

  it('leaves a consumer who already repointed the stack alone', () => {
    const repointed = BEFORE.replace(
      '--font-mono: "fira-code", monospace;',
      '--font-mono: "fira-code", monospace;\n  --font-editorial: "Charter", serif;',
    );
    const { css } = runTokensCssMigrations(repointed);
    expect(css).toContain('--font-editorial: "Charter", serif;');
    expect(css).not.toContain('--font-editorial: var(--font-sans);');
  });

  it('is idempotent', () => {
    const once = runTokensCssMigrations(BEFORE).css;
    const twice = runTokensCssMigrations(once).css;
    expect(twice).toBe(once);
  });
});

describe('editorial steps above the reading size', () => {
  const PAIR = `:root {
  --font-editorial: var(--font-sans);
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-weight-normal: 400;
  --line-height-tight: 1.35;
  --line-height-tighter: 1.25;
  --letter-spacing-normal: 0;
  --editorial-md-font-family: var(--font-editorial);
  --editorial-md-font-size: var(--font-size-md);
  --editorial-sm-font-size: var(--font-size-sm);
}
`;

  it('adds both steps to a tokens.css that only has the pair', () => {
    const { css, applied } = runTokensCssMigrations(PAIR);
    expect(applied).toContain('2026-08-27-editorial-large-steps');
    expect(css).toContain('--editorial-lg-font-size: var(--font-size-lg);');
    expect(css).toContain('--editorial-xl-font-size: var(--font-size-xl);');
    expect(css).toContain('--editorial-xl-font-family: var(--font-editorial);');
  });

  it('tightens leading by one step away from the reading size', () => {
    const { css } = runTokensCssMigrations(PAIR);
    expect(css).toContain('--editorial-lg-line-height: var(--line-height-tight);');
    expect(css).toContain('--editorial-xl-line-height: var(--line-height-tighter);');
  });

  it('auto-applies, since it only inserts names', () => {
    const { applied } = runAdditiveTokensCssMigrations(PAIR);
    expect(applied).toContain('2026-08-27-editorial-large-steps');
  });

  it('leaves a step the consumer already tuned alone', () => {
    const tuned = PAIR.replace(
      '--editorial-sm-font-size: var(--font-size-sm);',
      '--editorial-sm-font-size: var(--font-size-sm);\n  --editorial-lg-font-size: var(--font-size-2xl);',
    );
    const { css } = runTokensCssMigrations(tuned);
    expect(css).toContain('--editorial-lg-font-size: var(--font-size-2xl);');
    expect(css).not.toContain('--editorial-lg-font-size: var(--font-size-lg);');
  });

  it('is idempotent', () => {
    const once = runTokensCssMigrations(PAIR).css;
    const twice = runTokensCssMigrations(once).css;
    expect(twice).toBe(once);
  });
});

describe('gradient stop companions', () => {
  const BEFORE = `:root {
  --gradient-1: linear-gradient(to right, var(--color-brand-500) 0%, var(--color-accent-500) 100%);
  --gradient-2: radial-gradient(circle at 50% 50%, var(--color-brand-500) 0%, transparent 100%);
  --gradient-angle-horizontal: 90deg;
}
`;

  it('adds a -stops companion per gradient slot', () => {
    const { css, applied } = runTokensCssMigrations(BEFORE);
    expect(applied).toContain('2026-08-26-gradient-stops');
    expect(css).toContain('--gradient-1-stops: var(--color-brand-500) 0%, var(--color-accent-500) 100%;');
    expect(css).toContain('--gradient-2-stops: var(--color-brand-500) 0%, transparent 100%;');
  });

  it('reads each companion out of the slot it belongs to, not a shipped default', () => {
    const retuned = BEFORE.replace(
      'var(--color-brand-500) 0%, var(--color-accent-500) 100%',
      'red 0%, blue 100%',
    );
    const { css } = runTokensCssMigrations(retuned);
    expect(css).toContain('--gradient-1-stops: red 0%, blue 100%;');
  });

  it('skips a slot whose value it cannot read', () => {
    const aliased = ':root {\n  --gradient-1: var(--brand-sweep);\n}\n';
    const { css } = runTokensCssMigrations(aliased);
    expect(css).not.toContain('--gradient-1-stops');
  });

  it('is idempotent', () => {
    const once = runTokensCssMigrations(BEFORE).css;
    const twice = runTokensCssMigrations(once).css;
    expect(twice).toBe(once);
  });
});

describe('runTokensCssMigrations', () => {
  it('adds the letter-spacing and easing scales an old tokens.css lacks', () => {
    const { css, applied, changed } = runTokensCssMigrations(LEGACY_TOKENS_CSS);
    expect(changed).toBe(true);
    expect(applied).toContain('2026-05-29-typography-scale-additions');
    for (const t of ['--letter-spacing-normal', '--ease-out-quart']) {
      expect(css).toContain(t);
    }
  });

  it('reshapes the size-vocabulary line-height scale to leading vocabulary and retires the 2.0 slot', () => {
    // Old names built dynamically so the deprecated vocabulary never appears as
    // a literal here (Wave 1 invariant: no stale --line-height-{xs..xl} in src).
    const oldSteps = ['xs', 'sm', 'md', 'lg', 'xl'];
    const values = ['1', '1.25', '1.5', '1.75', '2'];
    const modern = `:root {\n${oldSteps
      .map((s, i) => `  --line-height-${s}: ${values[i]};`)
      .join('\n')}\n}\n`;

    const { css, applied } = runTokensCssMigrations(modern);
    expect(applied).toContain('2026-07-20-line-height-rename');
    for (const decl of [
      '--line-height-none: 1;',
      '--line-height-tightest: 1.1;',
      '--line-height-tighter: 1.25;',
      '--line-height-tight: 1.35;',
      '--line-height-normal: 1.5;',
      '--line-height-relaxed: 1.75;',
    ]) {
      expect(css).toContain(decl);
    }
    for (const s of oldSteps) expect(css).not.toContain(`--line-height-${s}`);
    // The old loose/looser names are gone too — the 2.0 slot has no successor.
    expect(css).not.toContain('--line-height-loose');
    expect(css).not.toContain('--line-height-looser');

    expect(runTokensCssMigrations(css).changed).toBe(false);
  });

  it('adds the semantic text-style bundles with fixed heading leading', () => {
    const { css, applied } = runTokensCssMigrations(LEGACY_TOKENS_CSS);
    expect(applied).toContain('2026-07-20-semantic-text-styles');
    for (const decl of [
      '--heading-xl-font-family: var(--font-display);',
      '--heading-sm-font-family: var(--font-sans);',
      '--body-md-line-height: var(--line-height-normal);',
      '--code-font-family: var(--font-mono);',
      '--eyebrow-font-size: var(--font-size-sm);',
      '--eyebrow-text-transform: none;',
    ]) {
      expect(css).toContain(decl);
    }

    // Headings pin their leading at every viewport (no responsive re-point): xl/lg
    // at `tightest` (1.1), md/sm at `tighter` (1.25).
    expect(css).toContain('--heading-xl-line-height: var(--line-height-tightest);');
    expect(css).toContain('--heading-md-line-height: var(--line-height-tighter);');

    // Full fold twice = no change.
    expect(runTokensCssMigrations(css).changed).toBe(false);
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
    // Inserted as hex by the additions migration, then converted by the
    // later oklch migration in the same full run.
    expect(css).toContain('--color-white: oklch(1 0 0);');
    expect(css).toContain('--color-black: oklch(0 0 0);');
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
        --sectiondivider-lg-title-line-height: var(--line-height-none);
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
    expect(tokens).toContain('--line-height-none');
    expect(tokens).toContain('--letter-spacing-normal');
    expect(tokens).not.toContain('--text-primary'); // defined → fine
    expect(missing.find((m) => m.token === '--line-height-none')?.referencedBy).toEqual([
      'sectiondivider',
    ]);
  });

  it('treats generated-sidecar definitions as defined', () => {
    const missing = validateTokensCss({
      tokensCss: `:root { --text-primary: #fff; }`,
      generatedCss: `:root:root { --line-height-none: 1; --letter-spacing-normal: 0; }`,
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
