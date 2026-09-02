---
name: live-tokens-build-page
description: Apply the @motion-proto/live-tokens project conventions when building a page: shipped components, theme tokens over hex/pixel literals, dynamic route mounting, per-page site.css. Use when the user asks to build, create, or lay out a page, route, hero, landing page, dashboard, settings screen, or pricing page; add a route; place an existing component on a page; or assemble a screen from the catalogue. For component choice see live-tokens-pick-component; for a brand-new component, live-tokens-create-component; for look and feel mid-build, live-tokens-generate-theme or live-tokens-adjust-geometry.
---

# Building pages in a live-tokens project

Two rules above all else:

1. **Use a shipped component if one fits.** Import from `@motion-proto/live-tokens/components/<Name>.svelte`. See **live-tokens-pick-component** for the catalogue and the confusing-pair decisions. Author custom markup only when nothing fits, and then consider **live-tokens-create-component** so the new piece is editable too.
2. **Use theme tokens for every value.** Every color, spacing, radius, font-size, and font-family in page CSS is a `var(--token-*)`. No hex literals. No pixel literals. A change in `/live-tokens/editor` should repaint your page.

For text, reach for a whole text style rather than assembling one: `--heading-xl` through `--heading-sm`, `--body-md`, `--body-sm`, `--editorial-xl` through `--editorial-sm`, `--eyebrow`, and `--code` each carry a `-font-family`, `-font-size`, `-font-weight`, `-line-height`, and `-letter-spacing`. A heading set from `--heading-lg-*` retypes when the theme's fonts change; one set from a raw `font-size` does not.

Text inside a `Card` or a `CollapsibleSection` is typed by that container, not by the page: the slot pins the axes the container owns onto nested `p`, `ul`, `ol`, and `li`, so a consumer's global element rules cannot break a card's body. Pass `prose={false}` when the page should own the type instead, which is also what full-bleed media wants.

## Layout

Pages sit inside the column grid via `--columns-count`, `--columns-gutter`, `--columns-max-width`. Toggle `ColumnsOverlay` (Cmd+G in dev) to visualise it while placing content.

To place children at specific page-column positions, span the parent grid (`grid-column: 1 / -1`), redeclare `repeat(var(--columns-count), 1fr)` with `--columns-gutter`, then refer to children by real page-column numbers. Never fabricate a local `repeat(N, 1fr)` with a hardcoded count: the widths drift from the page grid and the numbers stop matching `ColumnsOverlay`.

## Wiring

- Add the route the way `App.svelte` already wires routes:
  - **`<LiveTokensRouter pages={...}>`** (the usual case): add a `pages` entry as `lazy: () => import('./YourPage.svelte')` with a `source: 'src/...'` (and a `label`/`icon` to show it in the nav rail). For a route you can't enumerate (a `/:id`, a path prefix, a gated page), add a `resolve(path) => RouteEntry | null` instead of a `pages` key; same entry shape, so `props` and `source` (hence "Page Source") work identically.
  - **Manual `<LiveEditorOverlay>`**: dispatch with `$derived.by(() => import(...))` and register the route's source in `pageSources={...}`.
  Either way use `lazy`, not a static top-level import: static imports evaluate every page module at boot and leak page CSS into the editor routes.
- Import `site.css` from each page's `<script>` block, never from `main.ts` (would leak into editor routes).

The entry shape, for a project whose `App.svelte` has moved on from the template:

```svelte
const pages = {
  '/pricing': {
    lazy: () => import('./pages/Pricing.svelte'),
    source: 'src/pages/Pricing.svelte',
    label: 'Pricing',
    icon: 'fa-tag',
  },
};
```

`source` is what makes Page Source work; drop `label` to keep a route reachable by URL but off the nav rail.

## Avoid

- Hex or pixel literals in page CSS.
- Hardcoded column counts (`repeat(10, 1fr)`). Use `repeat(var(--columns-count), 1fr)`.
- Utility classes overriding shipped components. Extend via the `/live-tokens/components` editor instead.
- Deep imports from `node_modules/@motion-proto/live-tokens/src/...`. Use public entry points only.
- Mounting `Editor` or `ComponentEditorPage` outside their dedicated routes.
- A page route under `/live-tokens/*`. That namespace is reserved for the package's own dev surfaces so they can never shadow your routes; the rest of the URL space is yours.

## Verify

Run the checker and fix what it reports. Repeat until it exits 0:

```sh
npx live-tokens check-page src/pages/YourPage.svelte
# or: npx @motion-proto/live-tokens check-page      (every page under src/)
```

It fails on a component outside the catalogue, a deep import, a `var()` that resolves to nothing, a colour literal, a route under `/live-tokens/*`, and `site.css` imported from `main.ts`. It warns on a raw px or rem dimension, a hardcoded column count, an absolute type value, and a route entry with no `source`.

Warnings do not fail the run. `--strict` makes them fail, which is the setting to use when the page is meant to be fully tokenized. `--json` prints findings with a stable `rule` id, so you can work through one rule at a time and re-run. `--off=<rule>` silences a rule for a run; `"checks": { "rules": { ... } }` in `live-tokens.config.json` sets it for the project.

Then in dev: change a colour in `/live-tokens/editor` and confirm your page repaints (proves token usage). The overlay's "Page Source" button on the new route opens the page in VS Code (proves the route's `source`). `ColumnsOverlay` (Cmd+G) shows content sitting inside `--columns-max-width`.
