/**
 * Static registry of CSS custom-property declarations from variables.css.
 *
 * variables.css is the single source of truth for token defaults. Layer-1
 * design tokens (e.g. `--color-primary-500: #c44d3f;`) are declared as
 * literals. Layer-2 component tokens (e.g. `--notification-info-title: var(--text-info);`)
 * are declared as aliases pointing at a design token.
 *
 * Token-picking UIs need to recover the semantic identity of an arbitrary
 * variable — e.g. to display "info text / primary" rather than a raw hex. For
 * alias variables we must follow the `var(--x)` chain from the declaration to
 * find the underlying token whose *name* the selector can parse.
 *
 * This module parses variables.css at import time (via Vite's ?raw loader) and
 * exposes helpers that walk those aliases. The pure `buildTokenRegistry` is
 * also exported so tests can construct a registry from an fs-loaded file
 * (Vitest's default CSS plugin swallows `?raw` imports for .css files).
 */

import variablesCss from '../styles/variables.css?raw';

export interface TokenRegistry {
  getDeclaredValue(varName: string): string | null;
  resolveAliasChain(varName: string): string[];
}

/**
 * Pure constructor: parses a variables.css source string and returns a
 * registry bound to that snapshot.
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

const defaultRegistry = buildTokenRegistry(variablesCss);

/** Raw declared value from variables.css, or null if not declared. */
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
