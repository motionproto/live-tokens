// @vitest-environment node
import { describe, it, expect } from 'vitest';
import type { ContrastPair } from '../core/palettes/contrastPairs';
import { rawKind, stripSide } from '../core/components/aliasKinds';
import { getComponentRegistryEntries } from './registry';

const entries = getComponentRegistryEntries();

const pairKey = (pair: ContrastPair) => JSON.stringify([pair.foreground, pair.backdrop, pair.context ?? null]);

describe('component contrast pairs contract', () => {
  describe.each(entries.map((e) => [e.id, e] as const))('%s', (_id, entry) => {
    const pairs = entry.contrastPairs ?? [];
    const declared = new Set([
      ...entry.schema.map((t) => t.variable),
      ...(entry.intrinsics ?? []).flatMap((spec) => spec.variants.map((v) => spec.variable(v))),
    ]);

    it('pairs every text-color token as a foreground', () => {
      const foregrounds = new Set(pairs.map((p) => p.foreground));
      // A per-side padding row falls through `rawKind` to text-color; its parent names the kind.
      const unpaired = entry.schema
        .filter((t) => rawKind(stripSide(t.variable)) === 'text-color' && !foregrounds.has(t.variable))
        .map((t) => t.variable);
      expect(unpaired).toEqual([]);
    });

    it('names only schema and intrinsic variables', () => {
      const unknown = pairs.flatMap((p) => [p.foreground, ...p.backdrop]).filter((v) => !declared.has(v));
      expect([...new Set(unknown)]).toEqual([]);
    });

    it('names a font size on every text pair', () => {
      expect(pairs.filter((p) => p.role === 'text' && !p.fontSize).map((p) => p.foreground)).toEqual([]);
    });

    it('declares each foreground, backdrop and context once', () => {
      const seen = new Set<string>();
      expect(pairs.map(pairKey).filter((key) => seen.has(key) || !seen.add(key))).toEqual([]);
    });
  });
});
