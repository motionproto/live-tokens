// @vitest-environment happy-dom
//
// Resolution contract for LiveTokensRouter's dispatch: the precedence that
// turns a path into the one RouteEntry driving both the rendered page and its
// "Page Source". The package's /live-tokens/* routes (editor, components, docs)
// are matched by the component before resolveRoute runs, so they're out of
// scope here.

import { describe, expect, it } from 'vitest';
import { resolveLinkNavigation, resolveRoute, type RouteEntry } from './LiveTokensRouter.svelte';

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

describe('resolveLinkNavigation — which clicks the router claims', () => {
  const BASE = 'https://site.test/current';
  const ROUTES = ['/', '/about', '/essays/taste'];
  const claimsRoute = (pathname: string) => ROUTES.includes(pathname);

  const plainClick = {
    button: 0,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    defaultPrevented: false,
  };

  function link(attrs: Record<string, string>) {
    return {
      getAttribute: (name: string) => attrs[name] ?? null,
      hasAttribute: (name: string) => name in attrs,
    };
  }

  function claim(attrs: Record<string, string>, click: Partial<typeof plainClick> = {}) {
    return resolveLinkNavigation(link(attrs), { ...plainClick, ...click }, claimsRoute, BASE);
  }

  it('claims a plain left-click on a declared route', () => {
    expect(claim({ href: '/about' })).toBe('/about');
  });

  it('carries the query and hash through to navigate', () => {
    expect(claim({ href: '/essays/taste?x=1#refs' })).toBe('/essays/taste?x=1#refs');
  });

  // The reported bug: a PDF in public/ opened in a new tab was cancelled and
  // pushed through the router, which has no such route, so nothing opened.
  it('leaves a target="_blank" PDF to the browser', () => {
    expect(claim({ href: '/slides.pdf', target: '_blank', rel: 'noopener noreferrer' })).toBeNull();
  });

  it('leaves a same-tab static file to the browser', () => {
    expect(claim({ href: '/slides.pdf' })).toBeNull();
  });

  it('claims a route whose path happens to look like a file', () => {
    expect(resolveLinkNavigation(link({ href: '/v1.2' }), plainClick, (p) => p === '/v1.2', BASE)).toBe('/v1.2');
  });

  it('leaves a download to the browser', () => {
    expect(claim({ href: '/about', download: '' })).toBeNull();
  });

  it('leaves rel="external" to the browser', () => {
    expect(claim({ href: '/about', rel: 'noopener external' })).toBeNull();
  });

  it('treats target="_self" as ordinary same-tab navigation', () => {
    expect(claim({ href: '/about', target: '_self' })).toBe('/about');
  });

  it('leaves modified clicks, non-left buttons, and handled clicks alone', () => {
    expect(claim({ href: '/about' }, { metaKey: true })).toBeNull();
    expect(claim({ href: '/about' }, { ctrlKey: true })).toBeNull();
    expect(claim({ href: '/about' }, { shiftKey: true })).toBeNull();
    expect(claim({ href: '/about' }, { altKey: true })).toBeNull();
    expect(claim({ href: '/about' }, { button: 1 })).toBeNull();
    expect(claim({ href: '/about' }, { defaultPrevented: true })).toBeNull();
  });

  // `//host/x` starts with '/', and pushState throws on a cross-origin URL.
  it('leaves a protocol-relative cross-origin href to the browser', () => {
    expect(claim({ href: '//evil.test/about' })).toBeNull();
  });

  it('leaves hash, relative, and absolute-URL hrefs alone', () => {
    expect(claim({ href: '#refs' })).toBeNull();
    expect(claim({ href: 'about' })).toBeNull();
    expect(claim({ href: 'https://site.test/about' })).toBeNull();
  });

  it('consults resolve()-style dynamic routes through claimsRoute', () => {
    const claims = (p: string) => /^\/module\/.+$/.test(p);
    expect(resolveLinkNavigation(link({ href: '/module/abc' }), plainClick, claims, BASE)).toBe('/module/abc');
  });

  // pages['/'] renders an unmatched path; it does not claim one. Cancelling
  // these clicks is what hid every non-route the origin serves.
  it("does not claim an unrouted path just because pages['/'] would render it", () => {
    expect(claim({ href: '/no/such/page' })).toBeNull();
  });
});
