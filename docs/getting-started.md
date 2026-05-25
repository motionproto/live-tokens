# Getting started

This page gets you from zero to a live token edit in about five minutes.

## What you need

- Node 20 or later
- npm (or pnpm, yarn)
- A terminal and a browser

That's it. No Figma plugin, no account, no SaaS.

## Two ways to start

### A. Try the starter

The fastest path. Clone the repo as a working app, edit one home page,
keep everything else.

```bash
npx degit motionproto/live-tokens my-app
cd my-app
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). You'll see
a starter home page. Look at the **top-right corner** of the page:
there is a small pill labelled with the project name. That is the
Live Editor overlay.

### B. Install into an existing Svelte 5 + Vite app

Use this when you already have a project.

```bash
npm install @motion-proto/live-tokens
```

Wire the Vite plugin and the overlay in three places:

```ts
// vite.config.ts
import { themeFileApi } from '@motion-proto/live-tokens/vite-plugin';

export default defineConfig({
  plugins: [
    svelte(),
    themeFileApi({ tokensCssPath: 'src/system/styles/tokens.css' }),
  ],
});
```

```ts
// src/main.ts
import '@motion-proto/live-tokens/src/system/styles/tokens.css';
import { initEditorStore, initCssVarSync, initRouter } from '@motion-proto/live-tokens';

initCssVarSync();
initRouter();
initEditorStore();
```

```svelte
<!-- src/App.svelte -->
<script>
  import { LiveEditorOverlay } from '@motion-proto/live-tokens';
</script>

<LiveEditorOverlay />
<!-- your app -->
```

The README at the repo root has the longer version, including the
optional `live-tokens.config.json` for relocating where saved themes
live on disk.

## Your first edit

1. **Open the editor.** Click the pill in the top-right. It expands
   into a panel docked to the right of the page.
2. **Switch to Tokens.** The default view. You'll see tabs for
   *Palettes, Type, Spacing, Radius, Shadows, Overlays, Gradients,
   Columns*.
3. **Drag a palette base.** Open *Palettes*, pick **Brand**, drag the
   colour swatch or change the hex. The page behind the editor
   repaints as you drag.
4. **Save.** Click the file icon in the editor header, choose
   **Save as**, name the theme. You'll see the file appear in
   `src/live-tokens/data/themes/`.
5. **Reload the page.** Your saved theme is the active theme; the page
   comes back exactly as you left it.

## What you just changed

Every edit writes to CSS custom properties on `:root`. Components in
your app read those properties through `var(--...)` references. There
is no separate build step, no AST transform, no preprocessor doing
magic in the background. The page renders against plain CSS variables
that the editor swaps live.

When you eventually want to ship, the editor *promotes* a theme to
production: it writes the theme's variables into
`src/system/styles/tokens.generated.css` and your build bundles that
file alongside `tokens.css`. The editor itself never ships to
production.

## Where to go next

- **[Editing tokens](editing-tokens.md)**: a tour of every tab in the
  editor.
- **[Themes workflow](themes-workflow.md)**: save, switch, promote,
  manifests.
- **[Adding components](adding-components.md)**: the Claude skill
  walks you through making your own component editable.
- **[Token naming](token-naming.md)**: the naming pattern, so your
  custom components fit the system.

The chapters under **Reference** later in the sidebar cover the
internals (architecture, state machine, dev-server plugin). You do
not need any of them to use the editor.
