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

// A copied literal reads the same as an import, so the registry contract
// above can't tell them apart — only object identity against the runtime
// module's own export catches a copy.
describe('a built-in entry imports its catalogue, never copies it', () => {
  const runtimeModules = import.meta.glob('/src/system/components/*.svelte', { eager: true }) as Record<
    string,
    { catalogue?: unknown }
  >;
  const builtIns = entries.filter((e) => e.origin === 'system');

  it('covers every built-in entry', () => {
    expect(builtIns.length).toBeGreaterThan(20);
  });

  describe.each(builtIns.map((e) => [e.id, e] as const))('%s', (_id, entry) => {
    it('entry.catalogue is the runtime module\'s own export', () => {
      const mod = runtimeModules[`/${entry.sourceFile}`];
      expect(mod?.catalogue).toBeDefined();
      expect(entry.catalogue).toBe(mod!.catalogue);
    });
  });
});
