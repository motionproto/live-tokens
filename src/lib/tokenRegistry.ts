/**
 * Static registry of CSS custom-property declarations.
 *
 * Layer-1 design tokens live in tokens.css (the single source of truth for
 * shared primitives). Layer-2 component tokens live inside each component's
 * `<style>` block as `:global(:root) { ... }` declarations — owned by the
 * component that uses them.
 *
 * Token-picking UIs need to recover the semantic identity of an arbitrary
 * variable — e.g. to display "info text / primary" rather than a raw hex. For
 * alias variables we must follow the `var(--x)` chain from the declaration to
 * find the underlying token whose *name* the selector can parse.
 *
 * This module parses both sources at import time (tokens.css via Vite's
 * ?raw loader, component files via import.meta.glob) and exposes helpers that
 * walk those aliases. The pure `buildTokenRegistry` and `extractGlobalRootBody`
 * helpers are also exported so tests can construct a registry from fs-loaded
 * files (Vitest's default CSS plugin swallows `?raw` imports for .css files).
 */

import tokensCss from '../styles/tokens.css?raw';

const componentSources = import.meta.glob('../components/*.svelte', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

export interface TokenRegistry {
  getDeclaredValue(varName: string): string | null;
  resolveAliasChain(varName: string): string[];
}

/**
 * Extract the declaration body of every `:global(:root) { ... }` rule from a
 * Svelte component source file. The body is a flat list of `--name: value;`
 * declarations that `buildTokenRegistry` can parse directly.
 *
 * Assumes no nested braces inside the block — Layer-2 token blocks are flat
 * declaration lists, not nested rulesets.
 */
export function extractGlobalRootBody(source: string): string {
  const re = /:global\(:root\)\s*\{([^}]*)\}/g;
  const bodies: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    bodies.push(m[1]);
  }
  return bodies.join('\n');
}

/**
 * Pure constructor: parses a CSS source string (possibly concatenated from
 * multiple files) and returns a registry bound to that snapshot.
 */
export function buildTokenRegistry(cssText: string): TokenRegistry {
  const declarations = new Map<string, string>();
  const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(cssText)) !== null) {
    declarations.set(m[1], m[2].trim());
  }

  function resolveAliasChain(varName: string): string[] {
    const chain = [varName];
    const visited = new Set<string>([varName]);
    let current = varName;
    while (true) {
      const decl = declarations.get(current);
      if (!decl) return chain;
      const aliasMatch = decl.match(/var\((--[a-z0-9-]+)\)/i);
      if (!aliasMatch) return chain;
      const next = aliasMatch[1];
      if (visited.has(next)) return chain;
      visited.add(next);
      chain.push(next);
      current = next;
    }
  }

  return {
    getDeclaredValue: (v) => declarations.get(v) ?? null,
    resolveAliasChain,
  };
}

const componentTokenCss = Object.values(componentSources)
  .map(extractGlobalRootBody)
  .join('\n');

const defaultRegistry = buildTokenRegistry(tokensCss + '\n' + componentTokenCss);

/** Raw declared value from tokens.css, or null if not declared. */
export const getDeclaredValue = defaultRegistry.getDeclaredValue;

/**
 * Walk the alias chain starting at `varName`, returning each successive
 * variable reference (including the starting one). Stops when a declaration is
 * a literal value (e.g. hex) or when the next link is absent from the
 * registry. Guards against cycles.
 *
 * Example: `--notification-info-title` → `--text-info` → stops (literal hex).
 * Returns `['--notification-info-title', '--text-info']`.
 */
export const resolveAliasChain = defaultRegistry.resolveAliasChain;
