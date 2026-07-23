# Execution plan: harmony axes own their hues (`harmonyAxes`)

Branch: create **`harmony-axes-redesign`** off `main` @ `88897dd`. Four waves, each a single commit unit executable by a sub-agent with only this doc and the repo. Waves are strictly sequential; each ends green (`npm run check` 0 errors, `npm test` all passing).

**Precondition:** a clean working tree on `main` @ `88897dd`. Never stash, reset, or checkout over uncommitted changes; if the tree is dirty, stop and report.

**Reference-branch warning:** branch `harmony-axes-ui-experiment` is a loose *visual* reference only (the slot/plug/swatch direction). Its data model (dense list + `' divider'` sentinel) is wrong for this redesign. Do not build on it, cherry-pick from it, or copy its state handling. Note that `main` itself currently carries a divider-sentinel `HarmonyAxesList.svelte` (the `DIVIDER = ' divider'` constant at `src/editor/ui/colors/HarmonyAxesList.svelte:10`); that file is rewritten in Wave 4 and the sentinel pattern must not survive.

## What this builds (the model)

Today harmony is a **dense ordered list of families**: `EditorState.harmonyOrder: string[]` (`src/editor/core/store/editorTypes.ts:140`), persisted as `Theme.harmonyOrder?: string[]` (`src/editor/core/themes/themeTypes.ts:88`), written only by `setHarmonyOrder` (`src/editor/ui/colors/paletteBaseColor.ts:86`). The wheel handle *is* the family; slot 0's family is the anchor; a family off the list has no wheel presence.

The redesign inverts this: **four fixed axes — Anchor, Secondary, Tertiary, Quaternary — each own a hue**, independent of colors. A color family may **bind live** to an axis: it adopts the axis hue and follows the axis thereafter. An unbound axis still has a hue (visible as a swatch and a wheel handle) so the user previews what a dropped color would become. Harmony becomes an optional group-editing tool, usable with zero colors attached.

### New data shape (the crux)

```ts
// src/editor/core/palettes/colorHarmony.ts
export const AXIS_COUNT = 4;
export const AXIS_ROLES = ['Anchor', 'Secondary', 'Tertiary', 'Quaternary'] as const;

export interface HarmonyAxis {
  /** Hue in [0, 360). Always present, bound or not. */
  hue: number;
  /** Bound family label (member of HARMONY_ELIGIBLE), or null when the axis is empty. */
  family: string | null;
}

// EditorState gains (and harmonyOrder is deleted in Wave 2):
harmonyAxes: HarmonyAxis[];        // invariant: length === AXIS_COUNT, index = axis role

// Theme gains (additive; harmonyOrder stays in the type as a deprecated legacy field):
harmonyAxes?: HarmonyAxis[];
```

One array of `{ hue, family }` objects — not parallel `axisHues`/`axisFamilies` arrays — so a hue and its binding can never skew apart by index, `structuredClone`/JSON round-trips are trivial, and gaps are just `family: null`. Fixed length 4 (enforced by the sanitizer, not the type system) keeps "sparse with gaps" natural: a family in Tertiary with Secondary empty is `axes[2].family === 'Tertiary-family'`, `axes[1].family === null`.

### The seven design decisions, resolved

1. **Data shape:** `harmonyAxes: HarmonyAxis[]` as above, replacing `harmonyOrder: string[]`. Index **is** axis identity (0 = Anchor … 3 = Quaternary). Rationale: `applyHarmony` already deals `harmonyHues(mode, a, n)[i]` to position `i` (`colorHarmony.ts:88`); keying hues by axis index just removes the dense-list indirection. One object per axis, no parallel arrays, no sentinel entries.

2. **Live-binding source of truth: kept in sync, enforced at the single write path.** The family's `baseColor.h` remains what the derivation pipeline and `cssVarSync` consume (untouched). The coherence invariant is: *for every bound axis, `axes[i].hue === palettes[family].baseColor.h` (normalized)*, maintained in both directions inside `paletteBaseColor.ts` mutations:
   - Axis-originated writes (mode apply, axis drag, global rotate, bind) set `axes[i].hue` **and** the bound family's `baseColor.h` in the **same `mutate`/`transaction`** — one undo step, one store emission, `cssVarSync` fan-out unchanged.
   - Color-originated hue writes (`setBaseColor`, `setBaseHueChroma`, `setBaseHue` in `paletteBaseColor.ts`) sync the bound axis's hue in the same `mutate` (the handle is the color's handle while bound). `setBaseChroma`/`setBaseLightnessChroma` don't touch hue and need no sync.

3. **Unbound axis hue: stored in `axes[i].hue`**, persisted in the theme, rendered as the axis swatch and wheel handle. A mode re-arranges bound and unbound axes identically: `applyHarmonyToAxes(mode, axes)` sets all four hues from `harmonyHues(mode, axes[0].hue, AXIS_COUNT)`; only bound families additionally get a `baseColor.h` write.

4. **Anchor with no bound color:** the anchor hue is simply `axes[0].hue` — a stored value, valid regardless of binding. The old "at least one family assigned" floor and the missing-anchor `return {}` guard in `applyHarmony` (`colorHarmony.ts:84-85`) disappear: modes always work; they may move zero colors. `tintNeutralsFromAnchor` takes the anchor **hue** (`axes[0].hue`), not an order.

5. **Sparse slots with gaps:** `family: null` entries at any index; hues are keyed by axis index, so a family bound to Tertiary gets slot-2 geometry whether or not Secondary is occupied. At most one family per axis and one axis per family (sanitizer drops later duplicates).

6. **Migration (additive, non-destructive):** `Theme.harmonyAxes` is a new optional field. On load: present → sanitize; absent → derive from legacy `Theme.harmonyOrder` (absent legacy field → the default order), binding `order[i]` to axis `i` **seeded at that family's current `baseColor.h`** — so every existing theme loads with byte-identical color state and identical harmony behavior. Loading never rewrites the file. Saving writes `harmonyAxes` plus a derived legacy `harmonyOrder` (bound families in axis order) so older builds still open re-saved themes.

7. **Wheel semantics: handles are axes; the swatch-row dot means "bound".** All four axes always render an external rotate handle (unbound ones visually distinct); only bound axes render an inner chroma dot + solid rail (chroma belongs to a color, not an axis). Ghost preview, global rotate, and per-axis drag operate on all four axes. `ColorsTab`'s `onWheel` flag becomes `axes.some((a) => a.family === spec.label)`.

### Renamed API surface

| Old (shipped) | New | Fate of old symbol |
|---|---|---|
| `harmonyOrder: string[]` (EditorState) | `harmonyAxes: HarmonyAxis[]` | deleted in Wave 2 |
| `Theme.harmonyOrder?: string[]` | `Theme.harmonyAxes?: HarmonyAxis[]` | old field kept in the type, deprecated (read on load, written as compat) |
| `DEFAULT_HARMONY_ORDER` | `defaultHarmonyAxes(): HarmonyAxis[]` | unexported in Wave 4 (private legacy constant used only by `axesFromLegacyOrder`) |
| `sanitizeHarmonyOrder(input)` | `sanitizeHarmonyAxes(input, palettes)` + `axesFromLegacyOrder(order, palettes)` | unexported in Wave 4 (folded into `axesFromLegacyOrder`) |
| `applyHarmony(mode, palettes, order)` | `applyHarmonyToAxes(mode, axes)` + `boundColorPatch(axes, palettes)` | deleted in Wave 3 (last consumer: `ColorsTab.svelte:55`) |
| `tintNeutralsFromAnchor(palettes, order)` | `tintNeutralsFromAnchor(palettes, anchorHue: number)` | signature changes in Wave 3 |
| `setHarmonyOrder(order)` (`paletteBaseColor.ts:86`) | `setAxisHue` / `setAxisHues` / `bindFamilyToAxis` / `unbindFamily` | legacy-semantics shim during Waves 2–3, deleted in Wave 4 |
| `harmonyHues(mode, anchorHue, slotCount)` | **unchanged** | keep — geometry and pinning tests are correct |
| `HARMONY_ELIGIBLE` | **unchanged** | keep — dev-declared pool |

New store write path (all in `src/editor/ui/colors/paletteBaseColor.ts`, mirroring its existing header contract):

```ts
/** Set one axis's hue; a bound family's baseColor follows in the same mutate.
 *  familyChroma carries the wheel drag's chroma policy; omitted = chroma kept. */
export function setAxisHue(index: number, hue: number, familyChroma?: number): void;

/** Several axis hues in ONE transaction (mode apply, keyboard rotate-all). */
export function setAxisHues(
  entries: { index: number; hue: number; familyChroma?: number }[],
  historyLabel: string,
): void;

/** Bind a family to an axis; the family adopts the axis hue (c + L kept).
 *  Trade-places semantics: whatever occupied the destination takes the source's
 *  position (another axis, adopting its hue, or Unassigned). One mutate. */
export function bindFamilyToAxis(family: string, index: number): void;

/** Unbind; the family keeps its current color, the axis keeps its hue. */
export function unbindFamily(family: string): void;
```

Every setter **early-returns when the result equals current state** (compare before calling `mutate`) — this fixes the shipped nit where a no-op drop still pushed an empty undo entry (`mutate` in `editorCore.ts:259` has no identity dedupe; the guard belongs at the action layer, not in `mutate`).

## Commit-unit protocol

One wave = one commit. Run the wave's verification green before committing; never commit red. Commit message `Harmony axes W<n>: <summary>` plus the standard co-author trailer. Run the Svelte MCP autofixer (`mcp__plugin_svelte_svelte__svelte-autofixer`) on every edited `.svelte` file before the wave's final check. Do not push, tag, or release. Stop after each wave for review. If reality contradicts this plan (a cited symbol is missing, a test pins conflicting behavior), stop and report rather than improvise.

## Global invariants (reviewer checklist)

1. **Coherence:** for every bound axis, `axes[i].hue === palettes[axes[i].family].baseColor.h` (normalized). Maintained by every write path, both directions.
2. **Single store path:** every axis/binding/color change goes through `paletteBaseColor.ts` setters into `mutate`/`transaction`; no parallel state; `cssVarSync` iframe fan-out untouched.
3. **Geometry preserved:** `harmonyHues` and its pinning tests (`colorHarmony.test.ts:23-46`) are untouched. Per-family harmony output for the default setup stays exactly today's values (the literal offset table at `colorHarmony.test.ts:97-117` is retargeted at the new composition, never weakened).
4. **Old themes load identically:** absent `harmonyAxes` derives from legacy `harmonyOrder` (absent → default) with hues seeded from the loaded palettes; no destructive writes on load; no theme-file migration entry needed (additive optional field).
5. **Hue-only:** harmony code never writes chroma or lightness. The only chroma writes are the wheel's existing drag policies (absolute-chroma toggle, chroma rail), unchanged in meaning.
6. **Wheel truthfulness:** four handles, always, one per axis; the swatch-row dot appears iff the family is bound to an axis; inner chroma dots exist only for bound axes.
7. **No empty undo steps:** every UI action that can be a no-op is guarded before `mutate`.
8. **No new theme tokens.** Editor chrome stays greyscale and tokenized (`--ui-*`); UI copy has short sentences and no em-dashes; comments state only non-obvious WHYs.
9. **Out-of-bounds untouched:** `emptyStep`/background spot strip, `solveTextCurves`, Color Story, and the history machine (`editorCore.ts`) are not modified.

---

## Wave 1 — core: axis data model in `colorHarmony.ts` (pure, additive)

**Goal:** the new types and pure functions exist and are fully tested; nothing consumes them yet. Old exports stay intact so every call site compiles unchanged.

Files: `src/editor/core/palettes/colorHarmony.ts`, `src/editor/core/palettes/colorHarmony.test.ts`, `src/editor/core/store/editorTypes.ts`, `src/editor/core/themes/themeTypes.ts`, `src/editor/core/store/editorStore.ts` (one line in `emptyState`).

1. `colorHarmony.ts` — add (keep `HarmonyMode`, `HARMONY_ELIGIBLE`, `harmonyHues`, `reHue`, and — temporarily — `DEFAULT_HARMONY_ORDER`, `sanitizeHarmonyOrder`, `applyHarmony`, `tintNeutralsFromAnchor` exactly as they are):
   - `AXIS_COUNT`, `AXIS_ROLES`, `interface HarmonyAxis` as specified above.
   - `defaultHarmonyAxes(): HarmonyAxis[]` — Brand bound at 25.49, Accent at 70.44, Background at 282.93 (read the hues from `PALETTE_SPECS` `initialColor` in `paletteDerivation.ts:41-43`, do not hardcode; `paletteDerivation` does not import `colorHarmony`, so no cycle), Quaternary unbound at `norm(anchorHue + 270)`. Returns a fresh array each call (it seeds mutable state).
   - `applyHarmonyToAxes(mode: HarmonyMode, axes: HarmonyAxis[]): HarmonyAxis[]` — `'custom'` returns a copy unchanged; otherwise families preserved, `hue[i] = harmonyHues(mode, axes[0].hue, AXIS_COUNT)[i]`.
   - `boundColorPatch(axes: HarmonyAxis[], palettes: Record<string, PaletteConfig>): Record<string, Oklch>` — for each bound axis whose palette exists, `reHue(config, axis.hue)`. Skips unbound axes and missing configs.
   - `sanitizeHarmonyAxes(input: unknown, palettes: Record<string, PaletteConfig>): HarmonyAxis[]` — non-array → `defaultHarmonyAxes()` reconciled against `palettes`; else coerce to exactly `AXIS_COUNT` entries (truncate extras; pad missing indexes from `defaultHarmonyAxes()`); per entry: `family` must be a string in `HARMONY_ELIGIBLE` not already used at a lower index (else `null`), `hue` must be a finite number (else the default axis hue for that index), normalized to [0, 360). Finally reconcile the coherence invariant: for each bound axis whose palette exists, `hue := palettes[family].baseColor.h` normalized (the color is ground truth on load; the axis snaps to its color).
   - `axesFromLegacyOrder(order: unknown, palettes: Record<string, PaletteConfig>): HarmonyAxis[]` — run the existing `sanitizeHarmonyOrder` rules on `order` (invalid/absent → default trio), bind `order[i]` to axis `i` at `palettes[family].baseColor.h` (fallback: the family's `PALETTE_SPECS` `initialColor.h`), remaining axes unbound at `defaultHarmonyAxes()` hues (Quaternary offset computed from the migrated axis-0 hue, not the default anchor).
   - Update the file-header comment for the axis model (anchor = axis 0's stored hue).
2. `editorTypes.ts` — `EditorState` gains `harmonyAxes: HarmonyAxis[]` with doc comment "Four fixed axes (index = role: Anchor/Secondary/Tertiary/Quaternary); each owns a hue; family is the live-bound color or null." Keep `harmonyOrder` for now with a `/** Legacy; removed in Wave 2. */` note.
3. `themeTypes.ts` — `Theme` gains `harmonyAxes?: HarmonyAxis[]` (import the type); reword the `harmonyOrder` doc comment (line 85-88) to "Deprecated legacy field. Read when `harmonyAxes` is absent; written on save for older builds."
4. `editorStore.ts` `emptyState()` (line 73) — add `harmonyAxes: defaultHarmonyAxes(),` beside the existing `harmonyOrder` seed (line 92). Nothing reads it yet; the two coexist only between the W1 and W2 commits.
5. Tests (`colorHarmony.test.ts` — extend; every existing test stays byte-identical):
   - `defaultHarmonyAxes`: shape (length 4, roles by index, Quaternary unbound at anchor+270, hues match `PALETTE_SPECS`).
   - `applyHarmonyToAxes`: pins each mode's four axis hues against the `harmonyHues` slot table; `'custom'` unchanged; gap case (Secondary unbound) still deals slot-2 geometry to the Tertiary binding.
   - `boundColorPatch`: bound families re-hued with own c+L kept; unbound axes and missing palettes produce no keys; a fully-unbound axes array → `{}`.
   - **Bridge equivalence (deleted with old `applyHarmony` in Wave 3):** for every non-custom mode, `boundColorPatch(applyHarmonyToAxes(mode, axesFromLegacyOrder(['Brand','Accent','Background'], palettes)), palettes)` equals `applyHarmony(mode, palettes)` exactly. This is the default-order pinning carried into the new model.
   - `sanitizeHarmonyAxes`: one test per rule (non-array, truncate/pad, ineligible family, duplicate family, non-finite hue, hue normalization, bound-hue reconciliation to the palette).
   - `axesFromLegacyOrder`: default trio from `undefined`; `['Accent','Brand','Special']` binds axes 0-2 at those families' palette hues with axis 3 unbound; `['Danger','Brand','Brand']` → only Brand bound (axis 0); missing palette falls back to spec initial hue.

**Verification:** `npx vitest run src/editor/core/palettes/colorHarmony.test.ts`, then `npm run check`, then `npm test`.

**Commit:** `Harmony axes W1: axis data model in colorHarmony (pure core)`

## Wave 2 — state flip + persistence + migration

**Goal:** `harmonyAxes` becomes the **only** harmony state. `EditorState.harmonyOrder` is deleted; every consumer is adapted (mechanically for the UI, which gets its real rewrite in Waves 3-4); themes and localStorage round-trip and migrate.

Files: `src/editor/core/store/editorTypes.ts`, `src/editor/core/store/editorStore.ts`, `src/editor/core/store/editorPersistence.ts`, `src/editor/ui/colors/paletteBaseColor.ts`, `src/editor/ui/colors/ColorWheel.svelte`, `src/editor/ui/colors/ColorsTab.svelte`, `src/editor/ui/colors/HarmonyAxesList.svelte`, `src/editor/core/store/editorStore.test.ts`.

1. `editorTypes.ts` — delete `harmonyOrder` from `EditorState` (line 139-140).
2. `editorStore.ts`:
   - `emptyState()` — delete the `harmonyOrder` seed (line 92); drop the now-unused `DEFAULT_HARMONY_ORDER`/`sanitizeHarmonyOrder` imports (line 33) in favor of `defaultHarmonyAxes`, `sanitizeHarmonyAxes`, `axesFromLegacyOrder`.
   - `loadFromFile` (line 516) — replace line 535 with:
     ```ts
     next.harmonyAxes = theme.harmonyAxes
       ? sanitizeHarmonyAxes(theme.harmonyAxes, next.palettes)
       : axesFromLegacyOrder(theme.harmonyOrder, next.palettes);
     ```
     (after `next.palettes` is populated, which it already is at that point).
   - `toTheme` (line 551) — replace `harmonyOrder: state.harmonyOrder` (line 569) with `harmonyAxes: state.harmonyAxes` plus the compat field: bound families in axis order, **omitted when no family is bound** (an empty legacy list would round-trip to the default trio on an old build — worse than absent). Comment the WHY in one line.
3. `editorPersistence.ts` — add `normalizeHarmonyAxes(state): EditorState` beside `normalizeComponents`/`migrateGradients` and call it in `hydrate()`'s normalization chain, then delete the stale `harmonyOrder` key from the merged object. **As implemented (W2, review-approved deviation):** the branch keys on the presence of a legacy `harmonyOrder` key in the persisted state — legacy present → `axesFromLegacyOrder(order, state.palettes)`; else → `sanitizeHarmonyAxes(state.harmonyAxes, state.palettes)`. The originally drafted condition ("harmonyAxes is a valid array → sanitize") was dead-on-arrival: `hydrate` shallow-merges persisted state over `emptyState()`, which always seeds default axes, so the sanitize path would always win and silently discard a mid-upgrade session's custom `harmonyOrder` arrangement. Key-presence is the definitive pre-axes signal because no post-W2 path ever writes `harmonyOrder` into persisted store state.
4. `paletteBaseColor.ts`:
   - Add `setAxisHue`, `setAxisHues`, `bindFamilyToAxis`, `unbindFamily` per the API spec above. History labels: `` `colors: ${AXIS_ROLES[index]} axis hue` ``, caller-supplied for `setAxisHues`, `` `colors: bind ${family}` ``, `` `colors: unbind ${family}` ``. Each guards no-op before mutating (invariant 7).
   - Two-way sync: add a private `syncBoundAxisHue(s: EditorState, label: string): void` (find the axis bound to `label`; set its hue to the family's new `baseColor.h`) and call it at the end of the write callbacks in `setBaseColor`, `setBaseHueChroma`, and `setBaseHue`. One WHY comment: direct color edits must not silently detach the handle from its color.
   - Replace `setHarmonyOrder`'s body with a **legacy-semantics shim** (deleted in Wave 4, mark it so): one `mutate('colors: harmony axes', …)` that sets `axes[i] = { family: order[i] ?? null, hue: order[i] ? s.palettes[order[i]].baseColor.h : axes[i].hue }` for i in 0..3 — i.e. the old reorder behavior, where assignment changes but **no color's hue moves** (parity with today: reordering never re-hued anything until a mode was re-applied). No-op guarded.
5. Minimal mechanical UI adaptations (behavior-identical; real rewrites are Waves 3-4). Define the shared expression `boundOrder = axes.filter((a) => a.family !== null).map((a) => a.family!)`:
   - `ColorWheel.svelte:31` — `wheelLabels` derives `boundOrder` from `$editorState.harmonyAxes`.
   - `ColorsTab.svelte` — add a `boundOrder` `$derived`; `applyMode` (line 55) and `tintNeutrals` (line 60) pass it to the old `applyHarmony`/`tintNeutralsFromAnchor` signatures; the swatch flag (line 75) becomes `$editorState.harmonyAxes.some((a) => a.family === spec.label)`.
   - `HarmonyAxesList.svelte:23` — `assigned` derives `boundOrder`. Everything else in the file stays (it dies in Wave 4).

   Parity note for the reviewer: legacy load maps `order[i]` → axis `i`, so `boundOrder` reproduces the old `harmonyOrder` exactly for every migrated theme.
6. Tests (`editorStore.test.ts` — rework the `harmonyOrder persistence round-trip` describe at line 279 into `harmonyAxes persistence + migration`, reusing its `baseTheme` helper; keep the old test *intents*, retargeted):
   - Theme with neither field loads default bindings (Brand/Accent/Background bound, Quaternary unbound) with hues seeded from loaded palettes (provide `editorConfigs` so seeding is observable).
   - Legacy `harmonyOrder: ['Accent','Brand','Special']` → axes 0-2 bound to those families at their palette hues, axis 3 unbound.
   - Legacy invalid `['Danger','Brand','Brand']` → only Brand bound.
   - `toTheme` → `loadFromFile` round-trips a sparse layout (Secondary unbound, Tertiary bound) including unbound hues; saved theme also carries the compat `harmonyOrder` equal to the bound list, and omits it when nothing is bound.
   - A hand-edited `harmonyAxes` whose bound hue disagrees with the palette reconciles to the palette hue on load.
   - New setter behavior: `bindFamilyToAxis` adopts the axis hue into `baseColor.h` in one history entry (`__getHistoryLengths`); trade-places on an occupied axis; `unbindFamily` keeps the color; `setAxisHue` on a bound axis moves both hue fields in one entry; a no-op `bindFamilyToAxis`/`setAxisHue` adds **no** history entry; a direct `setBaseHue` on a bound family drags the axis hue along.
7. Check `__snapshots__`/fixtures for shape assertions on `EditorState`/`Theme`; update only after confirming the diff is exactly the field swap.

**Verification:** `npm run check`, `npm test`. Svelte autofixer on the three edited `.svelte` files.

**Commit:** `Harmony axes W2: store flips to harmonyAxes; persistence + migration`

## Wave 3 — wheel + ColorsTab operate on axes

**Goal:** wheel handles are the four axes (unbound included); per-axis drag is "set this axis's hue" with the bound family following; ghosts/global-rotate/mode-apply run off axes; old `applyHarmony` is deleted. Default themes look identical except for one intended addition: a fourth (unbound) axis handle.

Files: `src/editor/ui/colors/ColorWheel.svelte`, `src/editor/ui/colors/ColorsTab.svelte`, `src/editor/core/palettes/colorHarmony.ts`, `src/editor/core/palettes/colorHarmony.test.ts`, `src/editor/ui/colors/paletteBaseColor.ts` (imports only).

1. `ColorWheel.svelte`:
   - Replace `wheelLabels`/`wheelSpecs` (lines 31-36) with an axis-first derivation: for each `i` in 0..3, `{ index: i, role: AXIS_ROLES[i], family, hue, bound }` where a bound axis reads `hue`/`chroma`/`lightness`/`hex` from the family's `baseColor` (equal to `axes[i].hue` by invariant 1) and an unbound axis carries only `axes[i].hue`. `#each` keys become the axis index.
   - Rendering: bound axes render as today (solid rail, inner chroma dot, external handle, tether). Unbound axes render tether + external handle only — no inner dot, no solid rail — with a distinguishing `unbound` class (hollow/dashed greyscale treatment; see Reserved judgment call 6). `aria-label`: `` `Rotate ${role} axis hue` `` and, when bound, mention the family.
   - Per-axis drag (`startAxisDrag`/`applyAxis`, lines 263-280): keyed by axis index. Still calls `onCustomize()` (mode detaches to `custom` — mechanic kept, now axis-general) and `onSelect(family)` only when bound. Per-frame write: `setAxisHue(index, angle, bound ? chromaPerPolicy : undefined)` where `chromaPerPolicy` reproduces `writeRotation` (line 257): absolute-chroma on → `chroma0`; off → `rFrac0 * maxChroma(l0, newHue)`. Unbound drags carry no chroma. Gesture scope/Escape-cancel machinery unchanged.
   - Global rotate (`startGlobalDrag`/`applyGlobal`, lines 283-302): capture `RotateStart` per **axis** (hue0 always; chroma intent only when bound); per-frame, `setAxisHue` for all four axes inside the existing clipping scope (collapses to one undo). Keyboard `rotateAll` (line 336) becomes one `setAxisHues(entries, 'colors: rotate all')` transaction covering all four axes.
   - Ghosts (lines 130-142): `harmonyHues(previewMode, axes[0].hue, AXIS_COUNT)`; bound axes as today (family chroma radius, skip when stationary); unbound axes preview as a small marker on the external track at the target hue (skip when stationary).
   - Keyboard: `axisKey` → `setAxisHue(index, hue + dir * HUE_STEP, …)` with the same chroma policy; `dotKey` unchanged (dots exist only for bound axes). The `Props.onCustomize` doc comment gets a one-line update.
2. `ColorsTab.svelte`:
   - Delete the `boundOrder` shim. `applyMode` becomes: `const target = applyHarmonyToAxes(mode, $editorState.harmonyAxes); setAxisHues(target.map((a, i) => ({ index: i, hue: a.hue })), \`colors: harmony ${mode}\`);` — hue-only, bound families follow inside the transaction, no-op guarded (re-applying the current geometry pushes nothing).
   - `tintNeutrals` → `tintNeutralsFromAnchor($editorState.palettes, $editorState.harmonyAxes[0].hue)`.
   - `selected = 'Brand'` (line 26) stays: it is a family selection, orthogonal to axes; add nothing.
3. `colorHarmony.ts` — delete the old `applyHarmony` (its last consumer is gone); change `tintNeutralsFromAnchor` to `(palettes, anchorHue: number)` (hue in, not order). `DEFAULT_HARMONY_ORDER`/`sanitizeHarmonyOrder` remain exported for the Wave 2 shim until Wave 4.
4. `colorHarmony.test.ts` — delete the bridge-equivalence test and the old `applyHarmony` describe, **retargeting its literal pinning table** (lines 97-117) at the composition `boundColorPatch(applyHarmonyToAxes(mode, axes), palettes)` with default-shaped axes: same literal offsets, same per-family assertions (never weakened). Port the non-Brand-anchor, 4-slot-square, unlisted-family-untouched, and missing-config cases to axis shapes. Update `tintNeutralsFromAnchor` tests to the hue signature.
5. Manual QA note for the reviewer: default theme → wheel shows the familiar three colored handles plus one unbound Quaternary handle at anchor+270; dragging it moves no color and detaches to custom; hovering square shows four ghosts; global rotate carries all four axes; one undo per gesture; re-applying the active mode is not an undo step.

**Verification:** `npm run check`, `npm test`. Svelte autofixer on both edited components.

**Commit:** `Harmony axes W3: wheel + ColorsTab operate on axes`

## Wave 4 — axes list UI (bind / unbind / move) + legacy cleanup

**Goal:** rewrite `HarmonyAxesList.svelte` around four fixed axis rows with hue swatches and an Unassigned pool; drag and keyboard paths for bind/unbind/move; delete every legacy symbol.

Files: `src/editor/ui/colors/HarmonyAxesList.svelte` (full rewrite), `src/editor/ui/colors/ColorsTab.svelte` (copy), `src/editor/ui/colors/paletteBaseColor.ts`, `src/editor/core/palettes/colorHarmony.ts`, `src/editor/core/palettes/colorHarmony.test.ts`.

1. `HarmonyAxesList.svelte` — rewrite. No `' divider'` sentinel, no local mirror of store state; slots are modeled explicitly:
   - **Four fixed axis rows** (index 0-3), always rendered: role label (`AXIS_ROLES[i]`), an **axis hue swatch** — `oklchToHexClamped(0.65, 0.12, axes[i].hue)` for unbound rows (constant preview L/C, see Reserved judgment call 4); the family's own `baseColor` hex for bound rows — then either the bound family's draggable chip + name, or an "Empty" placeholder in `--ui-text-muted`.
   - **Unassigned section** below (eyebrow `Unassigned`): every `HARMONY_ELIGIBLE` family not currently bound, as draggable chips (family `baseColor` hex + name).
   - **Drag:** family chips use the HTML5 drag pattern already in the current file (`application/x-…` payload, drop-target highlight); drop targets are the four axis rows and the Unassigned section. Drop on an axis → `bindFamilyToAxis(family, index)` (trade-places per the setter's contract); drop on Unassigned → `unbindFamily(family)`. Self-drop is a no-op (guarded; no undo entry).
   - **Keyboard:** each chip is a focusable `<button>`. Positions form the sequence [Anchor, Secondary, Tertiary, Quaternary, Unassigned]. `ArrowUp`/`ArrowDown` move the focused family one position (into an occupied axis = trade places; below Quaternary = unbind; from Unassigned up = bind to Quaternary). `Delete`/`Backspace` on a bound chip unbinds. `aria-label` states the current position and the keys.
   - **Focus indicator (fix the shipped nit):** `:focus-visible` on chips gets a visible ring — `outline: 2px solid var(--ui-border-higher); outline-offset: 2px;` — never a color-only change (the current file's `.drag-handle:focus-visible` at line 258 sets `outline: none` + color; do not reproduce that).
   - All writes go through `bindFamilyToAxis`/`unbindFamily` only. Styling greyscale + `--ui-*` tokens, row text `--ui-font-size-sm`, visual weight matching the existing blocks; `animate:flip` may be kept. Comments: non-obvious WHYs only.
2. `ColorsTab.svelte` — rewrite the `axes-desc` copy (line 220), which still describes the divider model. New copy (short sentences, no em-dashes): "Each axis owns a hue. Drop a color on an axis to bind it. The color adopts the axis hue and follows the axis. Drag a color to Unassigned to let it float free."
3. Legacy deletion:
   - `paletteBaseColor.ts` — delete the `setHarmonyOrder` shim and its `sanitizeHarmonyOrder` import.
   - `colorHarmony.ts` — stop exporting `sanitizeHarmonyOrder` and `DEFAULT_HARMONY_ORDER`; keep them as private helpers of `axesFromLegacyOrder` (rename to `sanitizeLegacyOrder`/`LEGACY_DEFAULT_ORDER` locally). `HARMONY_ELIGIBLE` stays exported.
   - `colorHarmony.test.ts` — fold the `sanitizeHarmonyOrder` describe (line 186) into `axesFromLegacyOrder` coverage (same rule intents through the public surface).
   - Grep-verify: `grep -rn "harmonyOrder\|setHarmonyOrder\|sanitizeHarmonyOrder\|DEFAULT_HARMONY_ORDER" src` must hit only `themeTypes.ts` (deprecated theme field), `colorHarmony.ts` internals, `loadFromFile`/`toTheme`/`normalizeHarmonyAxes` migration reads/writes, and their tests.
4. Manual QA pass (dev server, usually `localhost:5174`): bind Special to Quaternary (it barely moves: 292.72 → the axis hue); the swatch row gains its dot; apply square (Special lands on anchor+270); unbind Background (it floats; modes leave it alone; dot disappears; the Tertiary axis keeps its hue and swatch); keyboard-only bind/move/unbind round trip; every committed gesture is exactly one undo step and no-op drops add none; save, reload, and confirm the sparse layout persisted; load a pre-redesign theme and confirm identical colors and bindings.

**Verification:** `npm run check`, `npm test`, Svelte autofixer on both edited/created components, plus the manual pass above.

**Commit:** `Harmony axes W4: axes list UI (bind/unbind) + legacy cleanup`

---

## Reserved judgment calls (decided — do not re-litigate; anything outside this list: stop and ask)

1. **Quaternary default hue** is `norm(anchorHue + 270)` — the slot-3 offset of square, the only default-adjacent four-hue mode, and coincidentally near Special's initial hue (292.72) so the obvious fourth binding is nearly a no-op.
2. **Occupied-target semantics are trade-places**, uniformly: the moved family and the occupant exchange positions (an exchanged position may be Unassigned); each newly bound family adopts its new axis's hue; axis hues never change from binding operations. One transaction per gesture.
3. **Direct hue edits to a bound family move the axis with it** (`syncBoundAxisHue`). Binding is symmetric-live, not one-way.
4. **Unbound swatch preview constants** are `l: 0.65, c: 0.12`. Fixed values; do not invent alternatives or per-axis variation.
5. **`toTheme` writes both fields**: `harmonyAxes` always; compat `harmonyOrder` = bound families in axis order, omitted when empty (an empty legacy list would resurrect the default trio on old builds).
6. **Styling latitude** exists only for the exact visual treatment of unbound wheel handles, unbound ghosts, and list chrome — within greyscale `--ui-*` token rules. Semantics (what renders, what it means, what writes) have none.
7. The `harmonyHues` slot table, hue-only rotation, `emptyStep`/spot strip, `solveTextCurves`, Color Story, and the history machine are untouched, as in the shipped plan.
8. If a cited symbol or line has drifted from this doc, stop and report; never improvise a different model.

## Out of scope (explicitly)

- Auto-fill/auto-sort of axes, per-slot preview machinery beyond the hue swatch, more than four axes.
- New theme tokens; user-editable eligibility (`HARMONY_ELIGIBLE` stays dev-declared).
- Auto-applying a harmony mode on bind/unbind/move.
- Deleting branch `harmony-axes-ui-experiment` (user's call after the redesign lands).
- Push, tag, or release.
