# __APP_NAME__

Scaffolded with [`@motion-proto/live-tokens`](https://github.com/motionproto/live-tokens).

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## What you have

This project follows the package's [recommended layout](https://github.com/motionproto/live-tokens#recommended-project-layout): all editable state lives under `src/` and is committed, so `npm install` and upgrades never touch your styles.

- `src/pages/Home.svelte` — the starter page. Replace it with your own content.
- `src/App.svelte` — your routes. `<LiveTokensRouter>` adds dev-only routes under
  a reserved `/live-tokens/*` namespace (so they never collide with your pages):
  `/live-tokens/editor` (theme tokens), `/live-tokens/components` (per-component
  aliases), and `/live-tokens/docs` (the user guide).
- `src/system/styles/tokens.css` — your theme token vocabulary. Hand-authored
  and yours; the editor reads it but never writes it.
- `src/styles/site.css` — themed page typography. Yours to edit.

## Editing live

Run `npm run dev`, then click **Open Token Editor** on the home page (or visit
`/live-tokens/editor`). Edits live in the JSON under `src/live-tokens/data/`:
Save keeps them in a theme, and Adopt writes the theme into
`src/live-tokens/data/tokens.generated.css`, the file your built site ships.
The editor is dev-only — `npm run build` ships plain CSS variables and the
components you used, nothing else.

## Adding components

The package ships ~25 editable components (Button, Card, Table, Dialog, …).
Import them from `@motion-proto/live-tokens/components/<Name>.svelte`. To author
your own editable component, install the Claude Code skills:

```bash
npx @motion-proto/live-tokens setup-claude
```

## Testing a component or a page

`npm run test:design` runs `check-component --tests` and `check-page --tests`:
the static checks plus the registry contract, the component contract suites,
and a page's own rendered output, in a browser, against this project.
Playwright, Vitest, and happy-dom are installed; the browser is a one-time
download:

```bash
npx playwright install chromium
```

`live-tokens.testing.ts` names the two files the component run reads:
`src/registerComponents.ts` registers your components, and `tests/contracts.ts`
holds one contract per component, which is what the browser suites drive. The
create-component skill writes both.

`check-page --tests` needs nothing declared: it opens each page named in
`src/App.svelte`'s `pages` object at its own route, and proves that every
shipped component instance paints from its semantic properties, every run of
text sits in one shipped text style, every text and surface pair meets AA,
sections sit on the page grid, and nothing overflows.

A failing run leaves its report under `test-results/`, gitignored.
