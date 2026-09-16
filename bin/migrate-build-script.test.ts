import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import { runMigrateBuildScript } from './migrate-build-script.mjs';

const SHIPPED = 'live-tokens check-page --no-fix && live-tokens check-component --no-fix';
const PLUGIN_CONFIG = `import { themeFileApi } from '@motion-proto/live-tokens/vite-plugin';\nexport default { plugins: [themeFileApi({ tokensCssPath: 'src/system/styles/tokens.css' })] };\n`;

const roots: string[] = [];
function project(scripts: Record<string, string>, viteConfig = PLUGIN_CONFIG): string {
  const root = mkdtempSync(join(tmpdir(), 'lt-migrate-build-'));
  roots.push(root);
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'app', scripts }, null, 2) + '\n');
  writeFileSync(join(root, 'vite.config.ts'), viteConfig);
  return root;
}
const scriptsOf = (root: string) => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts;

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('runMigrateBuildScript', () => {
  it('removes the shipped script and its build step, keeping the other scripts and the file format', () => {
    const root = project({ dev: 'vite', build: 'npm run check:design && vite build', 'check:design': SHIPPED });
    expect(runMigrateBuildScript({ root })).toEqual({ status: 'changed' });
    expect(scriptsOf(root)).toEqual({ dev: 'vite', build: 'vite build' });
    expect(readFileSync(join(root, 'package.json'), 'utf8')).toBe(
      JSON.stringify({ name: 'app', scripts: { dev: 'vite', build: 'vite build' } }, null, 2) + '\n',
    );
  });

  it('accepts the npx form of the shipped script', () => {
    const root = project({ build: 'npm run check:design && vite build', 'check:design': SHIPPED.replaceAll('live-tokens', 'npx live-tokens') });
    expect(runMigrateBuildScript({ root }).status).toBe('changed');
  });

  it('reports the change without writing when apply is false', () => {
    const scripts = { build: 'npm run check:design && vite build', 'check:design': SHIPPED };
    const root = project(scripts);
    expect(runMigrateBuildScript({ root, apply: false })).toEqual({ status: 'would-change' });
    expect(scriptsOf(root)).toEqual(scripts);
  });

  it.each([
    ['the Vite config does not use themeFileApi', { build: 'npm run check:design && vite build', 'check:design': SHIPPED }, 'export default {};\n', 'does not use themeFileApi'],
    ['themeFileApi has checks turned off', { build: 'npm run check:design && vite build', 'check:design': SHIPPED }, PLUGIN_CONFIG.replace("tokensCssPath", 'checks: false, tokensCssPath'), 'checks: false'],
    ['the project wrote its own check:design', { build: 'npm run check:design && vite build', 'check:design': `${SHIPPED} --strict` }, PLUGIN_CONFIG, 'differs'],
    ['another script runs check:design', { build: 'npm run check:design && vite build', ci: 'npm run check:design', 'check:design': SHIPPED }, PLUGIN_CONFIG, '"ci" still runs it'],
  ])('keeps the script when %s', (_label, scripts, viteConfig, reason) => {
    const root = project(scripts, viteConfig);
    const result = runMigrateBuildScript({ root });
    expect(result.status).toBe('advisory');
    expect(result.reason).toContain(reason);
    expect(scriptsOf(root)).toEqual(scripts);
  });

  it('changes nothing in a project without check:design', () => {
    const root = project({ build: 'vite build' });
    expect(runMigrateBuildScript({ root })).toEqual({ status: 'unchanged' });
  });
});
