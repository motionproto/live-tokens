# Live Tokens

A starter Svelte + Vite site with a full design-token system and an in-browser editor.

## What you get

- **Design-token admin panel** at `/admin` (dev-only). Edit colors, typography, spacing, radii, shadows, and motion, and see the whole site update live.
- **Live editor overlay** pinned to the top-right of every page in dev. Opens the token editor in a side panel or floating window without leaving the page you're styling.
- **Page Source** button — jumps straight to the current page's Svelte file in VS Code (`vscode://` link).
- **Component library** at `/components`: Button, Card, Dialog, Badge, Tabs, Tooltip, Toggle, and more.
- **Token persistence**: each saved palette is a JSON file in `tokens/`. The active palette syncs into `src/styles/variables.css` on save, so production builds ship pure CSS.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173. The editor overlay sits in the top-right corner. Click **Editor** to expand it, or hit **Fullscreen** to jump to `/admin`.

## Layout

- `src/pages/Landing.svelte` — the welcome page (replace this with your site)
- `src/pages/Admin.svelte` — design-system editor
- `src/pages/ShowcasePage.svelte` — component showcase
- `src/components/` — the reusable components
- `src/showcase/` — the editor UI (tabs, palette editors, curve editor, backup browser)
- `src/lib/` — the overlay, router glue, token persistence, and color helpers
- `src/styles/variables.css` — the generated CSS variables (this is the source of truth at runtime)
- `tokens/` — persisted palette files; `_active.json` selects the palette loaded on dev, `_production.json` selects the palette synced to CSS

## How the editor ships changes to prod

1. Edit in `/admin` → the overlay writes to the active JSON file in `tokens/`.
2. When you promote a palette to "production", its variables are written into `src/styles/variables.css` and backed up under `src/styles/_backups/`.
3. `npm run build` bundles that CSS file as-is. No token-editor code or JSON lookups in the prod bundle.

## License

MIT. Originally extracted from RuneGoblin.
