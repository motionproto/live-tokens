# Execution plan: OKLCH-native color system

Package `@motion-proto/live-tokens` v0.40.1 (pre-1.0), branch `light-first-theming` (worktree `live-tokens-light-first`). Two parts:

- **Part A (Waves 1–2):** numeric OKLCH becomes the stored + edited basis. This alone fixes the slider/wheel flicker and deletes the workarounds.
- **Part B (Waves 3–5):** CSS serialization flips to `oklch()`. Gated on a separate, explicit go decision after Part A ships and passes QA.

Each wave is a single commit unit executable by a sub-agent with only this doc and the repo.

## The model (vocabulary for this doc)

Three layers. The words matter; earlier drafts blurred them.

- **Basis** — numeric OKLCH `{ l, c, h }` (the `Oklch` interface in `src/editor/core/palettes/oklch.ts`). The only representation colors are stored, edited, and computed in: theme JSON (`baseColor`, `overrides`), the editor store, derivation math, solver inputs.
- **Projections** — renderings of the basis. Always derived, never fed back:
  - *CSS serialization*: the string written to the live `:root` and generated CSS. Hex today (Part A keeps it); `oklch()` after Part B.
  - *Display*: what readouts show. The primary display is OKLCH numbers (sliders, wheel position, numeric readouts). **Hex is a legacy projection**: a secondary readout plus the text-field input, parsed to OKLCH at the boundary on commit. Other formats (RGB, HSL, P3) can slot in later behind the same formatter; building them is out of scope.
- **Input boundaries** — external strings entering the system (the hex text field, the EyeDropper, an imported theme's `cssVariables` bag). Parsed to numeric OKLCH exactly once, at the boundary.

Terminology: write **OKLCH**, never "LCH" (CIE LCh is a different color space). Say "hex projection", never "the hex value" as if hex were a basis.

## Background (why)

Base colors are stored as 8-bit hex and every editor control re-derives its numbers from that hex each frame. The round-trip is lossy twice over: 8-bit quantization, and gamut clamping baked into every setter, so chroma and hue intent are destroyed at the extremes. Verified mechanism of the twitch: the sliders emit numeric OKLCH, the code immediately serializes to hex to store it, then re-parses per frame —

- `ColorsTab.svelte:165` — `onHueChromaChange={(h, c, l) => setBaseColor(selected, oklchToHexClamped(h, c, l))}`
- `PaletteEditor.svelte:502` — `onBaseChange={(h, c, l) => edit('baseColor', oklchHex(h, c, l))}`
- `PaletteEditor.svelte:680` — `{@const oc = hexToOklch(editingColor)}` re-derives the override-panel slider positions from the hex draft on every change (the override panel has the same twitch class as the base sliders)
- every setter in `paletteBaseColor.ts` gamut-clamps, serializes to hex, stores; consumers `hexToOklch` it back

Workarounds currently patching this, all deleted in Wave 2: gesture-intent pinning in `LightnessBar.svelte`, the `liveEdit` bar→wheel intent channel (`colorWheelMath.ts` + `ColorWheel.svelte`), the pinned-hue write guard in `setBaseLightnessChroma`.

Key finding: derivation already computes entirely in OKLCH (`computePaletteColor` / `computeDerivedColor` in `paletteDerivation.ts`) and touches hex only at the final serialization step. Part A is storage + boundary work, not a math rewrite. The UI event interfaces (`ColorEditPanel`'s `onHueChromaChange`, `commitHex`'s parse-at-boundary) are already OKLCH-native; storage is the single hex chokepoint.

## Decisions (user-confirmed)

1. **OKLCH is the single basis** — stored, edited, computed. Hex never lives in the store or theme JSON.
2. **The store holds unclamped user intent.** No setter gamut-clamps before writing. `gamutClamp` is projection-only: per-step derivation output, swatch/strip/canvas rendering, hex display, CSS serialization, and the solver's sRGB adapter. This is what makes deleting the workarounds safe — numeric storage with clamp-on-write would regress to chroma collapse when an absolute-chroma L drag passes an extreme. Bonus fix: today chroma is permanently lost *across* gestures after releasing at an L extreme; with unclamped intent it recovers.
3. **Numeric readouts and slider/handle positions reflect stored intent; rendered swatches and the hex readout show the sRGB projection** (clamped). The dot may sit at the gamut edge while the stored chroma is larger; that is correct, and consistent with the existing "gamut is display-only" invariant in `colorWheelMath.ts`.
4. **Hex is a legacy projection.** Secondary readout + text-field input, parsed to OKLCH at the boundary (`ColorEditPanel.commitHex` already does this correctly). Not a guarantee the system upholds.
5. **Storage precision:** theme JSON stores `l`, `c` to 4 decimals, `h` to 2 — beyond sub-LSB fidelity, keeps file diffs stable.
6. **Opacity untouched:** `color-mix(in srgb, var(--token) NN%, transparent)` mixes on the var reference, so it is value-format-agnostic. Moving to `in oklch` is a deliberate visual change, out of scope.
7. **WCAG contrast stays sRGB-terminated** (relative luminance is sRGB-defined). The solver converts numeric OKLCH → hex at its own boundary; `contrast.ts` stays hex-based.
8. **Part B is a separate go/no-go** (see Part B header). The model no longer argues for keeping hex serialization, but the migration cost is its own decision.
9. **Hex companion output: deferred.** Not a system promise; revisit if a consumer asks. Part B's generated CSS may carry inline hex comments for human readability — a nicety, not API.

## Invariant revisions (from the light-first-theming plan — intentionally changed)

1. "`PaletteConfig` shape unchanged" → **revised**: `baseColor` + `overrides` become numeric OKLCH; ships with a theme-JSON migration.
2. "Existing themes render byte-identically" → **"within ~1 LSB, migration-gated"** (hex→OKLCH round-trip). Precedent: the palette-unification migration was a sub-1-LSB shift.
3. "No token vocabulary changes / no migration" → Part A ships a theme-JSON storage migration; Part B additionally ships a breaking `tokens.css` value migration and a version bump.

## Commit-unit protocol

One wave = one commit. Run the wave's verification green before committing; never commit red. Commit message `OKLCH W<n>: <summary>` + the standard co-author trailer. Do not push, tag, or release (user-triggered CI). Stop after each wave for review. If reality contradicts this plan, stop and report rather than improvise.

## Global invariants (reviewer checklist)

1. **Basis/projection split holds:** internal consumers (contrast solver, harmony, anchor logic) read numeric OKLCH; only projections serialize; no internal code re-parses a serialized output string.
2. **No setter clamps or serializes.** Greppable definition of done: after Wave 2, the only callers of `hexToOklch` / `oklchToHex` are projection paths (canvas strips, swatch + hex display, `serializeDerivedValue`, the solver's sRGB adapter) and input boundaries (hex field, EyeDropper, reconcile parser, the storage migration).
3. **Editing is lossless:** no edit round-trips through hex or through gamut clamping. The workarounds are deleted, not left dormant.
4. **Primary readouts are OKLCH; the hex field remains as legacy input**, parsed at the boundary.
5. **Single store path preserved** (`paletteBaseColor` → `mutate`); `cssVarSync` fan-out preserved (writes hit self + parent `:root`).
6. **Opacity path untouched** (`color-mix(in srgb …)` valid against either serialization).
7. **Contrast terminates in sRGB** (WCAG tests stay hex-based).
8. Editor chrome greyscale/tokenized; buttons `UIPillButton`; every value tokenized.

---

# Part A — OKLCH basis (fixes the flicker)

## Wave 1: numeric IR + serializer split (output stays hex, byte-identical)

**Goal:** isolate serialization behind a typed intermediate representation so Wave 2 (and later Part B) are safe; zero output change.

The derived-vars map is heterogeneous — colors, but also gradient strings (`--page-bg`) and keywords (`--page-bg-attachment`) — so the IR is typed, not "just numbers":

```ts
type DerivedValue =
  | { kind: 'color'; l: number; c: number; h: number }
  | { kind: 'raw'; css: string };
```

1. `paletteDerivation.ts`: derivation produces `Record<string, DerivedValue>` (`palettesToValues`); `computePaletteColor` / `computeDerivedColor` return `Oklch`. Overrides (still hex strings this wave) parse to color-kind at the derive boundary. `--page-bg` gradient/solid composition happens in the serialization layer (`raw` kind, composed from already-serialized step colors). A single `serializeDerivedValue` renders color → hex (this wave); `palettesToVars` = serialize ∘ derive, public signature unchanged. Live `:root` (`editorRenderer.ts:39`) and the promote path (`themeFileApi.ts`) keep receiving the serialized string map.
2. `solveTextContrast.ts` reads the numeric map: the `HEX_RE` gates (`:111,114,119,184,198`) become kind checks; `pickAdverse` reads `.l` directly; `--page-bg` falls back to the surface default when the value is `raw` (same semantics as today's non-hex fallback). The solver converts numeric → hex at its own sRGB boundary for `contrastRatio` / `findLForContrast`.
3. **Not an internal consumer:** `reconcilePalettesFromCssVars`' anchor (`HEX_RE` on `--color-{ns}-500`, `paletteDerivation.ts:349`) parses the *imported theme's* `cssVariables` bag — an input boundary, not a reader of derivation output. Unchanged this wave. (Part B Wave 3 extends this parser to accept `oklch()` strings; Wave 2 converts its snap write at the boundary.)
4. Add a round-trip property test: `hexToOklch` ∘ `oklchToHex` is identity over fixture overrides + random hex (guards the override pass-through this wave depends on).

**Verify:** `palettesToVars` snapshot **byte-identical**; `solveTextContrast`/`contrast` tests green; `npm test` + `npm run check` green.

## Wave 2: store OKLCH (unclamped intent); convert all sites; delete the workarounds

**Goal:** OKLCH is the stored + edited truth; lossless editing; workarounds removed.

1. `themeTypes.ts`: `baseColor: Oklch`; `overrides: Record<string, Oklch>`. `PALETTE_SPECS[*].initialColor` becomes an `Oklch` seed so `config.baseColor ?? spec.initialColor` (`paletteDerivation.ts:237`) and `ensureConfig` / `defaultPaletteConfig` (`paletteMath.ts`) stay type-consistent — no hex/numeric union leaks.
2. **Theme-JSON migration** (hex→OKLCH, precision per decision 5), unconditional structural in `editorStore.ts:loadFromFile`, mirroring `2026-06-05-palette-unification.ts`. Covers `baseColor` and `overrides`. (The `_imported` anchor lives in `cssVariables` and stays a string; the reconcile parser converts at the boundary when snapping.)
3. Setters (`paletteBaseColor.ts:41–95`): write channels directly — no `hexToOklch` reads, **no `gamutClamp`** (decision 2). `setBaseLightnessChroma`'s pinned-hue parameter becomes unnecessary (store hue is stable at c≈0); simplify signatures. `setBaseColor` / `setBaseColors` take `Oklch`. `oklchToHexClamped` leaves the write path (survives only if a display site needs it).
4. Full site inventory (invariant 2's grep is the completeness check):
   - `PaletteEditor.svelte`: anchor-to-base reads (`:131`, `:419`), `oklchHex` writes (`:502` `onBaseChange`), `paletteComputed`, and the **override draft channel** — `editingDraft` / `editingColor` become `Oklch`; `ColorEditPanel` receives `h/c/l` straight from the draft (delete the `oc = hexToOklch(editingColor)` re-derivation at `:680`); `handleColorChange` stores numeric. The override panel gets the same fix as the base sliders, not an afterthought.
   - `ColorsTab.svelte:165` → `setBaseColor(selected, { l, c, h })`.
   - `ColorWheel.svelte`: target rendering reads numeric; harmony/rotate patch construction (`:327–331`) builds `Oklch` patches.
   - `colorHarmony.ts` (`:38,56,71`): `reHue` / `applyHarmony` / `tintNeutralsFromBrand` return `Oklch` maps.
   - `solveTextContrast.ts:135`: seed read becomes direct channel access.
   - Reconcile snap write (`paletteDerivation.ts:352`): parsed hex → `Oklch` at the boundary.
   - Canvas/gradient painting in `LightnessBar` / `ColorWheel` / `ColorEditPanel` keeps `oklchToHex` — projection, allowed.
5. **Delete the workarounds:** `LightnessBar.svelte` gesture pinning + `onLiveEdit` prop; the `LiveColorEdit` type and `liveEdit` channel (`colorWheelMath.ts`, `ColorWheel.svelte`); the pinned-hue guard. Thumb and dot render from the store.
6. Display: the hex readout derives through one formatter (gamut-clamped projection) so future formats slot in beside it; hex input parsing stays at the existing boundary (`commitHex`). Primary readouts show OKLCH.

**Verify:** derived CSS within ~1 LSB of pre-migration; fixtures updated for the storage shape; `npm test` + `npm run check` green. **Manual QA:** wheel, lightness bar, H/C/L sliders, **and the override edit panel**, in both Absolute Chroma modes — smooth, no twitch, workarounds gone. New capability checks: drag L to an extreme and back — chroma and hue fully recover; hue survives a pass through grey (c = 0).

---

# Part B — `oklch()` CSS serialization (separate go/no-go)

**Status: GO recorded 2026-08-19 — Mark: "I would rather see OKLCH end-to-end and for us to use hex only for display and copying." Executing Waves 3-5 on branch `oklch-part-b` off `main` @ 9c295bb (v0.50.0, not the v0.40.1 this plan was written against; Wave 5's bump target moves accordingly).**

Costs: modern-browser floor (Chrome 111 / Safari 15.4 / Firefox 113, ~2023); a breaking `tokens.css` value migration; consumer churn; version bump. Benefits: shipped tokens shed 8-bit quantization; generated CSS is legible in the basis; wide-gamut output becomes possible later without another format change. **No visual change on flip day:** all values remain sRGB-gamut-clamped before serialization; emitting unclamped/P3 values is a separate future decision, out of scope.

> **Execution record (2026-08-19).** Waves 3-5 executed on branch `oklch-part-b`: W3 `16fd837`, W4 `49147b0`, W5 `0da8fc2`. Green at each wave: `npm test` 3538 passing (baseline 3525 + 13 new), `npm run check` 0 errors/0 warnings across 614 files, `npm run build` clean, `check:token-contract` warns as designed (breaking migration in a pre-1.0 minor, CHANGELOG flagged).
>
> Deviations from the plan, all in W3 step 5's audit sweep, which found **three** hex readers rather than the zero it expected: the generator's contrast gate (`generateColorsAndType.ts`, both the text and surface sides — the text side was silently returning wrong ratios), the Color Story readouts, and `backgroundContrast.ts`. The last is a runtime file in `src/system`, which cannot import from `src/editor`, so `oklch.ts` moved to `src/system/internal/` with a re-export shim at the old path (30 importers unchanged). Separately, `reconcilePalettesFromCssVars` was serializing derived values only to collect key names and discarding them; it is called at boot with pre-migration configs whose `baseColor` is still a hex string, so it now reads the IR instead. W4 added the value half of the contract guard (the name-only guard would have passed a value-rewriting migration as additive). `oklchToCss` pins hue to 0 at zero chroma — the OKLab round trip put `#ffffff` at h 89.88.
>
> **W5 step 2 (consumer migration) deliberately not done.** `live-tokens-online` is the only real consumer (`node-graph` has no live-tokens dependency; `live-tokens-text-styles` no longer exists). It has 0.50.0 installed, whose `backgroundContrast` cannot parse `oklch()`, and it renders `FloatingTokenTags` in its hero. Migrating its vendored `tokens.css` before it upgrades to 0.51.0 would silently degrade that contrast picker to always-white. Correct order: publish 0.51.0, upgrade the consumer, then `npx live-tokens migrate`.
>
> **Manual QA still owed** (the user's half): live app renders `oklch()`; importing a pre-flip (hex) and a post-flip (`oklch()`) theme both reconcile and snap. The parser accepts both, unit-tested, but neither path has been driven in the browser.

## Wave 3: flip the serializer

1. `serializeDerivedValue` emits `oklch(l c h)` for both the live `:root` and the promote path. Internal consumers unaffected (numeric, per Wave 1). Values remain sRGB-clamped.
2. Reconcile anchor parser accepts `oklch()` strings as well as hex (promoted and re-imported CSS now carries `oklch()`), converting to numeric at the boundary.
3. Readouts unchanged (OKLCH primary, hex legacy).
4. Regenerate the `palettesToVars` snapshot; rewrite exact-hex test expectations to parse-and-compare tolerance. WCAG contrast tests stay hex-based.
5. Audit sweep: grep for consumers parsing `:root` / derived values as hex (`HEX_RE`, `#`-slicing) — the solver and reconcile are covered by Waves 1–3; any other hit stops the wave for report.

**Verify:** `npm test` + `npm run check` + `npm run build` green. **Manual QA:** live app renders `oklch()`; importing both a pre-flip (hex) and post-flip (`oklch()`) theme reconciles/snaps correctly.

## Wave 4: `tokens.css` breaking migration

1. New migration under `vite-plugin/tokensCssMigrations/` — idempotent hex→`oklch()` text transform, tagged **`'breaking'`** (the additive-contract guard at `index.ts:100–110` is name-only; this is value-rewriting and must never auto-apply as additive). Add value-aware contract coverage.
2. Convert the hand-authored `src/system/styles/tokens.css` (283 hex, incl. hand-tuned `--color-white` / `--color-black`) via the migration — it has no palette source, so the migration converts existing hex text.
3. Hex companion deliberately **not** shipped (decision 9). Optional: inline hex comments in generated output.

**Verify:** `npx live-tokens migrate` idempotent + correct on a vendored copy; migration contract tests updated; `npm run build` green.

## Wave 5: version bump + consumer migration

1. Bump `package.json` → next minor (0.41.0 from 0.40.1; adjust if the branch has released meanwhile); `CHANGELOG.md` "Changed (breaking)" entry; note in `RELEASING.md`. No release/tag (user-triggered CI).
2. Apply the migration + re-promote to local consumers vendoring `tokens.css`: `live-tokens-online`, `live-tokens-text-styles`, `node-graph`. Report the per-consumer diff summary.

**Verify:** each consumer renders; `npx live-tokens migrate` clean; diff summaries reported for user review.

---

## Out of scope

- `color-mix` opacity in `oklch` (deliberate visual change).
- Actual release / tag (user-triggered CI).
- Any token *name* changes.
- Additional display formats (RGB / HSL / P3 readouts) — the formatter leaves room; nothing built now.
- Wide-gamut (unclamped / P3) serialization.

## Verification (end state)

**Part A:** numeric OKLCH is the stored + edited basis; the store holds unclamped intent; no edit round-trips through hex or gamut clamping; the workarounds are deleted; primary display is OKLCH with hex as a legacy, boundary-parsed projection; CSS serialization still hex, byte-compatible. **Part B (if approved):** CSS output is `oklch()` (sRGB-clamped), the breaking `tokens.css` migration and version bump are staged, local consumers are migrated. Nothing pushed or tagged. Per wave: `npm test` + `npm run check` green (Part B waves also `npm run build`), with manual-QA notes captured.
