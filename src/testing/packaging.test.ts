import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// playwright.ts's `**/component-*.contract.{ts,js}` testMatch is safe only
// because a tarball ships exactly one of `src/testing` or `src/testing-js`:
// a testDir sees only its own extension. Re-adding the TypeScript source to
// `files` would let a consumer's testDir see both and double-collect.
//
// Pinned against the actual packlist rather than `package.json`'s `files`
// array: a `files` entry like `src/testing/`, `src`, or
// `src/testing/*.contract.ts` would all still satisfy "contains
// src/testing-js and not the literal string src/testing" while packing the
// TypeScript sources anyway.
describe('the published tarball', () => {
  it('packs no path under src/testing/', () => {
    const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
    const raw = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd: root, encoding: 'utf8' });
    const [{ files }] = JSON.parse(raw) as { files: { path: string }[] }[];
    const paths = files.map((f) => f.path);
    expect(paths).toContain('src/testing-js/index.js');
    expect(paths.filter((p) => p.startsWith('src/testing/'))).toEqual([]);
  });
});
