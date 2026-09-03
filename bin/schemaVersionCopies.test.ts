import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { THEME_SCHEMA_VERSION } from '../src/editor/core/themes/themeTypes';

/**
 * `.mjs` tooling cannot import TypeScript, so three scripts hand-copy
 * `THEME_SCHEMA_VERSION`. Two of them had guards; `seed-preset-theme.mjs` had
 * none and sat a version behind unnoticed. This pins all of them at once, so
 * the next bump fails here rather than writing themes under a stale version.
 */
const COPIES = [
  'bin/set-colors.mjs',
  'scripts/check-preset-themes.mjs',
  'scripts/seed-preset-theme.mjs',
];

describe('hand-copied THEME_SCHEMA_VERSION', () => {
  it.each(COPIES)('%s matches the TypeScript constant', (file) => {
    const src = fs.readFileSync(path.resolve(__dirname, '..', file), 'utf-8');
    const match = src.match(/const THEME_SCHEMA_VERSION = (\d+);/);

    expect(match, `${file} declares no THEME_SCHEMA_VERSION copy`).not.toBeNull();
    expect(Number(match![1])).toBe(THEME_SCHEMA_VERSION);
  });
});
