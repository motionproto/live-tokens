// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTokenRegistry, extractGlobalRootBody } from '../../lib/tokenRegistry';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));
const DEMOS_DIR = TEST_DIR;
const TOKENS_CSS = join(TEST_DIR, '..', '..', 'styles', 'tokens.css');
const COMPONENTS_DIR = join(TEST_DIR, '..', '..', 'components');

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

/** Scrape `variable: '--foo'` entries from a demo's <script> block. */
function extractDemoVariables(file: string): string[] {
  const source = readFileSync(file, 'utf8');
  const re = /variable\s*:\s*'(--[a-z0-9-]+)'/gi;
  const out: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) out.push(m[1]);
  return out;
}

/** Test whether a variable name fits a layer-1 design-token naming pattern. */
function isLayer1TokenName(name: string): boolean {
  if (/^--color-[a-z]+-\d{3}$/.test(name)) return true;
  if (/^--surface-[a-z]+(-[a-z]+)?$/.test(name)) return true;
  if (/^--border-[a-z]+(-[a-z]+)?$/.test(name)) return true;
  if (/^--text-[a-z]+(-[a-z]+)?$/.test(name)) return true;
  if (/^--(radius|space|font|shadow|transition|overlay|hover|empty)(-[a-z0-9]+)*$/.test(name)) return true;
  return false;
}

const demoFiles = readdirSync(DEMOS_DIR)
  .filter((f) => f.endsWith('Demo.svelte'))
  .map((f) => join(DEMOS_DIR, f));

describe('design-token architecture', () => {
  it('has demo files to inspect', () => {
    expect(demoFiles.length).toBeGreaterThan(0);
  });

  describe('every editor-exposed variable resolves to a design token', () => {
    for (const file of demoFiles) {
      const vars = extractDemoVariables(file);
      if (vars.length === 0) continue;
      const demoName = file.split('/').pop()!;
      for (const v of vars) {
        it(`${demoName}: ${v} resolves via alias chain to a layer-1 token`, () => {
          const chain = registry.resolveAliasChain(v);
          const terminal = chain[chain.length - 1];
          expect(
            isLayer1TokenName(terminal),
            `${v} → [${chain.join(' → ')}]; terminal "${terminal}" is not a design-token name. ` +
              `Either rename the target or add a var() alias declaration in tokens.css.`,
          ).toBe(true);
        });
      }
    }
  });

  // Every editor-exposed variable across every demo must be declared in
  // tokens.css as a var() alias (not a literal, not a raw primitive).
  // Component properties must bind to component-scoped Layer-2 aliases so
  // editing one component never rebinds a shared primitive used elsewhere.
  describe('every demo follows the component-token pattern', () => {
    for (const file of demoFiles) {
      const demoName = file.split('/').pop()!;
      const vars = extractDemoVariables(file);
      for (const v of vars) {
        it(`${demoName}: ${v} is a layer-2 component token (declared as var() alias)`, () => {
          const declared = registry.getDeclaredValue(v);
          expect(
            declared,
            `${v} is referenced by ${demoName} but not declared in tokens.css`,
          ).not.toBeNull();
          expect(
            declared!.startsWith('var('),
            `${v} should be a component-scoped alias declared as var(--primitive); got "${declared}". ` +
              `Component properties must not rebind shared primitives directly.`,
          ).toBe(true);
        });
      }
    }
  });
});
