---
name: live-tokens-build-page
description: Compose a page in a @motion-proto/live-tokens project by placing existing shipped components (Button, Card, Callout, Dialog, Tabs, etc.) inside the column grid, registering the route, wiring the overlay's pageSources entry, and styling with theme tokens only. Use when the user asks to build / create / lay out a page, route, hero, marketing page, landing page, dashboard, settings screen, or pricing page; add a route; place / drop / use an existing component on a page; or assemble a screen from the live-tokens catalogue. Not for authoring a brand-new component the catalogue doesn't contain (see live-tokens-add-component) or for setting up the project itself (see live-tokens-setup-project).
---

# Composing pages in a live-tokens project

This skill teaches how to add a new page to a project that consumes `@motion-proto/live-tokens`. The end state: a `.svelte` file rendering shipped components inside the column grid, mounted at a route, registered with the overlay so the "Page Source" button opens it in VS Code, and styled exclusively through theme tokens so it picks up live edits automatically.

If the project itself isn't set up yet, run the [[live-tokens-setup-project]] skill first. If you need an editable surface for something the shipped components don't cover, see [[live-tokens-add-component]].

## Page anatomy

A page is a single Svelte file. Three obligations:

1. **Mount it at a route.** Route → page mapping lives in `App.svelte` (or wherever you mount routed pages). The shipped pattern uses dynamic `import()` so each page's side-effect CSS (e.g. `site.css`) only evaluates when that route is visited.
2. **Register it in `pageSources`.** The `<LiveEditorOverlay pageSources={...} />` prop maps each route to its source file path. The overlay's "Page Source" button opens the value in VS Code. Add an entry whenever you add a route.
3. **Style with tokens, not literals.** Every colour, spacing, radius, font-size, and font-family in your page CSS must reference a theme variable. Hardcoded values won't update when the user edits the theme, and they fight the whole point of the package.

## The column grid

Pages live inside a column-based layout. The starter exposes these CSS variables (defined by `tokens.css` and editable in `/editor`):

| Variable                  | What it controls                      |
|---------------------------|---------------------------------------|
| `--columns-count`         | Column count (typically 12)           |
| `--columns-gutter`        | Gap between columns                   |
| `--columns-max-width`     | Outer cap on the grid's width         |

Standard page shell:

```svelte
<style>
  .page {
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
    max-width: var(--columns-max-width);
    margin: 0 auto;
    padding: var(--space-48) var(--space-32);
  }

  .hero { grid-column: 1 / -1; }
  .body { grid-column: 3 / span 8; }
  .aside { grid-column: 11 / span 2; }
</style>
```

Toggle `ColumnsOverlay` (Cmd+G in dev) to see the grid visualised while you place content.

## Shipped component catalog

Import from `@motion-proto/live-tokens/components/<Name>.svelte`. The `.svelte` extension is required; there is no barrel export:

```svelte
<script lang="ts">
  import Card from '@motion-proto/live-tokens/components/Card.svelte';
  import Button from '@motion-proto/live-tokens/components/Button.svelte';
  import Callout from '@motion-proto/live-tokens/components/Callout.svelte';
</script>
```

Use the right component for the job. See [[live-tokens-pick-component]] for the confusing-pair decisions (Tabs vs SegmentedControl, Card vs CollapsibleSection, etc.).

**Containers**
- `Card` — bordered surface with optional header, body, footer slots. The default container.
- `CollapsibleSection` — toggleable disclosure. Three variants: `chromeless`, `divider`, `container`.
- `SectionDivider` — visual break between sections. Variants set the eyebrow / heading scale.
- `Dialog` — modal with overlay, header, body, footer parts. Confirm/cancel buttons configurable.

**Inputs**
- `Button` — primary / secondary / outline / success / danger / warning. The default CTA.
- `Input` — text input with label, helper, error states. Has `focused` interaction state.
- `Toggle` — on/off switch with sliding thumb. Default state is off; `on` is a component state with its own track and thumb colors.
- `RadioButton` — single selection from a set rendered as visible radio rows.
- `SegmentedControl` — single selection from 2–4 short options shown inline.
- `TabBar` — single selection from a horizontal list, view-switcher for tab panels.
- `MenuSelect` — single selection from a dropdown menu. Use when SegmentedControl would overflow.

**Feedback**
- `Callout` — info / success / warning / danger panel for inline messages.
- `Notification` — dismissable top/bottom-anchored toast.
- `ProgressBar` — determinate or indeterminate fill bar.
- `Tooltip` — hover-anchored explanatory popover.
- `Badge` — small status pill. Variants for brand/info/success/warning/danger.
- `CornerBadge` — anchored to a corner of a parent (top-right, etc.).

**Display**
- `Table` — tabular data with header row and configurable cells.
- `Image` — themed image wrapper with radius and border.
- `ImageLightbox` — modal image viewer with optional zoom toolbar.
- `Stat` — number + label (smoke-test / example component; excluded from prod builds).
- `SideNavigation` — nested nav with active-path matching and per-section expand state.

## Page-level styling rules

- **Reference tokens, never literals.** `color: var(--text-primary)` ✓ — `color: #333` ✗.
- **Spacing comes from `--space-*` tokens** (`--space-4`, `--space-8`, `--space-12`, `--space-16`, `--space-20`, `--space-24`, `--space-32`, `--space-48`, etc.). Don't write `padding: 17px`.
- **Typography comes from `--font-*` tokens**: `--font-display` (Fraunces), `--font-sans` (Manrope), `--font-mono`. Sizes are `--font-size-xs` through `--font-size-4xl`.
- **For themed global element rules** (bare `h1`, `p`, `a`), `import './site.css'` at the top of the page's `<script>`. site.css is consumer-owned — fork and edit. Don't import it from `main.ts`; it would leak into editor routes.
- **For local element overrides**, prefer scoped Svelte styles to tagging components with utility classes. Slot content in `Card` / `CollapsibleSection` already inherits the slot's typography automatically (a `<p>` inside a `Card` body picks up the card's text style).

## Wiring a new route

[[live-tokens-setup-project]] shows the minimal static `{#if}` mount for first boot. Once you have more than one user-facing page (or any page that side-effect-imports its own CSS), upgrade `App.svelte` to dynamic per-route imports so each page's module only evaluates when visited.

Given a new page at `src/pages/Pricing.svelte`:

```svelte
<!-- App.svelte -->
<script lang="ts">
  import { LiveEditorOverlay, ColumnsOverlay } from '@motion-proto/live-tokens';
  import { route } from '@motion-proto/live-tokens';

  let pagePromise = $derived.by(() => {
    if ($route === '/editor') return import('@motion-proto/live-tokens/editor');
    if ($route === '/components') return import('@motion-proto/live-tokens/component-editor-page');
    if ($route === '/pricing') return import('./pages/Pricing.svelte');
    return import('./pages/Home.svelte');
  });
</script>

<LiveEditorOverlay
  navLinks={[
    { path: '/', label: 'Home', icon: 'fa-home' },
    { path: '/pricing', label: 'Pricing', icon: 'fa-tag' },
  ]}
  pageSources={{
    '/': 'src/pages/Home.svelte',
    '/pricing': 'src/pages/Pricing.svelte',
  }}
/>
<ColumnsOverlay />

{#await pagePromise then m}
  {@const Page = m.default}
  <Page />
{/await}
```

The `import()` lives inside `$derived.by` so the page module (and any CSS it side-effect-imports, like `site.css`) only evaluates when the route matches. Static top-level imports leak page-level CSS into editor routes and break theme isolation. That's why this is the canonical pattern once you have more than the boot-time scaffolding.

## Anti-patterns

- **Don't import `site.css` from `main.ts`.** Its global element rules will leak into the editor routes and break theme isolation. Import it from each page's `<script>` block so the per-route dynamic-import boundary contains it.
- **Don't hardcode pixel or hex values in page CSS.** `padding: 17px` and `color: #333` won't repaint when the user edits the theme. The package's whole point is lost. Reference a token.
- **Don't tag shipped components with utility classes to override their look.** They're meant to be extended through their tokens via the `/components` editor, not by leaking CSS into their internals from the outside.
- **Don't deep-import from `node_modules/@motion-proto/live-tokens/src/...`.** Use the public entry points only (`@motion-proto/live-tokens`, `.../components/<Name>.svelte`, `.../editor`, `.../component-editor-page`, `.../app/*.css`, `.../vite-plugin`). Deep imports break on package upgrade.
- **Don't mount editor pages (`Editor`, `ComponentEditorPage`) outside their dedicated routes.** They mount their own chrome and stylesheets; rendering them inside another page produces double-mount and styling collisions.
- **Don't use static top-level imports for page modules** once you have more than one user-facing route. Static imports evaluate every page module at boot, leaking each page's side-effect CSS (e.g. `site.css`) into the editor routes.

## Verification

After saving, in dev:

- [ ] The new route loads. `navigate('/pricing')` from another page works without reload.
- [ ] The overlay's nav rail shows the new entry (if added to `navLinks`).
- [ ] The overlay's "Page Source" button on the new route opens the page file in VS Code.
- [ ] Opening `/editor`, changing a colour, and switching back to your new page shows the colour change applied — confirms you used tokens, not literals.
- [ ] `ColumnsOverlay` (Cmd+G) shows your content sitting within the grid; no element bleeds outside `--columns-max-width`.
- [ ] No console warnings about missing CSS variables (would indicate a typo on a `var(--...)` reference).
