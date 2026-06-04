import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import { runMigrateRoutes } from './migrate-routes.mjs';

const roots: string[] = [];
function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), 'lt-migrate-routes-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}
const olds = (hits: Array<{ old: string }>) => hits.map((h) => h.old).sort();

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('runMigrateRoutes', () => {
  it('flags the old scaffold buttons as rewritable but writes nothing without apply', () => {
    const root = project({
      'src/App.svelte': `<LiveTokensRouter {pages} />`,
      'src/pages/Home.svelte':
        `<Button on:click={() => navigate('/editor')}>E</Button>\n` +
        `<Button on:click={() => navigate('/components')}>C</Button>`,
    });
    const r = runMigrateRoutes({ root, apply: false });

    expect(olds(r.pendingWrite)).toEqual(['/components', '/editor']);
    expect(r.rewritten).toHaveLength(0);
    expect(r.pendingWrite.find((h: { old: string }) => h.old === '/editor').line).toBe(1);
    expect(r.pendingWrite.find((h: { old: string }) => h.old === '/components').line).toBe(2);
    expect(readFileSync(join(root, 'src/pages/Home.svelte'), 'utf8')).toContain("navigate('/editor')");
  });

  it('rewrites editor/components references under apply', () => {
    const root = project({
      'src/App.svelte': `<LiveTokensRouter {pages} />`,
      'src/pages/Home.svelte':
        `<Button on:click={() => navigate('/editor')}>E</Button>\n` +
        `<a href="/components">C</a>`,
    });
    const r = runMigrateRoutes({ root, apply: true });

    expect(olds(r.rewritten)).toEqual(['/components', '/editor']);
    const home = readFileSync(join(root, 'src/pages/Home.svelte'), 'utf8');
    expect(home).toContain("navigate('/live-tokens/editor')");
    expect(home).toContain('href="/live-tokens/components"');
    expect(home).not.toContain("navigate('/editor')");
  });

  it('never auto-rewrites /docs, even under apply', () => {
    const root = project({
      'src/App.svelte': `<LiveTokensRouter {pages} />`,
      'src/Nav.svelte': `<a href="/docs">Docs</a>`,
    });
    const r = runMigrateRoutes({ root, apply: true });

    expect(olds(r.advisory)).toEqual(['/docs']);
    expect(r.rewritten).toHaveLength(0);
    expect(readFileSync(join(root, 'src/Nav.svelte'), 'utf8')).toContain('href="/docs"');
  });

  it('leaves a consumer-declared /components page alone (advisory, not rewritten)', () => {
    const root = project({
      'src/App.svelte': `const pages = { '/components': { lazy: () => import('./C.svelte') } };`,
      'src/Nav.svelte': `<a href="/components">C</a>`,
    });
    const r = runMigrateRoutes({ root, apply: true });

    expect(r.owned).toContain('/components');
    expect(olds(r.advisory)).toEqual(['/components']);
    expect(r.rewritten).toHaveLength(0);
  });

  it('treats an editorRoutes-relocated route as consumer-managed', () => {
    const root = project({
      'src/App.svelte': `<LiveTokensRouter {pages} editorRoutes={{ components: '/widgets' }} />`,
      'src/Nav.svelte': `<a href="/components">C</a>`,
    });
    const r = runMigrateRoutes({ root, apply: true });

    expect(r.owned).toContain('/components');
    expect(r.rewritten).toHaveLength(0);
    expect(olds(r.advisory)).toEqual(['/components']);
  });

  it('does not match already-migrated or look-alike paths', () => {
    const root = project({
      'src/App.svelte': `<LiveTokensRouter {pages} />`,
      'src/Home.svelte': `navigate('/live-tokens/editor');\nnavigate('/editorial');`,
    });
    const r = runMigrateRoutes({ root, apply: false });

    expect(r.pendingWrite).toHaveLength(0);
    expect(r.advisory).toHaveLength(0);
  });
});
