/**
 * The registry contract, as a function a project outside this package can run.
 *
 * Node-only: it reads the runtime `.svelte` file and the component's
 * `default.json` off disk, so it lives behind its own subpath export
 * (`@motion-proto/live-tokens/component-editor/contract`) rather than in the
 * browser barrel. A consumer's whole suite is a `describe.each` over their own
 * registrations and one call:
 *
 * ```ts
 * // @vitest-environment happy-dom
 * import { describe, it, expect } from 'vitest';
 * import { getComponentRegistryEntries, registerComponent } from '@motion-proto/live-tokens';
 * import { checkRegistryEntry } from '@motion-proto/live-tokens/component-editor/contract';
 * import MyWidgetEditor, { allTokens } from '../src/system/components/MyWidgetEditor.svelte';
 *
 * registerComponent({ id: 'mywidget', label: 'My Widget', icon: 'fas fa-magic',
 *   sourceFile: 'src/system/components/MyWidget.svelte',
 *   editorComponent: MyWidgetEditor, schema: allTokens });
 *
 * const mine = getComponentRegistryEntries().filter((e) => e.origin === 'custom');
 *
 * describe.each(mine.map((e) => [e.id, e] as const))('%s', (_id, entry) => {
 *   it('meets the registry contract', () => {
 *     expect(checkRegistryEntry(entry)).toEqual([]);
 *   });
 * });
 * ```
 *
 * The `origin` filter is load-bearing outside this package: the registry always
 * carries the shipped components too, and their `sourceFile` paths are relative
 * to the package root, not the consumer's.
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { get } from 'svelte/store';
import type { RegistryEntry } from './registry';
import type { Token } from './scaffolding/types';
import { parseColorOpacity } from '../core/themes/parsers/colorOpacity';
import { editorState, setComponentAlias, clearComponentAlias } from '../core/store/editorStore';

export interface RegistryContractOptions {
  /** Root that `entry.sourceFile` is relative to. Defaults to `process.cwd()`,
      which is the project root under both vitest and `npm test`. */
  projectRoot?: string;
  /** Directory holding `<id>/default.json`. Defaults to
      `<projectRoot>/src/live-tokens/data/component-configs`. Pass the
      `componentConfigsDir` from `live-tokens.config.json` when a project moved it. */
  componentConfigsDir?: string;
}

const PADDING_SIDE_RE = /-padding-(top|right|bottom|left)$/;
const PROBE = { kind: 'token', name: '--space-8' } as const;

/**
 * Tokens excluded from the runtime-declaration and default-seed checks:
 *   - `hidden: true` (vestigial or hidden by design),
 *   - `kind: 'gradient'` (structured payloads, stored as gradient objects, not vars),
 *   - `-padding-(top|right|bottom|left)` (written on demand by the split-padding
 *     UI and consumed through the `themed-padding` mixin's fallback chain, so
 *     they exist as neither `:root` declarations nor default seeds).
 */
function isEditableSurfaceToken(t: Token): boolean {
  if (t.hidden) return false;
  if (t.kind === 'gradient') return false;
  if (PADDING_SIDE_RE.test(t.variable)) return false;
  return true;
}

/** Every `--xxx:` declaration in every `<style>` block of a Svelte file. */
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

/** Opacity a seeded alias resolves to. A plain token alias is fully opaque; a
    gradient payload or `transparent` carries no guarantee, so it reads as 0. */
function seededOpacity(raw: unknown): number {
  if (typeof raw !== 'string' || raw === 'transparent') return 0;
  return parseColorOpacity(raw)?.opacity ?? 100;
}

/**
 * Run the registry contract against one entry and return a violation line per
 * failure. An empty array is the pass.
 *
 * The contract:
 *   1. Registration — `sourceFile` resolves to a real file, the schema is non-empty.
 *   2. Uniqueness — no schema variable is declared twice.
 *   3. Editor ↔ runtime — every editable token's CSS var is declared in the
 *      runtime's `<style>` block, so an edit has something to repaint.
 *   4. Editor ↔ default config — every editable token has a seed alias in
 *      `<id>/default.json`, so a consumer adopts with full defaults. A component
 *      with no `default.json` is editor-only; the seed and floor checks skip it.
 *   5. Opacity floors — a token declaring `minOpacity` ships a default at or
 *      above it, so a floating panel starts out legible over page content.
 *   6. Round-trip — `setComponentAlias` persists into the slice under the same key.
 */
export function checkRegistryEntry(
  entry: RegistryEntry,
  options: RegistryContractOptions = {},
): string[] {
  const projectRoot = options.projectRoot ?? process.cwd();
  const configsDir =
    options.componentConfigsDir ??
    path.resolve(projectRoot, 'src/live-tokens/data/component-configs');

  const violations: string[] = [];
  const schema = entry.schema ?? [];
  const runtimePath = path.resolve(projectRoot, entry.sourceFile);

  if (schema.length === 0) violations.push('registration: schema is empty');
  if (!existsSync(runtimePath)) {
    violations.push(`registration: sourceFile does not resolve to a file (${runtimePath})`);
  }

  const seen = new Set<string>();
  for (const t of schema) {
    if (seen.has(t.variable)) violations.push(`uniqueness: ${t.variable} is declared twice`);
    seen.add(t.variable);
  }

  const editable = schema.filter(isEditableSurfaceToken);

  if (existsSync(runtimePath)) {
    const runtimeVars = extractRuntimeDeclarations(readFileSync(runtimePath, 'utf-8'));
    for (const t of editable) {
      if (!runtimeVars.has(t.variable)) {
        violations.push(`runtime: ${t.variable} is not declared in ${entry.sourceFile}`);
      }
    }
  }

  const configPath = path.join(configsDir, entry.id, 'default.json');
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, 'utf-8')) as {
      aliases?: Record<string, unknown>;
    };
    const aliases = config.aliases ?? {};
    for (const t of editable) {
      if (!(t.variable in aliases)) {
        violations.push(`default config: ${t.variable} has no seed in ${entry.id}/default.json`);
      }
    }
    for (const t of schema) {
      if (t.minOpacity === undefined) continue;
      const opacity = seededOpacity(aliases[t.variable]);
      if (opacity < t.minOpacity) {
        violations.push(
          `opacity floor: ${t.variable} seeds at ${opacity}%, below its ${t.minOpacity}% floor`,
        );
      }
    }
  }

  const sample = editable[0];
  if (sample) {
    setComponentAlias(entry.id, sample.variable, PROBE);
    const stored = get(editorState).components[entry.id]?.aliases?.[sample.variable];
    if (JSON.stringify(stored) !== JSON.stringify(PROBE)) {
      violations.push(
        `round-trip: setComponentAlias(${entry.id}, ${sample.variable}) stored ${JSON.stringify(stored)}`,
      );
    }
    clearComponentAlias(entry.id, sample.variable);
  }

  return violations;
}
