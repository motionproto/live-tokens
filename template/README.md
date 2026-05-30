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
- `src/App.svelte` — your routes. `<LiveTokensRouter>` adds the dev-only
  `/editor` (theme tokens) and `/components` (per-component aliases) routes.
- `src/system/styles/tokens.css` — your theme token vocabulary. The dev server
  writes edits here when you use the in-browser editor.
- `src/styles/site.css` — themed page typography. Yours to edit.

## Editing live

Run `npm run dev`, then click **Open Token Editor** on the home page (or visit
`/editor`). Changes persist to `src/system/styles/tokens.css` and the JSON under
`src/live-tokens/data/`. The editor is dev-only — `npm run build` ships plain
CSS variables and the components you used, nothing else.

## Adding components

The package ships ~25 editable components (Button, Card, Table, Dialog, …).
Import them from `@motion-proto/live-tokens/components/<Name>.svelte`. To author
your own editable component, install the Claude Code skills:

```bash
npx @motion-proto/live-tokens setup-claude
```
