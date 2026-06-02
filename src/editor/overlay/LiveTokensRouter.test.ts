// @vitest-environment happy-dom
//
// Resolution contract for LiveTokensRouter's dispatch: the precedence that
// turns a path into the one RouteEntry driving both the rendered page and its
// "Page Source". Owned routes (/editor, /components, /docs) are matched by the
// component before resolveRoute runs, so they're out of scope here.

import { describe, expect, it } from 'vitest';
import { resolveRoute, type RouteEntry } from './LiveTokensRouter.svelte';

function fakeComponent(): NonNullable<RouteEntry['component']> {
  return (() => {}) as unknown as NonNullable<RouteEntry['component']>;
}

describe('resolveRoute — path to RouteEntry precedence', () => {
  const pages: Record<string, RouteEntry> = {
    '/': { component: fakeComponent(), source: 'src/Home.svelte', label: 'Site' },
    '/about': { component: fakeComponent(), source: 'src/About.svelte' },
  };

  // runegoblin's /module/:id shape: resolve() matches the path, hands the page
  // the captured id as a prop, and supplies the source so the dynamic route
  // gets "Page Source" too.
  function resolve(route: string): RouteEntry | null {
    const m = route.match(/^\/module\/(.+)$/);
    if (m) {
      return {
        lazy: () => Promise.resolve({ default: fakeComponent() }),
        props: { moduleId: m[1] },
        source: 'src/pages/ModuleDetail.svelte',
      };
    }
    return null;
  }

  it('drives a /module/:id path through resolve with props and source', () => {
    const entry = resolveRoute(pages, resolve, '/module/abc123');
    expect(typeof entry?.lazy).toBe('function');
    expect(entry?.props).toEqual({ moduleId: 'abc123' });
    expect(entry?.source).toBe('src/pages/ModuleDetail.svelte');
  });

  it("a null resolve return falls through to pages['/']", () => {
    expect(resolveRoute(pages, resolve, '/totally/unknown')).toBe(pages['/']);
  });

  it('an exact pages match wins over resolve', () => {
    const matchesEverything = (): RouteEntry => ({ component: fakeComponent() });
    expect(resolveRoute(pages, matchesEverything, '/about')).toBe(pages['/about']);
  });

  it("resolve wins over the '/' fallback when it returns an entry", () => {
    const entry = resolveRoute(pages, resolve, '/module/x');
    expect(entry).not.toBe(pages['/']);
    expect(entry?.props).toEqual({ moduleId: 'x' });
  });

  it("with no resolve, behaves as before: exact match, then '/' fallback", () => {
    expect(resolveRoute(pages, undefined, '/about')).toBe(pages['/about']);
    expect(resolveRoute(pages, undefined, '/missing')).toBe(pages['/']);
  });

  it("returns null when nothing matches and there is no '/' fallback", () => {
    expect(resolveRoute({}, undefined, '/x')).toBeNull();
    expect(resolveRoute({}, () => null, '/x')).toBeNull();
  });
});
