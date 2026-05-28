import { describe, it, expect } from 'vitest';
import {
  collectDefinedTokens,
  collectReferencedTokens,
  ensureScale,
  renameToken,
  removeToken,
  removeTokensMatching,
} from './cssTokenOps';

const ROOT = `:root {
  /* Type scale */
  --font-size-md: 1rem;
  --font-size-lg: 1.25rem;
  --font-weight-normal: 400;
}
`;

describe('collectDefinedTokens', () => {
  it('finds declarations, not var() references', () => {
    const css = `:root { --a: 1; --b: var(--a); }`;
    const defs = collectDefinedTokens(css);
    expect(defs.has('--a')).toBe(true);
    expect(defs.has('--b')).toBe(true);
    expect(defs.size).toBe(2);
  });
});

describe('collectReferencedTokens', () => {
  it('finds var() references only', () => {
    const css = `:root { --a: 1; --b: var(--a); --c: color-mix(in srgb, var(--x) 70%, transparent); }`;
    const refs = collectReferencedTokens(css);
    expect([...refs].sort()).toEqual(['--a', '--x']);
  });
});

describe('ensureScale', () => {
  it('inserts missing tokens after the anchor prefix', () => {
    const out = ensureScale(ROOT, {
      sectionComment: 'Line height',
      anchorPrefixes: ['--line-height-', '--font-size-'],
      entries: [
        { name: '--line-height-xs', value: '1' },
        { name: '--line-height-sm', value: '1.25' },
      ],
    });
    expect(out).toContain('--line-height-xs: 1;');
    expect(out).toContain('--line-height-sm: 1.25;');
    expect(out).toContain('/* Line height */');
    // Placed after the font-size block (the matched anchor), before font-weight.
    expect(out.indexOf('--line-height-xs')).toBeGreaterThan(out.indexOf('--font-size-lg'));
    expect(out.indexOf('--line-height-xs')).toBeLessThan(out.indexOf('--font-weight-normal'));
  });

  it('is idempotent — running twice equals running once', () => {
    const opts = {
      anchorPrefixes: ['--font-size-'],
      entries: [{ name: '--line-height-xs', value: '1' }],
    };
    const once = ensureScale(ROOT, opts);
    const twice = ensureScale(once, opts);
    expect(twice).toBe(once);
  });

  it('leaves the source untouched when every token already exists', () => {
    const out = ensureScale(ROOT, {
      entries: [{ name: '--font-size-md', value: '999rem' }],
    });
    expect(out).toBe(ROOT);
    expect(out).not.toContain('999rem'); // never overwrites an existing value
  });

  it('only inserts the missing subset', () => {
    const out = ensureScale(ROOT, {
      anchorPrefixes: ['--font-size-'],
      entries: [
        { name: '--font-size-md', value: 'x' }, // exists → skip
        { name: '--font-size-xl', value: '2rem' }, // missing → insert
      ],
    });
    expect(out).toContain('--font-size-xl: 2rem;');
    expect(out).not.toContain('--font-size-md: x;');
  });

  it('falls back to before the :root closing brace when no anchor matches', () => {
    const out = ensureScale(ROOT, {
      anchorPrefixes: ['--nonexistent-'],
      entries: [{ name: '--ease-out-quart', value: 'cubic-bezier(0.25, 1, 0.5, 1)' }],
    });
    expect(out).toContain('--ease-out-quart:');
    expect(out.indexOf('--ease-out-quart')).toBeLessThan(out.indexOf('}'));
  });
});

describe('renameToken', () => {
  it('rewrites the declaration and references', () => {
    const css = `:root { --old: 1; --b: var(--old); }`;
    const out = renameToken(css, '--old', '--new');
    expect(out).toBe(`:root { --new: 1; --b: var(--new); }`);
  });

  it('does not match a longer token that shares the prefix', () => {
    const css = `:root { --color-primary: red; --color-primary-500: pink; }`;
    const out = renameToken(css, '--color-primary', '--brand');
    expect(out).toContain('--brand: red;');
    expect(out).toContain('--color-primary-500: pink;'); // untouched
  });

  it('is a no-op when old is absent or new already exists', () => {
    const css = `:root { --a: 1; --b: 2; }`;
    expect(renameToken(css, '--missing', '--x')).toBe(css);
    expect(renameToken(css, '--a', '--b')).toBe(css);
  });
});

describe('removeToken', () => {
  it('drops the declaration line', () => {
    const out = removeToken(ROOT, '--font-size-lg');
    expect(out).not.toContain('--font-size-lg');
    expect(out).toContain('--font-size-md');
  });

  it('is a no-op when the token is absent', () => {
    expect(removeToken(ROOT, '--nope')).toBe(ROOT);
  });
});

describe('removeTokensMatching', () => {
  const css = `:root {
  --sectiondivider-lg-title-color: var(--text-primary);
  --sectiondivider-canvas-title-color: var(--text-primary);
  --sectiondivider-title-font-size: var(--font-size-5xl);
  --font-size-md: 1rem;
}
`;
  const isLegacyDivider = (name: string) =>
    name.startsWith('--sectiondivider-') &&
    !['lg', 'md', 'sm'].includes(name.slice('--sectiondivider-'.length).split('-')[0]);

  it('removes only the matching declarations', () => {
    const out = removeTokensMatching(css, isLegacyDivider);
    expect(out).toContain('--sectiondivider-lg-title-color'); // kept (lg)
    expect(out).toContain('--font-size-md'); // kept (not a divider)
    expect(out).not.toContain('--sectiondivider-canvas-title-color');
    expect(out).not.toContain('--sectiondivider-title-font-size');
  });

  it('is idempotent', () => {
    const once = removeTokensMatching(css, isLegacyDivider);
    expect(removeTokensMatching(once, isLegacyDivider)).toBe(once);
  });

  it('is a no-op when nothing matches', () => {
    expect(removeTokensMatching(ROOT, isLegacyDivider)).toBe(ROOT);
  });
});
