import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { skillTrees } from './skillTrees';

describe('skillTrees', () => {
  it('imports every tree file under trees/', () => {
    const files = readdirSync(new URL('./trees/', import.meta.url))
      .filter((file) => file.endsWith('.ts'))
      .map((file) => file.replace(/\.ts$/, ''))
      .sort();
    expect(Object.keys(skillTrees).sort()).toEqual(files);
  });
});
