---
name: live-tokens-build-page
description: Build a page in a @motion-proto/live-tokens project from the shipped components at their defaults: one text style per place, one size, one primary action, a theme token for every value, a lazy route, per-page site.css. Use when the user asks to build, create, lay out, or rearrange a page, route, hero, landing page, dashboard, settings screen, pricing page, or a tool screen with a stage and controls; add a route; place an existing component on a page; assemble a screen from the catalogue; or says the layout, sizes, type scale, button emphasis, or labels of a page are off. Edits page files and the route table only, never a component or the theme. Not for choosing between two components (see live-tokens-pick-component), a component the catalogue lacks (live-tokens-create-component), or a theme change mid-build (live-tokens-create-theme, live-tokens-set-geometry).
---

# Building a page in a live-tokens project

Assemble the page from shipped components at their defaults. Type the page's own elements from the text styles. Never edit a component or `tokens.css` for a page. The components editor at `/live-tokens/components` retunes a component for the whole project.

## Rules

1. **Use a shipped component when one fits.** Import from `@motion-proto/live-tokens/components/<Name>.svelte`. `npx live-tokens components <id>` prints the declared props, the values each union accepts, and the usage comment. `--json` returns the same as data. The list includes the project's own components. Pass only the props a component declares. When nothing fits, read **live-tokens-pick-component**. Then author the piece with **live-tokens-create-component**.
2. **Use a theme token for every value.** Every color, spacing, radius, stroke, and shadow in page CSS is a `var(--token)`. That holds in the `<style>` block, an inline `style=` attribute, and a `style:` directive. Sizing is layout and stays literal: a hero's height, a max content width, a column's minimum width.

Text inside a `Card` or a `CollapsibleSection` takes the container's type. The slot pins the axes the container owns onto nested `p`, `ul`, `ol`, and `li`. When the page owns that type, as full-bleed media does, pass `prose={false}`.

## Hierarchy

**Type by place.** One text style per place. A page uses each level in order with no skipped level.

| Place | Style |
|---|---|
| Page title | `--heading-xl-*`, or `SectionDivider variant="md"` |
| Band or section title | `--heading-lg-*`, or `SectionDivider variant="sm"` |
| Card or box title | the Card `title` prop |
| Label above a group | `--body-sm-*` in `--text-secondary` |
| Body | `--body-md-*` |
| Secondary line, count, status | `--body-sm-*` |
| Command or value | `--code-*` |

A text style carries `-font-family`, `-font-size`, `-font-weight`, `-line-height`, and `-letter-spacing`. Set all five from one style. A single axis such as `--font-size-lg` or `--font-sans` never appears in page CSS. A single axis drops the family and weight the style carries, and the checker reports the axis. A weight alone, on `strong` or a list marker, is the one axis a page sets by itself. A page shows at most two weights.

**One size.** Omit `size` on every control and container. The shipped default is the page's size. When a component's default voice is wrong for the project, retune the component in `/live-tokens/components`. That moves every instance at once.

**One primary action.** One `variant="primary"` Button per page or dialog. Every other action is `secondary`. A tertiary action is `outline`. `danger` marks a destructive action only. In a row of actions the primary sits last, on the right. Fewer than five actions are individual Buttons. Five or more collapse into a `MenuSelect` behind one Button.

**Spacing by place.** Each place takes one step of the `--space-*` scale. Inside is smaller than between.

| Place | Step |
|---|---|
| Between controls in a row | `--space-8` |
| Inside a box the page draws | `--space-16` |
| Between fields in a form | `--space-20` |
| Between boxes in a band | `--columns-gutter` across, `--space-24` down |
| Between bands | `--space-16` above a hairline |

The hairline does the band's separating, so the band takes less space than the boxes inside it. A band's rule is `padding-top: var(--space-16)` with `border-top: var(--border-width-1) solid var(--border-neutral)`. Card chrome does not separate bands.

## Layout

The page shows one thing. All other content stays out of its way. Each mark that is not content costs attention: a rule, a border, a header bar, a shadow. Each mark must do a job that no other mark does.

Separate elements with the smallest difference that separates them. Use space first. When space is not sufficient, add a hairline rule. When a rule is not sufficient, use a second surface. Do not stack these separators. Two heavy edges side by side make a third shape between them. A band of boxes with borders and header bars reads as a set of posters.

Put each element in one of three layers, and color it from that layer. Content is `--text-primary`. A label is `--text-secondary`. Scaffolding is `--border-neutral`.

Show related items side by side when the width permits. Do not put them behind a toggle.

On a tool page, the stage is the content. Each control is administration. Give the space to the stage.

`references/layout-sources.md` names the sources for these laws.

Decide the bands before the columns. Read the page top to bottom. Name each band by its job: what the user looks at, types into, or presses. A content page runs hero, sections, footer. A tool page runs the stage on top, the inputs under it, and one toolbar along the bottom edge. The stage is the canvas, player, or strip the work is about. Each band is a row of the page grid. A band that needs columns of its own spans the grid and redeclares it, as below.

Stretch a band's boxes to one height (`align-items: stretch`) so their bottom edges make one line.

Pages sit inside the column grid via `--columns-count`, `--columns-gutter`, `--columns-max-width`. The columns button in the overlay's header (the vertical-lines icon) draws the grid over the page.

To place children at page-column positions:

1. Span the parent grid with `grid-column: 1 / -1`.
2. Redeclare `repeat(var(--columns-count), 1fr)` with `--columns-gutter`.
3. Refer to children by page-column numbers.

Never write a local `repeat(N, 1fr)` with a hardcoded count. The widths drift from the page grid and the numbers stop matching `ColumnsOverlay`.

## Containers by job

- `Panel` is a stage: a canvas, a player, a preview. It pins its height so the page holds still while what it shows changes.
- `Card` is a titled block of content. Its `title` prop is the card's title. The card's own tokens type it.
- A box in a tool UI labels itself. Use `Card variant="bare"` and put the label in the body as `--body-sm-*` in `--text-secondary`. Leave the shipped header alone.
- A toolbar is a flex row of Buttons on the band's bottom edge. Group them left and right with `justify-content: space-between`, the primary last. No card around it.
- A stacked rail sets `fullWidth` on each Button. `fullWidth` comes off in a row.
- `MenuSelect` renders its list open. For a picker, toggle it from a Button with a trailing chevron (`icon="fa-solid fa-chevron-down" iconPosition="right"`). Position the list absolutely under the button, `top: 100%` with a `--space-*` margin.

## Wiring

Add the route the way `App.svelte` already wires routes.

- **`<LiveTokensRouter pages={...}>`** (the usual case): add a `pages` entry with `lazy: () => import('./YourPage.svelte')` and `source: 'src/...'`. Add `label` and `icon` to show it in the nav rail. A `/:id`, a path prefix, or a gated page cannot sit in the table. For one of those, add `resolve(path) => RouteEntry | null` in place of a `pages` key. The entry shape is the same, so `props` and `source` (hence "Page Source") work the same way.
- **Manual `<LiveEditorOverlay>`**: dispatch with `$derived.by(() => import(...))` and register the route's source in `pageSources={...}`.

Either way use `lazy`. A static top-level import evaluates every page module at boot and leaks page CSS into the editor routes.

Import `site.css` from each page's `<script>` block. An import from `main.ts` leaks it into the editor routes.

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

`source` is what makes Page Source work. Drop `label` to keep a route reachable by URL and off the nav rail.

## Avoid

- A colour literal, or px or rem in spacing, stroke, radius, or shadow.
- A single type axis in page CSS. Set the five axes from one text style.
- A `size` prop on a shipped component.
- A second `variant="primary"` Button on one page.
- A hardcoded page-grid count (`repeat(10, 1fr)`). Use `repeat(var(--columns-count), 1fr)`, or `calc(var(--columns-count) - 2)` for a sub-grid that spans fewer page columns. A local two-up or three-up is a layout and is fine.
- A utility class that overrides a shipped component. Extend via the `/live-tokens/components` editor.
- A card header as a section label in a tool UI, and a page rule that shrinks it. Label the box with a text style.
- A deep import from `node_modules/@motion-proto/live-tokens/src/...`. Use the public entry points.
- `Editor` or `ComponentEditorPage` mounted outside their dedicated routes.
- A page route under `/live-tokens/*`. That namespace is reserved for the package's own dev surfaces.

## Verify

Run **live-tokens-check-compliance**. Its report carries both checkers' findings by rule, and **live-tokens-fix-findings** takes the fix list. Repeat until the page is clean.

The checker cannot see a layout. Open the page at the width it is built for and read it band by band:

- Heading levels run in order with no gap.
- No label is larger than the page's body copy.
- The boxes in a band end on one line.
- Every control stays inside its box. A `width: 100%` field without `box-sizing: border-box` pushes past it by its padding.
- The actions sit where the eye goes last, with the one primary at the end.

Then read the page from a distance. The bands and their edges are the only shapes that show. Then read it closely. For each border, header bar, and box, ask whether the page loses information when the element is removed. When the answer is no, remove the element. Find the element a reader sees first, second, and third, and confirm that is the reading order the page needs.
