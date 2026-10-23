import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { importEngine, missingEngine } from './a11y';

const require = createRequire(import.meta.url);

describe('the installed axe-core', () => {
  it('is 4.11.1 or later, the first release that reads OKLCH contrast correctly', () => {
    const [major, minor, patch] = (require('axe-core/package.json') as { version: string }).version.split('.').map(Number);
    expect(major).toBe(4);
    expect(minor * 1000 + patch).toBeGreaterThanOrEqual(11 * 1000 + 1);
  });
});

describe('missingEngine', () => {
  it('finds both engines installed here', async () => {
    expect(await missingEngine(['axe', 'alfa'])).toBeNull();
  });
});

describe('importEngine', () => {
  const absent = '@siteimprove/alfa-absent';

  it('names a package that fails to resolve as not installed', async () => {
    await expect(importEngine(absent, () => import(/* @vite-ignore */ absent))).rejects.toThrow(`${absent} is not installed`);
  });

  it('passes any other load error through unchanged', async () => {
    const broken = new Error('engine threw while loading');
    await expect(importEngine(absent, () => Promise.reject(broken))).rejects.toBe(broken);
  });
});
