// @vitest-environment happy-dom
/**
 * Universal registry contract — runs against every component in `builtInRegistry`
 * (and any custom-registered component at the time of the test run). Encodes the
 * three coverage guarantees the editor relies on:
 *
 *   (1) Registration: each entry resolves to a real runtime file and a non-empty schema.
 *   (2) Editor ↔ Runtime: every editable token's CSS var is declared in the
 *       runtime's <style> block.
 *   (3) Editor ↔ Production config: every editable token has a seed alias in the
 *       production-pointed default config so consumers adopt with full defaults.
 *   (4) Round-trip: `setComponentAlias` persists into the slice under the same key.
 *
 * Tokens excluded from (2) and (3):
 *   - `hidden: true` schema entries (vestigial or hidden-by-design; see audit).
 *   - `kind: 'gradient'` (structured payloads stored as gradient objects, not vars).
 *   - `-padding-(top|right|bottom|left)` suffixes — these are written on demand
 *      by the split-padding UI and consumed via the `themed-padding` SCSS mixin's
 *      fallback chain; they don't exist as `:root` declarations or default seeds.
 *
 * Replaces ad-hoc per-component audits — a new component is auto-covered by
 * adding it to the registry.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { get } from 'svelte/store';
import { getComponentRegistryEntries } from './registry';
import {
  editorState,
  setComponentAlias,
  clearComponentAlias,
} from '../core/store/editorStore';

const REPO_ROOT = path.resolve(__dirname, '../../..');
const CONFIG_ROOT = path.resolve(REPO_ROOT, 'src/live-tokens/data/component-configs');

const PADDING_SIDE_RE = /-padding-(top|right|bottom|left)$/;

type SchemaToken = { variable: string; hidden?: boolean; kind?: string };

function isEditableSurfaceToken(t: SchemaToken): boolean {
  if (t.hidden) return false;
  if (t.kind === 'gradient') return false;
  if (PADDING_SIDE_RE.test(t.variable)) return false;
  return true;
}

/** Extract `--xxx:` declarations from every <style> block in a Svelte file. */
function extractRuntimeDeclarations(source: string): Set<string> {
  const out = new Set<string>();
  const blocks = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
  for (const block of blocks) {
    for (const m of block.matchAll(/(?:^|[{;\n])\s*(--[a-z0-9-]+)\s*:/g)) {
      out.add(m[1]);
    }
  }
  return out;
}

function loadProductionAliasKeys(componentId: string): Set<string> | null {
  const pointerPath = path.join(CONFIG_ROOT, componentId, '_production.json');
  if (!existsSync(pointerPath)) return null;
  const { productionFile } = JSON.parse(readFileSync(pointerPath, 'utf-8')) as { productionFile: string };
  const configPath = path.join(CONFIG_ROOT, componentId, `${productionFile}.json`);
  if (!existsSync(configPath)) return null;
  const config = JSON.parse(readFileSync(configPath, 'utf-8')) as { aliases?: Record<string, unknown> };
  return new Set(Object.keys(config.aliases ?? {}));
}

const entries = getComponentRegistryEntries();

describe('component registry contract', () => {
  it('registry is non-empty', () => {
    expect(entries.length).toBeGreaterThan(0);
  });

  describe.each(entries.map((e) => [e.id, e] as const))('%s', (_id, entry) => {
    const runtimePath = path.resolve(REPO_ROOT, entry.sourceFile);
    const schema = entry.schema as SchemaToken[];

    it('has a resolvable sourceFile and a non-empty schema', () => {
      expect(schema.length).toBeGreaterThan(0);
      expect(existsSync(runtimePath)).toBe(true);
    });

    it('schema variables are unique within the component', () => {
      const seen = new Set<string>();
      const dups: string[] = [];
      for (const t of schema) {
        if (seen.has(t.variable)) dups.push(t.variable);
        seen.add(t.variable);
      }
      expect(dups).toEqual([]);
    });

    it('every editable schema variable is declared in the runtime <style>', () => {
      const source = readFileSync(runtimePath, 'utf-8');
      const runtimeVars = extractRuntimeDeclarations(source);
      const missing = schema
        .filter(isEditableSurfaceToken)
        .map((t) => t.variable)
        .filter((v) => !runtimeVars.has(v));
      expect(missing).toEqual([]);
    });

    it('every editable schema variable is seeded in the production config', () => {
      const aliasKeys = loadProductionAliasKeys(entry.id);
      if (!aliasKeys) {
        // No production config dir — component is editor-only or a smoke test.
        // Registration test still ran; skip the seed check.
        return;
      }
      const missing = schema
        .filter(isEditableSurfaceToken)
        .map((t) => t.variable)
        .filter((v) => !aliasKeys.has(v));
      expect(missing).toEqual([]);
    });

    it('setComponentAlias round-trips a sample editable token through the slice', () => {
      const sample = schema.find(isEditableSurfaceToken);
      if (!sample) return;
      setComponentAlias(entry.id, sample.variable, { kind: 'token', name: '--space-8' });
      const slice = get(editorState).components[entry.id];
      expect(slice?.aliases?.[sample.variable]).toEqual({ kind: 'token', name: '--space-8' });
      clearComponentAlias(entry.id, sample.variable);
    });
  });
});
