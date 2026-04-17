# Live Tokens

A Svelte + Vite design-token system with an in-browser editor. Ships two ways:

1. **Starter** — clone the repo, replace `Home.svelte` with your app, edit tokens live.
2. **Library** — `npm install @motion-proto/live-tokens` into an existing Svelte app and import the overlay + editor.

Both modes are supported and maintained together.

## What you get

- **Design-token admin panel** at `/admin` (dev-only). Edit colors, typography, spacing, radii, shadows, and motion; the whole site updates live.
- **Live editor overlay** pinned to the top-right in dev. Opens the editor in a side panel or floating window without leaving the page you're styling.
- **Page Source** button — jumps straight to the current page's Svelte file in VS Code (`vscode://` link).
- **Component library** at `/components`: Button, Card, Dialog, Badge, Tabs, Tooltip, Toggle, and more. Extendable with your own sections.
- **Theme persistence**: each saved palette is a JSON file in `themes/`. The active palette syncs into `src/styles/tokens.css` on save, so production builds ship pure CSS — no editor code or JSON lookups in the prod bundle.

## Use as a starter

```bash
npx degit motionproto/live-tokens my-app
cd my-app
npm install
npm run dev
```

Open http://localhost:5173. Replace `src/pages/Home.svelte` with your own landing page. Keep or delete `src/pages/KitDemo.svelte` (the `/kit` route) depending on whether you want the demo around as a reference.

### Starter layout

- `src/pages/Home.svelte` — your app's `/` route. **Replace this with your content.**
- `src/pages/KitDemo.svelte` — `/kit` route. Marketing/demo page for the kit itself. Safe to delete once you don't need it.
- `src/pages/Admin.svelte` — `/admin` route. Design-system editor.
- `src/pages/ShowcasePage.svelte` — `/components` route. Component browser.
- `src/App.svelte` — top-level router + overlay wiring.
- `src/components/` — reusable components.
- `src/showcase/` — editor UI (tabs, palette editors, curve editor, backup browser).
- `src/lib/` — overlay, router, token persistence, color helpers.
- `src/styles/tokens.css` — the generated CSS variables (source of truth at runtime).
- `themes/` — persisted theme files. `_active.json` = theme loaded on dev. `_production.json` = theme synced to CSS on "promote."

### How the editor ships changes to prod (starter)

1. Edit in `/admin` → the overlay writes to the active theme file in `themes/`.
2. Promote a theme to "production" → its variables are written into `src/styles/tokens.css` and backed up under `src/styles/_backups/`.
3. `npm run build` bundles that CSS file as-is.

## Use as a library

Install into an existing Svelte 4 + Vite project:

```bash
npm install @motion-proto/live-tokens
```

### Wire it into your Vite config

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { themeFileApi } from '@motion-proto/live-tokens/vite-plugin';

export default defineConfig({
  plugins: [
    svelte(),
    themeFileApi({
      themesDir: 'themes',
      tokensCssPath: 'src/styles/tokens.css',
    }),
  ],
  optimizeDeps: {
    exclude: ['@motion-proto/live-tokens'],
  },
});
```

The `themeFileApi` plugin:
- Seeds `themes/` with a default theme on first dev-server start.
- Hosts the `/api/*` routes the editor uses to save/load themes.
- Auto-injects `__PROJECT_ROOT__` so the overlay's "Page Source" link can open files in VS Code. You don't need a `define` entry for this.

### Bootstrap in `main.ts`

```ts
import { configureEditor, initializeTheme } from '@motion-proto/live-tokens';
import App from './App.svelte';

configureEditor({ storagePrefix: 'my-app-' });

async function boot() {
  if (import.meta.env.DEV) {
    await initializeTheme();
  }
  new App({ target: document.getElementById('app')! });
}

boot();
```

### Mount the overlay + admin route

```svelte
<!-- App.svelte -->
<script lang="ts">
  import { LiveEditorOverlay, ColumnsOverlay } from '@motion-proto/live-tokens';
  import Admin from '@motion-proto/live-tokens/admin';
  import { route } from './router';
</script>

<LiveEditorOverlay
  navLinks={[
    { path: '/', label: 'Home', icon: 'fa-home' },
    { path: '/components', label: 'Components', icon: 'fa-puzzle-piece' },
  ]}
  pageSources={{
    '/': 'src/pages/Home.svelte',
    '/components': 'src/pages/ComponentsPage.svelte',
  }}
/>
<ColumnsOverlay />

{#if $route === '/admin'}
  <Admin />
{:else}
  <!-- your routes -->
{/if}
```

`<LiveEditorOverlay />` self-gates: it only renders in dev, never inside an iframe, and never when the user is on `editorPath` (defaults to `/admin`). You don't need to wrap it in `{#if import.meta.env.DEV}` guards.

### Styles

```ts
// main.ts — or wherever you import global styles
import '@motion-proto/live-tokens/styles/editor.css';
import '@motion-proto/live-tokens/styles/form-controls.css';
import '@motion-proto/live-tokens/styles/fonts.css';
```

### Add your own components to the showcase

```svelte
<!-- src/pages/ComponentsPage.svelte -->
<script lang="ts">
  import { ComponentsTab, defaultSections, type ComponentSection } from '@motion-proto/live-tokens/components';
  import '@motion-proto/live-tokens/styles/editor.css';
  import MyWidgetDemo from '../components/MyWidgetDemo.svelte';

  const mySections: ComponentSection[] = [
    { id: 'myWidget', label: 'My Widget', component: MyWidgetDemo },
  ];
  const allSections = [...defaultSections, ...mySections];
</script>

<ComponentsTab sections={allSections} />
```

## Publishing

The package is published to npm as `@motion-proto/live-tokens`.

1. Bump the version in `package.json`.
2. Verify the tarball contents: `npm pack --dry-run`.
3. `npm publish --access public` — `prepublishOnly` rebuilds `dist-plugin/`.
4. Tag and push: `git tag v0.2.0 && git push origin main --tags`.

**What ships:**

- `src/lib/`, `src/showcase/`, `src/components/`
- `src/pages/Admin.svelte` + `Admin.svelte.d.ts`
- `src/showcase/editor.css`, `src/styles/form-controls.css`, `src/styles/fonts.css`, `src/styles/fonts/`
- `dist-plugin/` — compiled Vite plugin

**What doesn't ship** (starter-only): `src/App.svelte`, `src/main.ts`, `src/pages/Home.svelte`, `src/pages/KitDemo.svelte`, `src/pages/ShowcasePage.svelte`, `index.html`, `themes/`.

## License

MIT. Originally extracted from RuneGoblin.
