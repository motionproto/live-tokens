# Routing port: implementation plan

Status: Phase 1 (`resolve` + `props`) implemented and on `main`, targeting release
0.28.0 (not yet published). Its exit criterion, migrating a real consumer like
runegoblin onto the new prop, is not yet done. Rung-3 work remains deferred.
Companion to
`docs/routing-architecture-exploration.md`, which holds the root-cause analysis
and the full design of the routing port. This document is the build sequence.

## Completion status (2026-06-02)

Phase 1 is built, tested, and documented on `main`. It is not yet released, and
its consumer-migration exit criterion is still outstanding.

Done:

- [x] `props` on `RouteEntry`, spread into the dispatched page (`<Page {...entry.props} />`).
- [x] `resolve?: (route) => RouteEntry | null` prop; precedence `pages[route]`, then `resolve(route)`, then `pages['/']` (exported as `resolveRoute`).
- [x] Page-source resolves from the matched entry's `source`, so dynamic routes get "Page Source" and it cannot desync from the page.
- [x] Precedence documented at the API surface (the `resolve` prop, `RouteEntry.props`, and the `resolveRoute` JSDoc).
- [x] Back-compat: `pages`-only consumers unchanged (`resolveRoute(pages, undefined, route)` equals today's `pages[route] ?? pages['/']`).
- [x] Test `LiveTokensRouter.test.ts`: a `/module/:id` resolve (asserts component, props, source) plus the `null`-falls-through-to-`pages['/']` case. Full suite green (2705 tests); typecheck and build clean.
- [x] Present defect: removed the dead `/demo` glob and stale comment in `ComponentEditorPage.svelte`.
- [x] Developer docs: README routing section, `CHANGELOG` 0.28.0, build-page skill, template README, getting-started.

Outstanding:

- [ ] Consumer migration: move runegoblin onto `<LiveTokensRouter {pages} {resolve} />`. This is Phase 1's exit criterion and lives in that repo, not this one.
- [ ] Release 0.28.0: version bump plus tag/publish via CI. The CHANGELOG entry is ready.

Commits: `ec40596` (router `resolve`/`props`, test, present-defect cleanup) and
`4b9090e` (docs). The routing port and all rung-3 machinery remain deferred,
unchanged.

Per a YAGNI call (no full-router adoption is planned), the only **scheduled**
work is the no-router dynamic tier (`resolve` + `props`), which has a real
consumer today. The routing port and all full-router (rung-3) machinery are
designed in the exploration doc and summarized below, but **deferred** until a
real router consumer exists. We do not build the seam ahead of its consumer.

## What changed in this revision (C2 audit folded in)

- **Port deferred (audit M1).** Building a one-implementation interface for an
  absent rung-3 consumer was Speculative Generality, and inconsistent with
  deferring the adapter on the same grounds. The port now ships with the rung-3
  work, when that work is real, not before. The earlier "reachable day one via
  the port" claim is dropped; it was itself speculative.
- **`resolve` promoted to the only scheduled phase.** It has a real consumer
  (runegoblin's route shape) now.
- **Chrome extraction, owned-page data-flow, and the rung-3 boot entry**
  (audit M2, M3, M4) are bundled into the deferred rung-3 work, where their value
  materializes.
- **Props typing trade accepted and documented** (audit M5); **`pages`/`resolve`
  precedence documented** (audit m2).
- **A present defect logged** (audit M3): an owned page hardcodes consumer routes,
  independent of these phases.

## Design stance: defaults-first scale ladder

The audience is microsites and SPAs. The design is a ladder where the default is
the bottom rung, each step up is one additive change, and you only climb when a
real need pushes you. The original problem was a cliff; the remedy is a ladder
with no cliff. Rungs 0 to 2 are reachable today (rung 2 after Phase 1); rung 3 is
designed but not built.

- **Rung 0, one page / SPA.** Zero config. `<LiveTokensRouter pages={{ '/':
  { component: Home } }} />`.
- **Rung 1, a few static pages.** Same component, more `pages` entries. Where the
  bulk of consumers live and stop.
- **Rung 2, dynamic or gated pages, still no router.** Add `resolve` and `props`.
  This is the ceiling of the no-router tier by design: wanting more than `resolve`
  (declarative params, nested layouts, data loading, SSR) is the signal you have
  outgrown the default and should adopt a real router.
- **Rung 3, bring your own router.** Designed (the port, an adapter, the
  descriptor, the shell extraction), built on demand. Not supported until built.

## Decision record

- **Sequencing (settled).** Ship `resolve` + `props` now; defer the port and all
  rung-3 machinery entirely. No router is planned, so per YAGNI no port is built.
  This also honors the recorded "concrete before architecture" preference: the
  port is architecture for a consumer that does not yet exist.
- **Delivery (settled, for when rung 3 is built).** Svelte context via
  `<LiveTokensProvider location={adapter}>`, single mechanism, no
  `configureRouting` global. Decided so it is not re-litigated later; not built
  now.
- **Props shape (settled).** The resolver returns a `RouteEntry`; `props` is
  `Record<string, unknown>`. This trades compile-time prop checking (which a
  snippet outlet would keep) for page-and-source co-location. Accepted at
  microsite scale, where dynamic-route props are typically one id or slug.
  Documented so the trade is deliberate, not silent.

## Phase 1 (implemented, targets 0.28.0): the no-router dynamic tier

Goal: rung 2. A growing microsite expresses dynamic and gated routes without a
router; the existing default `route` store still owns location (the port is not
involved).

Changes by file:

- `src/editor/overlay/LiveTokensRouter.svelte` and the `RouteEntry` type
  (`LiveTokensRouter.svelte:15-23`):
  - add `props?: Record<string, unknown>` to `RouteEntry`, rendered as
    `<Page {...entry.props} />`, so one page serves many paths.
  - add `resolve?: (route: string) => RouteEntry | null`. Resolution order:
    owned routes, then `pages[route]`, then `resolve(route)`, then `pages['/']`.
    With only `pages` passed, identical to today. **Document this precedence at
    the API surface** so which mechanism wins is not surprising.
  - page-source comes from the resolved entry's `source`, so a dynamic route
    gets "Show page source" for free and the resolver cannot desync from the
    matcher.

Consumer impact (runegoblin, the real rung-2 consumer): it can move its
hand-written dispatch into `resolve` and reclaim the overlay, the `.lt-app`
editor chrome, link interception, and the nav rail from `LiveTokensRouter`
(gaining the `/docs` tab it never had), deleting most of its manual wiring and
its stranded `pageSource.ts`. Its per-route *consumer* chrome (the persistent
HeroBanner, the landing-only AiDisclosure) is composed around the router or
moved into the page components; a first-class consumer layout wrapper is part of
the deferred shell work (see below), not Phase 1.

Watch (audit m3): `RouteEntry` now mixes dispatch (`component`/`lazy`/`props`),
nav (`label`/`icon`), and tooling (`source`/`hidePageSource`) in one record.
Acceptable by Rule of Three today; further field growth is the signal to split
nav/tooling metadata from dispatch.

Back-compat: `resolve` and `props` are optional; omitting both is today's
behaviour exactly.

Verification: a test drives `resolve` for a `/module/:id`-shaped path and asserts
the right component, props, and source resolve; a `null` return falls through to
`pages['/']`.

Exit criteria: a product-shaped site (runegoblin's routes) renders entirely
through `<LiveTokensRouter {pages} {resolve} />` with working page-source on
dynamic routes and no hand-rolled overlay wiring.

Suggested release: 0.28.0.

## Deferred (on demand): full-router compatibility (rung 3)

Build only when a real router consumer appears. Bundled, because none of it has
value until then, and the port's only justification is a second implementation
of it. Full design is in the exploration doc; the pieces are:

- **The port and default adapter.** `LiveTokensLocation { path, navigate }`; the
  current `router.ts` repackaged as the default adapter (kept exported, so
  rungs 0 to 2 are unaffected). The two-axis model (location vs dispatch) is the
  explanatory frame and lives here, since no rung-0-to-2 consumer transfers an
  axis independently.
- **Delivery:** the `<LiveTokensProvider>` context decided above.
- **Owned-route descriptor.** The `/editor` `/components` `/docs` facts as one
  exported value. It must feed owned **pages**, not just the overlay nav: this is
  the proper fix for the hardcode below (audit M3), letting an owned page derive
  its "back to the site" targets from the consumer's page set instead of
  assuming them.
- **Shell / chrome extraction (`<LiveTokensShell>`).** So a rung-3 consumer (and
  any consumer wanting a page wrapper) gets the `.lt-app` / `is-editor` /
  `is-component-editor` chrome from one place instead of re-implementing it,
  which is the duplication runegoblin demonstrates today (audit M2).
- **Rung-3 boot entry (audit M4).** A router-agnostic init that runs the
  non-router hooks `bootLiveTokens` bundles (`cssVarSync`, `columnsOverlay`,
  `editorStore`, `initializeTheme`), since a router consumer never calls
  `bootLiveTokens`.
- **An official adapter and scaffold** for whatever router actually shows up, on
  its own subpath (it imports framework internals that only resolve inside that
  framework's app).

Until this is built, rung 3 is unsupported. A consumer needing it is the trigger
to build this bundle, at which point the second adapter implementation finally
justifies the port.

## Present defect (independent of these phases): owned page hardcodes consumer routes

`ComponentEditorPage.svelte:137,142` hardcode `/` and `/demo` as its "back to the
site" targets, and the `/demo` option is gated on `import.meta.glob('./Demo.svelte')`
(`:26`) which resolves against the package's own `pages/` dir, with a stale
comment about `App.svelte`. The proper fix (owned pages derive their nav from the
consumer's page set) lands with the deferred owned-route data-flow above. The
`/demo` plus glob plus stale-comment cleanup is independently doable now and need
not wait.

## Standard practices applied

- **YAGNI, exercised.** Deferring the port until a real router consumer exists is
  this principle applied to our own plan, not just to consumer code.
- **Progressive disclosure.** The default is the simplest rung; complexity is
  opt-in and incremental; no cliff between rungs.
- **Dependency inversion (for the deferred work).** When built, the shell depends
  on the port, not a concrete store. The objection was timing, not the
  abstraction.
- **Additive SemVer / Open-Closed.** Phase 1 keeps `pages` / `route` / `navigate`
  working unchanged; `resolve` and `props` are additive.
- **Release via CI.** Tag push triggers the publish workflow; never a local
  `npm publish`.

## Scale ladder (acceptance)

| Rung | Location owner | Dispatch owner | Consumer writes | Status |
| --- | --- | --- | --- | --- |
| 0 single page | default store | one `pages` entry | `<LiveTokensRouter {pages} />` | shipped |
| 1 microsite | default store | `pages` map | `<LiveTokensRouter {pages} />` | shipped |
| 2 dynamic, no router | default store | `pages` + `resolve` | `<LiveTokensRouter {pages} {resolve} />` | implemented (0.28.0, unreleased) |
| 3 own router | consumer adapter | consumer's router | adapter + provider + mount owned routes + shell | designed, deferred |

Acceptance for now: a consumer can move from rung 0 or 1 to rung 2 with a single
additive prop and no rewrite.

## Remaining open decisions

- **Scaffold regeneration contract** and the **official adapter target**: decided
  when rung 3 is triggered, not before.
- **Soft-deprecating direct `route` / `navigate` import** in favour of the port:
  only relevant once the port exists; not now.

## Key files (touch list)

- Phase 1: `src/editor/overlay/LiveTokensRouter.svelte` (and the `RouteEntry`
  type) only.
- Present-defect cleanup: `src/editor/pages/ComponentEditorPage.svelte`.
- Deferred (on demand): new `src/editor/core/routing/location.ts`,
  `src/editor/core/routing/editorRoutes.ts`, `src/editor/adapters/<router>.ts`, a
  `<LiveTokensShell>`; modify `router.ts`, `LiveEditorOverlay.svelte`,
  `ComponentEditorPage.svelte`, `bootstrap.ts`, `index.ts`, `package.json`,
  `bin/cli.mjs`; docs under `src/editor/docs/content/`.
