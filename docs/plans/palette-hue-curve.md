   # Execution plan: palette hue curve

Branch off `main` as `palette-hue-curve`. Six waves, each a single commit unit executable by a sub-agent with only this doc and the repo. Waves are strictly sequential; each ends green.

**Execution model.** A fresh Opus session orchestrates from this doc and writes no wave code itself. Each wave runs in a `wave-executor` sub-agent on **Sonnet**. The review gate after each wave (`wave-reviewer`) runs at the orchestrator's tier (Opus). The manual halves of each wave's verification belong to the user; the executor runs only the automated commands and reports the manual checklist as pending.

**Precondition:** a clean working tree. At the time of writing, the tree carries staged deletions of other `docs/plans/*.md` files plus this new file; that is the user's in-flight work. Resolve or commit it before Wave 1. Never stash, reset, or checkout over uncommitted changes; if the tree is dirty in any other way, stop and report.

Line numbers date from `0.50.0`. From Wave 2 on, locate by the cited symbol or string, and stop only if the symbol itself is gone.

## Status

| Wave | Summary | Executor | Status | Commit |
|---|---|---|---|---|
| 1 | Model and derivation: `hueCurve`, wrapped hue, tests | Sonnet | Done | 310871c |
| 2 | Curve engine handles signed axes: normalized templates, `hueCurveConfig` | Sonnet | Done | b734bfb |
| 3 | Base anchor covers hue | Sonnet | Done | fa7d9a0 |
| 4 | Collapsible curve sections; existing two reordered to slider order | Sonnet | Done | 02599c0 |
| 5 | Render the hue curve, closed by default | Sonnet | Done | b2fc793 + 506d36b |
| 6 | Docs and changelog | Sonnet | Done | b225aa5 |

The orchestrator updates this table after each review gate: `Not started` to `In progress` to `Done` (or `Blocked`, with a one-line reason appended under the table). Record the short commit SHA.

Waves 1 through 3 are invisible to the user and ship nothing on their own. Waves 4 and 5 together are the feature. If the run is cut short, cutting after Wave 4 leaves a coherent product (collapsible curve sections, no hue curve); cutting between 4 and 5 does not.

---

## The feature

The palette's two existing curves are already two of the three OKLCH sliders in `ColorEditPanel`: the "Saturation" curve is a chroma multiplier (`targetC = baseC * satMul`, `paletteDerivation.ts:211`) and Lightness is absolute L. Hue is the missing third channel.

Adding it gives a palette that can drift in temperature across its ramp, warm at the light end and cool at the dark end, without touching contrast. This works in OKLCH specifically because hue rotation is close to lightness-preserving, so the contrast ladder and the AA guarantees survive it. In HSL it would not.

| Curve | Y axis | Relation to base | Section default |
|---|---|---|---|
| **Hue** | −30 to +30 degrees, 0 = unchanged | offset | closed |
| **Saturation** | 0 to 200%, 100 = unchanged | multiplier | open |
| **Lightness** | 0 to 100, absolute | absolute | open |

Stacked in that order, matching the H / C / L slider order in `ColorEditPanel`. Two of the three are relative to the base color, which is the story that makes the stack coherent.

## Reserved judgment calls (already decided, do not re-litigate)

1. **Hue is stored as a signed delta in degrees, never an absolute hue.** Harmony axes own absolute hue with live binding; a delta composes with an axis rotation instead of fighting it for ownership. It also lets the base color move without dragging the curve behind it.

2. **The axis is ±30 and there is no zoom or expand control.** In this engine the axis *is* the clamp: `svgToY` (`curveEngine.ts`) bounds the dragged value to `cfg.yMin`/`cfg.yMax`, so the range is a real guardrail, not a view scale. Whole-family rotation already has two owners, the base color's H slider and the harmony axis that binds it; the curve's only job is the differential across the ramp. Values beyond ±30 remain expressible through the offset control, which is deliberate: offset is the "rotate the whole thing" gesture.

3. **No painted hue band behind the graph, and no color anywhere in the curve chrome.** A band drawn at fixed L and C would show an idealized sweep while `gamutClamp` trims chroma differently at every hue, so the paint and the swatch above it would disagree. The swatch row is the honest readout because it is the real derivation output. It also keeps the three stacked graphs visually identical, which is what makes a stack readable. Editor chrome stays greyscale with no exceptions in this plan.

4. **Direction is stated in the label, not drawn.** Up meaning plus degrees is arbitrary in a way that up meaning lighter is not. The fix is one string: the panel label reads `Hue ±30°` and the offset pill prints degrees. No axis tick labels, which none of the existing curves have.

5. **An absent `hueCurve` means flat zero, and stays absent.** No migration, and every existing theme renders byte-identical. Fresh configs do not seed a hue curve; it materializes on first edit. This keeps eleven redundant flat curves per theme out of every saved file.

6. **Hue is the only channel with no clamp in derivation.** It is cyclic, so the sum wraps into `[0, 360)`. Lightness and saturation keep their existing clamps.

7. **Reset writes the flat default; it does not delete the field.** Deleting would have to lift the base anchor out too, for no semantic gain: a flat curve and an absent one derive identically.

8. **Hue reaches all four curve groups** (Palette, Surfaces, Borders, Text), because it is one descriptor in `OverridesPanel`'s existing loop and asymmetry would cost more than it saves. Text is the group with the most obvious use: warm-tinted body copy.

9. **Section open/closed state is session-scoped**, held in `PaletteEditor`, never written to theme JSON. It is viewport state, not design intent.

10. **No separate "advanced mode" flag.** The closed section is the progressive disclosure; a mode toggle on top of it is a second thing to find.

11. UI copy: no em-dashes, short sentences. All values tokenized. Pill buttons via `UIPillButton`. Comments state only non-obvious WHYs and never restate the code.

## Global invariants (reviewer checklist)

1. **Identity by default.** A config with no `hueCurve` and no `hue` offset derives byte-identical colors to `0.50.0`, at every step of every scale of every palette. Waves 1 and 5 both pin this.
2. **No migration, no schema bump.** `schemaVersion` is untouched. Every added field on `PaletteConfig` and on the `scaleCurves` value type is optional.
3. **The axis is the clamp.** No code path can write a hue anchor outside ±30. The offset is the only route past it, and that is by design.
4. **Hue always lands in `[0, 360)`.** `Oklch.h` documents that range (`oklch.ts:7`); the trigonometry is indifferent, the type is not.
5. **Harmony untouched.** No wave reads or writes `harmonyAxes`, and no wave changes any signature in `paletteBaseColor.ts` or `colorHarmony.ts`.
6. **The base color renders verbatim at its anchor step** whenever `anchorToBase` is on, hue curve present or absent.
7. **Generated themes are unaffected.** `generateColorsAndType.ts` writes no hue curve, so the generator and the `live-tokens-generate-theme` skill are out of scope entirely.
8. **Snap is untouched.** `snapScaleToPalette` matches on lightness and assigns the whole palette `Oklch`, so hue rides along already. No wave edits it.
9. `npm run check` clean and `npm run test` green at every wave boundary.

## Commit-unit protocol

One wave, one commit. Run the wave's verification green before committing; never commit red. Commit message `Hue curve W<n>: <summary>` plus the standard co-author trailer. Do not push, tag, or release. Stop after each wave for review. If reality contradicts this plan (a cited symbol is missing, a test pins conflicting behavior), stop and report rather than improvise.

The data tree is live app state. No wave should touch `src/live-tokens/data/`; if a run leaves it dirty, restore per the recipe in `CLAUDE.md` before committing.

---

## Wave 1 — model and derivation

**Goal:** hue reaches the color math. Nothing renders differently, because nothing writes a hue curve yet.

**Executor:** Sonnet.

Files: `src/editor/core/themes/themeTypes.ts`, `src/editor/core/palettes/paletteDerivation.ts`, `src/editor/ui/palette/paletteMath.ts`, `src/editor/core/palettes/paletteDerivation.test.ts`.

1. `themeTypes.ts`, on `PaletteConfig` (`:12`):

   ```ts
   /** Signed hue offset in degrees per step, applied on top of the base hue.
    *  Absent means flat zero: the palette holds one hue, which is what every
    *  theme saved before this field did. */
   hueCurve?: CurveAnchor[];
   scaleCurves: Record<string, { lightness: CurveAnchor[]; saturation: CurveAnchor[]; hue?: CurveAnchor[] }>;
   ```

   `anchorPlacement` is not touched this wave; its hue fields land in Wave 3 alongside the code that writes them.

2. `paletteDerivation.ts`:

   ```ts
   export const DEFAULT_PALETTE_HUE = (): CurveAnchor[] => [makeAnchor(0, 0, 30), makeAnchor(100, 0, 30)];

   /** Hue is cyclic, so derivation wraps rather than clamps. The trig accepts
    *  any angle; `Oklch.h` is documented 0..360 and readouts print it. */
   const wrapHue = (h: number): number => ((h % 360) + 360) % 360;
   ```

3. `computePaletteOklch` (`:200`) takes `hueCurve` as an appended optional sixth parameter, so every existing call site and test compiles unchanged:

   ```ts
   hueCurve?: CurveAnchor[],
   ```

   Body: `const h = wrapHue(base.h + (hueCurve ? sampleCurve(hueCurve, xPos) : 0) + (curveOffset.hue ?? 0));` and pass `h` to `gamutClamp` in place of the destructured `h`.

4. `computeDerivedOklch` (`:404`) needs no signature change; the widened `scaleCurves` value type carries it:

   ```ts
   const hCurve = scaleCurves[scaleTitle]?.hue;
   const hOff = curveOffset[`${scaleTitle}-hue`] ?? 0;
   const targetH = wrapHue(baseH + (hCurve ? sampleCurve(hCurve, xPos) : 0) + hOff);
   ```

5. `paletteMath.ts`: widen the `ScaleCurves` type alias (`:58`) to match, re-export `DEFAULT_PALETTE_HUE`, and widen `scaleCurveKey`'s channel parameter (`:107`) to `'lightness' | 'saturation' | 'hue'`. `defaultPaletteConfig` and `defaultScaleCurvesObject` seed **no** hue curve (RJC 5).

6. Tests in `paletteDerivation.test.ts`:
   - **Identity.** For every step index, `computePaletteOklch(i, base, L, S, {})` deep-equals the same call with `DEFAULT_PALETTE_HUE()` passed, and equals it again with `scaleCurves.Text.hue = DEFAULT_PALETTE_HUE()` for the derived path. This is invariant 1.
   - **Rotation.** A hue curve ramping −30 to +30 puts step 0 at `base.h − 30` and the last step at `base.h + 30`.
   - **Wrap.** `base.h = 350` with a +30 delta yields 20, not 380. `base.h = 10` with −30 yields 340.
   - **Offset.** `curveOffset.hue = 15` shifts every step by 15, and `curveOffset['Text-hue']` shifts only the Text scale.
   - **Chroma consequence.** A hue rotation into a low-gamut region reduces the returned `c` even with a flat saturation curve. Pin it so the behavior is documented rather than discovered: it is `gamutClamp` doing its job, not a bug.

**Verification.** `npm run check`, `npm run test`. No manual step: nothing renders differently this wave.

---

## Wave 2 — the curve engine handles signed axes

**Goal:** `curveEngine` stops assuming `yMin` is zero, and gains the hue config. Provably behavior-preserving for the two existing configs.

**Executor:** Sonnet.

Files: `src/editor/ui/curveEngine.ts`, `src/editor/ui/BezierCurveEditor.svelte`, new `src/editor/ui/curveEngine.test.ts` (or extend an existing curve test file if one already covers templates).

1. `CurveConfig` gains one optional field:

   ```ts
   /** Suffix for the offset readout only. The axis range lives in `label`. */
   unit?: string;
   ```

2. New config:

   ```ts
   export const hueCurveConfig: CurveConfig = {
     yMin: -30, yMax: 30,
     label: 'Hue ±30°',
     unit: '°',
     gridLines: [0],
     dashedLines: [-15, 15],
   };
   ```

   The range is written into `label` rather than derived, because it is the only config whose axis is not self-evident from its name (RJC 4).

3. **Normalize `curveTemplates`.** Today `Ramp up` and `Ramp down` compute from `cfg.yMax` alone (`yMax * 0.1` to `yMax * 0.9`), which is wrong the moment `yMin` is negative. Rewrite all four in terms of `range = cfg.yMax - cfg.yMin`:

   - Flat: `yMin + range / 2`
   - Peak: `yMin`, `yMin + range / 2`, `yMin`
   - Ramp up: `yMin + range * 0.1` to `yMin + range * 0.9`
   - Ramp down: the reverse

   For `yMin = 0` this is algebraically identical to today, so both existing configs are byte-unchanged. Peak on a signed axis reads as "shifted negative except in the middle", which is a legal shape and not to be special-cased.

4. `BezierCurveEditor.svelte`: the offset pill (`:288`) appends `cfg.unit ?? ''` to the printed value, so hue reads `Offset +12°`. Nothing else in the component changes; `svgToY` already clamps to the config bounds, which is what enforces ±30 (invariant 3).

5. Tests:
   - Each of the four templates against `lightnessCurveConfig` and `saturationCurveConfig` deep-equals a hardcoded expectation transcribed from `0.50.0` behavior. This is the proof that the normalization changed nothing.
   - Against `hueCurveConfig`: Flat gives 0 to 0, Ramp up gives −24 to +24, Peak gives −30 to 0 to −30, and every produced y sits within ±30.
   - `svgToY` with `hueCurveConfig` clamps an out-of-bounds pixel to exactly −30 or +30.

**Verification.** `npm run check`, `npm run test`. Then manually, in `/live-tokens/colors` with a palette's curve editor open: apply each of the four templates to the Lightness and Saturation curves and confirm the shapes are unchanged from before the wave.

---

## Wave 3 — the base anchor covers hue

**Goal:** with `anchorToBase` on, the picked color still renders verbatim at its step once a hue curve exists.

**Executor:** Sonnet.

Files: `src/editor/core/themes/themeTypes.ts`, `src/editor/core/palettes/paletteDerivation.ts`, `src/editor/core/palettes/baseAnchor.test.ts`.

`syncBaseAnchor` (`:359`) pins lightness to base L and saturation to multiplier 100 at the nearest step. That is what makes the base color render verbatim. A non-flat hue curve breaks it unless hue is pinned to delta 0 at the same step.

1. `anchorPlacement` on `PaletteConfig` gains `displacedH?: number` and `priorHueEndpoints?: [CurveAnchor, CurveAnchor]`, mirroring the L and S fields and their existing doc comment.

2. `syncBaseAnchor` pins hue **only when `cfg.hueCurve` is defined**. When it is absent the flat-zero curve already yields delta 0 at every step, so there is nothing to pin and materializing a curve here would violate RJC 5. Otherwise the treatment is a direct mirror of the saturation branch: lift with `prev.displacedH` and `prev.priorHueEndpoints`, then `setCurveAnchor(hCurve, x, 0, fresh)`.

3. `clearBaseAnchor` (`:392`) lifts the hue placement the same way, guarded on the curve being present.

4. Tests in `baseAnchor.test.ts`:
   - With a non-flat hue curve and `anchorToBase` on, `computePaletteOklch` at `anchorPlacement.step` returns exactly `baseColor.h`.
   - `clearBaseAnchor` restores the hue curve to its pre-pin shape.
   - With `hueCurve` absent, `syncBaseAnchor` leaves it absent and writes no `displacedH`.
   - **Idempotency.** `syncBaseAnchor(cfg)` run twice deep-equals running it once, for a config with and without a hue curve. Wave 5 depends on this: it calls `syncBaseAnchor` again at hue-curve materialization, and that call must not disturb the already-placed L and S anchors.

**Verification.** `npm run check`, `npm run test`. Then manually: with `anchorToBase` on, drag the base color's H slider through a full rotation and confirm the anchored swatch still equals the base hex at every position, and that the anchor triangle stays on the same step it did before this wave.

---

## Wave 4 — collapsible curve sections, in slider order

**Goal:** the curve stack becomes three collapsible rows instead of a fixed pile. Lands on the existing two curves so the disclosure is verified against known-good shapes before hue arrives.

**Executor:** Sonnet.

Files: `src/editor/ui/palette/ScaleCurveEditor.svelte`, `src/editor/ui/PaletteEditor.svelte`, `src/editor/ui/palette/OverridesPanel.svelte`.

1. `ScaleCurveEditor.svelte` owns the disclosure, because it is already the per-channel wrapper and both call sites go through it. Move its component doc comment out of the `Props` interface, where it currently sits above `curveKey`, to above the interface. New props:

   ```ts
   open: boolean;
   onToggleOpen: () => void;
   ```

2. The header is a button following the existing `.derived-toggle` pattern (`PaletteEditor.svelte:669`, styles at `:730`): chevron-right when closed, chevron-down when open, then `cfg.label`, then a summary. Sized down to sit inside the curve stack; reuse `.curve-panel-label`'s `--ui-font-size-md` / semibold / `--ui-text-tertiary` for the label. `BezierCurveEditor`'s own `.curve-panel-header` keeps the help popover and stops rendering the bare label, so the name appears once.

3. The summary earns the collapsed row its keep. Derive it in `ScaleCurveEditor` from `anchors`, `defaults`, `offset`, and `cfg.unit`:

   - Anchors deep-equal `defaults` and `offset === 0`: the word `default`.
   - Otherwise: the range of anchor y values, `{min} to {max}{unit}`, plus ` offset {±n}{unit}` when the offset is non-zero, preceded by a filled dot at `--ui-text-primary` marking the curve as off its default.

   Range rather than first-to-last, because first-to-last lies about a peak. Greyscale only; the dot is the whole indicator (RJC 3). A curve that is actively shaping the palette must never be invisible behind a closed section.

4. `PaletteEditor.svelte` owns the open state for both call sites, session-scoped (RJC 9), keyed by the same `curveKey` strings that already key `curveOffset` and are already unique per palette:

   ```ts
   let curveSectionOpen: Record<string, boolean> = $state({});
   const sectionOpen = (key: string) => curveSectionOpen[key] ?? !key.endsWith('hue');
   ```

   `OverridesPanel` stays presentational, per its header comment: it receives `sectionOpen` and an `onToggleCurveSection` callback and mutates nothing.

5. **Reorder to slider order.** Saturation renders above Lightness, in `PaletteEditor`'s `curve-grid-span` (`:576`) and in `OverridesPanel`'s `curveDescriptors` (`:122`). This matches the H / C / L order in `ColorEditPanel` and is the order the hue curve joins in Wave 5.

**Verification.** `npm run check`, `npm run test`. Then manually, in both the docked overlay and `/live-tokens/colors`: open a palette's curve editor and each of the Text, Surfaces and Borders editors. Confirm both sections start open, collapse and re-expand independently, that the summary reads `default` on an untouched theme and shows the dot plus a range after any edit, and that the offset gesture still works on a re-expanded section. Confirm Saturation now sits above Lightness in all four groups.

---

## Wave 5 — render the hue curve

**Goal:** the feature becomes usable.

**Executor:** Sonnet.

Files: `src/editor/ui/PaletteEditor.svelte`, `src/editor/ui/palette/OverridesPanel.svelte`, `src/editor/ui/PaletteEditor.test.ts`.

1. `PaletteEditor.svelte`:
   - `let hueCurve = $derived($editorState.palettes[label]?.hueCurve);` left `undefined` when absent.
   - A third `ScaleCurveEditor`, rendered **first**, with `curveKey="hue"`, `cfg={hueCurveConfig}`, `anchors={hueCurve ?? DEFAULT_PALETTE_HUE()}`, `defaults={DEFAULT_PALETTE_HUE()}`, `offset={curveOffset['hue'] ?? 0}`.
   - `setHueCurve(a)`: writes `cfg.hueCurve = a` first, then, only on the materializing branch (`hueCurve` was `undefined` before the write), calls `syncBaseAnchor(cfg)` to pin the delta-0 anchor. The order matters: pinning before `a` lands would write the anchor into a still-flat transient curve that the assignment then overwrites, drifting the base color's hue at its anchor step on the first edit. Wave 3's idempotency test is what makes calling `syncBaseAnchor` here, after the value is already in place, safe. When the curve already exists, the assignment stands alone.
   - `lockedHueIdx`, mirroring `lockedLightnessIdx` (`:71`), and null whenever `hueCurve` is undefined.
   - Final order in the stack: Hue, Saturation, Lightness.

2. `OverridesPanel.svelte`: a third entry in `curveDescriptors`, first in the array, `channel: 'hue'`, `cfg: hueCurveConfig`, `anchors: sc.hue ?? DEFAULT_PALETTE_HUE()`, `defaults: DEFAULT_PALETTE_HUE()`. Widen the `channel` union on the descriptor type and on `onSetScaleCurve`. `setScaleCurve` in `PaletteEditor` (`:179`) widens to match and writes `hue` into the scale's entry.

3. Tests in `PaletteEditor.test.ts`:
   - A palette with no `hueCurve` renders three curve sections, with Hue closed and the other two open.
   - Editing the hue curve materializes the field, and with `anchorToBase` on, the anchored step's derived hex is unchanged by the edit.
   - Resetting the hue curve writes the flat default and clears the `hue` offset; the field remains present (RJC 7).
   - A theme fixture saved without `hueCurve` round-trips through save and load with the field still absent (invariant 2).

**Verification.** `npm run check`, `npm run test`. Then manually, in `/live-tokens/colors`:
   - Open a chromatic palette's curve editor. Hue is present, closed, and summarised `default`.
   - Expand it, drag the light end to about +20 and the dark end to about −20, and watch the swatch row above drift warm to cool while the lightness ladder holds.
   - Confirm the anchored swatch still matches the base hex throughout.
   - Confirm the offset pill reads degrees.
   - Confirm a value cannot be dragged past ±30.
   - Collapse the section and confirm the summary shows the dot and the range.
   - Repeat on the Text scale, which is the group with the most obvious use.
   - Save the theme, reload, and confirm the curve survives; confirm a theme saved before this branch still loads with Hue reading `default`.
   - Restore the data tree afterwards per `CLAUDE.md`, then run `node scripts/check-production-is-default.mjs`.

---

## Wave 6 — docs and changelog

**Goal:** the shipped user guide describes three curves, not two.

**Executor:** Sonnet.

Files: `src/editor/docs/content/editing-tokens.md`, `CHANGELOG.md`.

1. `editing-tokens.md:23` currently reads "Two curves shape how lightness and saturation fall off across the steps." Rewrite for three, in the stack's order, and say what hue is for: a palette that drifts in temperature across its ramp without moving contrast, which works because OKLCH hue rotation is close to lightness-preserving. State the ±30 range and that larger moves belong to the base color or the harmony axis. No em-dashes.

2. `CHANGELOG.md`: a new `### Added` entry under the next unreleased version, in the voice of the existing entries (user-facing outcome first, mechanism second). Note that existing themes are unaffected.

3. Run `npm run sync:docs` to regenerate `src/editor/docs/content.generated.ts`, and commit it. Never hand-edit that file; `npm run check:docs-content` gates the drift.

**Verification.** `npm run check`, `npm run test`, `npm run check:docs-content`. Then manually: open `/live-tokens/docs`, find the token-editing chapter, and confirm the curve section renders the new copy.
