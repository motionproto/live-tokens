# Bug: docs chapters fail to load in tarball consumers

Status: **fix implemented + locally verified, tarball re-verify pending publish.**
Implemented 2026-06-02 via the recommended generated-ES-module approach below
(version bumped to 0.28.1). Local gates pass: `check:docs-content`, `svelte-check`
(0 errors), full suite (2707 tests, incl. new `chapters.test.ts`), and
`npm pack --dry-run` confirms `content.generated.ts` + the `.md` sources ship.
Still open: publish 0.28.1 and re-verify `runegoblin-site` against the **tarball**
(see "Verify the fix" — a link test alone can't catch a source-vs-tarball break).

Observed 2026-06-02 in `runegoblin-site` on
`@motion-proto/live-tokens@0.28.0`. Latent since 0.27.0 (docs-from-package);
first exercised now because runegoblin is the first consumer to use the
package-owned `/docs` via the published tarball (live-tokens-online still
vendors its own docs page). Not introduced by 0.28.0.

## Symptom

In a consumer using the *installed* package, `/docs` renders the chapter
sidebar (Overview, Getting started, Editing tokens, Themes, Creating
components) and the intro, but selecting any chapter shows:

> Could not load chapter — Chapter not found: creating-components (expected at
> ./content/creating-components.md).

The package's own demo app (run from source) and a source-`npm link`ed consumer
both work. The break is source-vs-tarball.

## Root cause

`src/editor/docs/chapters.ts`:

- `chapters` is a **static** array → the sidebar always renders.
- bodies load via `docModules = import.meta.glob('./content/*.md', { query: '?raw', import: 'default' })`, and `loadChapter(id)` looks up `docModules['./content/${id}.md']`.

`import.meta.glob` and `?raw` are Vite **compile-time** transforms. Vite does
not expand them inside a pre-bundled `node_modules` dependency (esbuild
optimizeDeps doesn't process Vite-specific globs/queries), so `docModules` is
**empty** in a tarball consumer and every lookup misses. Source / `npm link`
consumption skips pre-bundling, which is why it worked during the 0.28.0
migration verify (link) and broke after switching runegoblin to `^0.28.0`.

Not a packaging problem: the five `.md` files DO ship — verified in
`node_modules/@motion-proto/live-tokens/src/editor/docs/content/`.

## Confirm first (one step)

In a consumer (e.g. runegoblin), add to `vite.config.ts`:
`optimizeDeps: { exclude: ['@motion-proto/live-tokens'] }`, restart dev, open
`/docs`, click a chapter. If it loads, the pre-bundling diagnosis is confirmed.
This is a *workaround*, not the fix (it pushes the burden onto every consumer).

## Repro

- Consumer: `/Users/mark/Documents/repos/runegoblin/runegoblin-site` (on
  `@motion-proto/live-tokens@0.28.0`). `npm run dev` →
  `http://localhost:5174/docs` → click "Creating components".
- Headless harness: `/tmp/rg-verify/drive.mjs` (playwright-core + system Chrome,
  no browser download). Docs use a hash router (`Docs.svelte` rewrites
  `chapter.md` → `#chapter`), so a chapter URL is `/docs#creating-components`.
  Add a step that visits it and asserts no "Could not load chapter".

## Fix (recommended): ship content as a plain ES module, not a Vite glob

Make chapter content transform-independent so it survives the dependency
boundary, following this repo's existing generated-artifact pattern
(`tokens.generated.css`, `sync:component-defaults` + a `check:` gate):

1. `scripts/sync-docs.mjs` reads `src/editor/docs/content/*.md` and writes
   `src/editor/docs/content.generated.ts`:
   ```ts
   export const docContent: Record<string, string> = {
     '01-overview': "…raw markdown…",
     'getting-started': "…",
     // …
   };
   ```
2. Rewrite `chapters.ts`: `import { docContent } from './content.generated'`;
   `loadChapter(id) => docContent[id] ?? throw`. Drop `import.meta.glob` / `?raw`.
3. Add `check:docs-content` (mirror `check:component-defaults`) so the generated
   file can't drift from the `.md` sources; run it in CI / prepack.
4. Keep the `.md` files as the authoring source; regenerate on change.

Alternatives, weaker: (a) document `optimizeDeps.exclude` as a consumer
requirement (per-consumer burden); (b) pre-build a docs bundle (heavier; the
package currently ships source).

## Scope / release

Affects every consumer using package-owned `/docs` from the published tarball.
Patch as **0.28.1**.

## Verify the fix

`npm link` the patched package into runegoblin (same way 0.28.0 was validated —
the dev server needs `server.fs.allow` for the out-of-root linked path; see
git history), run the harness against `/docs#<chapter>`, confirm chapters load.
Then publish 0.28.1 and re-verify runegoblin on the **tarball** (source-vs-tarball
is the whole point — a link test alone would not have caught this).
