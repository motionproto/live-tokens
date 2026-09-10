---
name: live-tokens-create-page
description: Create a page in a @motion-proto/live-tokens project from the shipped components at their defaults and the theme's text styles. Use when the user asks for a page or a route. Use when the user asks to change the layout of a page. Edits page files and the route table. For a choice between two components, read live-tokens-pick-component. For a component the catalogue lacks, read live-tokens-create-component. For a theme change, read live-tokens-create-theme.
---

# Creating a page in a live-tokens project

Assemble the page from the shipped components at their defaults and the theme's text styles. A change to a component is made in the components editor at `/live-tokens/components` and reaches every page. A change to the theme is made with **live-tokens-create-theme**.

## Workflow

1. Read the project first: the existing pages and where they live, how `App.svelte` wires routes, `--columns-count` in `tokens.css`, and the catalogue from `npx live-tokens components`.
2. Read the page top to bottom and name each section by its purpose. Take each section's column spans from the Page layouts table.
3. Build the page grid and place each section on it. Separate the sections with the smallest difference that separates them.
4. Give each section its container from the Containers by purpose list.
5. Match a shipped component to each need. When two could fit, read **live-tokens-pick-component**. When nothing in the catalogue fits, read **live-tokens-create-component**.
6. Write the page CSS in design tokens.
7. Set the hierarchy: one text style per element, the shipped size on every control, one primary action, and one space step per position.
8. Add the route, with a lazy import and the source path.
9. Run **live-tokens-check-compliance** and `npx live-tokens check-page <file> --tests --strict`, then check the rendered page.
10. Reply with the sections and the layout each took, the components placed, the route, and the compliance result.

## Layout

### Page layouts

Decide the sections before the columns. Read the page top to bottom and name each section by its purpose: what the user reads, types into, or presses. Each section is a row of the page grid. Take the column spans from the layout that matches the reader's task.

| Layout | Use when | Column spans |
|---|---|---|
| Stacked sections | The reader moves top to bottom: an opening, one section per topic, a close; or a stage, its inputs, and a toolbar. | Each section spans all columns. Copy spans half (6 of 12). |
| Main with a supporting pane | One region is the work and the other adjusts or describes it. | Main two thirds (8), pane one third (4). |
| List with detail | The reader picks an item from a list and inspects it. | List one third (4), detail two thirds (8). |
| Grid of equals | The reader compares or scans items of one kind. | Equal spans. Up to seven per section. |
| Single column | The reader fills a form or reads at length. | Half the columns (6), centered. |

The stage is the canvas, player, or strip the work is about. Stretch a section's containers to one height (`align-items: stretch`) so their bottom edges align.

### Grid

The page is the column grid: `display: grid`, `grid-template-columns: repeat(var(--columns-count), 1fr)`, `column-gap: var(--columns-gutter)`, `max-width: var(--columns-max-width)`, `margin: 0 auto`. Each section spans it with `grid-column: 1 / -1`.

To place a section's children at page-column positions:

1. Read `--columns-count` in the project's `tokens.css`.
2. Span the parent grid with `grid-column: 1 / -1`.
3. Redeclare `repeat(var(--columns-count), 1fr)` with `column-gap: var(--columns-gutter)`.
4. Place each child by page-column numbers.

A grid that follows the page columns takes `var(--columns-count)` or a `calc()` of it as its count, so it stays in step with `ColumnsOverlay`. A local grid of two or three equal columns writes its own count. A column number in `grid-column` is fixed to the count read in step 1.

No scaffold collapses the page grid on a phone: the theme's own column gutter alone exceeds a phone's width at the full column count, so every page writes its own `@media (max-width: 767px)` rule setting `grid-template-columns: 1fr` and `column-gap: 0`, with each section's children spanning `grid-column: 1 / -1`. A section's columns then stack in reading order.

### Separation

The page shows one thing, and every other element stays out of its way. Each element that is not content costs attention: a hairline, a border, a header bar, a shadow. Keep an element only when it serves a purpose no other element serves.

Separate elements with the smallest difference that separates them: space first, then a hairline, then a second surface. Use one separator at a time. Two heavy borders side by side make a third shape between them, and a section of containers with borders and header bars reads as a set of posters.

Color each element by its layer.

| Layer | Color |
|---|---|
| Content | `--text-primary`, or the color `site.css` gives the element |
| Label | `--text-secondary` |
| Chrome | `--border-neutral` |
| Overlay on content, such as a grid or a selection | `--border-brand`, which stays visible on any pixel |

Show related items side by side when the width permits. A line of copy runs 45 to 90 characters; the copy span in Page layouts holds that at body size. On a tool page the stage is the content and each control is chrome, so the stage takes the space.

`references/layout-sources.md` names the sources for these laws.

## Containers by purpose

- `Panel` is a stage: a canvas, a player, a preview. `minHeight` holds its height while what it shows changes.
- An empty stage shows a heading that names the condition and one `secondary` Button that fills it. An error goes in a `Callout variant="danger"`.
- `Card` is a titled block of content. Its `title` prop is the title, and the card's own tokens type it.
- A container in a tool UI labels itself: `Card variant="bare"` with the label in the body as `--body-sm-*` in `--text-secondary`.
- A form puts the essential fields first and the secondary fields in a `CollapsibleSection`. Its actions sit on the bottom edge.
- A row of fields is a flex row with `gap: var(--space-20)`. Each field's wrapper takes `flex: 1`.
- A toolbar is a flex row of Buttons on the section's bottom edge, with no container around it. Group the Buttons left and right with `justify-content: space-between`, the primary last. A `danger` Button sits apart from the group it could be mistaken for.
- A vertical stack of Buttons sets `fullWidth` on each Button. A row omits it.
- `MenuSelect` renders its list open. For a picker, toggle it from a Button with a trailing chevron (`icon="fa-solid fa-chevron-down" iconPosition="right"`) and position the list under the Button at `top: 100%` with a `--space-*` margin.

## Components

- Use a shipped component when one fits. Import it from `@motion-proto/live-tokens/components/<Name>.svelte`.
- `npx live-tokens components <id>` prints the declared props, the values each union accepts, and the usage comment. `--json` prints the same as data. The list includes the project's own components.
- Pass only the props a component declares.
- A shipped component fills its parent. To size one, size the element the page wraps it in.
- A native element with no chrome of its own needs no component: an `<input type="file">` behind a Button, a `<canvas>`, an `<img>` inside a stage.
- Text inside a `Card` or a `CollapsibleSection` takes the container's type on nested `p`, `ul`, `ol`, and `li`. When the page owns that type, as full-bleed media does, pass `prose={false}`.

## Tokens

- When a design token exists for a value, page CSS takes the token as `var(--token)`. That holds in the `<style>` block, an inline `style=` attribute, and a `style:` directive.
- A width is a span of page columns. The Layout section gives the grid.
- A height follows the content. A stage's `minHeight` is the one fixed height, set from what the stage must show.
- A value that comes from data, such as a sheet's padding in pixels or a chart's scale, is set through a `{}` expression.

## Hierarchy

### Type

One text style per element. A text style has five axes: `-font-family`, `-font-size`, `-font-weight`, `-line-height`, and `-letter-spacing`. Set all five from the one style.

| Element | Style |
|---|---|
| Page title | `h1` in `--heading-xl-*` |
| Section title | `h2` in `--heading-lg-*`, or `SectionDivider variant="sm"` |
| Card title | the Card `title` prop |
| Label above a group | `--body-sm-*` in `--text-secondary` |
| Body | `p` in `--body-md-*` |
| Secondary line | `--body-sm-*` in `--text-secondary` |
| Count, status, read-out | `--body-sm-*` in `--text-primary` |
| Command or value | `code` in `--code-*` |

Use the semantic element for each place: one `h1`, an `h2` for each section, `h3` inside a section, `p` for copy. Heading levels run in order with no skipped level. `site.css` types bare `h1` to `h4`, `p`, `code`, `pre`, and list items from these styles, so the tag carries the style. Type an element only when the table gives its tag a different style. A weight alone, on `strong` or a list marker, is the one axis a page sets by itself. A page shows at most two weights.

### Size

Omit `size` on every control and container. The shipped default is the page's size.

### Emphasis

One `primary` Button per page: the action that completes the page's main task. An action that supports that task is `secondary`. An action unrelated to the task, or informational, is `outline`. An action that destroys saved work is `danger`.

In a row of actions the primary sits last, on the right. Up to four actions are individual Buttons. Five or more collapse into a `MenuSelect` behind one Button.

### Spacing

Each position takes one step of the `--space-*` scale. Space inside a group is smaller than space between groups. A shipped component carries its own inner spacing; the table names the space the page draws.

| Position | Step |
|---|---|
| Between controls in a row | `--space-8` |
| Inside a wrapper the page draws | `--space-16` |
| Between fields in a form | `--space-20` |
| Between containers in a section | `--columns-gutter` across, `--space-24` down |
| Between sections | `--space-16` above a hairline |
| Page title to first section | `--space-24`, no hairline |
| Page margin | `--space-32` |

Every section after the first opens with a hairline: `padding-top: var(--space-16)` and `border-top: var(--border-width-1) solid var(--border-neutral)`. The hairline separates, so the gap between sections is smaller than the gap between the containers inside them. A section's edge is the hairline alone.

## Routing

Add the route the way `App.svelte` already wires routes.

- `<LiveTokensRouter pages={...}>`: add a `pages` entry with `lazy: () => import('./YourPage.svelte')` and `source: 'src/...'`. Add `label` and `icon` to show the page in the nav rail; omit `label` to keep the route reachable by URL alone. For a `/:id`, a path prefix, or a gated page, add `resolve(path) => RouteEntry | null` beside `pages`. The entry fields are the same.
- Manual `<LiveEditorOverlay>`: dispatch with `$derived.by(() => import(...))` and register the route's source in `pageSources={...}`.

Import the page with `lazy`, so page CSS stays off the editor routes. Import `site.css` from each page's `<script>` block for the same reason. `source` is what makes Page Source work. A page route sits outside `/live-tokens/*`, the namespace of the package's own routes, where `Editor` and `ComponentEditorPage` mount.

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

## Verify

Run **live-tokens-check-compliance**, then `npx live-tokens check-page <file> --tests --strict`. The Playwright suite runs against the page's own route and proves what only a rendered page can: the cascade leaves every component painting from its semantic properties, every run of text sits in one shipped text style, every text and surface pair meets AA, sections sit on the page grid, and nothing overflows. Each finding carries a rule id and a line; `--off=<rule>` silences a rule for one run. The two reports carry every finding by rule, and **live-tokens-fix-findings** takes the fix list. Repeat until the page is clean.

The checkers cannot see a layout. Open the page at the width it is built for and check each line below.

- The first section holds what the user came for.
- One `h1`. Heading levels run in order with no skipped level.
- No label is larger than the page's body copy.
- A line of copy runs 45 to 90 characters.
- The containers in a section align at the bottom.
- The actions sit where the eye goes last, with the one primary at the end.
- Every row of actions holds an action that leaves without committing.
- An action that destroys saved work confirms in a `Dialog`.
- An action that runs longer than a moment shows progress in a `ProgressBar` or a `Notification`.
- Every field has a default, and Reset restores it.
- Secondary settings sit in a `CollapsibleSection`. Every control is in view.
- Labels use the user's words, such as "Export slices".
- Every `img` has `alt` text. Focus order follows the reading order.

`references/interaction-sources.md` names the sources for these checks.

Then read the page from a distance: the sections and their edges are the only shapes that show. Then read it closely. For each border, header bar, and container, ask whether the page loses information when the element is removed. When the answer is no, remove the element. Find the element a reader sees first, second, and third, and confirm that is the reading order the page needs.
