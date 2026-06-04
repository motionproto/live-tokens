# Getting started

Scaffold a live token site in a moments. You need Node 20 or later, a
package manager (npm, pnpm, or yarn), and a browser. Open claude code in your repo and start building.

## Scaffold a new app

```bash
npm create @motion-proto/live-tokens@latest my-app
cd my-app
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). You get a
one-page Svelte + Vite app that depends on the published package, with the
editor wired up and the full component set ready to import.

`npx @motion-proto/live-tokens create my-app` runs the same scaffold without
the initialiser package.

### What the scaffold gives you

Every editable file lives under `src/` and is committed, so `npm install` and
version upgrades never touch your styles. The package code stays in
`node_modules`.

| Path | What it is |
|------|------------|
| `src/pages/Home.svelte` | The starter page. Replace it with your own content. |
| `src/App.svelte` | Your routes. `<LiveTokensRouter>` adds dev-only routes under a reserved `/live-tokens/*` namespace: `/live-tokens/editor`, `/live-tokens/components`, and `/live-tokens/docs`. |
| `src/system/styles/tokens.css` | Your base token vocabulary, hand-authored. |
| `src/styles/site.css` | Themed page typography, yours to edit. |

## Your first edit

1. Run `npm run dev` and open the home page.
2. Click **Open Token Editor**, or visit `/live-tokens/editor`. The editor opens beside
   the page.
3. Open **Palettes**, pick **Brand**, and change the base hex. The page
   repaints as you type.
4. Open the file menu and choose **Save as**. A theme appears as JSON under
   `src/live-tokens/data/themes/`.
5. Reload. Your saved theme is the active theme, so the page returns as you
   left it.

## What you just changed

Every edit sets a CSS custom property on `:root`. Your components read those
properties through `var(--...)`. There is no token build step and no
preprocessor rewriting your code: the page renders against plain CSS variables
the editor swaps live.

To ship, promote a theme to production in the editor. That bakes the theme's
variables into `src/live-tokens/data/tokens.generated.css`, which your build
bundles alongside `tokens.css`. The editor itself never reaches production.

Already have a Svelte 5 + Vite app? The
[README](https://github.com/motionproto/live-tokens#readme) covers installing
into an existing project.

## Where to go next

- **[Editing tokens](editing-tokens.md)**: a tour of the editor.
- **[Themes](themes-workflow.md)**: save, switch, and ship.
- **[Creating components](creating-components.md)**: make your own component
  editable.
