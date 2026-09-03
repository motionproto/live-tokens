import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SKILL_DOC, skillDocs } from './skillSources.generated';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const SKILLS = join(ROOT, '.claude/skills');

const skillDirs = readdirSync(SKILLS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

describe('skillDocs', () => {
  it('is keyed by every directory under .claude/skills', () => {
    const ids = skillDirs.map((dir) => dir.replace(/^live-tokens-/, '')).sort();
    expect(Object.keys(skillDocs).sort()).toEqual(ids);
  });

  it('carries SKILL.md for every skill', () => {
    for (const [id, docs] of Object.entries(skillDocs)) {
      expect(docs[SKILL_DOC], `${id} is missing ${SKILL_DOC}`).toBeDefined();
    }
  });

  it('carries every references/*.md on disk under its skill', () => {
    for (const dir of skillDirs) {
      const id = dir.replace(/^live-tokens-/, '');
      const refDir = join(SKILLS, dir, 'references');
      if (!existsSync(refDir)) continue;
      for (const file of readdirSync(refDir).filter((f) => f.endsWith('.md'))) {
        const path = `references/${file}`;
        expect(skillDocs[id]?.[path], `${id} is missing ${path}`).toBeDefined();
      }
    }
  });
});
