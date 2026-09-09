import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// playwright.ts's `**/component-*.contract.{ts,js}` testMatch is safe only
// because a tarball ships exactly one of `src/testing` or `src/testing-js`:
// a testDir sees only its own extension. Re-adding the TypeScript source to
// `files` would let a consumer's testDir see both and double-collect.
describe('package.json files field', () => {
  const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8'));

  it('ships the compiled testing build, not its TypeScript source', () => {
    expect(pkg.files).toContain('src/testing-js');
    expect(pkg.files).not.toContain('src/testing');
  });
});
