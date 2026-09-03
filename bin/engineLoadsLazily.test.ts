import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// CI runs `npm test` before `build:plugin`, so `dist-plugin/` does not exist
// while the suite runs. A `.mjs` module that a test imports must therefore
// load the compiled engine inside the function that needs it, never at module
// top. The 0.56.0 publish failed on exactly this in scripts/lib/presetFonts.mjs.

const ROOT = resolve(__dirname, '..');
const SCAN_DIRS = ['bin', 'scripts', 'vite-plugin', 'src'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.test.ts')) out.push(full);
  }
  return out;
}

const IMPORT = /from\s+['"]([^'"]+\.mjs)['"]/g;

function mjsImports(file: string): string[] {
  const text = readFileSync(file, 'utf8');
  return [...text.matchAll(IMPORT)].map((m) => resolve(dirname(file), m[1])).filter(existsSync);
}

/** Every .mjs module a test reaches, following .mjs-to-.mjs imports. */
function modulesReachableFromTests(): string[] {
  const seen = new Set<string>();
  const queue = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d))).flatMap(mjsImports);
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    queue.push(...mjsImports(file));
  }
  return [...seen].sort();
}

// Top-level statements start at column 0; anything inside a function body is
// indented. That distinction is the whole rule.
const TOP_LEVEL_ENGINE_LOAD = /^(?:const|let|var)?\s*(?:\{[^}]*\}\s*=\s*)?await import\(/m;

describe('modules the tests import', () => {
  const modules = modulesReachableFromTests();

  it('reach at least the CLI workers', () => {
    expect(modules.some((m) => m.endsWith('bin/set-geometry.mjs'))).toBe(true);
    expect(modules.some((m) => m.endsWith('bin/save-theme.mjs'))).toBe(true);
    expect(modules.some((m) => m.endsWith('scripts/lib/presetFonts.mjs'))).toBe(true);
  });

  it.each(modules.map((m) => [m.slice(ROOT.length + 1)]))('%s loads no engine at module top', (rel) => {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    expect(text).not.toMatch(TOP_LEVEL_ENGINE_LOAD);
  });
});
