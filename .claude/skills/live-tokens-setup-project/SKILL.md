---
name: live-tokens-setup-project
description: Install and wire @motion-proto/live-tokens into a Svelte 5 + Vite project (greenfield or existing). Covers the themeFileApi vite-plugin, main.ts boot sequence (initCssVarSync, initRouter, initColumnsOverlay, initEditorStore, initializeTheme), App.svelte overlay + route-based page mount, style imports, dev data folder layout, and live-tokens.config.json for relocating persisted data. Use when the user asks to install live-tokens, set up the package, bootstrap the editor surfaces, wire the persistence plugin, integrate live-tokens into an existing Svelte/Vite app, or get the dev server and /editor and /components routes running. Not for placing components on a page (see live-tokens-build-page) or authoring brand-new editable components (see live-tokens-add-component).
---

# Setting up @motion-proto/live-tokens in a project

This skill teaches how to bring a fresh or existing Svelte 5 + Vite project up to the point where the dev server boots cleanly, the editor overlay pins to every page, and the `/editor` and `/components` routes both load. After this is done, the user can author themes, edit per-component aliases, and (with the [[live-tokens-add-component]] skill) extend the system with new editable components.

## Greenfield shortcut

If the project doesn't exist yet, the package's own starter is the fastest path:

```bash
npx degit motionproto/live-tokens my-app && cd my-app && npm install && npm run dev
```

That clones the repo with `App.svelte`, `main.ts`, the router, and a placeholder `Home.svelte` already wired. Skip the rest of this skill — everything below is already done.

## Existing project: 5-step wire-up

The order matters. Each step assumes the previous one is in place.

### 1. Install the package

```bash
npm install @motion-proto/live-tokens
```

Peer requirements: Svelte ^5, Vite ^6 || ^7, sass ^1, svelte-preprocess ^6.

### 2. Add the vite plugin

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { themeFileApi } from '@motion-proto/live-tokens/vite-plugin';

export default defineConfig({
  plugins: [
    svelte(),
    themeFileApi({
      tokensCssPath: 'src/system/styles/tokens.css',
    }),
  ],
});
```

`themeFileApi` hosts the `/api/live-tokens/{themes,component-configs,manifests}/*` routes the editor saves through, seeds defaults on first dev-server start, and auto-injects `__PROJECT_ROOT__` + `__LIVE_TOKENS_API_BASE__` for the overlay.

### 3. Bootstrap main.ts

```ts
import '@motion-proto/live-tokens/app/tokens.css';
import '@motion-proto/live-tokens/app/fonts.css';   // optional: Fraunces + Manrope @font-face
import {
  configureEditor,
  initializeTheme,
  initCssVarSync,
  initRouter,
  initColumnsOverlay,
  initEditorStore,
} from '@motion-proto/live-tokens';
import App from './App.svelte';
import { mount } from 'svelte';

configureEditor({ storagePrefix: 'my-app-' });   // namespaces sessionStorage keys

async function boot() {
  initCssVarSync();         // first — other init*() read CSS vars it manages
  initRouter();             // before mount(App) so the route store is populated at first paint
  initColumnsOverlay();
  initEditorStore();
  if (import.meta.env.DEV) {
    await initializeTheme(); // dev only — prod bakes the theme into tokens.generated.css
  }
  mount(App, { target: document.getElementById('app')! });
}

boot();
```

`configureEditor` is optional. If you call it, do so before any `init*()` so the storage prefix is in place before the editor store reads sessionStorage.

### 4. Wire App.svelte: overlay + route-based mount

```svelte
<script lang="ts">
  import { LiveEditorOverlay, ColumnsOverlay } from '@motion-proto/live-tokens';
  import Editor from '@motion-proto/live-tokens/editor';
  import ComponentEditorPage from '@motion-proto/live-tokens/component-editor-page';
  import { route } from '@motion-proto/live-tokens';
  import Home from './Home.svelte';
</script>

<LiveEditorOverlay
  navLinks={[
    { path: '/', label: 'Home', icon: 'fa-home' },
    { path: '/components', label: 'Components', icon: 'fa-puzzle-piece' },
  ]}
  pageSources={{
    '/': 'src/Home.svelte',
  }}
/>
<ColumnsOverlay />

{#if $route === '/editor'}
  <Editor />
{:else if $route === '/components'}
  <ComponentEditorPage />
{:else if $route === '/'}
  <Home />
{/if}
```

- `<LiveEditorOverlay />` **self-gates**: it only renders in dev, never inside an iframe, and never on the editor route. Don't wrap in `{#if import.meta.env.DEV}` — that breaks the iframe check.
- The `pageSources` map drives the overlay's "Page Source" button. Add an entry for each non-editor route so contributors can open the file in VS Code with one click.
- The static `{#if}` chain shown here is the simplest first-boot pattern. As you add pages (especially pages that import their own CSS), switch to dynamic `import()` per route so each page's side-effect CSS only evaluates when visited. See [[live-tokens-build-page]] for the upgrade.

### 5. Add an entry HTML

Standard Vite — nothing live-tokens-specific:

```html
<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>my app</title></head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

## Where data lands

By default the plugin reads and writes under `src/live-tokens/data/` (subfolders `themes/`, `manifests/`, `component-configs/`). To move it, create `live-tokens.config.json` at the project root:

```json
{ "dataDir": "src/live-tokens/data" }
```

All four keys (`dataDir`, `themesDir`, `manifestsDir`, `componentConfigsDir`) are optional. `dataDir` relocates all three subfolders; per-folder overrides exist for monorepo cases where one folder is shared across packages. The dev server reads this file once at startup — restart vite to pick up changes.

**Commit the data folder.** Themes, manifests, and component-configs are first-class project artifacts that the editor reads on next boot, so they belong in version control. The only files worth ignoring are editor scratch files if you ever introduce any — none ship today.

## Optional styles

Two style imports for `main.ts`, each independent:

```ts
import '@motion-proto/live-tokens/app/fonts.css';            // Fraunces + Manrope @font-face
import '@motion-proto/live-tokens/app/tokens.generated.css'; // editor's production-theme sidecar
```

`tokens.generated.css` is plugin-managed; the editor regenerates it on theme promote. Never hand-edit.

A third optional stylesheet, `@motion-proto/live-tokens/app/site.css`, ships themed `h1` / `p` / `a` rules for page typography. Do **not** import it from `main.ts` — that would leak its global rules into editor routes. Import it from each page's `<script>` block instead. See [[live-tokens-build-page]] for the pattern.

Editor chrome (`ui-editor.css`, `ui-form-controls.css`) and the FontAwesome icon font are **auto-loaded by the editor pages themselves**. You do not import them.

## Verification

After running `npm run dev`, this is the contract:

- [ ] Dev server boots without errors.
- [ ] `/` renders your starter page; the editor overlay appears pinned top-right.
- [ ] `/editor` loads the theme editor. Saving a colour writes a file under `<dataDir>/themes/`.
- [ ] `/components` loads. Built-in components appear in the nav rail; the **CUSTOM** group is empty until you use [[live-tokens-add-component]].
- [ ] The overlay's "Page Source" button opens your `Home.svelte` in VS Code (if `code` CLI is installed).
- [ ] After first dev-server start, `<dataDir>/themes/default.json` exists, and each shipped component has its own `<dataDir>/component-configs/<comp>/default.json`.
- [ ] `npm run build` succeeds (production strips all editor code).

If any check fails, the most likely culprits are: missing `themeFileApi` in vite.config (no `/api/live-tokens/*` routes), missing `initCssVarSync()` call (overlay opens but token edits don't repaint), or mounting `App` before `initRouter()` (route store is uninitialised at first paint).
