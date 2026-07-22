# Execution plan: user-ordered harmony axes (`harmonyOrder`)

Branch `light-first-theming` (worktree `live-tokens-light-first`). Four waves, each a single commit unit executable by a sub-agent (Opus/Sonnet) with only this doc and the repo. Waves are strictly sequential; each ends green.

**Precondition:** a clean working tree. The branch currently carries uncommitted work (Color Story rewrite, harmony ghost preview, background spot strip). That work must be committed by the user before Wave 1 starts. Never stash, reset, or checkout-over uncommitted changes; if the tree is dirty, stop and report.

## What this builds (the model)

Today the harmony system hardcodes which palette families occupy the harmony axes:

- `src/editor/core/palettes/colorHarmony.ts:19` — `const TRIO = ['Brand', 'Background', 'Accent']`, with Brand as the fixed anchor. `harmonyHues()` (line 24) returns exactly 3 hues; `applyHarmony()` (line 49) re-hues exactly those three families. Square mode returns `[a, a+90, a+180]` — its fourth axis (`a+270`) is unreachable because there is no fourth slot.
- `src/editor/ui/colors/ColorWheel.svelte:30` — `TRIO_LABELS`, same three labels, drives which handles render, the ghost preview, and the global-rotate loop.
- `src/editor/ui/colors/ColorsTab.svelte:15` — `WHEEL_LABELS` drives the "on the wheel" dot in the swatch row (and currently over-claims: it lists Neutral and Alternate, which have no wheel handle).

This plan replaces the constants with **one ordered list, stored per theme**:

```ts
// EditorState and Theme both gain:
harmonyOrder?: string[]           // Theme (optional on disk; absent = default)
harmonyOrder: string[]            // EditorState (always present)

export const DEFAULT_HARMONY_ORDER = ['Brand', 'Accent', 'Background'];
export const HARMONY_ELIGIBLE = ['Brand', 'Accent', 'Background', 'Special'];
```

Semantics:

- **Slot 0 is the anchor.** The first family in the list keeps its hue; every other listed family is re-hued relative to it. (Today's anchor, Brand, is simply the default first entry.)
- **Modes deal hues to slots in order** via a per-mode slot table (below). A mode with more distinct hues than the list has slots leaves the extra hues unused; a list longer than a mode's distinct hues follows the table's curated repetition.
- **Families not in the list are never touched by harmony.** That is today's behavior for Special; removing Background from the list makes it free-floating.
- **Eligibility is fixed at the four chromatic non-functional families** (`HARMONY_ELIGIBLE`). Functional palettes (Info/Success/Warning/Danger) carry semantic hue and are never eligible; Neutral/Alternate have their own mechanism (`tintNeutralsFromBrand`). Eligibility is dev-declared, not user-editable — the user orders/includes within the pool, nothing more.
- List constraints: non-empty, unique entries, every entry in `HARMONY_ELIGIBLE`. Max length is therefore 4, which matches the largest harmony (square).

### Per-mode slot tables (curated, not mechanical)

`a` = anchor hue (hue of the family in slot 0). All hues normalized to [0, 360). These tables are the spec; do not invent alternatives. Slots are priority-ordered: the mode's defining hues occupy the lowest slots. Slot 1 is the primary harmonic partner. With the default order `['Brand', 'Accent', 'Background']`, dealing slots 0–2 reproduces today's per-family `applyHarmony` output exactly (Brand=slot 0, Accent=slot 1, Background=slot 2). That per-family equivalence is the Wave 1 pinning test. Note `harmonyHues` now returns hues in slot order, so its raw array differs from today's ordering (e.g. complementary is now `[a, a + 180, a]`, not `[a, a, a + 180]`); assert on `applyHarmony`'s per-family output, and update the existing direct `harmonyHues` unit test's expected array to the new slot order.

| mode                | slot 0 | slot 1  | slot 2  | slot 3  |
|---------------------|--------|---------|---------|---------|
| monochromatic       | a      | a       | a       | a       |
| analogous           | a      | a + 30  | a − 30  | a + 60  |
| complementary       | a      | a + 180 | a       | a + 180 |
| split-complementary | a      | a + 210 | a + 150 | a       |
| triadic             | a      | a + 240 | a + 120 | a       |
| square              | a      | a + 180 | a + 90  | a + 270 |
| custom              | a      | a       | a       | a       |

(`custom` remains "no constraint": `applyHarmony('custom', …)` still returns `{}`; the table row exists only so `harmonyHues` stays total.)

### Reserved judgment calls (already decided — do not re-litigate)

1. Slot-3 values in the table above are the curated choices, including the asymmetric analogous `a + 60`.
2. `tintNeutralsFromBrand` re-hues Neutral/Alternate from the **anchor** (slot 0 family), not hardcoded Brand. With the default order this is identical behavior. Rename to `tintNeutralsFromAnchor`; update the one call site (`ColorsTab.svelte`) and its button title ("from the anchor color" wording).
3. Hue-only rotation stays absolute (Global invariant 6 in `colorHarmony.ts`'s header): harmony never touches chroma or lightness.
4. The background spot strip, text-contrast solver, and `emptyStep` mechanism are out of scope and must not be modified.
5. UI copy: no em-dashes; short sentences. Editor chrome stays greyscale, all values tokenized, buttons via `UIPillButton`.

## Commit-unit protocol

One wave = one commit. Run the wave's verification green before committing; never commit red. Commit message `Harmony axes W<n>: <summary>` + the standard co-author trailer. Do not push, tag, or release. Stop after each wave for review. If reality contradicts this plan (a cited symbol is missing, a test pins conflicting behavior), stop and report rather than improvise.

## Global invariants (reviewer checklist)

1. **Default-order equivalence:** with `harmonyOrder` absent or equal to `DEFAULT_HARMONY_ORDER`, every mode's `applyHarmony` output is exactly today's output (same labels, same hues). Pinned by tests in Wave 1 and never weakened.
2. **Anchor = slot 0.** No code path assumes the anchor is Brand after Wave 1.
3. **Unlisted families are untouched** by apply, ghosts, and global rotate.
4. **Single store path:** all writes go through `mutate`/`transaction` in `editorCore` (via `paletteBaseColor.ts` helpers or a slice); no parallel state. `cssVarSync` fan-out untouched.
5. **Old themes load unchanged:** absent `harmonyOrder` yields the default; no migration file is needed (additive optional field). Invalid entries are dropped on load, and an emptied list falls back to the default.
6. **Wheel truthfulness:** a family shows the "on the wheel" dot in the swatch row iff it currently has a wheel handle.
7. Hue-only: no chroma/lightness writes anywhere in harmony code.
8. Comments state only non-obvious WHYs; no restating code.

---

## Wave 1 — core: `colorHarmony.ts` takes an ordered slot list (pure, no UI)

**Goal:** generalize the harmony math to N slots with a curated per-mode table, behavior-identical for the default order.

Files: `src/editor/core/palettes/colorHarmony.ts`, `src/editor/core/palettes/colorHarmony.test.ts`.

1. In `colorHarmony.ts`:
   - Add `export const DEFAULT_HARMONY_ORDER: readonly string[] = ['Brand', 'Accent', 'Background'];` and `export const HARMONY_ELIGIBLE: readonly string[] = ['Brand', 'Accent', 'Background', 'Special'];`. Delete the private `TRIO` constant.
   - Reshape `harmonyHues(mode, anchorHue)` → `harmonyHues(mode: HarmonyMode, anchorHue: number, slotCount: number): number[]`, implementing the slot table above (return the first `slotCount` entries; `slotCount` is 1–4). Keep the existing name so call sites are greppable.
   - Reshape `applyHarmony(mode, palettes)` → `applyHarmony(mode: HarmonyMode, palettes: Record<string, PaletteConfig>, order: readonly string[] = DEFAULT_HARMONY_ORDER): Record<string, Oklch>`:
     - `'custom'` → `{}` (unchanged).
     - Anchor config is `palettes[order[0]]`; if missing, return `{}` (mirrors today's missing-Brand guard).
     - Deal `harmonyHues(mode, anchorHue, order.length)` to the listed families in order; skip labels with no config (unchanged behavior).
   - Rename `tintNeutralsFromBrand` → `tintNeutralsFromAnchor(palettes, order = DEFAULT_HARMONY_ORDER)`; hue source is `palettes[order[0]]`. Update the doc comment.
   - Update the file-header comment: the trio is no longer a constant; the anchor is slot 0 of the caller-supplied order.
2. Update the two importing call sites **minimally** so the build stays green — `ColorsTab.svelte` (rename `tintNeutralsFromBrand` → `tintNeutralsFromAnchor`; `applyHarmony` keeps its default argument) and `ColorWheel.svelte` (`harmonyHues(previewMode, brand.hue)` → pass `3` as `slotCount`). Wave 3 does the real wheel generalization; this wave only keeps signatures compiling with unchanged behavior.
3. Tests (`colorHarmony.test.ts` — extend, keep existing tests passing; if an existing test calls the old signatures, update the call, never the expectation):
   - **Pinning:** for every mode, `applyHarmony(mode, palettes)` with no order argument equals the pre-change per-family output. With the default order, that is Brand=slot 0, Accent=slot 1, Background=slot 2; those are today's values by construction. Also update the existing direct `harmonyHues` unit test (e.g. `harmonyHues('complementary', 30)` was `[30, 30, 210]`, now `[30, 210, 30]` under the new slot order) to the new expected array; this is a call/ordering update, not a behavior weakening, since applied per-family output is unchanged.
   - Square with `['Brand', 'Background', 'Accent', 'Special']`: Special gets `anchor + 270`.
   - Non-Brand anchor: `['Accent', 'Brand']`, complementary → Accent keeps its hue, Brand gets `accentHue + 180`.
   - Unlisted family untouched: order without Background → no `Background` key in the patch.
   - Missing anchor config → `{}`.
   - `tintNeutralsFromAnchor` with `['Accent', …]` tints Neutral/Alternate to Accent's hue.

**Verification:** `npx vitest run src/editor/core/palettes/colorHarmony.test.ts`, then `npm run check`, then `npm test`.

## Wave 2 — state + persistence

**Goal:** `harmonyOrder` lives in the editor store and round-trips through theme JSON; absent means default; invalid input is sanitized on load.

Files: `src/editor/core/store/editorTypes.ts`, wherever `emptyState()` is defined (grep `function emptyState`), `src/editor/core/themes/themeTypes.ts`, `src/editor/core/store/editorStore.ts` (`loadFromFile`, `toTheme`), new slice `src/editor/core/themes/slices/harmonyOrder.ts` (or a function in an existing appropriate module — mirror how small slices are structured), plus `src/editor/core/store/editorStore.test.ts` for round-trip tests.

1. `EditorState` gains `harmonyOrder: string[]`; `emptyState()` seeds it with `[...DEFAULT_HARMONY_ORDER]`.
2. `Theme` (themeTypes.ts:77) gains `harmonyOrder?: string[]` with a doc comment: ordered harmony axis assignment; slot 0 is the anchor; absent = default trio.
3. Add and export a pure sanitizer in `colorHarmony.ts`:
   ```ts
   export function sanitizeHarmonyOrder(input: unknown): string[]
   ```
   Rules: non-array or empty → `[...DEFAULT_HARMONY_ORDER]`; filter to entries in `HARMONY_ELIGIBLE`; drop duplicates (keep first); if the result is empty → default. Unit-test it in `colorHarmony.test.ts` (each rule, one test).
4. `loadFromFile`: `next.harmonyOrder = sanitizeHarmonyOrder(theme.harmonyOrder)`. `toTheme`: include `harmonyOrder: state.harmonyOrder`. (Serialize unconditionally; a three-line default in the JSON is cheaper than absent-vs-default ambiguity.)
5. Store write path: add to `src/editor/ui/colors/paletteBaseColor.ts`:
   ```ts
   export function setHarmonyOrder(order: string[]): void
   ```
   One `mutate('colors: harmony axes', …)` writing `s.harmonyOrder = sanitizeHarmonyOrder(order)`. This is the single mutation path for Wave 4's UI.
6. Tests: `toTheme` → `loadFromFile` round-trips a non-default order; a theme JSON without the field loads the default; a theme with `['Danger', 'Brand', 'Brand']` loads as `['Brand']`. Follow the existing round-trip test style in `editorStore.test.ts`.
7. Check `__snapshots__` and any fixture themes for shape assertions that now need the new field; update snapshots only after confirming the diff is exactly the added field.

**Verification:** `npm run check`, `npm test`.

## Wave 3 — wheel + ghosts + swatch dots render from the list

**Goal:** the wheel shows one handle per family in `harmonyOrder`; ghost previews, global rotate, and the swatch-row wheel dots all derive from the same list. No visual change with the default order.

Files: `src/editor/ui/colors/ColorWheel.svelte`, `src/editor/ui/colors/ColorsTab.svelte`.

1. `ColorWheel.svelte`:
   - Delete `TRIO_LABELS`/`TRIO_SPECS` constants. Derive instead:
     ```ts
     let wheelLabels = $derived($editorState.harmonyOrder);
     let wheelSpecs = $derived(wheelLabels
       .map((l) => PALETTE_SPECS.find((s) => s.label === l))
       .filter((s): s is PaletteSpec => !!s));
     ```
   - Replace every `trio`/`TRIO_LABELS` iteration (handle render, `trioRender`, ghost dots, global rotate loop, per-axis drag lookup) with the derived list. This is mechanical: same code, list-driven length. Rename `trio*` locals to `wheel*` for honesty.
   - Anchor: any place that special-cases `'Brand'` (the ghost-preview anchor lookup at ~line 129 reads `trio.find((t) => t.label === 'Brand')`) must use `wheelLabels[0]` instead.
   - Ghosts: `harmonyHues(previewMode, anchorHue, wheelLabels.length)`.
   - The wheel must handle a 1-entry list (only an anchor handle; ghosts all at the anchor) and a 4-entry list without layout breakage. Handles may overlap at coincident hues; that is existing behavior (monochromatic already overlaps three handles).
2. `ColorsTab.svelte`:
   - Delete `WHEEL_LABELS`; the swatch `onWheel` flag becomes `$editorState.harmonyOrder.includes(spec.label)`. (This also fixes the current over-claim for Neutral/Alternate.)
   - `applyMode` passes the order: `applyHarmony(mode, $editorState.palettes, $editorState.harmonyOrder)`; `tintNeutralsFromAnchor($editorState.palettes, $editorState.harmonyOrder)`.
3. Manual QA note for the reviewer (default order): wheel renders exactly as before; hovering each harmony mode shows the same ghosts as before; global rotate moves the same three handles.

**Verification:** `npm run check`, `npm test`. Then run the Svelte autofixer MCP tool on both edited components if available.

## Wave 4 — axes list UI (reorder + include/exclude)

**Goal:** a compact control in the Harmony group of `ColorsTab.svelte` that shows the current slot assignment and lets the user reorder it and add/remove eligible families. All writes via `setHarmonyOrder`.

Files: new `src/editor/ui/colors/HarmonyAxesList.svelte`, `src/editor/ui/colors/ColorsTab.svelte`.

1. Component behavior:
   - Reads `$editorState.harmonyOrder`. Renders one row per listed family: slot number, a small color chip (family `baseColor`, via `oklchToHexClamped`), family label, "Anchor" tag on slot 0, a remove button (hidden when the list has one entry), and a drag handle.
   - Below the rows, offer the eligible-but-unlisted families (from `HARMONY_ELIGIBLE`) as small "+ Label" pill buttons that append to the list.
   - Drag-to-reorder: borrow the existing pointer-based reorder pattern — read `src/editor/ui/FontStackEditor.svelte` first and reuse its approach (it already does list drag in this codebase). Keyboard fallback: up/down arrow keys on a focused drag handle move the row (required; do not skip).
   - Every commit (drop, keyboard move, add, remove) calls `setHarmonyOrder(next)` once. No local mirror of the order beyond the in-flight drag.
   - After a reorder/add/remove, do **not** auto-apply the active harmony mode. The list changes assignment; the user re-applies a mode (or rotates) when ready. Set nothing else.
   - Styling: greyscale, tokenized (`--ui-*` vars), row text `--ui-font-size-sm`, eyebrow above the list reading `Axes`. Match the visual weight of the existing `.mode-row`/`.wheel-opts` blocks.
2. `ColorsTab.svelte`: render `<HarmonyAxesList />` inside the Harmony `.group`, between the `.harmony-actions` row and `.wheel-opts`.
3. Edge coupling to check by hand: with Background removed from the list, the harmony modes must leave Background's hue alone (Wave 1 guarantees it), and the swatch row must drop Background's wheel dot (Wave 3 guarantees it). With Special added, square mode must move Special onto `a+270`.
4. Run the Svelte autofixer MCP tool on the new component if available.

**Verification:** `npm run check`, `npm test`, plus a manual pass in the running app (dev server usually on `localhost:5174`): reorder, add Special, apply square, undo (one step per committed gesture), reload the page and confirm the order persisted with the theme.

---

## Out of scope (explicitly)

- Any change to `emptyStep`/spot strip, `solveTextCurves`, or Color Story.
- User-editable eligibility (pool is dev-declared).
- Per-mode custom angles, more than 4 slots, or harmony for functional palettes.
- Auto-applying harmony when the order changes.
