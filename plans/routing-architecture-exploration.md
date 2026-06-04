# Routing architecture: structural weakness and exploration brief

Status: exploration seed (not a decision). Written after shipping the v0.27.0
"docs ship from the package" feature, which surfaced the problem below.

Implementation status (2026-06): see `docs/routing-port-implementation-plan.md`.
Per a YAGNI call (no full-router adoption is planned), only the no-router dynamic
tier (`resolve` + `props`) is scheduled. The routing port and the full-router
machinery designed below are deferred until a real router consumer exists, so the
port is not built ahead of its second implementation. The design here stands as
the plan for when that day comes.

## Goal of the deep-dive

Design the right routing API so a consumer with **dynamic or imperative routes**
(params, prefixes, conditional gating) can keep the live-tokens editor shell and
all package-owned route conventions, instead of dropping to fully manual wiring.
Do this **without over-building a general router** (the target audience is
microsites) and **without breaking the existing `LiveTokensRouter` API**
(additive only). Success = the next consumer like `runegoblin-site` never has to
hand-roll the shell, and package-owned routes (`/editor`, `/components`,
`/docs`, future) reach every consumer for free.

## TL;DR problem statement

The package ships **two integration tiers with nothing between them**:

1. `LiveTokensRouter` (batteries-included) supports **exact static paths only**,
   and renders pages with **zero props**. No params, no prefixes, no wildcards,
   no conditional selection.
2. Manual `LiveEditorOverlay` (escape hatch) gives total freedom but forces the
   consumer to re-implement the entire shell: matching, dispatch, nav assembly,
   page-source resolution, overlay open-state, the iframe recursion guard, click
   interception, the `.lt-app` wrapper classes, and the package-owned routes.

The moment a consumer needs one dynamic/conditional route they fall off the
Tier-1 cliff completely. There is no "keep the shell, swap the matcher" seam.
A consequence already observed: Tier-2 consumers hardcode the package-owned nav
entries, so (a) they go stale and (b) they do not receive new owned routes like
`/docs`. Every owned route we add widens that gap.

## Background: what live-tokens is, how consumers integrate

`@motion-proto/live-tokens` is a design-token editor delivered as a Svelte 5 +
Vite package. Consumers build microsites; in dev they get an editor overlay with
package-owned routes `/editor` (token editor), `/components` (per-component alias
editor), and now `/docs` (the user guide, shipped from the package as of
v0.27.0). The package's positioning is "build microsites quickly," so most target
consumers have a handful of **static** pages.

Two public ways to integrate, both dev-only for the editor routes:

- `LiveTokensRouter` (`src/editor/overlay/LiveTokensRouter.svelte`): pass a
  `pages: Record<string, RouteEntry>` map. It owns the editor routes, auto-injects
  their nav tabs, dispatches pages, and hosts the overlay.
- Manual: render `<LiveEditorOverlay>` yourself
  (`src/editor/overlay/LiveEditorOverlay.svelte`) and drive your own routing off
  the package's exported `route` store + `navigate()`.

`bootLiveTokens(App, target, opts)` (`src/editor/bootstrap.ts`) is a one-call
boot that bundles the five `init*` hooks, theme init, and component registration.
Note: it is **routing-agnostic** — it mounts your `App`, then you still choose a
routing tier inside it.

## What the "router" actually is

`src/editor/core/routing/router.ts` is ~50 lines and contains **no matching
layer**. It is a location store plus a history shim:

- `route` = `writable<string>` holding `window.location.pathname`.
- `navigate(path)` = `pushState` + `route.set(pathname)`.
- `init()` = seed the store, wire `popstate`. Guards `window` for SSR/test.

So "routing" in the matching sense is entirely the responsibility of whoever
consumes the `route` string. Exactly one matcher ships: `LiveTokensRouter`'s
exact-key lookup.

## The structural gap (the cliff)

In `LiveTokensRouter.svelte`:

- Dispatch (around line 99):
  ```js
  let pagePromise = $derived.by(() => {
    if (isEditor) return import('../pages/Editor.svelte');
    if (isComponentEditor) return import('../pages/ComponentEditorPage.svelte');
    if (isDocs) return import('../docs/Docs.svelte');
    const entry = pages[$route] ?? pages['/'];   // exact key only, else home
    ...
  });
  ```
- Render (around line 135): `<PageComponent />` — pages receive **no props**.
- `navLinks`, `pageSources`, and `hidePageSourceOn` are all exact-path keyed.

Implications:
- No params: `/module/:id` cannot be expressed.
- No prefix/wildcard: `/reignmaker/rules/*` cannot be expressed.
- No prop delivery: even a finite, enumerable set of paths that should render
  through one component with the matched segment as a prop (e.g. a single
  `RulesPage path={slug}`) cannot be driven by the map, because pages render
  zero-prop.
- No imperative selection: "render module page only if `!__PROD_DEPLOY__ ||
  !module.paid`" cannot live in a static map.

The escape hatch is all-or-nothing: to get any of the above you abandon
`LiveTokensRouter` and rebuild the shell on the raw `route` string.

## Evidence it is structural, not just an early-adopter artifact

`runegoblin-site` (a product site, not a microsite) needs:
- `/module/:id` with paid-gating in prod (imperative).
- `/reignmaker/rules/*` rendering through one `RulesPage path={...}` (param prop).
- `/purchase/success`, `/purchase/cancel` (prefix), `/ai-disclosure`, `/`.

None of these fit the exact-match zero-prop map, so runegoblin uses the manual
tier: its own `src/router.ts` (re-exports the package `route`/`navigate`), a
hand-written regex dispatch in `src/App.svelte`, a hardcoded `navLinks` array,
and a separate `src/lib/pageSource.ts` regex resolver for the page-source
feature (which is also exact-path keyed on the overlay).

Two failures that prove the cost:
1. **Drift.** Its `navLinks` had a baked-in `{ path: '/custom_components', label:
   'Custom Components' }` that went stale and had to be cleaned up by hand.
2. **No free propagation.** We just added `/docs`. Every `LiveTokensRouter`
   consumer gets it automatically; runegoblin gets nothing until someone edits
   its array. This asymmetry is the structural smell.

A new consumer today with runegoblin's route shape would hit the same wall. So
the matching gap is current and permanent.

## Legacy vs structural (be precise)

- **Legacy / sheddable:** some of runegoblin's manual wiring is now redundant.
  `bootLiveTokens` collapsed the init-hook boilerplate, and `LiveTokensRouter`
  is more complete than when runegoblin integrated. The open-state persistence,
  iframe guard, click interception, and wrapper classes it copied could in
  principle be reclaimed.
- **Structural / permanent:** but they cannot reclaim them today without losing
  dynamic routing, because the only thing that owns that boilerplate is the
  all-or-nothing `LiveTokensRouter`. The fix is not a third helper; it is making
  the existing escape hatch one level higher.

## The three consumers (reference shapes)

- **Package demo** (`live-tokens/src/app/App.svelte`): `LiveTokensRouter` with
  static pages (Site, Demo, plus auto Components + Docs). The happy path.
- **live-tokens-online**
  (`live-tokens-online/src/App.svelte`): `LiveTokensRouter`, Home + Docs. Also
  the happy path. (Note: still vendors `src/docs/Docs.svelte` + a manual `/docs`
  page; remove after it upgrades to 0.27.0, else duplicate Docs tab.)
- **runegoblin-site** (`runegoblin/runegoblin-site/src/App.svelte`,
  `src/router.ts`, `src/lib/pageSource.ts`): manual `LiveEditorOverlay`. The
  cliff case.

## Candidate directions (starting points, not decisions)

1. **Add the missing seam (highest leverage).** Give `LiveTokensRouter` a
   `fallback`/`match` prop or a child snippet receiving `$route`: when no exact
   `pages` entry and no owned route matches, hand control to the consumer
   (return a component, or render the snippet). Consumer keeps overlay +
   conventions + all auto-routes and expresses dynamic/imperative routing in the
   callback. Longer-term clean shape: a `<LiveTokensShell>` that owns overlay +
   conventions + owned routes, with `LiveTokensRouter` as the thin exact-match
   default on top.
2. **Make package-owned routes a shared descriptor both tiers consume.** Export
   `editorNavLinks(overrides)` / `editorRouteFor(route)` /
   `editorHidePageSourceOn(overrides)`. `LiveTokensRouter` uses them internally;
   manual consumers spread them instead of hardcoding. Then `/docs` and future
   routes reach manual consumers for free. Falls out of #1 naturally.
3. **Raise the declarative ceiling with param/wildcard keys (complementary).**
   Support `/module/:id` and `/x/*` in `pages`, deliver matched params to the
   page (a prop or a `routeParams` store), allow `source` to be
   `(params) => string`. Additive; exact paths keep working. Does not replace #1
   (patterns cannot express imperative gating).
4. **Ease-of-use framing.** Document the tiers and a one-line answer to "when do
   I need my own matcher." Finish what `bootLiveTokens` started: fold the
   overlay-wiring boilerplate into the shell so "bring your own router" means
   "supply a matcher," not "re-derive the shell."

## Open questions for the deep-dive

- **Seam API:** `fallback` component fn vs. child snippet vs. full
  `<LiveTokensShell renderPage>` inversion? Which keeps the common case a
  one-liner while giving full control when needed?
- **Param delivery:** how to pass matched params/segments to pages without
  losing the zero-prop simplicity of the static case? Prop? `routeParams`
  store? Context?
- **Matcher implementation:** hand-roll a tiny path matcher, or take a small dep
  (regexparam-style)? Ordering/specificity rules?
- **Owned-route descriptor:** what is the minimal shared surface that lets both
  tiers agree on `/editor` `/components` `/docs` (+ overrides) without leaking
  internals?
- **Page-source coupling:** the "show page source" feature is also exact-path
  keyed. Should source resolution become a function of the matched route too, so
  dynamic routes get page-source for free?
- **Compat:** can all of this be purely additive to `LiveTokensRouter`'s props,
  preserving every current consumer with no change?
- **Right-sizing:** where is the line between "enough routing for product-ish
  consumers" and "a general router we should not ship"? The target is microsites.
- **SSR/test:** anything here that complicates the `window`-guarded init story?

## Constraints and principles

- Additive, non-breaking changes to the public API. `LiveTokensRouter`'s current
  `pages`/`editorRoutes` contract must keep working unchanged.
- Microsite-first. Do not turn this into a general-purpose router; solve the
  cliff, not every routing want.
- Owned routes are package-owned and dev-only; consumers must be able to relocate
  or disable each (`editorRoutes.editor|components|docs`).
- Release via CI (tag push), never local `npm publish`.
- Recently shipped: v0.27.0 docs-from-package. See
  `project_docs_ship_from_package` in the session memory and CHANGELOG 0.27.0.

## Key files index

- `src/editor/core/routing/router.ts` — the location store + history shim (no
  matcher).
- `src/editor/overlay/LiveTokensRouter.svelte` — the only shipped matcher
  (exact-key), owns editor/components/docs, nav injection, dispatch, render.
- `src/editor/overlay/LiveEditorOverlay.svelte` — the overlay UI; props `open`,
  `editorPath`, `navLinks`, `pageSources`, `hidePageSourceOn`.
- `src/editor/bootstrap.ts` — `bootLiveTokens` one-call boot (routing-agnostic).
- `src/editor/index.ts` — public exports (`route`, `navigate`,
  `LiveTokensRouter`, `LiveEditorOverlay`, `RouteEntry`, `EditorRouteOverrides`,
  `bootLiveTokens`, ...).
- Consumers: `src/app/App.svelte` (demo, happy path);
  `live-tokens-online/src/App.svelte` (happy path);
  `runegoblin/runegoblin-site/src/{App.svelte,router.ts,lib/pageSource.ts}`
  (the manual-tier cliff case).

---

# Deep-dive: the root cause (added 2026-06-02)

The brief above diagnoses the symptom precisely (two tiers, a cliff between
them) and reaches for the right first move (candidate #1, add a seam). This
section goes under that to name *why* the cliff exists, so the fix is chosen for
the cause and not the symptom. The short version: the package fused the one part
only it can build with the one part only the consumer can finish, and modelled
that consumer part as a fixed value when routing is inherently a function. Three
root causes follow, each with evidence from the code as it stands today.

## Walking the instances first (ground truth before architecture)

Two new facts from reading the three consumers, beyond what the brief records:

1. **runegoblin's `src/lib/pageSource.ts` is dead code.** `resolvePageSource()`
   is defined and exported and *never imported anywhere* in the site. Its author
   wrote the correct thing, page-source resolution as a function of the route
   (regex over `/reignmaker/rules/*`, prefix match on `/purchase/*` and
   `/module/`), then discovered `LiveEditorOverlay` only accepts
   `pageSources: Record<string,string>` and `hidePageSourceOn: string[]`. A
   function cannot be handed to that contract. So the resolver was stranded and
   `App.svelte` instead pre-computes a static `rulesPageSources` map from the
   known rule slugs. The consequence: the genuinely dynamic routes
   (`/module/:id`, any rule slug not enumerated) get **no** "Show page source"
   button, silently. This is the contract-shape problem made flesh, and it is
   worse than "drift": the consumer already tried the right pattern and the API
   refused it.

2. **The two happy-path consumers confirm the cliff is binary, not gradual.**
   The demo (`src/app/App.svelte`) and `live-tokens-online` both pass a small
   static `pages` map and write nothing else: no overlay wiring, no click
   handler, no open-state. runegoblin re-implements all of it by hand. There is
   no consumer sitting half-way, because the API offers no half-way. You either
   hand over a static map and get the whole shell, or you take the raw `route`
   store and rebuild the shell. The middle does not exist as a reachable state.

So the brief's read holds at ground level. Now the structure under it.

## Root cause 1: the shell and the dispatcher are one component

`LiveTokensRouter` does two jobs that belong to two different owners:

- **The shell** (only the package can build this): host `LiveEditorOverlay` and
  `ColumnsOverlay`, own the `/editor` `/components` `/docs` routes and their nav
  entries and their page-source suppression, intercept in-app link clicks, apply
  the `.lt-app` / `is-editor` / `is-component-editor` wrapper chrome, and stand
  up the iframe relationship (the overlay embeds `/editor` in an iframe and
  mirrors the host route in over postMessage via `parentRouteStore`; the overlay
  guards against recursive mount with `isInIframe`). This is intricate,
  package-internal, and exactly what no consumer should ever re-derive.
- **The dispatcher** (only the consumer can finish this): map the current route
  string to a page component, with whatever props that page needs.

These two are welded into one Svelte component with no boundary between them.
The welding is the cliff. The moment a consumer needs to customise the
dispatcher (a param, a gate, a prop), they cannot, because the dispatcher is not
a thing you can reach on its own. They drop the whole component, and the shell
goes with it. runegoblin did not re-hand-roll the overlay because it wanted to.
It re-hand-rolled the overlay because the overlay was only available bolted to a
matcher that could not express `/module/:id`.

Read against any mainstream router this is the inverted-out part. React Router,
SvelteKit, Next, Remix all separate a persistent **layout/shell** that renders
an **outlet** from the **matching** layer that decides what fills the outlet.
The chrome is hoisted out of the page and specified once. live-tokens has the
layout (the overlay + owned routes + wrapper *is* a layout) but never separated
it from matching, so the layout is not independently obtainable. The fix is to
make the shell a thing you can hold without holding a matcher.

## Root cause 2: the contract is a value, where routing is a function

Routing is a function: location to UI. The public contract models it as a
**static finite map**: `pages: Record<exactPath, zero-prop entry>`. A map can
only ever enumerate paths known at authoring time, and can only ever name a
component, never construct one with props. So an entire class of consumer is
excluded **by the type**, before any single feature is found missing:

- routes that are a function of data (`/module/:id`, `/rules/:slug`): not
  enumerable, so unrepresentable.
- routes selected by a predicate (`paid && PROD` gating): a map has no place to
  put a condition.
- pages that need the matched segment as input: the entry renders `<Page />`
  with zero props, so even a finite, fully-enumerable set of slugs that should
  flow through one `RulesPage path={slug}` cannot be driven by the map.

This is why "let consumers provide pages and routes in the format they want"
cannot be answered by a richer map. The format a real consumer wants is *code*:
a few `if`s, a regex, a `.find()` over their data, or a delegation to their own
router. The only contract that accepts all of those is a **function** (route to
component-or-null), not a value. The static map is then just the trivial special
case of that function, and is the correct default for the microsite that only
has exact paths.

The same defect repeats in the page-source contract (`Record<string,string>`)
and is what stranded runegoblin's resolver. One root cause, two surfaces.

## Root cause 3: three unsynchronised sources of truth for "what is this route"

A single route today is described in three independent places, each
exact-key'd, each needing manual upkeep:

- **matching**: `pages[$route]` picks the component.
- **nav**: `navLinks` is a separately-derived list of labelled paths.
- **page-source**: `pageSources[$route]` plus `hidePageSourceOn`.

The package-owned routes inject themselves into all three from inline literals
scattered across `$derived` blocks (`/components` and `/docs` appear as
hardcoded `{ path, label, icon }` objects in `navLinks`, again in
`hidePageSourceOn`, again in the dispatch chain). Nothing exports those literals
as data. So a manual consumer cannot consume them: it must hardcode its own
copy, which is why runegoblin's `navLinks` had a stale `/custom_components` entry
and is missing `/docs` entirely. The editor path alone is referenced four times
(iframe `src`, the dispatch match, the "hide overlay on editor" test, the nav),
held in sync by hand.

The robustness defect is that one conceptual thing (a route) has no single
description. It should resolve once to one descriptor that feeds page, nav, and
source together, and the owned routes should be that same kind of descriptor,
exported, so both tiers read one list instead of re-typing it.

## The tempting wrong turn: do not enrich the map

Candidate #3 (param keys `/module/:id`, wildcard keys `/x/*`, `source` as a
function, a `routeParams` store) is the natural-looking fix and is the one to
resist. It treats root cause 2 by making the *value* richer instead of admitting
routing is a *function*. That road has no end: params invite nested params,
which invite wildcards, which invite ordering and specificity rules, which
invite guards and redirects. Each step is a small reasonable feature and the sum
is a general-purpose router grown inside a token editor, in violation of the
explicit microsite-first constraint. It is the classic inner-platform effect: a
configuration language slowly reinventing the host language, always one feature
behind plain code.

The way to honour "do not ship a general router" is not to ship a *small* router.
It is to ship **no matcher beyond the trivial map** and let the consumer bring
matching as code. You do not out-feature React Router; you decline to compete
with it and host whatever the consumer already uses. Invert control for the
open-ended part, keep configuration only for the closed part (the static map
default).

## Recommended direction: extract the shell, keep the router thin

This is candidate #1 and #2 from the brief, taken to their root-cause
conclusion and merged. Candidate #3 is dropped. Candidate #4 (docs) follows for
free once the shape is right.

Shape:

- **`<LiveTokensShell>`** owns the entire package half from root cause 1: both
  overlays, the owned-route dispatch and their nav and source-hiding, link
  interception, the wrapper chrome, the iframe relationship. It exposes the
  consumer half as an **outlet**: a `page` snippet receiving `$route` (Svelte 5
  native), or equivalently a `match: (route) => Component | { component, props }
  | null` function prop. Either is an inversion point: the consumer expresses
  matching in code, with props, gating, params, or a hand-off to their own
  router. The shell matches owned routes *first*, so the consumer never sees or
  re-declares `/editor` `/components` `/docs`.
- **`LiveTokensRouter` becomes a thin wrapper** over the shell: it supplies the
  default outlet that does today's exact-match `pages[$route] ?? pages['/']`
  lookup. Its `pages` / `editorRoutes` props are unchanged. Every current
  consumer keeps working with no edit (root cause's additive constraint met),
  and the microsite happy path stays the same one-liner.
- **Owned routes become an exported descriptor** (`editorRouteDescriptors()` or
  similar): the path/label/icon/source-hidden facts that are currently inline
  literals. The shell reads it; a manual consumer that still wants to compose by
  hand reads the same list instead of hardcoding. `/docs` and any future owned
  route then reach both tiers for free. This kills root cause 3's drift.
- **Page-source becomes a function of the matched route**, resolved by the same
  outlet that picked the page, so it can never desync from the matcher and a
  dynamic route gets its source for free. The static map stays accepted as the
  default. `LiveEditorOverlay` is public (runegoblin imports it), so evolve its
  props additively: keep `pageSources` / `hidePageSourceOn`, add a resolved
  `sourceFile` / `showSource` path the shell can drive.

How each root cause is discharged:

| Root cause | Resolved by |
| --- | --- |
| 1. Shell fused to dispatcher | `LiveTokensShell` is the shell, reachable without any matcher; the matcher is an outlet you supply |
| 2. Contract is a value, not a function | The outlet is a function (or snippet) of `$route`; the static map is the default special case, not the only case |
| 3. Three unsynced sources of truth | Owned routes are one exported descriptor; page-source resolves through the same outlet as the page |

Why this is the standard-practices answer: it is the layout-plus-outlet split
every mainstream router uses, plus inversion of control for the open-ended part
and configuration for the closed part. It is strictly additive. It solves the
cliff by making the shell the stable, always-available thing and matching the
swappable thing, which is the exact inversion the current design got backwards.
And it builds no router: the package's matching ceiling stays "an exact map,"
while anything above that lives in consumer code where it belongs.

## Re-grading the brief's candidate directions

- **#1 (add the seam): promote to the spine.** Not a `fallback` prop bolted onto
  the existing component (that patches over the fusion while leaving it intact),
  but the full `<LiveTokensShell>` + outlet inversion, with `LiveTokensRouter`
  rebuilt on top. The brief's own "longer-term clean shape" is the actual fix,
  not the longer-term option.
- **#2 (shared owned-route descriptor): required, not optional.** It is the only
  way the manual tier ever stays in sync, and it falls out of #1.
- **#3 (param/wildcard map keys): drop.** This is the tempting wrong turn above.
  Re-examine only if real consumers, after the shell ships, still want a
  *declarative* spelling for the common `/:id` case and are willing to accept a
  hard ceiling on it. Default to no.
- **#4 (docs / framing): keep, do last.** Once the shell exists, "bring your own
  router" genuinely means "supply an outlet," and the docs can say exactly that.

## Answers to the brief's open questions, where root cause settles them

- **Seam API:** full `<LiveTokensShell>` with an outlet, not a `fallback` prop.
  A prop leaves the fusion in place; the shell removes it. Snippet vs `match`
  function is a downstream ergonomics choice, not a structural one; both satisfy
  root cause 2.
- **Param delivery:** do not deliver params through the framework at all. The
  consumer's outlet closes over them in plain code (`<RulesPage path={slug} />`).
  This is what dissolves the "how do we pass params without losing zero-prop"
  tension: the static default stays zero-prop, the dynamic case is just Svelte.
- **Matcher implementation:** the package ships no matcher beyond the exact map.
  No tiny path matcher, no `regexparam` dependency. Specificity and ordering are
  the consumer's `if`/`switch` order, which they already understand.
- **Owned-route descriptor:** the minimal shared surface is path + label + icon
  + source-hidden per owned route, plus the existing relocate/disable overrides.
  Exported as data, consumed by both tiers.
- **Page-source coupling:** yes, source resolution becomes a function of the
  matched route, resolved by the outlet, so dynamic routes get page-source for
  free and runegoblin's stranded resolver becomes the supported path.
- **Compat:** yes, fully additive. `LiveTokensRouter` keeps its props by being
  re-expressed as `LiveTokensShell` + the default outlet. `LiveEditorOverlay`
  keeps its props and gains optional ones.
- **Right-sizing:** the line is "exact map in the package, everything else in
  consumer code." The shell is the product; the router is a convenience default
  on top of it.
- **SSR/test:** unchanged. The shell is still gated by the same dev / iframe /
  `window` guards the overlay already carries; extraction moves that code, it
  does not add new global touches.

---

# The answer: how a consumer routes its own app

One sentence: **the consumer gives live-tokens a function from the current path
to a page; the package owns its editor routes and the shell around every page;
the consumer owns everything else.** The static `pages` map shipped today is the
lookup-table spelling of that function. Nothing more is needed, and deliberately
nothing more is offered.

## The single atom: a `RouteEntry`

Routing resolves, for the current path, to one descriptor the shell knows how to
render. This is the `RouteEntry` that already exists, with one addition (`props`)
so a page can be constructed and not merely named:

```ts
interface RouteEntry {
  component?: Component;                                  // eager
  lazy?: () => Promise<{ default: Component }>;           // code-split (keeps a page's CSS side-effects out of other bundles)
  props?: Record<string, unknown>;                        // NEW: lets one page serve many paths (e.g. a slug)
  label?: string;                                          // present => appears in the overlay nav rail
  icon?: string;
  source?: string;                                         // powers "Show page source"
  hidePageSource?: boolean;
}
```

The page and its page-source travel together in one value, so they cannot
desync. That is root cause 3 closed at the atom level.

## Two inputs, both optional, both producing `RouteEntry`s

`LiveTokensRouter` accepts either or both:

```ts
interface Props {
  pages?: Record<string, RouteEntry>;             // exact paths (today's API, unchanged)
  resolve?: (route: string) => RouteEntry | null; // NEW: compute the entry in code
  editorRoutes?: EditorRouteOverrides;            // relocate/disable owned routes (unchanged)
}
```

Resolution order, which reproduces today's behaviour exactly when only `pages`
is passed:

1. owned routes (`/editor`, `/components`, `/docs`) — matched by the shell
   first, so the consumer never declares or even sees them, and any owned route
   added later reaches every consumer for free.
2. `pages[route]` — exact match.
3. `resolve(route)` — the consumer's code, for everything dynamic.
4. `pages['/']` — final fallback (return your own entry from `resolve` for a
   real 404 instead).

`resolve` is plain code. It is where params, prefixes, and gating live, and the
package ships no syntax for any of them. That is the whole point: the package's
matching ceiling stays "an exact map," and the consumer's matching ceiling is
the language itself.

## The spectrum, by consumer

**Microsite (demo, live-tokens-online): unchanged one-liner.**

```svelte
<LiveTokensRouter {pages} />
```

**Product site with dynamic and gated routes (runegoblin): map for the static
pages, `resolve` for the tail.**

```svelte
<script lang="ts">
  const pages = {
    '/': { lazy: () => import('./pages/Landing.svelte'), label: 'Site', icon: 'fa-home', source: 'src/pages/Landing.svelte' },
    '/ai-disclosure': { lazy: () => import('./pages/AiDisclosurePage.svelte'), source: 'src/pages/AiDisclosurePage.svelte' },
  };

  function resolve(route: string): RouteEntry | null {
    const mod = route.match(/^\/module\/(.+)$/);
    if (mod) {
      const id = mod[1];
      if (__PROD_DEPLOY__ && modules.find(m => m.id === id)?.paid) return null; // gate in prod
      return { lazy: () => import('./pages/ModuleDetail.svelte'), props: { moduleId: id }, source: 'src/pages/ModuleDetail.svelte' };
    }
    const rules = route.match(/^\/reignmaker\/rules(?:\/(.*))?$/);
    if (rules) {
      const slug = rules[1] ?? '';
      return { lazy: () => import('./pages/RulesPage.svelte'), props: { path: slug }, source: rulesSourceFiles[slug] ?? 'src/pages/RulesPage.svelte' };
    }
    if (route.startsWith('/purchase/success')) return { lazy: () => import('./pages/PurchaseSuccess.svelte'), source: 'src/pages/PurchaseSuccess.svelte' };
    if (route.startsWith('/purchase/cancel')) return { lazy: () => import('./pages/PurchaseCancel.svelte'), source: 'src/pages/PurchaseCancel.svelte' };
    return null;
  }
</script>

<LiveTokensRouter {pages} {resolve} />
```

This single component replaces runegoblin's entire manual tier: the hand-rolled
overlay wiring, the open-state persistence, the click handler, the hardcoded
`navLinks`, and the stranded `pageSource.ts`. It also *gains* the `/docs` tab,
which the manual tier never received, and gives `/module/:id` a working "Show
page source" for the first time (via `entry.source`). The before/after is the
proof the model is right-sized: the dynamic product site collapses to the same
surface as the microsite plus one function.

**Own the outlet entirely (rare): `<LiveTokensShell>` + a snippet.** For a
consumer that needs to render arbitrary markup per route (wrap pages in
per-route chrome, render multiple regions, or host a foreign matcher), the same
shell is available one level lower, rendering a `page` snippet instead of
`RouteEntry`s. Page-source in this mode is a sibling `pageSource={(route) =>
string | undefined}` prop. Most consumers never need this; it exists so that
"bring your own routing" is a supported composition and not a fork.

## What this is not

- **Not a router.** No param syntax, no wildcard syntax, no specificity rules,
  no guards, no redirects, no path-matching dependency. Those are the consumer's
  `if`/`switch`/`.match()`, which they already know. Resisting these is the
  feature, per the microsite-first constraint.
- **Not a second way to do the simple thing.** The map is not deprecated; it is
  the sugar for the resolver. A consumer reaches for `resolve` only when a path
  is not knowable at authoring time.

# Compatible with a full router: the routing port

The resolver above answers "how do consumers express matching to *our* router."
The deeper goal is the opposite: **live-tokens should not own routing at all, so
a consumer's full router (SvelteKit, TanStack Router, svelte-routing, anything)
can own it and live-tokens composes in.** The earlier draft scoped this out as a
"known boundary." That was wrong. It is the actual target, and it is small,
because live-tokens barely uses routing.

## What live-tokens actually needs from routing

Grepped, the entire dependency on location is two operations:

- **read the current path** (the overlay shows it, the owned-route checks compare
  against it): only `LiveTokensRouter` and `LiveEditorOverlay` read `$route`.
- **request navigation** (the "Active Page" nav buttons, the in-editor page
  switches): `LiveEditorOverlay`, `LiveTokensRouter`, `ComponentEditorPage`.

That is the whole surface. Five files touch location and two of them are the
shell. Everything else people call "routing" (matching, params, nesting, link
interception, history, SSR) live-tokens either does in one place or does not do.
So the seam is a two-member **port**:

```ts
export interface LiveTokensLocation {
  path: Readable<string>;            // current path; the overlay/owned-routes read this
  navigate: (path: string) => void; // the overlay's nav + in-editor switches call this
}
```

Everything in the package that touches location depends on this interface, never
on a concrete store. That is the one change that makes "compatible with a full
router" true.

## Two orthogonal axes (this is the unlock)

The prior sections conflated two independent questions. Separating them is what
makes both the microsite and the SvelteKit cases fall out of one design:

- **Location axis:** who owns the current-path signal and navigation? The
  package's default history shim, or the consumer's router (via an adapter that
  satisfies the port).
- **Dispatch axis:** who maps a path to a page component? The package's
  `pages`/`resolve`, or the consumer's router.

A full router owns *both*. A microsite lets live-tokens own *both*. The port
decouples them so a consumer can hand over either or both without losing the
shell.

## Adapters

The default adapter is today's `router.ts`, unchanged in behaviour: a history
shim plus link interception. Microsites get it with zero config and notice
nothing. Crucially, **link interception belongs to this default adapter, not to
the shell**, because a full router already intercepts link clicks; the shell
must not double-handle them.

A consumer with a full router writes a tiny adapter. SvelteKit, in full:

```ts
import { page } from '$app/stores';
import { goto } from '$app/navigation';
import { derived } from 'svelte/store';

export const sveltekitLocation: LiveTokensLocation = {
  path: derived(page, ($p) => $p.url.pathname),
  navigate: (path) => goto(path),
};
```

Now SvelteKit owns the URL, history, link clicks, SSR, and matching. live-tokens
reads `path` and calls `goto`. We can ship one or two official adapters; the
interface is small enough that any router maps in a few lines.

## Mounting the owned pages in the consumer's router

The owned pages are already exported as components (`@motion-proto/live-tokens/editor`,
`/component-editor-page`, `/docs`). To let the consumer register them in *their*
router and keep the overlay nav in sync, export them as one descriptor (this is
candidate #2, now serving the bigger goal):

```ts
export const editorRoutes: ReadonlyArray<{
  id: 'editor' | 'components' | 'docs';
  path: string;                                   // default; overridable
  load: () => Promise<{ default: Component }>;
  navLabel?: string; navIcon?: string;            // for the overlay rail
  hidePageSource: boolean;
}>;
```

- A **programmatic** router (TanStack, svelte-routing) registers from this list
  in a loop.
- A **file-based** router (SvelteKit) creates three dev-only route files that
  re-export the components; we can scaffold these with a CLI command. The
  descriptor still feeds the overlay nav so labels and new owned routes stay in
  sync.

The overlay reads the same descriptor, so a manual or full-router consumer never
hardcodes `/components` or `/docs` and receives future owned routes for free.
The iframe is unaffected: it loads `/editor`, the consumer's router matches it
and renders the editor, and the existing `isInIframe` guard still stops the
overlay re-mounting inside the frame. `parentRoute` postMessage is unchanged.

## Delivery

Prefer Svelte **context**: a consumer wraps their root in a provider that puts
their adapter on the context; the shell/overlay read it via `getContext` with the
default history adapter as the fallback when no provider is present. This is
instance-scoped, idiomatic, and works without `bootLiveTokens` (which a SvelteKit
app does not call). Offer a `configureRouting(adapter)` imperative escape hatch
for non-Svelte hosts, mirroring the existing `configureEditor({ storagePrefix })`
pattern.

## The three integration modes this produces

1. **Batteries-included (no router):** `<LiveTokensRouter {pages} />`. Default
   adapter owns location, exact map owns dispatch. The microsite one-liner.
2. **Batteries-included, dynamic (no router):** `<LiveTokensRouter {pages}
   {resolve} />`. Default adapter, map plus code dispatch. The product site that
   does not want a router (runegoblin today).
3. **Bring your own router:** the consumer's router owns location (via adapter)
   and dispatch (its own routes). live-tokens contributes only the adapter wiring
   (a few lines), the owned pages mounted from the descriptor, and
   `<LiveEditorOverlay>` dropped in the root layout, fed by the port. live-tokens
   does no routing.

## Cost and honest edges

- Blast radius is the five files above. The work is: define the port, make the
  shell read the port instead of the singleton, package the current shim as the
  default adapter, export the owned-route descriptor, and provide the context
  provider. All additive; `LiveTokensRouter` keeps its exact props by binding to
  the default adapter internally.
- File-based routers cannot register routes programmatically, so SvelteKit
  consumers create three small dev-only route files. A scaffold command removes
  the friction but the files are theirs.
- SSR: the port's `path` must tolerate server render. The default adapter keeps
  its `window` guard; a SvelteKit adapter is SSR-safe by construction (it reads
  `page`). The overlay stays dev-only and client-only as today.
- This still ships no router. The package gains a *port* and a *default
  adapter*, which is the opposite of a router: it is the package declining to own
  routing and naming the minimum it needs so a real router can.
