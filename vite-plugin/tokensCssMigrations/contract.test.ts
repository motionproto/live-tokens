import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  TOKENS_CSS_MIGRATIONS,
  runAdditiveTokensCssMigrations,
  findContractViolations,
  semverBumpType,
  enforceBreakingRequiresMajor,
} from './index';
import type { TokensCssMigration } from './types';

const CANONICAL_TOKENS_CSS = readFileSync(
  resolve(process.cwd(), 'src/system/styles/tokens.css'),
  'utf-8',
);

const additive = (id: string): TokensCssMigration => ({ id, kind: 'additive', description: id, apply: (c) => c });
const breaking = (id: string): TokensCssMigration => ({ id, kind: 'breaking', description: id, apply: (c) => c });

describe('token-as-API contract — classification', () => {
  it('every registered migration declares a valid kind', () => {
    for (const m of TOKENS_CSS_MIGRATIONS) {
      expect(['additive', 'breaking'], `${m.id}`).toContain(m.kind);
    }
  });

  it('no additive migration removes or renames a token (verified against canonical tokens.css)', () => {
    expect(findContractViolations(CANONICAL_TOKENS_CSS)).toEqual([]);
  });

  it('catches a breaking change mislabeled additive', () => {
    // A migration that removes a token the canonical file defines, but claims additive.
    const liar: TokensCssMigration = {
      id: 'liar',
      kind: 'additive',
      description: 'removes --space-16 but says additive',
      apply: (css) => css.replace(/\s*--space-16:[^;]*;/, ''),
    };
    const before = new Set(TOKENS_CSS_MIGRATIONS);
    TOKENS_CSS_MIGRATIONS.push(liar);
    try {
      const violations = findContractViolations(CANONICAL_TOKENS_CSS);
      expect(violations.map((v) => v.id)).toContain('liar');
      expect(violations.find((v) => v.id === 'liar')?.removed).toContain('--space-16');
    } finally {
      // Restore the registry so order/contents don't leak into sibling tests.
      TOKENS_CSS_MIGRATIONS.length = 0;
      TOKENS_CSS_MIGRATIONS.push(...before);
    }
  });
});

describe('runAdditiveTokensCssMigrations', () => {
  it('skips breaking migrations', () => {
    // The dead --size-icon-* removal is breaking, so an old css that still has
    // those tokens keeps them after an additive-only run.
    const old = `:root {\n  --size-icon-sm: 1rem;\n}\n`;
    const { css } = runAdditiveTokensCssMigrations(old);
    expect(css).toContain('--size-icon-sm');
  });
});

describe('semverBumpType', () => {
  it.each([
    ['0.33.1', '1.0.0', 'major'],
    ['0.33.1', '0.34.0', 'minor'],
    ['0.33.1', '0.33.2', 'patch'],
    ['v0.33.1', 'v0.33.1', 'none'],
    ['1.2.3', '2.0.0', 'major'],
  ] as const)('%s -> %s = %s', (prev, next, expected) => {
    expect(semverBumpType(prev, next)).toBe(expected);
  });
});

describe('enforceBreakingRequiresMajor', () => {
  it('ok when no breaking migration ships', () => {
    const r = enforceBreakingRequiresMajor({
      newMigrations: [additive('a')],
      prevVersion: '0.33.1',
      nextVersion: '0.34.0',
    });
    expect(r.level).toBe('ok');
  });

  it('ok when a breaking migration ships with a major bump', () => {
    const r = enforceBreakingRequiresMajor({
      newMigrations: [breaking('b')],
      prevVersion: '1.4.0',
      nextVersion: '2.0.0',
    });
    expect(r.level).toBe('ok');
  });

  it('warns pre-1.0 when a breaking migration ships in a minor', () => {
    const r = enforceBreakingRequiresMajor({
      newMigrations: [breaking('b')],
      prevVersion: '0.33.1',
      nextVersion: '0.34.0',
    });
    expect(r.level).toBe('warn');
    expect(r.breakingIds).toEqual(['b']);
  });

  it('errors post-1.0 when a breaking migration ships in a minor', () => {
    const r = enforceBreakingRequiresMajor({
      newMigrations: [breaking('b'), additive('a')],
      prevVersion: '1.0.0',
      nextVersion: '1.1.0',
    });
    expect(r.level).toBe('error');
  });

  it('errors post-1.0 when a breaking migration ships in a patch', () => {
    const r = enforceBreakingRequiresMajor({
      newMigrations: [breaking('b')],
      prevVersion: '1.0.0',
      nextVersion: '1.0.1',
    });
    expect(r.level).toBe('error');
  });
});
