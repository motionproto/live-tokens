// @vitest-environment happy-dom
/**
 * Universal registry contract — runs against every component in `builtInRegistry`
 * (and any custom-registered component at the time of the test run). The
 * assertions live in `contract.ts` so a consumer's own suite is the same two
 * lines against their own registrations; `checkRegistryEntry`'s doc comment
 * states what it holds and why each exclusion exists.
 *
 * Replaces ad-hoc per-component audits — a new component is auto-covered by
 * adding it to the registry.
 */
import { describe, it, expect } from 'vitest';
import { getComponentRegistryEntries } from './registry';
import { checkRegistryEntry } from './contract';

const entries = getComponentRegistryEntries();

describe('component registry contract', () => {
  it('registry is non-empty', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  describe.each(entries.map((e) => [e.id, e] as const))('%s', (_id, entry) => {
    it('meets the registry contract', () => {
      expect(checkRegistryEntry(entry)).toEqual([]);
    });
  });
});
