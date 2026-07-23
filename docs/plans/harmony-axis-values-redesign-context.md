# Context handoff: harmony "axis values" redesign

Written 2026-07-23 for a fresh planning session. This is **context, not a plan** — the next session should turn the "Target model" below into a wave-by-wave implementation plan (in the style of `harmony-axis-order.md`), then execute.

## TL;DR

The just-shipped `harmonyOrder` feature models harmony as a **dense ordered list of color families**, where the wheel handles *are* the families. The user wants to invert that: harmony becomes **four axes that each own a hue**, independent of colors, and colors **bind live** to an axis. This is a redesign of the harmony core (engine + wheel + persistence), scoped deliberately small.

## Where the code is now

- `main` @ `3fe4be9` — merge of `light-first-theming` (the `harmonyOrder` feature, Waves 1–4 + UI iterations). Green: `npm run check` 0 errors, `npm test` 3044 passing. This is the baseline to build the redesign on.
- Branch `harmony-axes-ui-experiment` holds throwaway UI iterations (slot/plug/divider list) built on the **old** dense-list model. Useful only as a loose visual reference for the slot/plug/swatch direction; **do not build on it** — the data model underneath is wrong for the target. Safe to delete once the redesign lands.
- Original plan doc: `docs/plans/harmony-axis-order.md` (the shipped feature's spec, incl. the corrected priority-ordered slot table and global invariants — still the reference for the harmony math).

### What `harmonyOrder` is today (the thing being replaced)

`harmonyOrder: string[]` — an ordered, contiguous list of eligible color families (default `['Brand','Accent','Background']`). Semantics: slot 0 = anchor; each listed family is re-hued onto the harmony geometry relative to the anchor. It is the single source of truth for which families the wheel shows handles for and which participate when a harmony mode is applied.

Files that read/write it (all must be revisited):

- `src/editor/core/palettes/colorHarmony.ts` — `harmonyHues(mode, anchorHue, slotCount)` (the per-mode slot table, **already generalized to 4 slots** and tested — keep this), `applyHarmony(mode, palettes, order)`, `tintNeutralsFromAnchor`, `sanitizeHarmonyOrder`, `DEFAULT_HARMONY_ORDER`, `HARMONY_ELIGIBLE`.
- `src/editor/core/store/editorTypes.ts` — `EditorState.harmonyOrder: string[]`.
- `src/editor/core/themes/themeTypes.ts` — `Theme.harmonyOrder?: string[]` (persisted, additive).
- `src/editor/core/store/editorStore.ts` — `emptyState()` seed, `loadFromFile` (sanitize), `toTheme` (serialize).
- `src/editor/ui/colors/paletteBaseColor.ts` — `setHarmonyOrder(order)` (the single store write path).
- `src/editor/ui/colors/ColorWheel.svelte` — derives handles/ghosts/global-rotate/per-axis-drag from `harmonyOrder`; per-axis drag writes the **family's** `baseColor.h`.
- `src/editor/ui/colors/ColorsTab.svelte` — `applyMode`, swatch "on the wheel" dot, renders `<HarmonyAxesList/>`.
- `src/editor/ui/colors/HarmonyAxesList.svelte` — the list UI (will be rewritten).
- Tests: `colorHarmony.test.ts`, `editorStore.test.ts`.

## Why we're changing it

Through use, the user reframed the mental model. The current model treats a wheel handle as a family's hue. The target model treats a wheel handle as an **axis** (a harmonic position with its own hue) to which a family may or may not be bound. This makes harmony an **optional group-editing tool** ("edit groups of colors instead of individually"), usable even with no colors attached.

## Target model (agreed with the user — build exactly this)

1. **Four axes** — Anchor, Secondary, Tertiary, Quaternary — each carries a **hue** that persists in the theme. A harmony mode arranges the four hues geometrically (reuse the existing `harmonyHues` slot table); the user can also nudge an individual axis on the wheel (the existing mode-vs-custom mechanic, generalized to axes that may have no bound color).
2. **The axes list shows all four**, each with a **swatch of its current hue** — visible even when nothing is bound, so the user previews "what a dropped color would become."
3. **Dropping a color onto an axis binds it**: the color adopts the axis hue and stays **live-bound** — moving the axis (dragging its handle, or re-rolling the harmony/mode) moves every bound color with it, preserving the relationship.
4. **Dragging a color to Unassigned unbinds it**: it floats free again; the axis keeps its hue.
5. **Default** keeps today's setup so nothing regresses: Brand→Anchor, Secondary→Accent, Tertiary→Background bound at their current hues; Quaternary empty; Special unassigned.

Explicitly kept minimal: no per-slot preview machinery beyond the swatch, no auto-fill/auto-sort of slots, no new theme tokens.

## Key design decisions to resolve in planning

1. **Data shape.** `harmonyOrder: string[]` → something like `harmonyAxes: { hue: number; family: string | null }[]` (length ≤ 4), or a parallel `axisHues: number[]` + `axisFamilies: (string|null)[]`. Pick one; name it (`harmonyOrder` → `harmonyAxes` reads better). This is the crux; everything else follows.
2. **Live-binding mechanism.** When bound, is the family's `baseColor.h` the source of truth, the axis hue the source, or are they kept in sync? Whatever the choice, writes must go through the store `mutate`/`transaction` path and respect the iframe CSS-var fan-out (writes hit both self and parent `:root` via `cssVarSync` — see the project's cssvar-fanout note). Rotating an axis must update all bound families' hues in one mutation (one undo step).
3. **Axis hue when unbound.** An axis with no color still needs a hue for its swatch and wheel handle. Store it. Decide how a mode re-arranges bound + unbound axes together (anchor hue + offsets from `harmonyHues`).
4. **Anchor with no bound color.** Today "at least one family assigned" guaranteed an anchor. Under the new model the anchor axis has a hue regardless of binding, so decide what "anchor hue" is when Anchor is unbound (a stored value; a mode still works off it).
5. **Sparse vs contiguous.** The user wants independent slots (a color stays where put; empty slots allowed, including gaps like Tertiary filled while Secondary empty). Confirm the shape supports gaps, and that `applyHarmony` keys hues by **axis index** (so a color in Tertiary gets the tertiary offset regardless of Secondary being empty).
6. **Migration.** `Theme.harmonyOrder?: string[]` is persisted in existing themes. Additive-load: map an old dense list onto axis slots 0..n-1, seeding each axis hue from that family's current `baseColor.h`. No destructive migration; old themes must load unchanged in behavior.
7. **Wheel behavior.** Handles now represent axes (some possibly unbound). Ghost preview, global rotate, and per-axis drag must operate on axes. The swatch-row "on the wheel" dot should mean "family is bound to an axis."

## Architectural / code-quality cleanups to fold into the redesign

Doing these as part of the redesign (rather than separately) avoids reworking soon-to-change code twice:

- **Rename for the new model.** `harmonyOrder`/`setHarmonyOrder`/`sanitizeHarmonyOrder`/`DEFAULT_HARMONY_ORDER` → axis-centric names. Keep `HARMONY_ELIGIBLE` (still the dev-declared pool: Brand/Accent/Background/Special).
- **Keep the tested math.** `harmonyHues` (the corrected priority-ordered slot table) and its pinning tests are correct and reusable as-is; the redesign should preserve/adapt those tests, not rewrite the geometry.
- **Single write path.** Preserve the "one mutation path" invariant (`setHarmonyOrder`'s successor) for every axis/binding change; no parallel state, `cssVarSync` fan-out untouched.
- **Drop the sentinel hack.** The experimental UI used a `' divider'` string sentinel inside the list array — do not carry that forward; model slots explicitly.
- **Wheel per-axis drag.** Today it special-cases detaching to `custom` and writes family `baseColor.h`. Generalize cleanly to "set this axis's hue," with bound families following.
- **Non-blocking review nits from the shipped waves** (carry forward or fix): a no-op drag drop still pushed an empty undo step (`mutate` has no identity dedupe); the drag-handle focus indicator was color-only (no ring); `ColorsTab.svelte`'s initial `selected = 'Brand'` literal is fine but worth a glance under the new model.
- **A11y.** Keep a keyboard path for assigning/unassigning and reordering axes (the shipped version had arrow-key reorder; the new binding interaction needs an equivalent).
- **Comments.** Repo rule: only non-obvious WHYs; no restating code.

## Suggested shape of the implementation plan

Mirror `harmony-axis-order.md`'s wave discipline (each wave one green commit):

1. **Core + types** — new axis data shape in `colorHarmony.ts` + `editorTypes`/`themeTypes`; adapt `applyHarmony` to key by axis index; sanitizer; keep/adapt pinning tests.
2. **State + persistence + migration** — store seed, `loadFromFile` (old `harmonyOrder` → axes), `toTheme`; round-trip + migration tests.
3. **Wheel** — handles/ghosts/rotate/per-axis-drag operate on axes; live binding writes bound families in one mutation.
4. **Axes list UI** — four fixed slots with hue swatches; drag colors to bind/unbind; keyboard equivalents.

## Verification bar (unchanged from the shipped feature)

`npm run check` (0 errors) and `npm test` green before each commit; run the Svelte MCP autofixer on any edited `.svelte`. Old themes must load with identical behavior. Do not push/tag/release; stop after each wave for review.
