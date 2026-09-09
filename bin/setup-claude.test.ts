import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — plain .mjs module, no types
import { runSetupClaude, formatSetupResult } from './setup-claude.mjs';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillsDir = join(pkgRoot, '.claude', 'skills');
const shipped = readdirSync(skillsDir).filter((n) => statSync(join(skillsDir, n)).isDirectory());

const created: string[] = [];
function freshProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'lt-setup-claude-'));
  created.push(dir);
  return dir;
}

function skillDir(cwd: string, name: string): string {
  return join(cwd, '.claude', 'skills', name);
}

function plant(cwd: string, name: string, file = 'SKILL.md', body = 'stale'): void {
  const dir = skillDir(cwd, name);
  mkdirSync(dirname(join(dir, file)), { recursive: true });
  writeFileSync(join(dir, file), body);
}

afterEach(() => {
  while (created.length) rmSync(created.pop()!, { recursive: true, force: true });
});

describe('runSetupClaude', () => {
  it('installs every bundled skill into an empty project', () => {
    const cwd = freshProject();
    const result = runSetupClaude({ pkgRoot, cwd });

    expect(result.installed).toEqual(shipped);
    expect(result.skipped).toEqual([]);
    for (const skill of shipped) {
      expect(existsSync(join(skillDir(cwd, skill), 'SKILL.md')), skill).toBe(true);
    }
  });

  it('leaves an existing skill alone without --force', () => {
    const cwd = freshProject();
    plant(cwd, shipped[0], 'SKILL.md', 'mine');

    const result = runSetupClaude({ pkgRoot, cwd });

    expect(result.skipped).toEqual([shipped[0]]);
    expect(readFileSync(join(skillDir(cwd, shipped[0]), 'SKILL.md'), 'utf8')).toBe('mine');
  });

  it('removes a skill this release no longer ships, under --force', () => {
    const cwd = freshProject();
    plant(cwd, 'live-tokens-build-page');

    const result = runSetupClaude({ pkgRoot, cwd, force: true });

    expect(result.removed).toEqual(['live-tokens-build-page']);
    expect(existsSync(skillDir(cwd, 'live-tokens-build-page'))).toBe(false);
  });

  it('keeps a renamed skill without --force, so nothing is deleted by surprise', () => {
    const cwd = freshProject();
    plant(cwd, 'live-tokens-build-page');

    const result = runSetupClaude({ pkgRoot, cwd });

    expect(result.removed).toEqual([]);
    expect(existsSync(skillDir(cwd, 'live-tokens-build-page'))).toBe(true);
  });

  it("never touches a project's own skill", () => {
    const cwd = freshProject();
    plant(cwd, 'deploy-checklist', 'SKILL.md', 'mine');

    runSetupClaude({ pkgRoot, cwd, force: true });

    expect(readFileSync(join(skillDir(cwd, 'deploy-checklist'), 'SKILL.md'), 'utf8')).toBe('mine');
  });

  it('drops a reference file the release removed from a skill it still ships', () => {
    const cwd = freshProject();
    plant(cwd, shipped[0], 'references/retired.md', 'stale');

    runSetupClaude({ pkgRoot, cwd, force: true });

    expect(existsSync(join(skillDir(cwd, shipped[0]), 'references/retired.md'))).toBe(false);
    expect(existsSync(join(skillDir(cwd, shipped[0]), 'SKILL.md'))).toBe(true);
  });

  it('reports a missing bundle rather than emptying the destination', () => {
    const cwd = freshProject();
    expect(() => runSetupClaude({ pkgRoot: cwd, cwd })).toThrow(/No bundled skills found/);
  });
});

describe('formatSetupResult', () => {
  it('names each removed skill and counts it', () => {
    const cwd = freshProject();
    plant(cwd, 'live-tokens-build-page');

    const out = formatSetupResult(runSetupClaude({ pkgRoot, cwd, force: true }));

    expect(out).toContain('gone  live-tokens-build-page');
    expect(out).toContain('1 removed');
  });

  it('points a run that skipped everything at --force', () => {
    const cwd = freshProject();
    runSetupClaude({ pkgRoot, cwd });

    const out = formatSetupResult(runSetupClaude({ pkgRoot, cwd }));

    expect(out).toContain('--force');
    expect(out).not.toContain('removed');
  });
});
