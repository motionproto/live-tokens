import { describe, expect, it } from 'vitest';
import { linkHash, linkTargets, resolveLink, slug } from './atlasLink';
import { skillTrees } from './skillTrees';

describe('atlasLink', () => {
  it('names a block by its title', () => {
    expect(slug('Run `set-type` (again)')).toBe('run-set-type-again');
  });

  it.each(Object.entries(skillTrees))('gives every target in %s a unique path', (_, tree) => {
    const paths = linkTargets(tree).map((t) => t.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it.each(Object.entries(skillTrees))('resolves every link in %s back to its target', (skill, tree) => {
    for (const target of linkTargets(tree)) {
      expect(resolveLink(linkHash(skill, target), skillTrees)).toEqual({ skill, target });
    }
  });

  it('opens the skill when the block is unknown', () => {
    expect(resolveLink('#set-type/gone', skillTrees)).toEqual({ skill: 'set-type', target: null });
  });

  it('rejects an unknown skill', () => {
    expect(resolveLink('#nope/voice', skillTrees)).toBeNull();
  });
});
