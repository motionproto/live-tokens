import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import { runBuildChecks } from './buildChecks.mjs';

// No migrations pending, so each test sees only the page's own findings.
const engine = {
  TOKENS_CSS_MIGRATIONS: [],
  readLiveTokensConfig: () => ({}),
  runAdditiveTokensCssMigrations: (css: string) => ({ changed: false, css, applied: [] }),
  runTokensCssMigrations: (css: string) => ({ css, applied: [] }),
};

const roots: string[] = [];
function project(pageBody: string, checks?: object): string {
  const root = mkdtempSync(join(tmpdir(), 'lt-build-checks-'));
  roots.push(root);
  mkdirSync(join(root, 'src/system/styles'), { recursive: true });
  mkdirSync(join(root, 'src/pages'), { recursive: true });
  writeFileSync(join(root, 'src/system/styles/tokens.css'), ':root { --text-primary: #eee; }');
  writeFileSync(join(root, 'src/pages/Home.svelte'), pageBody);
  if (checks) writeFileSync(join(root, 'live-tokens.config.json'), JSON.stringify({ checks }));
  return root;
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('runBuildChecks', () => {
  it('passes a page that takes its color from a design token', async () => {
    const result = await runBuildChecks({ root: project('<div style="color: var(--text-primary)"></div>'), engine });
    expect(result).toMatchObject({ errors: 0, warnings: 0 });
  });

  it('counts a color literal as an error and names its rule in the report', async () => {
    const result = await runBuildChecks({ root: project('<div style="color: #fff"></div>'), engine });
    expect(result.errors).toBe(1);
    expect(result.report).toContain('[color-literal]');
  });

  it('holds the severity the project configured', async () => {
    const root = project('<div style="color: #fff"></div>', { rules: { 'color-literal': 'warn' } });
    const result = await runBuildChecks({ root, engine });
    expect(result).toMatchObject({ errors: 0, warnings: 1 });
  });

  it('writes nothing to the page it checks', async () => {
    const body = '<div style="color: #fff"></div>';
    const root = project(body);
    await runBuildChecks({ root, engine });
    expect(readFileSync(join(root, 'src/pages/Home.svelte'), 'utf8')).toBe(body);
  });
});
