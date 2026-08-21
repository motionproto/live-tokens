# Live Tokens

A design system for styling and building Svelte + Vite microsites. Edit tokens and components in a dev-only editor and watch the running site repaint on every input. Save the result as a theme file and carry it between projects.

```bash
npm install @motion-proto/live-tokens
```

The editor is dev-only. Production builds get plain CSS variables and the components you used.

## What you get

- **Live token editing.** Colors, typography, spacing, radii, shadows, motion, palettes, and gradients. Every input writes a CSS variable, so the page repaints with no reload and no build step.
- **Live component editing.** 25 shipped Svelte components (Button, IconButton, Input, Card, Dialog, Badge, Callout, Table, Tooltip, Toggle, TabBar, SegmentedControl, RadioButton, MenuSelect, ProgressBar, CornerBadge, SectionDivider, CollapsibleSection, Notification, Image, ImageLightbox, CodeSnippet, SideNavigation, Panel, InlineEditActions) declare their design-token aliases in a `:global(:root)` block. Rewire an alias from the component's editor and it updates everywhere that component is used, on your real pages.
- **Four dev-only routes.** `/live-tokens/editor` for tokens, `/live-tokens/colors` for palettes, `/live-tokens/components` for per-component aliases, `/live-tokens/docs` for the user guide.
- **Editor overlay.** Pins to the top right of every dev page and opens the editor in a side panel or floating window, so you edit on the page you are styling. Its "Page Source" button opens the current page's `.svelte` file in VS Code.
- **Themes.** A theme is a whole look in one file: colors and type plus a config for every component, stored by value. Loading one changes a single pointer file, and nothing your site ships changes until you Adopt. Export a theme and import it into another project to restore the look in one step.
- **Seven example looks.** Autumn, Halloween, Midnight Study, Ocean, Royal Velvet, Spring Meadow, and Sunset each ship as a full theme: colors, a Google Fonts pairing, and a shape personality of radius, padding, gap, and border-width aliases. They ship inside the package, so trying one needs no local files. Load Motion Proto to return to the default. Saving over a preset writes a local copy that shadows the shipped one; delete the copy and the shipped version returns.
- **Vite plugin.** Hosts the `/api/live-tokens/{colors-and-type,component-configs,themes}/*` routes the editor reads and writes through. The single namespace keeps these routes clear of anything your app serves under `/api`.
- **Claude Code skills.** Five bundled skills that drive the package from plain English. See [Claude Code skills](#claude-code-skills).

## Install

### Vite config

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { themeFileApi } from '@motion-proto/live-tokens/vite-plugin';

export default defineConfig({
  plugins: [
    // vitePreprocess compiles the shipped components' `<style lang="scss">`
    // blocks. Install `sass` alongside it.
    svelte({ preprocess: vitePreprocess() }),
    themeFileApi({
      tokensCssPath: 'src/system/styles/tokens.css',
    }),
  ],
});
```

The `themeFileApi` plugin:

- Resolves the `default` colors and type from the installed package, so you start on the shipped defaults with no local copy.
- Discovers components at `src/components/*.svelte` and `src/system/components/*.svelte`, and seeds `src/live-tokens/data/component-configs/{comp}/default.json` from each component's `:global(:root)` block.
- Writes `src/live-tokens/data/themes/default.json` at dev-server start: the Default theme, derived from the shipped colors and type plus those component defaults, and regenerated when either changes. It is protected, so the editor never deletes it and an outside deletion heals on the next start.
- Bakes `tokens.generated.css` from the production theme at startup, so a fresh checkout builds against the look you shipped.
- Hosts the `/api/live-tokens/*` routes the editor saves and loads through.
- Injects `__PROJECT_ROOT__` for the overlay's "Page Source" link and `__LIVE_TOKENS_API_BASE__` so the client uses whatever `apiBase` you configured.

A project last opened on 0.47.1 or earlier keeps its colors and type in `themes/` and its whole looks in `manifests/`, the names 0.48 reassigned. The plugin recognises that layout, writes nothing, and says so. `npx live-tokens migrate` moves `themes/` to `colors-and-type/` and `manifests/` to `themes/`, records what the retired per-layer pointers resolved to as the production theme, and clears them. Restart the dev server afterwards.

### Bootstrap in `main.ts`

```ts
// main.ts
import '@motion-proto/live-tokens/app/tokens.css';
import './live-tokens/data/tokens.generated.css';
import '@motion-proto/live-tokens/app/fonts.css';
import { bootLiveTokens } from '@motion-proto/live-tokens';
import App from './App.svelte';

bootLiveTokens(App, '#app');
```

`bootLiveTokens` runs the editor's idempotent init hooks, fetches the active theme in dev, registers any consumer-authored components, and mounts the app. It side-effect-imports FontAwesome, because the dev overlay always needs icons. The three token-CSS imports stay with you: order matters, and `tokens.generated.css` is project-local.

### Mount routes with `<LiveTokensRouter>`

```svelte
<!-- App.svelte -->
<script lang="ts">
  import { LiveTokensRouter } from '@motion-proto/live-tokens';
</script>

<LiveTokensRouter pages={{
  '/': { lazy: () => import('./Home.svelte'), label: 'Home', icon: 'fa-home', source: 'src/Home.svelte' },
}} />
```

`<LiveTokensRouter>` owns the dev overlay (`<LiveEditorOverlay>` and `<ColumnsOverlay>`), the four editor routes, in-app link-click interception, and the nav-rail and page-source plumbing the overlay needs. Each entry in `pages` is one of your routes; entries with a `label` appear in the overlay's nav rail. Pass `lazy: () => import('./Page.svelte')` so each page's stylesheet side-effects evaluate only when that route is visited, or `component: PageComponent` for an eager import. The editor routes dispatch internally, so you never import the library's editor pages yourself.

For routes you cannot enumerate ahead of time (a `/:id`, a path prefix, a page shown only under some condition), add a `resolve` function from the current path to a `RouteEntry` and return `null` to fall through. Resolution order is `pages[path]`, then `resolve(path)`, then the `pages['/']` fallback, so adding `resolve` never changes how existing entries match. A resolved entry can carry `props`, letting one component serve many paths, and its `source` gives the dynamic route a working "Page Source" button.

```svelte
<LiveTokensRouter
  pages={{ '/': { lazy: () => import('./Home.svelte'), label: 'Home' } }}
  resolve={(path) => {
    const m = path.match(/^\/module\/(.+)$/);
    if (!m) return null;
    return { lazy: () => import('./ModulePage.svelte'), props: { id: m[1] }, source: 'src/ModulePage.svelte' };
  }}
/>
```

Relocate or disable an editor route with the `editorRoutes` prop: `<LiveTokensRouter pages={…} editorRoutes={{ editor: '/admin/editor', components: false }} />`. A string moves the route; `false` removes it, along with its nav-rail entry.

The whole overlay surface is dev-only and tree-shakes out of production builds. No `{#if import.meta.env.DEV}` guards needed.

### Use components

```svelte
<script lang="ts">
  import Button from '@motion-proto/live-tokens/components/Button.svelte';
  import Callout from '@motion-proto/live-tokens/components/Callout.svelte';
</script>

<Callout variant="info">Read this.</Callout>
<Button variant="primary">Save</Button>
```

Each component carries its own design-token aliases and picks up your `tokens.css` values automatically. Import only the ones you use.

### Styles

The editor pages load their own chrome (`ui-editor.css`, `ui-form-controls.css`) and the icon font. The only stylesheet you need is a `tokens.css` declaring the design-token CSS variables on `:root`.

```ts
import '@motion-proto/live-tokens/app/tokens.css';
import '@motion-proto/live-tokens/app/site.css';   // optional: themed h1/p/a styles
import '@motion-proto/live-tokens/app/fonts.css';  // optional: Fraunces + Manrope @font-face
```

Or copy `node_modules/@motion-proto/live-tokens/src/system/styles/tokens.css` into your project and edit it. It stays hand-authored: what you Adopt lands in the sidecar `tokens.generated.css`, never back in `tokens.css`.

### Lower-level API

`bootLiveTokens` and `<LiveTokensRouter>` are wrappers. The individual init functions (`initCssVarSync`, `initRouter`, `initColumnsOverlay`, `initEditorStore`, `initializeTheme`), `<LiveEditorOverlay>`, `<ColumnsOverlay>`, and the editor page exports (`@motion-proto/live-tokens/editor`, `@motion-proto/live-tokens/component-editor-page`) are all exported. Use them to build a custom shell: arbitrary markup per route, a foreign matcher, or your own overlay wiring. Dynamic and gated routes do not need this; use `resolve` above, which keeps the overlay, nav rail, and page source intact.

## Where data lands, and how to move it

The plugin reads and writes under one folder, `src/live-tokens/data/`, which holds three subdirectories it owns: `colors-and-type/`, `themes/`, and `component-configs/`.

`themes/` holds one file per whole look, plus `_active.json` naming the one the editor has open and `_production.json` naming the one your site ships. `colors-and-type/` and `component-configs/{comp}/` hold each layer's `default.json` baseline, any preset you save by name, and the `_working.json` buffer for edits you have not saved into the active theme. A buffer is a delta from the open theme, so ordinary theme switching leaves none behind.

To move the data, create `live-tokens.config.json` at your project root:

```json
{
  "dataDir": "src/live-tokens/data"
}
```

All four keys are optional. `dataDir` relocates all three subfolders at once. The per-folder overrides cover unusual layouts, such as a monorepo where colors and type are shared across packages but component configs are not:

```json
{
  "dataDir": "src/live-tokens/data",
  "colorsAndTypeDir": "../shared/colors-and-type",
  "componentConfigsDir": "src/live-tokens/data/component-configs",
  "themesDir": "src/live-tokens/data/themes"
}
```

Resolution order, per folder: an explicit `themeFileApi(opts)` argument, then the matching key in `live-tokens.config.json`, then `<dataDir>/<sub>`. The dev server reads the file once at startup, so restart Vite to pick up changes.

## Scaffold a new app

```bash
npx @motion-proto/live-tokens create my-app
cd my-app
npm install
npm run dev
```

This generates a Svelte + Vite app that depends on the package, with `vite.config.ts`, `main.ts`, `App.svelte`, the `themeFileApi` plugin, and a placeholder `src/pages/Home.svelte` already wired. The token CSS is seeded from the version you scaffolded against. Open http://localhost:5173, replace `Home.svelte` with your content, and upgrade later with `npm update`.

## Recommended project layout

`create` scaffolds this layout. Conforming to it by hand keeps upgrades non-destructive and projects consistent.

```
src/
  main.ts                         # token CSS chain, then bootLiveTokens(App, '#app')
  App.svelte                      # routes (e.g. <LiveTokensRouter {pages} />)
  pages/                          # your pages
  styles/site.css                 # your themed page typography (yours to edit)
  system/styles/tokens.css        # vendored Layer-1 tokens, committed
  live-tokens/data/               # editor state, committed
    tokens.generated.css          #   editor output
    themes/                       #   one file per whole look, plus the two pointers
    colors-and-type/ component-configs/
vite.config.ts                    # svelte({ preprocess: vitePreprocess() }) + themeFileApi
svelte.config.js                  # vitePreprocess()
```

Conventions that make it work:

- **Vendor `tokens.css` into `src/` and commit it.** Point `themeFileApi({ tokensCssPath })` at that file, never at one inside `node_modules`, which `npm install` wipes.
- **Keep all editable state under `src/` and commit it**: `tokens.css`, `tokens.generated.css`, and everything in `live-tokens/data/`. This invariant is what makes upgrades safe, since `npm install` only touches `node_modules`, `package.json`, and the lockfile.
- **Nothing is backed up for you.** The dev server keeps no snapshots, so git is the safety net. Commit a theme you care about before editing over it.
- **Preprocess with `vitePreprocess()`** (bundled in `@sveltejs/vite-plugin-svelte`) and keep `sass` installed for the components' SCSS. No `svelte-preprocess`, no `legacy-peer-deps`.
- **Import only from the public surface**: `@motion-proto/live-tokens`, `/components/*`, `/vite-plugin`, `/app/*`.

## Minimal setup without the plugin

The least a consumer needs after `npm install @motion-proto/live-tokens`:

```ts
// src/main.ts
import '@motion-proto/live-tokens/app/tokens.css';
import { mount } from 'svelte';
import App from './App.svelte';

mount(App, { target: document.getElementById('app')! });
```

```svelte
<!-- src/App.svelte -->
<script lang="ts">
  import Editor from '@motion-proto/live-tokens/editor';
</script>

<Editor />
```

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte({ preprocess: vitePreprocess() })],
});
```

`vite build` works as-is: no `css: 'injected'` workaround, no `optimizeDeps` excludes. Add `themeFileApi` and `bootLiveTokens` from the Install section when you want edits persisted to disk.

## Consumer-authored components

The shipped components are first-party, but you can author your own and get the same live editing. Co-locate the runtime and editor files in `src/components/` or `src/system/components/`, then pass them to `bootLiveTokens`:

```ts
// src/main.ts
import { bootLiveTokens } from '@motion-proto/live-tokens';
import App from './App.svelte';
import MyWidgetEditor, { allTokens as myWidgetTokens } from './components/MyWidgetEditor.svelte';

bootLiveTokens(App, '#app', {
  components: [{
    id: 'mywidget',
    label: 'My Widget',
    icon: 'fas fa-magic',
    sourceFile: 'src/components/MyWidget.svelte',
    editorComponent: MyWidgetEditor,
    schema: myWidgetTokens,
  }],
});
```

`bootLiveTokens` calls `registerComponent` for each entry, gated on `import.meta.env.DEV` so registration tree-shakes out of production. Call `registerComponent` directly if you need finer control over timing.

The component appears on `/live-tokens/components` under a **CUSTOM** group. Token rows, linked-block sharing, per-component config persistence, and reset-to-default behave exactly as they do for the built-in set. Import only from `@motion-proto/live-tokens` or `@motion-proto/live-tokens/component-editor`; never deep-import from `src/`.

## CLI

```bash
npx @motion-proto/live-tokens <command>
```

| Command | What it does |
|---|---|
| `create <dir> [--force]` | Scaffold a new Svelte + Vite app wired up with live-tokens. |
| `setup-claude [--force]` | Install the bundled Claude Code skills into `./.claude/skills/`. |
| `check-component <id>` | Validate a component's runtime, editor, and registration against the authoring contract. |
| `generate-theme <brief.json> [--no-activate] [--dry-run] [--carry-from <name>]` | Build a full theme from a 10-seed OKLCH brief, enforce AA contrast, write `themes/<slug>.json`, and open it. |
| `adjust <ops.json> [--dry-run]` | Move radius, padding, gap, and border-width aliases along their token scales. |
| `migrate [--check] [--write] [--tokens <path>]` | Reconcile the project with the installed package: additive `tokens.css` migrations, the pre-0.48 data-tree move, and a report on source references to the routes that moved in 0.35.0. |

Once installed in a project, the same commands are available as `npx live-tokens <command>`.

## Claude Code skills

The package bundles five Claude Code skills. They encode the conventions this README cannot carry in full: which component fits a need, how a page is wired, what a valid theme looks like in OKLCH, and how shape and space move along the token scales. Each triggers from an ordinary request, so there are no slash commands to learn.

### Install

```bash
npx @motion-proto/live-tokens setup-claude
```

This copies every bundled skill into `./.claude/skills/` in the current directory. Re-run it after upgrading the package to pick up new and changed skills, adding `--force` to overwrite. macOS and Linux only. The equivalent by hand:

```bash
mkdir -p .claude/skills && cp -R node_modules/@motion-proto/live-tokens/.claude/skills/. .claude/skills/
```

### `live-tokens-pick-component`

Ask "TabBar or SegmentedControl?", "how do I let someone pick one of four options?", or "what is the difference between a Callout and a Notification?".

The skill holds the catalogue grouped by job (action, input, selection, containers, messaging, display) and a decision table for each confusable family: `SegmentedControl` vs `TabBar` vs `RadioButton` vs `MenuSelect`, `Card` vs `CollapsibleSection` vs `Dialog`, `Callout` vs `Notification` vs `Tooltip` vs `Badge`, `Button` vs `IconButton`, and the on/off case. It answers the question and writes nothing. Read it before authoring anything new.

### `live-tokens-build-page`

Ask for a page, a route, or a screen: "build a pricing page", "add a /settings route", "put a hero at the top of Home".

The skill composes the page from shipped components, styles every value with `var(--token-*)` (no hex, no pixel literals, so editor changes repaint the page), places content on the column grid via `--columns-count`, `--columns-gutter`, and `--columns-max-width`, adds the route as a `lazy` import with a `source` so the overlay's "Page Source" button works, and imports `site.css` from the page rather than `main.ts` so page CSS stays out of the editor routes. It writes your page files and the route entry, and never touches the data tree.

### `live-tokens-generate-theme`

Ask for a look: "a dark, moody night theme", "a St Patrick's Day theme in green and gold", "warmer", "more contrast", "calmer".

The skill translates the brief into ten OKLCH seeds (Brand, Accent, Special, Canvas, Neutral, Alternate, Info, Success, Warning, Danger) plus a light or dark scheme, then runs `npx live-tokens generate-theme <brief.json>`. The CLI assembles the curves, enforces AA contrast on derived text tokens and auto-corrects where it can, writes `themes/<slug>.json`, opens it, and prints a contrast report. Exit 1 means the seeds themselves are unworkable, and each failure line names the seed to change.

Most of the skill is the judgment the generator cannot supply: a chroma budget scaled to how much screen area each palette covers, per-role lightness and hue bands for each scheme, gamut guardrails against impossible seeds, harmony modes, the optional canvas gradient, shadow weight for the canvas, and OKLCH anchors for named colors.

Scope: colors only. Fonts, gradients, and component aliases carry forward from the open theme, or from `--carry-from <name>`. `--dry-run` prints the report without writing; `--no-activate` writes without opening. Opening a theme never changes what your site ships; Adopt does. Regenerating replaces that theme's whole color state, including palette edits made in the editor since the last run.

### `live-tokens-adjust-shape-space`

Ask for shape or space: "make the buttons pill shaped", "sharper corners on the cards", "space it out", "tighter", "thinner borders".

The skill turns the phrase into ops (`kind` of `radius`, `padding`, `gap`, or `border-width`, with `shift: N` or `set: <token>`, optionally scoped to one component id), then runs `npx live-tokens adjust <ops.json>`. The CLI moves each matching alias along its ladder, reads the live config first so "a bit more" compounds, and prints every change and every skip.

It also knows where these edits go wrong: controls run out of room long before containers do, so a global compaction is one step and anything deeper is aimed at named containers; a pill needs more horizontal padding than a square-cornered control, not less; and content insets stop at `--space-4`, below which a relative "tighter" reports as clamped instead of writing.

Edits land in each affected component's `_working.json` buffer, which is what the running page reads, so save the open theme in the editor to keep them. `--dry-run` reports without writing, and the inverse op is the undo.

### `live-tokens-create-component`

Ask for something the catalogue lacks: "author a Rating component", "make my Chip component editable in the editor".

The skill covers the four-step recipe: the runtime `.svelte` file with its `:global(:root)` token block, the editor `.svelte` file exporting `allTokens` and its variant groups, the `registerComponent()` call, and the catalogue entry that keeps `live-tokens-pick-component` current. It carries the naming scheme, the token suffix vocabulary, the state model (component states such as selected and disabled are separate from interaction states such as hover), linked siblings, the public-imports rule, and the shipped `Toggle` as a worked example from runtime file to registration.

Verify the result:

```bash
npx @motion-proto/live-tokens check-component <id>
```

The validator checks the file layout, the `:global(:root)` block, the token-suffix vocabulary, the state-before-property rule, the no-raw-color-defaults rule, the public-imports rule, and the `registerComponent({ id })` call. Exit code 0 means the static contract is met. Use it after Claude generates a component, and as a pre-commit guard on hand-authored ones.

## How the editor ships changes to production

1. Edit on `/live-tokens/editor`, `/live-tokens/colors`, or `/live-tokens/components`. Edits sit in the working buffer (`_working.json`). **Save** in the Theme panel captures the buffer into the open theme at `<dataDir>/themes/{name}.json`.
2. **Adopt** the theme. It becomes the production theme, and its variables are baked into `tokens.generated.css` next to your authored `tokens.css`. Nothing else writes that file, so trying a look never changes what you ship.
3. `npm run build` bundles both as plain CSS. No editor code, no JSON lookups, no dev surfaces reach production.

## File ownership: what the plugin writes

Knowing which files the plugin touches matters when you upgrade the package or work in a repo you do not want overwritten. For how a saved look stays safe across upgrades while `tokens.css` holds the building blocks, see [TOKENS.md](./TOKENS.md).

**On `npm install` or `npm update`: nothing outside `node_modules/`.** There are no install hooks. Upgrading never touches `src/live-tokens/data/` or any other file in `src/`.

**The plugin writes in two places only:**

- `src/live-tokens/data/`, configurable through `live-tokens.config.json`.
- The CSS sidecars next to your `tokensCssPath`: `tokens.generated.css` and `fonts.css`.

**At dev-server startup it fills gaps and refreshes its own derived files, and overwrites no authored file:**

- `<dataDir>/themes/default.json`, the derived Default theme, regenerated when the shipped colors and type or a component default changes.
- `<dataDir>/themes/_active.json` and `_production.json`, written only when missing, and healed when they name a theme that no longer resolves.
- `<dataDir>/component-configs/{comp}/default.json`, regenerated from the component's `:global(:root)` block only when the `.svelte` source is newer than the existing file. It is a build artifact of the source, so do not hand-edit it.
- `tokens.generated.css` beside your `tokensCssPath`, rebaked from the production theme so a fresh checkout builds against the look you shipped.

**Editor actions rewrite these:**

- `<dataDir>/colors-and-type/_working.json` and `<dataDir>/component-configs/{comp}/_working.json`, the buffers, written as you edit and cleared when a theme you open does not carry them.
- `<dataDir>/themes/{name}.json`, on every Save and Save As in the Theme panel.
- `<dataDir>/colors-and-type/{name}.json` and `<dataDir>/component-configs/{comp}/{name}.json`, only when you save a preset by name.
- `tokens.generated.css` and `fonts.css`, regenerated from the production theme when you Adopt.

The plugin never writes your authored `tokens.css`. It holds defaults you are free to hand-edit, and the editor's overrides land in `tokens.generated.css`, which the app imports immediately after it.

The one exception is `themeFileApi({ autoMigrate: true })`. With it enabled, the dev server applies pending additive token migrations (new token names only) to `tokens.css` at startup and writes the file, so it keeps up with the package as you upgrade. The change shows up in git for review. Breaking migrations that rename or remove tokens are never applied automatically; run `npx live-tokens migrate` for those during a deliberate upgrade. The option is off by default. See [TOKENS.md](./TOKENS.md).

## License

MIT. Originally extracted from [RuneGoblin](https://www.runegoblin.com/).
