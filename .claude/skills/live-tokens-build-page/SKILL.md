---
name: live-tokens-build-page
description: Apply the @motion-proto/live-tokens project conventions when building a page: shipped components, theme tokens over hex/pixel literals, dynamic route mounting, per-page site.css. Use when the user asks to build, create, lay out, or rearrange a page, route, hero, landing page, dashboard, settings screen, pricing page, or a tool screen with a stage and controls; add a route; place an existing component on a page; assemble a screen from the catalogue; or says the layout, label sizes, or control sizes of a page are off. For component choice see live-tokens-pick-component; for a brand-new component, live-tokens-create-component; for look and feel mid-build, live-tokens-create-theme or live-tokens-set-geometry.
---

# Building pages in a live-tokens project

Two rules above all else:

1. **Use a shipped component if one fits.** Import from `@motion-proto/live-tokens/components/<Name>.svelte`. See **live-tokens-pick-component** for the catalogue and the confusing-pair decisions. Pass only the props it declares, with variant and size values from its union: `npx live-tokens components <id>` prints them (`--json` for data), and the list includes the project's own components beside the shipped ones. A prop a component does not declare is dropped silently at runtime, and the checker reports it. Author custom markup only when nothing fits, and then consider **live-tokens-create-component** so the new piece is editable too.
2. **Use theme tokens for every value.** Every color, spacing, radius, font-size, and font-family in page CSS is a `var(--token-*)`, whether it sits in the `<style>` block, an inline `style=` attribute, or a `style:` directive. No colour literals in any notation, `white` and `rgb()` included. No px or rem in spacing, stroke, radius, or shadow: that is the geometry the theme owns and `adjust` moves. Sizing is layout, not theme: a hero's height, a max content width, or a column's minimum width stays a literal. A change in `/live-tokens/editor` should repaint your page.

For text, reach for a whole text style rather than assembling one: `--heading-xl` through `--heading-sm`, `--body-md`, `--body-sm`, `--editorial-xl` through `--editorial-sm`, `--eyebrow`, and `--code` each carry a `-font-family`, `-font-size`, `-font-weight`, `-line-height`, and `-letter-spacing`. A heading set from `--heading-lg-*` retypes when the theme's fonts change; one set from a raw `font-size` does not.

Text inside a `Card` or a `CollapsibleSection` is typed by that container, not by the page: the slot pins the axes the container owns onto nested `p`, `ul`, `ol`, and `li`, so a consumer's global element rules cannot break a card's body. Pass `prose={false}` when the page should own the type instead, which is also what full-bleed media wants.

## Layout

**The purpose of a layout.** The page shows one thing. All other content must stay out of its way. Each mark that is not content costs attention: a rule, a border, a header bar, a shadow. Each mark must do a job that no other mark does.

Separate elements with the smallest difference that separates them. Use space first. If space is not sufficient, add a hairline rule. If a rule is not sufficient, use a second surface. Do not stack these separators. Two heavy edges side by side make a third shape between them. A band of boxes with borders and header bars looks like a set of posters.

Put each element in one of three layers, and type it from that layer. Content is `--text-primary`. Labels are `--eyebrow-*` or `--text-secondary`. Scaffolding is `--border-neutral`.

Show related items side by side when the width permits. Do not put them behind a toggle.

On a tool page, the stage is the content. Each control is administration. Give the space to the stage. Give the controls the smallest size that still works.

`references/layout-sources.md` names the sources for these laws.

Decide the bands before the columns. Read the page top to bottom and name each band by its job: what the user looks at, what they type into, what they press. A content page runs hero, sections, footer. A tool page runs the stage on top (the canvas, player, or strip the work is about), the inputs under it, and one toolbar of actions along the bottom edge. Each band is a row of the page grid; a band that needs columns of its own spans the grid and redeclares it, as below.

Separate bands with space and a rule, `padding-top: var(--space-16)` and `border-top: var(--border-width-1) solid var(--border-neutral)`, and stretch a band's boxes to one height (`align-items: stretch`) so their bottom edges make one line. Card chrome does not separate bands.

Pages sit inside the column grid via `--columns-count`, `--columns-gutter`, `--columns-max-width`. The columns button in the overlay's header (the vertical-lines icon) draws the grid over the page while you place content.

To place children at specific page-column positions, span the parent grid (`grid-column: 1 / -1`), redeclare `repeat(var(--columns-count), 1fr)` with `--columns-gutter`, then refer to children by real page-column numbers. Never fabricate a local `repeat(N, 1fr)` with a hardcoded count: the widths drift from the page grid and the numbers stop matching `ColumnsOverlay`.

### Containers by job

- `Panel` is a stage: a canvas, a player, a preview. It pins its height so the page holds still while what it shows changes.
- `Card` is a titled block of content. Its header is typed by the card's own tokens, `--card-default-title-*` at `--font-size-2xl` with a body at `--font-size-xl` by default; `size="compact"` drops the title to md, the body to sm, and tightens the padding. That is a content card's voice, and the theme editor retunes it for the whole project.
- A box in a tool UI labels itself. Use `variant="bare" size="compact"` and put your own label in the body, typed from a text style: the `.eyebrow` class from `site.css` for a quiet section label, `.heading-sm` for one that leads. Leave the shipped header alone rather than shrinking it with a page rule.
- A toolbar is a flex row of small buttons on the band's bottom edge, grouped left and right with `justify-content: space-between`. No card around it.

### Density

- `Button` and `IconButton` take `size="small"` in toolbars, compose rows, and any band that holds more than a couple of actions; the default size is for the page's primary action. `fullWidth` belongs to a stacked rail and comes off in a row.
- A project component that wraps shipped buttons forwards a `size` prop to them, so a page sets density the same way for shipped and custom pieces.
- Text in your own elements inside a `Card` inherits the card's body size unless you type it. A label, count, or status line inside a card sets a text style of its own (`--body-sm-*`, `--code-*`).
- `MenuSelect` renders its list open. For a picker, toggle it from a small `Button` with a trailing chevron (`icon="fa-solid fa-chevron-down" iconPosition="right"`) and position the list absolutely under the button, `top: 100%` with a `--space-*` margin.

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

- Colour literals, and px or rem in spacing, stroke, radius, or shadow.
- Hardcoded page-grid counts (`repeat(10, 1fr)`). Use `repeat(var(--columns-count), 1fr)`, or `calc(var(--columns-count) - 2)` for a sub-grid that spans fewer page columns. A local two-up or three-up is a layout and is fine.
- Utility classes overriding shipped components. Extend via the `/live-tokens/components` editor instead.
- A card header as a section label in a tool UI, and a page rule that shrinks it. Label the box yourself with a text style.
- Deep imports from `node_modules/@motion-proto/live-tokens/src/...`. Use public entry points only.
- Mounting `Editor` or `ComponentEditorPage` outside their dedicated routes.
- A page route under `/live-tokens/*`. That namespace is reserved for the package's own dev surfaces so they can never shadow your routes; the rest of the URL space is yours.

## Verify

Run the checker and fix what it reports. Repeat until it exits 0:

```sh
npx live-tokens check-page src/pages/YourPage.svelte
# or: npx @motion-proto/live-tokens check-page      (every page under src/)
```

It fails on a component outside the catalogue, a prop or value the component does not declare, a deep import, a `var()` that resolves to nothing, a colour literal in any notation, a route under `/live-tokens/*`, and `site.css` imported from `main.ts`. It warns on a px or rem literal in the geometry the theme owns, a hardcoded page-column count, a raw type axis, and a route entry with no `source`. Inline `style=` attributes and `style:` directives are read the same way as the `<style>` block; a `var()` fallback is never a finding. The recipe for each rule is in **live-tokens-fix-findings**.

Warnings do not fail the run. `--strict` makes them fail, which is the setting to use when the page is meant to be fully tokenized. `--json` prints findings with a stable `rule` id, so you can work through one rule at a time and re-run. `--off=<rule>` silences a rule for a run; `"checks": { "rules": { ... } }` in `live-tokens.config.json` sets it for the project. A project scaffolded by `create` runs the checker, with `check-component`, as `npm run check:design` before every `vite build`, so the page has to pass before it can ship.

The checker cannot see a layout. Open the page at the width it is built for and read it band by band: the boxes in a band end on one line, no label is larger than the page's body copy, every control stays inside its box (a `width: 100%` field without `box-sizing: border-box` pushes past it by its padding), and the actions sit where the eye goes last. Fix what you see before you move on.

Then look at the page from a distance. The bands and their edges must be the only shapes that you see. Then look closely. For each border, header bar, and box, ask this question: does the page lose information if this element is removed? If the answer is no, remove the element. Find the element that a reader sees first, second, and third. Make sure that this is the reading order the page needs.

Then in dev: change a colour in `/live-tokens/editor` and confirm your page repaints (proves token usage). The overlay's "Page Source" button on the new route opens the page in VS Code (proves the route's `source`). The columns overlay shows content sitting inside `--columns-max-width`.
