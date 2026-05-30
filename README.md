# Live Tokens

A foundational design system for quickly styling and building Svelte + Vite microsites. **Edit your tokens and components in real time** — colors, typography, spacing, per-component aliases — and see the site update as you drag the slider. Save the result as a portable configuration you can carry from project to project.

`npm install @motion-proto/live-tokens` into your app — install once, style fast. The editor is dev-only; production builds get plain CSS variables and your chosen components, nothing else.

## What you get

- **Real-time token editing.** Pick a color, drag a hue slider, retype a font size — the page repaints on every input event via CSS-variable writes. No reload, no save-and-refresh, no build step. Works across colors, typography, spacing, radii, shadows, motion, palettes, and gradients.
- **Real-time component editing.** Each of ~24 shipped Svelte components (Button, Input, Card, Dialog, Badge, Callout, Table, Tooltip, Toggle, TabBar, SegmentedControl, RadioButton, MenuSelect, ProgressBar, CornerBadge, SectionDivider, CollapsibleSection, Notification, Image, ImageLightbox, CodeSnippet, SideNavigation, and more) declares its own design-token aliases in a `:global(:root)` block. Rewire any alias from a per-component picker and see that component update everywhere it's used — live, on your real pages, not in a Storybook sandbox.
- **Theme editor** (`/editor` route, dev-only) — the home of real-time token editing. Save themes to disk as JSON, promote one to "production" to bake it into a static `tokens.css` for the build.
- **Per-component editor** (`/components` route, dev-only) — the home of real-time component-alias editing. Pick token aliases per component without writing CSS.
- **Live editor overlay** — pins to the top-right of every dev page. Opens the editor in a side panel or floating window so you edit *on the page you're styling*, not in a separate tab. Includes a "Page Source" button that opens the current page's `.svelte` file in VS Code.
- **Preset bundles** — capture a whole site configuration (active theme + every component's active config) as a single portable artifact. Drop a preset into a new project to restore the full styling in one step.
- **Vite plugin** — hosts the `/api/live-tokens/{themes,component-configs,manifests}/*` routes that persist your edits to disk as you make them. The single namespace keeps live-tokens' routes from colliding with anything your app serves under `/api`.
- **Claude Code skill suite** — three bundled skills so you can drive the package in plain English. `build-page` composes pages from the shipped components. `pick-component` decides between confusing pairs (TabBar vs SegmentedControl, Card vs CollapsibleSection). `create-component` authors a new editable component against the project's naming, state-model, and import rules. One command to install all three: `npx @motion-proto/live-tokens setup-claude`. See [Claude Code skills](#claude-code-skills) below.

## Quick install

```bash
npm install @motion-proto/live-tokens
```

### Vite config

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { themeFileApi } from '@motion-proto/live-tokens/vite-plugin';

export default defineConfig({
  plugins: [
    // vitePreprocess compiles the shipped components' `<style lang="scss">`
    // blocks — install `sass` alongside it.
    svelte({ preprocess: vitePreprocess() }),
    themeFileApi({
      tokensCssPath: 'src/system/styles/tokens.css',
    }),
  ],
});
```

The `themeFileApi` plugin:
- Seeds `src/live-tokens/data/themes/` with a default theme on first dev-server start.
- Discovers components at `src/components/*.svelte` (and `src/system/components/*.svelte` for back-compat) and seeds `src/live-tokens/data/component-configs/{comp}/default.json` from each component's `:global(:root)` block.
- Hosts the `/api/live-tokens/*` routes the editor uses to save and load themes + per-component configs.
- Auto-injects `__PROJECT_ROOT__` for the overlay's "Page Source" link and `__LIVE_TOKENS_API_BASE__` so the client uses whatever `apiBase` you configured.

### Where data lands — and how to move it

By default, the plugin reads and writes under one folder: `src/live-tokens/data/`. Inside that folder live three subdirectories — `themes/`, `manifests/`, `component-configs/` — each owned by the plugin.

To move them, create a `live-tokens.config.json` at your project root:

```json
{
  "dataDir": "src/live-tokens/data"
}
```

All four keys are optional. `dataDir` is the headline knob — it relocates all three subfolders at once. The per-folder overrides exist for unusual layouts (e.g. a monorepo where themes are shared across packages but component-configs aren't):

```json
{
  "dataDir": "src/live-tokens/data",
  "themesDir": "../shared/themes",
  "componentConfigsDir": "src/live-tokens/data/component-configs",
  "manifestsDir": "src/live-tokens/data/manifests"
}
```

Resolution order, per folder: explicit `themeFileApi(opts)` argument > matching key in `live-tokens.config.json` > `<dataDir>/<sub>`. The dev server reads the file once at startup — restart vite to pick up changes.

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

`bootLiveTokens` orchestrates the editor's idempotent init hooks, fetches the
active theme in dev, optionally registers consumer-authored components, and
mounts the app. FontAwesome is side-effect-imported by the bootstrap (the dev
overlay always needs icons). The three token-CSS imports stay with the
consumer because order matters and `tokens.generated.css` is project-local.

Pass `components` to register consumer-authored editable components:

```ts
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

`<LiveTokensRouter>` owns the dev overlay (`<LiveEditorOverlay>` +
`<ColumnsOverlay>`), the editor routes (`/editor`, `/components`), the
in-app link-click interception, and the nav-rail/page-source plumbing the
overlay needs. Each entry in `pages` is one of your routes; entries with a
`label` appear in the overlay's nav rail. Pass pages as `lazy: () => import('./Page.svelte')`
so each page's stylesheet side-effects only evaluate when that route is
visited; pass `component: PageComponent` instead for an eagerly-imported
page. The editor routes are dispatched internally, so you don't have to
dynamic-import the library's editor pages yourself.

You can also relocate or disable a default editor route via the
`editorRoutes` prop: `<LiveTokensRouter pages={…} editorRoutes={{ editor: '/admin/editor', components: false }} />`.
Pass a string to move a route; pass `false` to remove the route entirely
(no dispatch and, for `components`, no auto-injected nav-rail entry).

The whole overlay surface is dev-only and tree-shakes out of production
builds — no `{#if import.meta.env.DEV}` guards needed.

### Lower-level API (when you need it)

`bootLiveTokens` and `<LiveTokensRouter>` are convenience wrappers. The
individual init functions (`initCssVarSync`, `initRouter`,
`initColumnsOverlay`, `initEditorStore`, `initializeTheme`),
`<LiveEditorOverlay>`, `<ColumnsOverlay>`, and the editor page exports
(`@motion-proto/live-tokens/editor`,
`@motion-proto/live-tokens/component-editor-page`) all stay exported. Use
them directly if you need a custom shell or non-standard route dispatch.

### Use components

```svelte
<script lang="ts">
  import Button from '@motion-proto/live-tokens/components/Button.svelte';
  import Callout from '@motion-proto/live-tokens/components/Callout.svelte';
</script>

<Callout variant="info">Read this.</Callout>
<Button variant="primary">Save</Button>
```

The components carry their own design-token aliases (declared inside each `.svelte` file). They'll pick up your `tokens.css` overrides automatically. Strip out the ones you don't use; nothing is forced.

### Styles

Editor chrome (`ui-editor.css`, `ui-form-controls.css`) and the icon font are
**auto-loaded by the editor pages themselves**; you don't import them. The
only stylesheet a consumer needs is a `tokens.css` declaring the design-token
CSS variables on `:root`.

You can use the package's default as a starting point:

```ts
import '@motion-proto/live-tokens/app/tokens.css';
import '@motion-proto/live-tokens/app/site.css';   // optional: themed h1/p/a styles
import '@motion-proto/live-tokens/app/fonts.css';  // optional: Fraunces + Manrope @font-face
```

…or copy `node_modules/@motion-proto/live-tokens/src/system/styles/tokens.css` into
your project and edit. The editor will seed `themes/default.json` on first
run and you can promote your edits back into the file.

## Consuming live-tokens from scratch

The minimum a consumer needs after `npm install @motion-proto/live-tokens`:

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

No `css: 'injected'` workaround, no `optimizeDeps` excludes — `vite build` works as-is. (You'll want the full `themeFileApi` plugin and `bootLiveTokens` / `<LiveTokensRouter>` from the Quick install section above when you're ready to persist edits to disk and ship a real app.)

## Greenfield? Scaffold a new app

If you're starting from scratch, skip the manual wiring:

```bash
npx @motion-proto/live-tokens create my-app
cd my-app
npm install
npm run dev
```

This generates a Svelte + Vite app that **depends on** the package — `vite.config.ts`, `main.ts`, `App.svelte`, the `themeFileApi` plugin, and a placeholder `src/pages/Home.svelte` are all pre-wired. The token CSS is seeded from the version you scaffolded against, so it never drifts. Open http://localhost:5173 and replace `Home.svelte` with your content; upgrade the package later with `npm update`.

(The older `npx degit motionproto/live-tokens` route cloned this whole repo as your app — the package's source, tests, and all. `create` gives you a thin consumer app instead.)

## Consumer-authored components

The shipped components are first-party by default, but you can author your own and get the same real-time editing experience. Co-locate runtime and editor files in `src/components/` (or `src/system/components/`, both are scanned by default) and pass them to `bootLiveTokens`:

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

(`bootLiveTokens` calls `registerComponent` internally for each entry, gated on `import.meta.env.DEV` so the registration tree-shakes out of production builds. Call `registerComponent` directly if you need finer control over timing.)

The component appears in the `/components` page under a **CUSTOM** group in the nav rail. Token rows, linked-block sharing, per-component config persistence, and reset-to-default work identically to the built-in set. All imports must come from `@motion-proto/live-tokens` or `@motion-proto/live-tokens/component-editor`; never deep-import from `src/`.

## Claude Code skills

The package ships a suite of Claude Code skills that encode the project's conventions so Claude can drive the package in plain English. They cover the three jobs the README itself can't carry well: deciding which shipped component fits a need, composing a page from the catalogue, and (for the long-tail case) authoring a new editable component. Each skill auto-triggers from natural-language requests — no slash commands. (Plain `npm install` plus the README handle first-time setup.)

| Skill                          | Triggers on                                                          | What it knows                                                                                                                  |
|--------------------------------|----------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| `live-tokens-build-page`       | "build a pricing page using live-tokens components"                  | shipped-component catalogue, column grid, `pageSources` registration, token-only styling rule                                   |
| `live-tokens-pick-component`   | "what's the difference between TabBar and SegmentedControl?"         | decision tables for each confusable family (selection, container, messaging, on/off); when to author a new one instead         |
| `live-tokens-create-component` | "author a new Toggle component for my live-tokens project"           | runtime + editor + `registerComponent()` recipe, naming scheme, state model, public-imports rule, verification checklist        |

### Install

```bash
npx @motion-proto/live-tokens setup-claude
```

Copies every bundled skill into `./.claude/skills/` in the current directory. Re-run after upgrading the package to pick up new or updated skills (pass `--force` to overwrite). macOS/Linux only.

If you'd rather avoid the CLI, the equivalent one-liner:

```bash
mkdir -p .claude/skills && cp -R node_modules/@motion-proto/live-tokens/.claude/skills/. .claude/skills/
```

### Validate authored components

The same CLI ships a static validator that turns the `create-component` skill's verification checklist into a runnable command:

```bash
npx @motion-proto/live-tokens check-component <id>
```

It enforces the file layout, `:global(:root)` block, token-suffix vocabulary, the state-before-property rule, the no-raw-colour-defaults rule, the public-imports rule, and the `registerComponent({ id })` call. Exit code 0 means the static contract is met. Useful both as a self-check after Claude generates a component and as a pre-commit guard on human-authored ones.

## How the editor ships changes to prod

1. Edit in `/editor` or `/components`. Saves write to `<dataDir>/themes/{name}.json` and `<dataDir>/component-configs/{comp}/{name}.json`.
2. Promote a theme to "production." Its variables are written into `tokens.generated.css` next to your authored `tokens.css`.
3. `npm run build` bundles both as plain CSS. No editor code, no JSON lookups, no dev surfaces ship to prod.

## File ownership — what the plugin writes

Knowing which files the plugin touches matters when upgrading the package or working in a repo you don't want overwritten.

**On `npm install` or `npm update`: nothing outside `node_modules/`.** No install hooks. Upgrading versions never touches your `src/live-tokens/data/`, or any file in `src/` outside it.

**The plugin only writes inside two locations on disk:**

- `src/live-tokens/data/` (configurable via `live-tokens.config.json` — see "Where data lands").
- The CSS sidecars next to your `tokensCssPath` (`tokens.generated.css`, `fonts.css`).

It never writes to your project root, your `src/` outside the data folder, or anywhere else.

**At dev-server startup, the plugin only fills gaps — it never overwrites authored files:**

- `<dataDir>/themes/default.json` — written **only if missing**.
- `<dataDir>/themes/_active.json` and `_production.json` — written **only if missing**.
- `<dataDir>/component-configs/{comp}/_active.json` and `_production.json` — same: only if missing.
- `<dataDir>/component-configs/{comp}/default.json` — regenerated from the component's `:global(:root)` block **only when the `.svelte` source is newer than the existing default**. This file is a build artifact of the source; don't hand-edit it.

**At dev-time editor actions, these files get rewritten by your explicit save/promote:**

- `<dataDir>/themes/{name}.json` — every save in the editor.
- `<tokensCssPath sibling>/tokens.generated.css` — fully regenerated when you save or promote the production theme.
- `<tokensCssPath sibling>/fonts.css` — same rule: regenerated from the theme's font sources.
- `<dataDir>/component-configs/{comp}/{name}.json` — every save of a per-component config.

The developer-authored `tokens.css` itself is **never written** by the plugin — it holds defaults you're free to hand-edit. The editor's overrides land in the sidecar `tokens.generated.css`, which the package imports immediately after `tokens.css`.

## License

MIT. Originally extracted from [RuneGoblin](https://www.runegoblin.com/).
