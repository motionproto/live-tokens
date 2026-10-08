// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildTokenRegistry } from './tokenRegistry';

const CSS = `:root {
  --font-size-4xl: 2.25rem;
  --heading-xl-font-size: var(--font-size-4xl);
  --heading-xl-double: calc(var(--font-size-4xl) * 2);
  --card-surface: color-mix(in srgb, var(--surface-neutral-lower) 70%, transparent);
}

@media (max-width: 480px) {
  :root {
    --font-size-4xl: 1.75rem;
    --heading-xl-font-size: var(--heading-xl-phone-font-size);
  }
}
`;

describe('buildTokenRegistry', () => {
  const registry = buildTokenRegistry(CSS);

  it('reads the top-level value of a token re-declared inside @media', () => {
    expect(registry.getDeclaredValue('--font-size-4xl')).toBe('2.25rem');
    expect(registry.getDeclaredValue('--heading-xl-font-size')).toBe('var(--font-size-4xl)');
    expect(registry.getDeclaredValue('--heading-xl-phone-font-size')).toBeNull();
  });

  it('follows a whole-value var() alias past a breakpoint re-point', () => {
    expect(registry.resolveAliasChain('--heading-xl-font-size')).toEqual([
      '--heading-xl-font-size',
      '--font-size-4xl',
    ]);
  });

  it('stops at a calc() that reads a token', () => {
    expect(registry.resolveAliasChain('--heading-xl-double')).toEqual(['--heading-xl-double']);
  });

  it('follows a token carried at reduced opacity', () => {
    expect(registry.resolveAliasChain('--card-surface')).toEqual(['--card-surface', '--surface-neutral-lower']);
  });
});
