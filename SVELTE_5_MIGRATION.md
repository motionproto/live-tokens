# Svelte 5 migration — plan

This branch migrates `@motion-proto/live-tokens` from Svelte-4 source idioms
to Svelte 5 runes. Phase 1 (released as 0.4.0 on `main`) widened the peer
range so consumers on Svelte 5 + Vite 6/7 can install without
`--legacy-peer-deps`; this branch does the actual source migration so we
ship runes-mode components rather than relying on Svelte 5's legacy mode.

## Green bar

`src/components/__tests__/publicSurface.test.ts` (added in 0.4.0) pins the
consumer-facing contracts: event dispatch, slot rendering, two-way
binding, and mount lifecycle for every public component. Every step in
this plan must keep that file green.

## Codebase scale (counted on 0.4.0)

| signal | count |
| --- | --- |
| `.svelte` files | 101 |
| `export let` | 355 |
| `$:` reactive statements | 228 |
| `<slot>` | 60 |
| `createEventDispatcher` | 41 occurrences across 7 of the 17 public components |
| `$$slots` / `$$restProps` / `svelte:component` / `svelte:self` | 75 |
| `writable/readable/derived` (svelte/store) | 8 occurrences across 22 import sites |

Stores stay on `svelte/store`; they work in Svelte 5 unchanged. The
migration is purely component-shape (runes API).

## Sequence

**Step 1 — dev tooling swap (one commit).**
- Bump devDeps to a runes-capable toolchain:
  - `svelte` 4 → 5 (latest)
  - `@sveltejs/vite-plugin-svelte` 3 → 5 (vite 6) or 6 (vite 7) — pick to match the chosen vite major
  - `vite` 5 → 7
  - `svelte-check` 3 → 4
- Don't touch any `.svelte` source yet. Run `publicSurface.test.ts`.
  Expect failures: this is the canary. The failures tell us what
  behaviour silently differs in Svelte 5's legacy mode (modifiers, slot
  forwarding, `bind:` semantics). Fix surgically; do not rewrite.

**Step 2 — codemod sweep (one commit).**
- Run `npx sv migrate svelte-5` over `src/`. The migrator handles:
  - `export let foo` → `let { foo = default } = $props()`
  - simple `$: x = expr` → `let x = $derived(expr)`
  - `$$slots` / `$$restProps` → `$props().children` / rest
  - `<svelte:component this={Foo}>` → `<{Foo}>`
- Commit the raw codemod output before any hand fixes so the next commit's
  diff is exactly the human-judged part.

**Step 3 — hand fixes (multiple commits, grouped by category).**
- `$:` side-effect statements (not assignments) → `$effect(() => { … })`.
  Audit each one; some are derived-with-side-effects and should be split.
- `createEventDispatcher` → callback props. **Breaking change for
  consumers.** For each public component:
  1. Add a `oncamelcase: (payload) => void` prop alongside the existing
     event name.
  2. Keep dispatching the legacy event for one release (forward both)
     so consumers can migrate on their own schedule.
  3. Document in CHANGELOG.
- `<slot>` and `<slot name="foo">` → `{@render children?.()}` /
  `{@render foo?.()}`. Again, breaking for consumers; consider keeping a
  thin `<slot>` for one release if the runes compiler permits it inside a
  runes-mode component (it does not — slots and snippets don't coexist
  in the same file).

**Step 4 — store and overlay re-check.**
- `$editorState` subscriptions inside runes-mode components: confirm
  `$store` auto-subscription still applies (it does in Svelte 5).
- `cssVarSync` and `LiveEditorOverlay` are the highest-risk surfaces —
  they bridge iframe ↔ parent CSS-var writes. Re-run the overlay
  manually in a browser; `publicSurface.test.ts` doesn't cover them.

**Step 5 — release as 0.5.0 (or 1.0.0).**
- Slots → snippets and events → callbacks are a public API break. Either
  ship as `0.5.0` with a prominent "BREAKING" section in CHANGELOG, or
  use the occasion to cut `1.0.0`.
- Drop the legacy Svelte 4 peer: `svelte: ^5`. Keep `vite: ^5 || ^6 || ^7`
  if the chosen plugin version allows; otherwise narrow to the supported
  vite majors.

## What this branch does *not* do

- Doesn't touch the build / release workflow. Same `prepublishOnly`,
  same `npm pack` shape.
- Doesn't rewrite stores to runes. `writable()`/`derived()` stay; they're
  shared across the editor, overlay, and persistence layer and runes
  don't compose across files the way stores do.
- Doesn't touch CSS or design tokens. Style and token semantics are
  Svelte-version-independent.
