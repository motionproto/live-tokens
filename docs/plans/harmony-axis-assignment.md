# Execution plan: harmony axis assignment (legibility pass)

Branch off `main` as `harmony-axis-assignment`. Five waves, each a single commit unit executable by a sub-agent with only this doc and the repo. Waves are strictly sequential; each ends green.

**Precondition:** a clean working tree. Verified clean at `0.45.0` when this plan was written. Never stash, reset, or checkout-over uncommitted changes; if the tree is dirty, stop and report.

**Scope:** presentation only. No wave changes the harmony data model. Four fixed axes, one optional family each, hue-only rotation (Global invariant 6 in `colorHarmony.ts`'s header) all hold unchanged, and every `paletteBaseColor.ts` signature survives. A legibility problem is fixed at the presentation layer.

Design sketch (renders the target states): https://claude.ai/code/artifact/1c584c49-4794-4456-b203-c4e820b3f2c2 — the sketch predates the greyscale drop-target decision in Wave 2 step 5; where they disagree, this doc wins.

## What this fixes (the problem)

### 1. Three surfaces derive binding state independently, and disagree

The model has three binding states — bound to an active axis, bound to an *inactive* axis, unbound — and each surface computes its own answer from `modeActiveAxes`:

| Surface | Derivation | What it renders for a family bound to an inactive axis |
|---|---|---|
| Swatch row | `ColorsTab.svelte:78` (`onWheel`) | No dot. Reads as unbound. |
| Axes list | `HarmonyAxesList.svelte:34` (`axisDisabled`) | An ordinary bound row. Reads as fully active. |
| Wheel | `ColorWheel.svelte:53-54` (`isVisible`) | A free dot: no rail, no numeral, no label. Reads as a rendering bug. |

`axisDisabled` is `!active && family === null`, so a *bound* inactive axis is not disabled and renders as a normal row. In Complementary with the default seed, axes 3 and 4 deactivate, so this is the first state a user hits after clicking a harmony mode — not an edge case.

This is the wave-1 fix and the reason the plan exists. Everything after it is downstream.

### 2. Assignment is drag-only and invisible at rest

`HarmonyAxesList.svelte` offers no click path to bind. Discoverability rests on one sentence of prose (`ColorsTab.svelte:235`) plus a `⋮⋮` glyph at `--ui-font-size-xs` in `--ui-text-muted` (`:270-277`). Drop targets have no resting appearance — `.drop-target` only exists mid-drag (`:214-218`). The chip's click does something *different* from its drag: click selects the family (`:142`), drag binds it. The documented verb is the one that cannot be discovered.

### 3. The list is spatially divorced from the wheel it describes

The wheel is the top of the left pane (`ColorsTab.svelte:99`); the axes list is the bottom of the right pane (`:233`), below the entire Color Story. The only connector is a numeral, rendered in two visual languages: a tangent-rotated glyph orbiting the disc (`ColorWheel.svelte:486`) and a muted tabular `3.` in a label column (`HarmonyAxesList.svelte:126`, `:239-242`).

### 4. Nothing disabled says why, and the vocabulary forks

A disabled axis is dashed at `opacity: 0.45` and still labelled `Empty` (`HarmonyAxesList.svelte:150`, `:244-249`) with no on-screen reason. Copy uses *drop*, *bind*, *unbind*, *float free* and *Unassigned* for two operations. `AXIS_ROLES` (`colorHarmony.ts:27`) names axis 2 "Secondary", which is also a Color Story text step (`ColorStory.svelte:23`).

## Reserved judgment calls (already decided — do not re-litigate)

1. **An inactive axis keeps today's wheel behaviour.** Its rail, external handle and numeral still disappear; a bound family still drops to the free dot and edits there. The change is that the free dot gains its axis numeral and an "off wheel" label. Drawing an inert dashed rail so the ring always shows four axes was considered and rejected: it is a much larger `ColorWheel.svelte` change for a state the label already resolves.
2. **Axes 2, 3 and 4 lose their role words entirely.** The axes are numbered; the numeral is the name. "Secondary / Tertiary / Quaternary" assert a ranking the model does not have — `harmonyHues` deals slots in priority order, not importance order — and they collide with the Color Story's text steps. Two names for one slot, only one of them true.
3. **Axis 1 keeps the word "Anchor".** It is the only axis carrying information a numeral cannot: every other slot is dealt as `anchor + offset`, so the other three are *positioned relative to it*. A number says which slot; it cannot say which slot the rest are measured from. `tintNeutralsFromAnchor` and its button title (`ColorsTab.svelte:139`) already depend on the term.
4. **`AXIS_ROLES` is deleted, not stubbed.** Nothing outside `src/editor/` imports it and it is not in the package `exports` map. Wave 5 replaces it with an `axisLabel(i)` helper.
5. **The Unassigned tray survives the picker.** It is redundant with the menu for *assigning*, but it is the only at-a-glance answer to "which families are spare", and it stays a drop target.
6. **Drag-and-drop is never removed.** The picker is additive. Every drag path, keyboard handler and `refocus` behaviour survives Wave 4.
7. **Hue-only stays absolute.** No wave writes chroma or lightness.
8. UI copy: no em-dashes; short sentences. Editor chrome stays greyscale with **no exceptions in this plan** — state distinctions use line weight, ring count, or dashing, never color. All values tokenized, pill buttons via `UIPillButton`.
9. Comments state only non-obvious WHYs; no restating code.

## Commit-unit protocol

One wave = one commit. Run the wave's verification green before committing; never commit red. Commit message `Axis assignment W<n>: <summary>` + the standard co-author trailer. Do not push, tag, or release. Stop after each wave for review. If reality contradicts this plan (a cited symbol is missing, a test pins conflicting behavior), stop and report rather than improvise.

Waves 1 and 2 carry most of the value and are independently shippable. If the run is cut short, cutting after Wave 2 leaves a coherent product.

## Global invariants (reviewer checklist)

1. **One derivation of axis status.** After Wave 1, no component computes binding state from `modeActiveAxes` directly. `grep -rn "modeActiveAxes" src/editor/ui/` returns nothing.
2. **Model untouched.** `PaletteConfig`, the `harmonyAxes` array shape, and every exported signature in `paletteBaseColor.ts` are unchanged across all five waves.
3. **Drag survives.** Every existing drag path, `onChipKeydown` binding and `refocus` call still works, including after Wave 4.
4. **Nothing is disabled without a visible reason.** Any dimmed, dashed or hollow element carries an on-screen explanation — not a `title`, not prose elsewhere in the pane.
5. **Bindings survive mode changes.** Switching to Complementary and back to Custom loses no binding. An `off-wheel` axis is still a legal assignment target.
6. **Wheel truthfulness, restated.** A family shows a filled numeral iff it currently has a wheel rail; a hollow numeral iff it is bound to an inactive axis; no numeral iff unassigned. All three surfaces agree by construction, because they read the same helper. (The filled/hollow rendering lands in Wave 2; from Wave 1 the underlying statuses already agree.)
7. **No new dependencies and no new package entry points.** Everything lands in existing `src/editor/` modules or new siblings within them.
8. `npm run check` clean and `npm run test` green at every wave boundary.

---

## Wave 1 — one source of truth for axis status; bound-but-inactive reads as itself

**Goal:** the three surfaces stop disagreeing. Highest value, smallest diff, no new primitives.

Files: `src/editor/core/palettes/colorHarmony.ts`, `src/editor/core/palettes/colorHarmony.test.ts`, `src/editor/ui/colors/harmonyModeIcons.ts`, `src/editor/ui/colors/HarmonyAxesList.svelte`, `src/editor/ui/colors/ColorWheel.svelte`, `src/editor/ui/colors/ColorsTab.svelte`.

1. In `colorHarmony.ts`, beside `modeActiveAxes`:

   ```ts
   export type AxisStatus = 'on-wheel' | 'off-wheel' | 'unused';

   /**
    * Per-axis presentation status. The single source every Colors surface reads,
    * so the wheel, the swatch row and the axes list cannot disagree about the
    * same axis.
    *
    *   on-wheel  — the mode deals this slot a distinct hue: rail, handle, numeral.
    *   off-wheel — a family is bound, but the mode deals the slot no position.
    *               The binding is real and returns when the mode changes; the
    *               family edits as the free dot meanwhile.
    *   unused    — no family bound and no position dealt.
    */
   export function axisStatuses(mode: HarmonyMode, axes: HarmonyAxis[]): AxisStatus[];
   ```

   Implementation reads `modeActiveAxes(mode)`: `active[i]` → `'on-wheel'` (bound or not — an unbound active axis still draws its hue-preview handle); `!active[i] && axes[i].family !== null` → `'off-wheel'`; otherwise `'unused'`.

   Also export `activeAxisCount(mode)` = `modeActiveAxes(mode).filter(Boolean).length`. The reason strings in step 3 need the number and must never hardcode it per mode.

   Also export `axisLabel(index: number): string`, returning `'anchor'` for 0 and `` `axis ${index + 1}` `` otherwise. Waves 1 and 4 consume it; Wave 5 deletes `AXIS_ROLES` and migrates its remaining call sites onto it.

   Reason strings and aria render the mode's display name, never the raw id — `'split-complementary'` must not reach copy. Export `modeLabel(mode: HarmonyMode): string` from `harmonyModeIcons.ts`, reading the existing `HARMONY_MODE_BUTTONS` labels.

2. In `colorHarmony.test.ts`, pin the new helper:
   - Complementary with the default seed axes yields `['on-wheel', 'on-wheel', 'off-wheel', 'unused']` (axis 3 bound to Canvas, axis 4 unbound by `defaultHarmonyAxes`).
   - `custom` and `monochromatic` yield four `'on-wheel'` entries — the carve-outs in `modeActiveAxes`.
   - Equivalence pinning, so this wave provably changes no behaviour: for every mode, `statuses[i] === 'unused'` is exactly today's `!modeActiveAxes(mode)[i] && axes[i].family === null`, and `statuses[i] === 'on-wheel'` is exactly today's `modeActiveAxes(mode)[i]`.

3. `HarmonyAxesList.svelte`:
   - Replace `axisDisabled` (`:34`) with `statuses = $derived(axisStatuses(activeMode, axes))`. `axisSeq` (`:36`) keeps excluding **only** `'unused'` — an `off-wheel` axis stays a legal keyboard destination and a legal drop target (invariant 5). Verify `onDragOver` (`:86`) and `onDrop` (`:101`) reject `'unused'` only; this is today's behaviour and must not shift.
   - `off-wheel` rows keep the family chip at full strength — the binding is real — and gain an inline reason: `off wheel · Complementary uses 2`, composed from `modeLabel` + `activeAxisCount`. The hollow-numeral treatment arrives with `AxisNumeral` in Wave 2, not here.
   - `unused` rows keep the dashed + dimmed treatment and gain `unused · Complementary uses 2`, replacing the bare `Empty` at `:150` **on unused rows only**. An empty row on an *active* axis (Custom, axis 4) keeps `Empty` until Wave 4 replaces it with the picker trigger.
   - These two reason strings are final: Wave 5's copy table references them and does not re-author them.
   - The reason is rendered text in the row, never a `title` (invariant 4).
   - Rewrite the Props doc comment (`:12-14`); it still describes the old disabled semantics.

4. `ColorWheel.svelte`:
   - Derive `isVisible` (`:54`, off `activeAxes` at `:53`) from `axisStatuses` rather than `modeActiveAxes` (invariant 1). `'on-wheel'` is the only visible state, so render behaviour is unchanged — this is a re-derivation, not a redesign (RJC 1).
   - Label the free dot (`:528-541`). It currently carries a family-colored fill and no indication of which axis it belongs to or why it left the ring. The dot serves two states and only one gets a numeral: a family bound to an inactive axis (`off-wheel`) gains the hollow axis numeral adjacent to the dot; a fully unassigned family (Neutral, Alternate by default) keeps an unnumbered dot (invariant 6: no numeral iff unassigned). Put the status in both `aria-label` and `title`, em-dash free (RJC 8) — bound-inactive: `Canvas, axis 3. Off the wheel in Complementary. Drag to adjust hue and chroma.`; unassigned: `Neutral, unassigned. Drag to adjust hue and chroma.`

5. `ColorsTab.svelte`: change `swatches.onWheel` (`:78`) to `swatches.axis: { index: number; status: AxisStatus } | null`, derived from the same helper by finding the axis whose `family` matches the spec label. **Rendering stays as-is this wave** — keep the existing `wheel-dot` conditional working off `axis?.status === 'on-wheel'`. Wave 2 replaces the mark.

**Verification.** `npm run check`, `npm run test`. Then manually, in both the docked overlay and `/live-tokens/colors`: switch to Complementary with the default seed and confirm Canvas reads as bound-and-off-wheel on the swatch row, the wheel and the list simultaneously, with the reason on screen. Switch back to Custom and confirm Canvas returns to the ring with no binding lost.

---

## Wave 2 — one numeral across the swatch row, the wheel and the list

**Goal:** the connective token becomes a number that means the same thing everywhere, replacing three visual languages.

Files: new `src/editor/ui/colors/AxisNumeral.svelte`; `ColorsTab.svelte`, `HarmonyAxesList.svelte`, `ColorWheel.svelte`.

1. `AxisNumeral.svelte` takes `index: number` and `status: AxisStatus`. Filled = `'on-wheel'`, hollow (dashed border, `--ui-text-muted`) = `'off-wheel'`. Callers do not render it for unassigned families. Three call sites with identical state logic is the threshold where the shared component pays for itself. Footprint is fixed at dot scale, about `1rem`, numeral at `--ui-font-size-xs`; the component carries no positioning of its own, so the wheel can place it absolutely and the rows inline.

2. `ColorsTab.svelte`: replace the 6px `.wheel-dot` (`:187`, `:505-515`) with `AxisNumeral` in the same corner position.

   The badge sits on an arbitrary user-chosen fill, so it cannot inherit a surface token and stay legible. Give it a `rgba(0, 0, 0, 0.72)` scrim — greyscale, so RJC 8 holds. This is the one place in the file a literal is correct; comment it as such, since the rest of the editor is strictly tokenized.

   Fit: the badge keeps the dot's corner slot and stays absolutely positioned inside the chip, so the dock-magnification height transition carries it with no separate animation. Swatches shrink hard in the docked panel (`flex: 1 1 0; min-width: 0`); verify at the narrowest real swatch width that the badge clears the label and stays legible.

3. `HarmonyAxesList.svelte`: the numeral moves out of the `.role` span (`:126`) into `AxisNumeral`. Delete `.role-num` (`:239-242`) and its selected-state rule (`:228`).

4. `ColorWheel.svelte`: the orbiting `.axis-num` (`:486`) adopts the same filled/hollow logic, as does the free-dot numeral added in Wave 1.

5. **De-duplicate selection, greyscale only.** Today `.axis-row.selected` (`:222-225`) and `.chip.selected` (`:298-301`) both resolve to `--ui-text-primary`, so a selected row lights up twice; and `.drop-target` (`:214-218`) at `--ui-border-higher` is close enough in weight to be confusable with selection mid-drag. Settle on:
   - **Selected axis row** = inverted numeral + a single 1px `--ui-text-primary` row border. The chip inside an axis row drops its own `.selected` treatment.
   - **Unassigned tray chips keep `.chip.selected`.** They have no row and no numeral; it is their only selection indicator, and deleting it would break the selection carry across the Colors surfaces.
   - **Drop-target** = a doubled ring: the row's 1px border switches to `--ui-text-primary` and gains `outline: 1px solid var(--ui-text-primary); outline-offset: 1px`. Ring count separates "about to receive" (two lines) from "selected" (one line); the outline adds no layout shift. Not dashed (dashed already means unused) and not colored (RJC 8).

**Verification.** `npm run check`, `npm run test`. Manually: select a family in the swatch row and confirm exactly one selection treatment appears per surface. Drag a chip over the selected row and confirm drop-target and selection are distinguishable. Select an unassigned family and confirm its tray chip still reads selected. Check the swatch badge at the docked panel's narrowest width: legible, clear of the label, riding the magnification transition.

---

## Wave 3 — placement

**Goal:** put the list beside the wheel it describes. Pure markup and CSS in one file; no logic changes.

File: `src/editor/ui/colors/ColorsTab.svelte`.

1. Move the axes (`:233-237`) out of the right pane into `#colors-wheel`, directly below the `Color Harmony` group (after `:167`). They enter as a **group, not a section** — a block-head inside a section would nest two heading tiers. Move `Derived scale` (`:213-216`) and `ColorReadouts` (`:218-220`) to the right pane below `ColorStory`, wrapped in one new `section.block` (groups cannot sit bare in a pane). Its block-head names the selection — eyebrow `Selected color`, title `selectedSpec.displayLabel ?? selected` — keeping the association with the left column's edit panel legible now that the numbers live a pane away; the `Derived scale` group eyebrow stays inside.

   Left: Wheel → Lightness → Harmony modes → **Harmony axes** → Swatches → Edit panel.
   Right: Color Story → Selected color (Derived scale + Readouts).

   Mode → axes → swatches then reads as one sentence: pick the geometry, say who sits on it, edit whoever is selected. The two columns also stop terminating at wildly different heights.

2. The axes group takes the eyebrow treatment of its new siblings (`Color Harmony` at `:117`, `Swatches` at `:170`): eyebrow `Harmony axes`, then the description, then the list. Delete the bare `h2` (`:234`) and dissolve the `#colors-axes` section wrapper — grep for references to the id first; stop and report if anything targets it.

3. Break the left column's uniform rhythm so the wheel and the controls below it stop carrying identical weight. The knob is the `.block` gap `--ui-space-20` (`:274-279`), which every group inside `#colors-wheel` shares; the pane gap `--ui-space-32` (`:263`) only separates sibling blocks and never fires inside the left column. The wheel is the hero of the view; give it more clearance than the groups keep between themselves.

4. Check the `1200px` breakpoint (`:253-258`) and the `1024px` collapse (`:517-522`). The docked panel's iframe viewport sits below 1200px and the Colors page sits above it, so this move behaves differently at each — both must be checked (invariant 8's manual half).

**Verification.** `npm run check`, `npm run test`. Manually at three widths — docked panel default, Colors page at 1280px, and below 1024px — confirm no column collapses badly and the axes list stays adjacent to the harmony controls.

---

## Wave 4 — assign a family with a picker; drag kept as an accelerator

**Goal:** a click path to assignment. The largest wave; review it on its own.

Files: new `src/editor/ui/UIMenuButton.svelte`; `src/editor/ui/colors/HarmonyAxesList.svelte`.

1. **`UIMenuButton.svelte`.** Every dropdown in the editor currently routes through `UITokenSelector`, which is CSS-variable-bound: it carries `variable`, `component`, `canBeLinked`, `selectionsLocked` and `onreset`, none of which mean anything for editor state. The axis picker is not a token slot, so reusing it would be wrong.

   Write a plain trigger + anchored popover: `role="menu"`, outside-click and `Escape` to close, focus returned to the trigger on close. Follow `UIInfoPopover.svelte` for the outside-click and positioning pattern rather than inventing one — it already handles the document listener lifecycle correctly.

   Compose the body from the **existing** `UIOptionList` / `UIOptionItem` primitives. Their `preview` / `label` / `meta` snippets map exactly onto swatch / family name / "moves from 2", so the menu inherits the editor's option styling for free.

2. **`HarmonyAxesList.svelte`.** The chip is **not** the trigger. Its click selects the family (`:142`) — the selection carry across the Colors surfaces (d499fc4) must survive — and its grip, `draggable`, `ondragstart` / `ondragend` / `onkeydown` stay intact (invariant 3, RJC 6). The picker gets its own control per row:
   - A bound row (`on-wheel` and `off-wheel` alike — an off-wheel axis is a legal target, invariant 5) gains a chevron `UIMenuButton` trigger at the row's trailing edge, its own tab stop.
   - An empty row on an **active** axis renders `Assign a color…` as the trigger itself, replacing its `Empty` text.
   - An **unused** row gets no trigger. It keeps the Wave 1 reason text; drag already rejects it (`onDragOver`, `:86`) and the picker must not offer it.
   - The menu lists every `HARMONY_ELIGIBLE` family in one list. A family already bound elsewhere shows `moves from 2` in the `meta` slot — the consequence drag never surfaced until after the drop.
   - A separated `Leave empty` item at the foot, calling `unbindFamily`.
   - Menu header names the axis via `axisLabel` (from Wave 1): `Assign to axis 4`, `Assign to anchor`.

3. Keep the Unassigned tray and its drop target (RJC 5).

**Verification.** `npm run check`, `npm run test`. Manually: assign a bound family to a different axis via the menu and confirm it leaves the old row, that the menu warned it would move, and that the wheel updates. Then repeat the same reassignment by dragging, and confirm identical end state. Click a bound chip and confirm it selects the family and opens no menu. Keyboard-only: Tab to a trigger, open with Enter, arrow through, select with Enter, confirm focus returns to the trigger. Arrow keys on the chip still move the family between axes; menu arrow navigation begins only after the trigger opens it.

---

## Wave 5 — one verb per concept

**Goal:** the copy stops forking. Deliberately last: widest surface, least visual change, and the only wave whose output is visible outside the Colors view.

Files: `src/editor/core/palettes/colorHarmony.ts`, `src/editor/ui/colors/paletteBaseColor.ts`, `HarmonyAxesList.svelte`, `ColorWheel.svelte`, `ColorsTab.svelte`, plus any test asserting on history-label strings.

| Concept | Today | Becomes |
|---|---|---|
| Attach a color | drop · bind | **assign** |
| Detach a color | unbind · float free | **unassign** |
| Axes 2, 3, 4 | Secondary · Tertiary · Quaternary | **nothing — the numeral is the name** |
| Axis 1 | Anchor | **Anchor** (unchanged) |
| Inactive axis | "Empty", dimmed | **the Wave 1 reason string (`unused · Complementary uses 2`), unchanged here** |

1. Delete `AXIS_ROLES` (`colorHarmony.ts:27`) (RJC 4). `axisLabel` already exists (Wave 1); this wave migrates every remaining `AXIS_ROLES` call site onto it. Update the file header comment (`:3-4`), which still names the four roles.

2. Update the call sites: `paletteBaseColor.ts:109`, `ColorWheel.svelte:37`, `HarmonyAxesList.svelte:126`, `:136`, `:172`, `:174`, and the three imports (`HarmonyAxesList.svelte:7`, `ColorWheel.svelte:8`, `paletteBaseColor.ts:22`). `ColorWheel.svelte:37` feeds the composed aria/title at `:516-517`; with `role` now `axis 3`, the template's own word "axis" must go — `Rotate axis 3 hue`, `Rotate anchor hue`, never `Rotate axis 3 axis hue`.

3. **`paletteBaseColor.ts:109` composes an undo-history label**: `` mutate(`colors: ${AXIS_ROLES[index]} axis hue`, …) ``. It becomes `` `colors: ${axisLabel(index)} hue` ``, giving `colors: anchor hue` and `colors: axis 3 hue`. Both read better than today's `colors: Secondary axis hue`. History labels are user-facing prose rather than API, so this is a copy improvement, not a break — but any test asserting on those strings updates in this wave.

4. Aria follows the same helper and gets shorter: `Brand, on axis 2 of 4. Arrow up or down to move it, Delete to unassign.`

5. Rows render `1 Anchor`, `2`, `3`, `4`. Keep the `.role` column at a fixed width even though only row 1 fills it, so every picker starts at the same x — the alignment is what makes a column of numerals scan. Narrow it to fit "Anchor".

6. Update the section description (`ColorsTab.svelte:235`) to the new verbs. It currently says "Drop a color on an axis to bind it… Drag a color to Unassigned to let it float free." After Wave 4 the primary interaction is a click, so it should describe that first and mention drag second.

7. Sweep the remaining rendered strings carrying the old verbs: `HarmonyAxesList.svelte:138` (`Delete unbinds`), `:174` (`Drag onto an axis to bind it`), `:187` (`Every color is bound to an axis.` becomes `Every color is assigned to an axis.`). Function names (`bindFamilyToAxis`, `unbindFamily`) keep their names (invariant 2).

**Verification.** `npm run check`, `npm run test`. `grep -rn "AXIS_ROLES\|unbind\|float free" src/editor/` returns only `unbindFamily` (the function name, unchanged per invariant 2). `grep -rn "bind\|bound\|drop" src/editor/ui/colors/` returns only identifiers — `bindFamilyToAxis`, `unbindFamily`, the drag-and-drop handlers and the `drop-target` class — never a rendered string. Manually: perform an axis hue drag and confirm the undo entry reads `colors: axis 2 hue`.

---

## Manual verification matrix (run at every wave boundary)

These are the states that currently disagree; they are the regression surface for the whole plan.

1. Default seed, **Custom**: axes 1–3 bound, axis 4 empty. All three surfaces agree.
2. **Complementary**: axes 3 and 4 deactivate. Canvas reads bound-and-off-wheel on the swatch row, the wheel and the list at once, with the reason on screen.
3. Back to **Custom**: Canvas returns to the ring. No binding lost.
4. **Monochromatic**: all four axes stay active (the carve-out in `modeActiveAxes`); nothing renders hollow.
5. Reassign a bound family to another axis. It leaves the old one; from Wave 4, the menu said so first.
6. Keyboard only: Tab to a chip, Arrow up/down through the axes and into Unassigned, Delete to unassign. Focus follows the family (`refocus`). From Wave 4 the picker chevron is a separate tab stop; Enter on the chip still selects, never opens the menu.
7. Both mount points: the docked overlay panel and `/live-tokens/colors`. The `1200px` breakpoint means Wave 3 behaves differently at each.
8. Select an unassigned family: from Wave 2 its tray chip is its only selection indicator in the axes list; confirm it reads selected.

## Suggested commit subjects

```
Axis assignment W1: one source of truth for axis status
Axis assignment W2: one numeral across the swatch row, the wheel and the list
Axis assignment W3: move Harmony axes under the mode row
Axis assignment W4: assign a family with a picker, drag kept as an accelerator
Axis assignment W5: one verb per concept
```
