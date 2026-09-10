import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — plain .mjs module, no types
import * as pageRoutes from './pageRoutes.mjs';
// @ts-expect-error — plain .mjs module, no types
import { NOT_PAGES } from '../check-page.mjs';

const {
  SYSTEM_DIRS,
  DEFAULT_PAGE_VIEWPORTS,
  resolvePageTargets,
  resolvePageTestTargets,
  routeTable,
  settingsPageRoutes,
  settingsPageViewports,
} = pageRoutes;

const roots: string[] = [];

function project(app: string, files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), 'lt-page-routes-'));
  roots.push(root);
  mkdirSync(join(root, 'src/pages'), { recursive: true });
  writeFileSync(join(root, 'src/App.svelte'), app);
  for (const [rel, text] of Object.entries(files)) {
    mkdirSync(join(root, rel, '..'), { recursive: true });
    writeFileSync(join(root, rel), text);
  }
  return root;
}

const APP = `<script lang="ts">
  import { LiveTokensRouter } from '@motion-proto/live-tokens';
  const pages = {
    '/': { lazy: () => import('./pages/Home.svelte'), label: 'Home', source: 'src/pages/Home.svelte' },
    '/about': { lazy: () => import('./pages/About.svelte'), source: 'src/pages/About.svelte' },
    '/nowhere': { lazy: () => import('./pages/Nowhere.svelte') },
  };
</script>

<LiveTokensRouter {pages} />
`;

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('resolvePageTargets', () => {
  it('pairs every page the route table names with its route', () => {
    expect(resolvePageTargets([], project(APP))).toEqual([
      { source: 'src/pages/About.svelte', route: '/about' },
      { source: 'src/pages/Home.svelte', route: '/' },
    ]);
  });

  it('leaves a page no route renders without one, and says why', () => {
    const [target] = resolvePageTargets(['src/pages/Nowhere.svelte'], project(APP));
    expect(target.route).toBeNull();
    expect(target.reason).toMatch(/pageRoutes/);
  });

  it('reads a directory as every mapped page under it', () => {
    expect(resolvePageTargets(['src/pages'], project(APP)).map((t: { route: string }) => t.route))
      .toEqual(['/about', '/']);
  });

  it('keeps the system directories out', () => {
    const app = APP.replace(
      "'/nowhere': { lazy: () => import('./pages/Nowhere.svelte') },",
      "'/skills': { lazy: () => import('./editor/Atlas.svelte'), source: 'src/editor/Atlas.svelte' },",
    );
    expect(resolvePageTargets([], project(app)).map((t: { source: string }) => t.source))
      .toEqual(['src/pages/About.svelte', 'src/pages/Home.svelte']);
  });

  it('lets pageRoutes map a route the table cannot express', () => {
    const root = project(APP, {
      'live-tokens.testing.ts': `export default { pageRoutes: { 'src/pages/Nowhere.svelte': '/thing/42' } };`,
    });
    expect(resolvePageTargets(['src/pages/Nowhere.svelte'], root))
      .toEqual([{ source: 'src/pages/Nowhere.svelte', route: '/thing/42' }]);
  });

  it('lets pageRoutes override the route the table names', () => {
    const root = project(APP, {
      'live-tokens.testing.ts': `export default { pageRoutes: { 'src/pages/About.svelte': '/about?tab=team' } };`,
    });
    expect(resolvePageTargets(['src/pages/About.svelte'], root))
      .toEqual([{ source: 'src/pages/About.svelte', route: '/about?tab=team' }]);
  });

  it('ignores a commented-out pageRoutes', () => {
    const root = project(APP, {
      'live-tokens.testing.ts': `// pageRoutes: { 'src/pages/Home.svelte': '/wrong' }\nexport default {};`,
    });
    expect(settingsPageRoutes(root).size).toBe(0);
  });

  it('refuses a pageRoutes it cannot read statically', () => {
    const root = project(APP, {
      'live-tokens.testing.ts': `export default { pageRoutes: routesFrom(config) };`,
    });
    expect(() => settingsPageRoutes(root)).toThrow(/plain object literal/);
  });

  it('refuses a page URL that is not a string literal', () => {
    const root = project(APP, {
      'live-tokens.testing.ts': "export default { pageRoutes: { 'src/pages/Home.svelte': `/${slug}` } };",
    });
    expect(() => settingsPageRoutes(root)).toThrow(/string literal/);
  });

  it('reads only the router file, not every object named pages', () => {
    const root = project(APP, { 'src/pages/Home.svelte': '<p>home</p>' });
    writeFileSync(
      join(root, 'src/pages/Decoy.svelte'),
      `<script>const pages = { '/decoy': { source: 'src/pages/Decoy.svelte' } };</script>`,
    );
    expect([...routeTable(root).keys()]).toEqual(['/', '/about']);
  });
});

describe('settingsPageViewports', () => {
  it('falls back to the two fixed viewports with no settings file at all', () => {
    expect(settingsPageViewports(project(APP))).toEqual(DEFAULT_PAGE_VIEWPORTS);
  });

  it('falls back to the two fixed viewports when the key is absent', () => {
    const root = project(APP, { 'live-tokens.testing.ts': 'export default {};' });
    expect(settingsPageViewports(root)).toEqual(DEFAULT_PAGE_VIEWPORTS);
  });

  it('reads a replaced list — the regression a stale hardcoded default missed', () => {
    const root = project(APP, {
      'live-tokens.testing.ts': 'export default { pageViewports: [{ width: 1440, height: 900 }] };',
    });
    expect(settingsPageViewports(root)).toEqual([{ width: 1440, height: 900 }]);
  });

  it('ignores a commented-out pageViewports', () => {
    const root = project(APP, {
      'live-tokens.testing.ts': '// pageViewports: [{ width: 1440, height: 900 }]\nexport default {};',
    });
    expect(settingsPageViewports(root)).toEqual(DEFAULT_PAGE_VIEWPORTS);
  });

  it('refuses a pageViewports it cannot read statically', () => {
    const root = project(APP, {
      'live-tokens.testing.ts': 'export default { pageViewports: viewportsFrom(config) };',
    });
    expect(() => settingsPageViewports(root)).toThrow(/array literal/);
  });

  it('refuses an entry that is not a plain { width, height } literal', () => {
    const root = project(APP, {
      'live-tokens.testing.ts': 'export default { pageViewports: [{ width: 1440 }] };',
    });
    expect(() => settingsPageViewports(root)).toThrow(/width, height/);
  });
});

describe('resolvePageTestTargets: the two halves of check-page --tests have to agree', () => {
  function projectWithExclude(exclude: string[]) {
    return project(APP, {
      'live-tokens.config.json': JSON.stringify({ checks: { exclude } }),
      'src/pages/About.svelte': '<p>about</p>',
      'src/pages/Home.svelte': '<p>home</p>',
    });
  }

  it('drops an excluded page from the no-paths-given discovery, same as checkPages', () => {
    const root = projectWithExclude(['src/pages/About.svelte']);
    expect(resolvePageTestTargets([], root).map((t: { source: string }) => t.source)).toEqual([
      'src/pages/Home.svelte',
    ]);
  });

  it('drops an excluded page from a directory target, same as checkPages walking that directory', () => {
    const root = projectWithExclude(['src/pages/About.svelte']);
    expect(resolvePageTestTargets(['src/pages'], root).map((t: { source: string }) => t.source)).toEqual([
      'src/pages/Home.svelte',
    ]);
  });

  it('still checks an excluded page named explicitly as a file, same as checkPages', () => {
    const root = projectWithExclude(['src/pages/About.svelte']);
    expect(resolvePageTestTargets(['src/pages/About.svelte'], root).map((t: { source: string }) => t.source)).toEqual(
      ['src/pages/About.svelte'],
    );
  });
});

it('mirrors the static checker list of system directories', () => {
  expect(SYSTEM_DIRS).toEqual(NOT_PAGES);
});
