import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import * as tokensCssEngine from '../vite-plugin/tokensCssMigrations/index';
// @ts-expect-error — plain .mjs module, no types
import { checkTokensCssMigrations } from './rules/tokens.mjs';

// CI runs the suite before build:plugin, so the pass gets the source engine.
const engine = { ...tokensCssEngine, readLiveTokensConfig: () => ({}) };
const CURRENT = readFileSync(resolve(__dirname, '../src/system/styles/tokens.css'), 'utf8');

function project(css: string) {
  const root = mkdtempSync(join(tmpdir(), 'lt-tokens-migration-'));
  const path = join(root, 'src/system/styles/tokens.css');
  mkdirSync(join(root, 'src/system/styles'), { recursive: true });
  writeFileSync(path, css);
  return { root, read: () => readFileSync(path, 'utf8') };
}

const ids = (list: { details: { migrations: { id: string }[] } }[]) => list.flatMap((f) => f.details.migrations.map((m) => m.id));
const withoutTints = CURRENT.replace(/^\s*--tint(?:-low|-high)?:.*\n/gm, '');

describe('the tokens.css migration pass', () => {
  it('applies a pending additive migration, and a second run applies nothing', async () => {
    const { root, read } = project(withoutTints);
    const first = await checkTokensCssMigrations({ root, apply: true, engine });
    expect(ids(first.applied)).toEqual(['2026-09-01-tint-scale']);
    expect(first.findings).toEqual([]);
    expect(read()).toContain('--tint-low:');

    const second = await checkTokensCssMigrations({ root, apply: true, engine });
    expect(second).toEqual({ applied: [], findings: [] });
  });

  it('reports a pending additive migration without writing under --no-fix', async () => {
    const { root, read } = project(withoutTints);
    const { applied, findings } = await checkTokensCssMigrations({ root, apply: false, engine });
    expect(applied).toEqual([]);
    expect(findings.map((f: { rule: string }) => f.rule)).toEqual(['tokens-migration']);
    expect(read()).toBe(withoutTints);
  });

  it('leaves a pending breaking migration as a finding and never applies it', async () => {
    const { root, read } = project(CURRENT.replaceAll('--scrim', '--overlay'));
    const { findings } = await checkTokensCssMigrations({ root, apply: true, engine });
    const breaking = findings.filter((f: { rule: string }) => f.rule === 'tokens-breaking-migration');
    expect(ids(breaking)).toContain('2026-09-01-scrim-rename');
    expect(read()).toContain('--overlay:');
    expect(read()).not.toContain('--scrim:');
  });
});
