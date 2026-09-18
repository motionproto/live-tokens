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
// @ts-expect-error — plain .mjs module, no types
import { CATALOGUE_FAMILIES } from '../../../bin/lib/catalogue.mjs';
// @ts-expect-error — plain .mjs module, no types
import { PAGE_RULES } from '../../../bin/check-page.mjs';
// @ts-expect-error — plain .mjs module, no types
import { COMPONENT_RULES } from '../../../bin/check-component.mjs';

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
  const runtimeSources = import.meta.glob('/src/system/components/*.svelte', {
    eager: true,
    query: '?raw',
    import: 'default',
  }) as Record<string, string>;
  const runtimeFiles = Object.keys(runtimeModules).filter((path) => !path.endsWith('Editor.svelte'));
  const builtIns = entries.filter((e) => e.origin === 'system');

  it('covers every runtime file', () => {
    expect(builtIns.map((e) => `/${e.sourceFile}`).sort()).toEqual(runtimeFiles.sort());
  });

  describe.each(builtIns.map((e) => [e.id, e] as const))('%s', (_id, entry) => {
    it('entry.catalogue is the runtime module\'s own export', () => {
      const mod = runtimeModules[`/${entry.sourceFile}`];
      expect(mod?.catalogue).toBeDefined();
      expect(entry.catalogue).toBe(mod!.catalogue);
    });

    it('every catalogue.props key names a prop the file declares', () => {
      const declared = declaredProps(runtimeSources[`/${entry.sourceFile}`]);
      for (const key of Object.keys(entry.catalogue.props ?? {})) expect(declared).toContain(key);
    });
  });
});

// Invariant 1: every declared name in a catalogue entry is verified.
describe.each(entries.map((e) => [e.id, e] as const))('%s catalogue', (_id, entry) => {
  it('family is in the closed union', () => {
    expect(CATALOGUE_FAMILIES).toContain(entry.catalogue.family);
  });

  it('every alternatives key names a registered component id', () => {
    const ids = new Set(entries.map((e) => e.id));
    for (const key of Object.keys(entry.catalogue.alternatives ?? {})) expect(ids.has(key)).toBe(true);
  });

  it('every constraints[].rule names a page or component rule id', () => {
    for (const constraint of entry.catalogue.constraints ?? []) {
      if (typeof constraint === 'string') continue;
      expect(constraint.rule in PAGE_RULES || constraint.rule in COMPONENT_RULES).toBe(true);
    }
  });
});

function declaredProps(source: string): string[] {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const start = withoutComments.search(/interface Props\s*\{/);
  if (start < 0) return [];
  let depth = 0;
  let end = start;
  for (let i = withoutComments.indexOf('{', start); i < withoutComments.length; i++) {
    if (withoutComments[i] === '{') depth++;
    else if (withoutComments[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const body = withoutComments.slice(withoutComments.indexOf('{', start) + 1, end);
  return [...body.matchAll(/^\s*([A-Za-z_$][\w$]*)\??\s*:/gm)].map((m) => m[1]);
}
