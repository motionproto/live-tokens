// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTokenRegistry, extractGlobalRootBody } from '../core/palettes/tokenRegistry';
import { parseColorOpacity } from '../core/themes/parsers/colorOpacity';
import { getComponentRegistryEntries } from './registry';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const TOKENS_CSS = join(TEST_DIR, '..', '..', 'system', 'styles', 'tokens.css');
const COMPONENTS_DIR = join(TEST_DIR, '..', '..', 'system', 'components');

// Vitest's CSS plugin swallows `?raw` imports for .css files, so we build the
// registry from an fs-loaded snapshot rather than going through the default
// module export. Layer-2 tokens now live in each component's <style> block
// under `:global(:root)`; merge those bodies with tokens.css to match the
// runtime registry.
const tokensSource = readFileSync(TOKENS_CSS, 'utf8');
const componentTokenCss = readdirSync(COMPONENTS_DIR)
  .filter((f) => f.endsWith('.svelte'))
  .map((f) => extractGlobalRootBody(readFileSync(join(COMPONENTS_DIR, f), 'utf8')))
  .join('\n');
const registry = buildTokenRegistry(tokensSource + '\n' + componentTokenCss);

/** Test whether a variable name fits a layer-1 design-token naming pattern. */
function isLayer1TokenName(name: string): boolean {
  // Color ramps: --color-<palette>-<step>  OR semantic color primitives: --color-<name>
  if (/^--color-[a-z]+(-\d{3})?$/.test(name)) return true;
  if (/^--surface-[a-z]+(-[a-z]+)?$/.test(name)) return true;
  if (/^--border-[a-z]+(-[a-z]+)?$/.test(name)) return true;
  if (/^--text-[a-z]+(-[a-z]+)?$/.test(name)) return true;
  if (/^--(radius|space|font|line-height|letter-spacing|shadow|ring|transition|overlay|hover|page-bg|border-width|gradient|icon-size|blur|scale|dot-size|duration|ease)(-[a-z0-9]+)*$/.test(name)) return true;
  return false;
}

// Drives both describe blocks: one entry per (component, variable) pair pulled
// from each editor's exported `allTokens`. This is the authoritative surface —
// includes template-literal-built tokens (Button, SegmentedControl, etc.) and
// typography colorVariables that the previous source-regex approach silently
// missed. See registry.ts for how each editor exports its full token list via
// `<script context="module">`.
const editorTokenCases: Array<{ editor: string; variable: string }> = [];
for (const entry of getComponentRegistryEntries()) {
  for (const t of entry.schema) {
    // `hidden: true` tokens are optional override slots (e.g. split-padding's
    // per-side overrides used as `var(--x, fallback)` by the themed-padding
    // mixin) — they don't need a default declaration in tokens.css.
    if ((t as { hidden?: boolean }).hidden) continue;
    // Structured-payload tokens (currently only `kind: 'gradient'`) are
    // declared as literal CSS (e.g. `linear-gradient(...)`), not as a
    // var() alias — they own a structured value the editor renders into
    // the property directly. The layer-2 alias check below doesn't apply.
    if ((t as { kind?: string }).kind === 'gradient') continue;
    editorTokenCases.push({ editor: entry.id, variable: t.variable });
  }
}

describe('design-token architecture', () => {
  it('has editor schemas to inspect', () => {
    expect(editorTokenCases.length).toBeGreaterThan(0);
  });

  describe('every editor-exposed variable resolves to a design token', () => {
    for (const { editor, variable } of editorTokenCases) {
      it(`${editor}: ${variable} resolves via alias chain to a layer-1 token`, () => {
        const chain = registry.resolveAliasChain(variable);
        const terminal = chain[chain.length - 1];
        expect(
          isLayer1TokenName(terminal),
          `${variable} → [${chain.join(' → ')}]; terminal "${terminal}" is not a design-token name. ` +
            `Either rename the target or add a var() alias declaration in tokens.css.`,
        ).toBe(true);
      });
    }
  });

  // Every variable an editor binds must be declared in tokens.css (or a
  // component <style> :global(:root) block) as an alias to a design token — not
  // a raw literal color. Component properties bind to component-scoped Layer-2
  // aliases so editing one component never rebinds a shared primitive used
  // elsewhere. Two forms are valid:
  //   1. `var(--token)`                                        — opaque alias
  //   2. `color-mix(in srgb, var(--token) NN%, transparent)`   — alias + opacity
  // Form 2 is what the color picker emits for any color token below 100%
  // opacity; `parseColorOpacity` is the single source of truth for that shape.
  // It still references a design token and only applies alpha, so it satisfies
  // the same invariant — it does not rebind a primitive to an arbitrary color.
  describe('every editor follows the component-token pattern', () => {
    for (const { editor, variable } of editorTokenCases) {
      it(`${editor}: ${variable} is a layer-2 component token (alias to a design token)`, () => {
        const declared = registry.getDeclaredValue(variable);
        expect(
          declared,
          `${variable} is referenced by ${editor} but not declared in tokens.css`,
        ).not.toBeNull();
        expect(
          declared!.startsWith('var(') || parseColorOpacity(declared!) !== null,
          `${variable} should be a component-scoped alias — either var(--token) or ` +
            `color-mix(in srgb, var(--token) NN%, transparent); got "${declared}". ` +
            `Component properties must not rebind shared primitives directly.`,
        ).toBe(true);
      });
    }
  });
});
