# Execution plan: light-first theming + Colors view

This doc is self-contained: five waves, each a single commit unit, executable by a sub-agent with no context beyond this doc and the repo.

## Background (why)

The palette system is hard-biased toward dark backgrounds. Root cause (verified): `defaultScaleCurves` (`src/editor/core/palettes/paletteDerivation.ts:95-108`, near-duplicated in `src/editor/ui/palette/paletteMath.ts:52-65`) pins Surfaces to an **absolute** OKLCH-L band 15→47 and Borders 25→80, while Text is a **multiplier** of seed L (120→55, pushing text light). In `computeDerivedColor` (`paletteDerivation.ts:133-160`) non-text scales ignore seed lightness entirely, so no seed choice can produce a light surface. `--page-bg` defaults to ramp step `'850'` (dark; steps are 100,200…850,900,950 — no 150). `snapScaleToPalette` (`paletteMath.ts:210-248`) assumes dark-first ordering. No scheme concept and no contrast math exist anywhere.

Decisions (user-approved):
- **One theme = one scheme.** No runtime light/dark toggle. Light themes become first-class via scheme-parameterized *defaults*; derivation math is untouched so saved themes render byte-identically. No migration (no token-name changes, no `PaletteConfig` shape changes).
- **Theming tool = a new "Colors" editor view** (peer of Tokens/Components): OKLCH color wheel with draggable seed handles + swatch row + format readouts on the left; a proportional **Color Story** on the right; **harmony** modes underneath.
- **Harmony trio = Brand (anchor), Background, Accent** — the 60-30-10 story colors. Harmony rotates **hue only**; chroma/lightness are never written by harmony and never clamped anywhere (low-chroma background is a default tendency, not a constraint — a saturated background is a legitimate choice; the neutral-zone ring is a visual guide only).
- **Special is off the wheel and outside harmonies** (reserved for unique uses): swatch-row only, edited via the readout panel. Neutral/Alternate: draggable near-center, excluded from harmony geometry, optional "tint neutrals from brand".
- **Wheel edits are the same operation as token-page base-color edits**: same store path, same session-scope undo semantics, live `cssVarSync` fan-out.
- **Accessibility target WCAG 2.1 AA** (4.5:1 body, 3:1 large/UI), delivered as a one-undo "Derive accessible text" action.
- Shipped `tokens.css` fallbacks and `themes/default.json` stay dark (brand default; values, not machinery).

## Commit-unit protocol

- One wave = one commit. Run the wave's verification block and get it green before committing. Never commit a red tree.
- Commit message format: `Colors W<n>: <summary>` plus the standard co-author trailer.
- Do not push, tag, or release. Releases ride CI via tag push and are user-triggered.
- Stop after the wave commits. Review happens between waves.
- If reality contradicts this plan (a file moved, a mechanism works differently than described), stop and report the contradiction instead of improvising around it.

## Global invariants (reviewer checklist)

1. **Existing themes render byte-identically.** Derivation math (`computePaletteColor`, `computeDerivedColor`) is moved, never changed. `scaleCurveDefaults('dark')` deep-equals the legacy `defaultScaleCurves` anchor values (pinned in a test). A fixture test derives `palettesToVars` from `src/live-tokens/data/themes/default.json`'s `editorConfigs` and asserts unchanged output across the refactor.
2. **No token vocabulary changes.** No new/renamed/removed `--surface-*`, `--text-*`, `--color-*`, `--border-*`, `--page-bg*` names. `tokens.css` and `default.json` are untouched. No tokensCss migration, no theme migration.
3. **`PaletteConfig` shape unchanged** (`src/editor/core/themes/themeTypes.ts:10-38`). Scheme is a function parameter, never a stored field.
4. **Single source for palette math.** After Wave 1, `paletteMath.ts` contains no duplicate implementations of core derivation functions — only re-exports plus genuinely UI-only helpers.
5. **One store path for edits.** Wheel/harmony/solver writes go through `mutate`/`transaction`/`beginScope`+`commitScope`/`cancelScope` from `editorStore.ts` on `state.palettes[label]` (and `state.cssVars` for the `--text-inverted` override). No parallel color state; handle positions derive from store state.
6. **Harmony writes hue only.** `applyHarmony` output preserves each palette's chroma and lightness exactly. No code introduces a chroma clamp or cap on any palette.
7. **Editor chrome rules.** Greyscale `--ui-*` tokens only (file-state indicators excepted); buttons are `src/editor/ui/UIPillButton.svelte`; headings use the semantic scale (body=md, group=lg, section=2xl); every design value tokenized.
8. **Contrast claims verified post-round-trip.** Any solved color is re-checked with `contrastRatio` after hex conversion.
9. **`cssVarSync` fan-out preserved** (writes hit self + parent `:root`); nothing writes CSS vars around it.

## Reserved judgment calls (flag in review notes, don't guess silently)

- Light-scheme default anchors (Surfaces 98→82, Borders 92→45, Text 30→120) are proposed values; tune during Wave 2 manual QA if needed and note the final numbers. Never touch the dark anchors.
- Wheel rendering: chroma→radius normalization (proposed linear 0→0.33) and fixed display lightness (proposed L≈0.72); note choices.
- Condensed sidebar switcher currently toggles two views (`EditorViewSwitcher.svelte` `toggle()`); with three views make it cycle and note the interaction.
- Colors-view sidebar contents: proposed nav anchors (Wheel, Story) + `ThemeFileManager` footer, mirroring the tokens view; note deviations.
- Keyboard nudge increments for wheel handles; Colors segment icon (fa set).
- `disabled` text step grading (deliberately non-AA) exact offset beyond `muted`.

---

## Wave 1: consolidate duplicated palette math

**Goal:** one source of truth for derivation; `paletteMath.ts` becomes re-exports + UI-only helpers.

1. In `src/editor/core/palettes/paletteDerivation.ts`: export `SCALES` (adopt `paletteMath.ts`'s richer `Scale`/`Step` types — structurally identical), `computePaletteColor`, `computeDerivedColor`, `stepIndexToX`/`scaleStepToX`, `paletteStepKey`/`stepKey`, `PALETTE_STEPS`. Behavior identical.
2. In `src/editor/ui/palette/paletteMath.ts`: delete the duplicated implementations; re-export from core. Keep UI-only: `defaultPaletteConfig`, `DEFAULT_NEUTRAL_LIGHTNESS`, `paletteStepLightness`, `injectLockedAnchor`/`removeLockedAnchor`, `snapScaleToPalette`, `scaleCurveKey`, `GRAY_FALLBACK`.
3. Resolve the one known behavioral drift in core's favor: missing `scaleCurves[title]` falls back to **defaults** (`paletteDerivation.ts:143-145`), not `[]` (`paletteMath.ts:185-186`). No practical change — editor-authored configs always carry explicit `scaleCurves`.
4. Verify `PaletteEditor.svelte:15-27` and `OverridesPanel.svelte` imports resolve via the re-exports.
5. Tests (extend `src/editor/core/palettes/paletteDerivation.test.ts`): re-exported symbols `===` core symbols; the default.json fixture invariant (Global invariant 1); a pinned-value spot check (one known config → exact hexes).

Verification: `npm test`, `npm run check`.

## Wave 2: scheme-parameterized defaults + direction-agnostic snap

**Goal:** light themes are first-class; nothing dark-authored changes.

1. `paletteDerivation.ts`:
```ts
export type SchemeDirection = 'light' | 'dark';
export function scaleCurveDefaults(scheme: SchemeDirection = 'dark') // → {Surfaces, Borders, Text} each {lightness(), saturation()}
```
`'dark'` returns today's exact anchors. `'light'`: Surfaces (0,98,5)→(100,82,5); Borders (0,92,5)→(100,45,5); Text lightness (0,30,30)→(100,120,30) (primary darkest, multiplier semantics); saturation curves identical to dark. Keep `defaultScaleCurves` exported as an alias for `scaleCurveDefaults('dark')` with unchanged shape so all call sites (`computeDerivedColor` fallback, `PaletteEditor.svelte:182`, `OverridesPanel.svelte:117`) are untouched.
2. `defaultPaletteConfig` (`paletteMath.ts`) gains optional `scheme?: SchemeDirection` (default `'dark'`) selecting `scaleCurveDefaults(scheme)`.
3. `snapScaleToPalette` (`paletteMath.ts`): score every contiguous window in BOTH orderings (dark-first as today, plus reversed); take the global minimum cost; on exact tie prefer dark-first. Signature unchanged (sole caller: `PaletteEditor.svelte`).
4. De-duplicate `src/editor/ui/VariablesTab.svelte:52-61`: render the 10 `PaletteEditor`s from an `{#each}` over `PALETTE_SPECS` (import from core), preserving currently rendered labels/props exactly (note the Alternate display-label special case).
5. Tests: `scaleCurveDefaults('dark')` deep-equals pinned legacy values; light Surfaces curve descends (98→82); snap fixtures — ascending (dark-style) curve returns the same window as before, descending (light-style) curve picks from the reversed ordering.
6. Manual QA: in the dev app (`npm run dev`), hand-author a light theme (Neutral Surfaces curve ~98→82, Text multipliers ~30→120, Background `emptyStep` `'100'`); confirm pages read correctly, overlays/shadows acceptable, editor chrome unaffected. Tune light anchors if needed (reserved judgment call).

Verification: `npm test`, `npm run check`, plus the manual QA note in the commit/review notes.

## Wave 3: core modules — contrast, harmony, text solver

**Goal:** pure, unit-tested engines; no UI.

1. New `src/editor/core/palettes/contrast.ts` (+ `contrast.test.ts`):
```ts
export function relativeLuminance(hex: string): number;       // WCAG 2.1
export function contrastRatio(a: string, b: string): number;  // 1..21, order-independent
export const AA_BODY = 4.5; export const AA_LARGE = 3.0;
export function findLForContrast(opts: {
  against: string; ratio: number; direction: 'lighter'|'darker';
  c: number; h: number; margin?: number;                       // margin default 0.05
}): { l: number; c: number; hex: string };
```
Binary-search OKLCH L (~24 iterations; ratio is monotonic in L at fixed hue with gamut-clamped chroma) using `hexToOklch`/`oklchToHex`/`gamutClamp` from `./oklch`. If the ratio is unreachable at the requested chroma, decay chroma toward 0 and retry (achromatic extremes reach 21:1). Verify the returned hex with `contrastRatio` after round-trip; nudge one step if the margin was consumed.
2. New `src/editor/core/palettes/colorHarmony.ts` (+ test):
```ts
export type HarmonyMode = 'complementary'|'split-complementary'|'triadic'|'square'|'analogous'|'monochromatic'|'custom';
export function harmonyHues(mode: HarmonyMode, anchorHue: number): number[];   // hues for [Brand, Background, Accent]
export function applyHarmony(mode, palettes: Record<string, PaletteConfig>): Record<string, string>;
  // new baseColors for Brand/Background/Accent: hue from harmonyHues, each palette's own chroma+L preserved exactly
export function tintNeutralsFromBrand(palettes): Record<string, string>;       // Neutral/Alternate re-hued to Brand's hue, own c+L preserved
```
`'custom'` applies no constraint. Special is never touched.
3. New `src/editor/core/palettes/solveTextContrast.ts` (+ test):
```ts
export function solveTextCurves(palettes: Record<string, PaletteConfig>, scheme?: SchemeDirection):
  { patches: Record<string, Pick<PaletteConfig,'scaleCurves'>>; cssVarOverrides: Record<string,string>; report: ContrastPairing[] }
```
Scheme defaults to inference from the resolved `--page-bg` lightness (OKLCH L ≥ 0.5 → light). Per family emit a 5-anchor Text lightness curve (x = 0,25,50,75,100; anchor `y_i = 100·solvedL_i/seedL`; multi-anchor curves are established — default.json has 3-anchor ones): neutral `primary`+`secondary` ≥4.5:1 vs the adverse extreme of the neutral surface band, `tertiary` ≥4.5:1 vs surface default, `muted` ≥3:1 vs surface default, `disabled` graded beyond muted (non-AA, reserved judgment call); chromatic families `primary` ≥4.5:1 vs the worse of `--surface-neutral` (default) and resolved `--page-bg` (chroma decay allowed), `secondary` ≥4.5:1 vs surface default, remaining steps graded toward the surface. Solve direction: `'lighter'` (dark scheme) / `'darker'` (light). Light scheme adds `{'--text-inverted': 'var(--color-neutral-100)'}` to `cssVarOverrides` (the static `tokens.css:334` value is dark-on-anything); dark adds nothing. Derive all surface/page hexes via the real `palettesToVars`.
4. Tests: WCAG anchors (#000/#fff = 21, #767676/#fff ≈ 4.54), symmetry; solver grid (hues × backgrounds × directions) meets ratio post-round-trip; chroma-decay path (saturated yellow on white at 4.5:1); harmony hue geometry per mode + c/L preservation + determinism; solveTextCurves sweep — scheme ∈ {light,dark} × brand hue ∈ {0,60,120,180,240,300} × brand L ∈ {0.35,0.55,0.75}: apply patches, derive via `palettesToVars`, assert every guaranteed pairing meets its ratio; dark emits no overrides.

Verification: `npm test`, `npm run check`.

## Wave 4: Colors view — plumbing, wheel, swatches, readouts

**Goal:** the new editor view with a working wheel; edits identical to token-page base-color edits.

1. `src/editor/core/store/editorViewStore.ts`: add `'colors'` to `EditorView`; extend `readView()` and the `storage`-event guard.
2. `src/editor/ui/EditorViewSwitcher.svelte`: third segment ("Colors", icon per reserved judgment call); condensed mode cycles the three views.
3. `src/editor/pages/EditorShell.svelte`: sidebar branch for `'colors'` (nav anchors Wheel/Story + `ThemeFileManager` footer, mirroring tokens view) and main branch rendering `ColorsTab`.
4. New `src/editor/ui/colors/ColorsTab.svelte`: two-pane grid — left: wheel + (Wave 5: harmony row) + swatch row + readouts; right: Color Story placeholder (Wave 5). Chrome per invariant 7.
5. New `src/editor/ui/colors/ColorWheel.svelte`: canvas OKLCH disc (angle = hue, radius = chroma 0→~0.33 linear, fixed display L≈0.72, per-pixel `gamutClamp`; render once per size into cached ImageData, devicePixelRatio-aware). Draggable handles (absolutely-positioned focusable buttons; pointer capture; arrow keys nudge hue/chroma) for **Brand, Accent, Background, Neutral, Alternate** at each seed's (h,c); handle fill = actual seed hex; selection ring. Subtle neutral-zone guide ring near center (visual only — no clamping). Dragging writes hue/chroma into `state.palettes[label].baseColor` (seed L preserved) inside the PaletteEditor session pattern: `beginScope({label, collapseToOne:true, clipUndoFloor:true})` on interaction start, `commitScope` on end, `cancelScope` on Escape/unmount (`PaletteEditor.svelte:84,246,252` is the model; use `beginSliderGesture` for drag collapse).
6. Swatch row: all 10 palettes (`PALETTE_SPECS` order); click selects (wheel handle highlights when the family has one; Special + Info/Success/Warning/Danger are swatch-only). Readout panel for the selection: reuse `src/editor/ui/ColorEditPanel.svelte` (H/C/L sliders + EyeDropper) plus new `ColorReadouts.svelte` showing HEX / `rgb()` / `hsl()` / `oklch()` with click-to-copy.
7. Test: view-store round-trip guard accepts `'colors'`.

Verification: `npm test`, `npm run check`. Manual: switch to Colors; drag Brand — page restyles live; token-page swatch shows the same base color afterward; one undo restores the pre-session color; Escape cancels.

## Wave 5: harmony row, Color Story, accessible-text action

**Goal:** the full screen; QA both schemes.

1. Harmony row under the wheel: seven mode buttons (greyscale glyphs, Adobe-reference layout); hover shows ghost handles at the would-be hues; click applies `applyHarmony` (Brand anchor → Brand/Background/Accent baseColors) in one scope → single undo. Adjacent "Tint neutrals from brand" action (`tintNeutralsFromBrand`, Neutral/Alternate only, one scope).
2. New `src/editor/ui/colors/ColorStory.svelte` (right pane): vertical bands over `--page-bg`, top-to-bottom **Brand 30% / Accent ~8% / Special sliver ~2% / Background field 60%** (fixed v1 proportions, 60-30-10); band fills `var(--surface-{family})`; functional colors (Info/Success/Warning/Danger) as small superimposed swatches near the bottom (`var(--surface-{family})`). Band labels in `var(--text-{family})` with a small live AA ratio readout computed via `contrastRatio` from the store-derived hexes (`palettesToVars` output), not `getComputedStyle`. Live-updates during drags via normal store reactivity.
3. "Derive accessible text" `UIPillButton`: runs `solveTextCurves` → applies patches + `cssVarOverrides` via `transaction('derive accessible text', ...)` (one undo).
4. Manual QA (both schemes; visual-qa agent optional): drag Background to a light hue + set `emptyStep` '100' → derive accessible text → story ratios all pass and pages read correctly; same for a dark theme; a deliberately saturated bright background works (no clamping anywhere); harmony apply = one undo; theme save/reload round-trip (`ThemeFileManager`).

Verification: `npm test`, `npm run check`, `npm run build`; manual QA notes in review.

---

## Out of scope (explicitly)

- Runtime light/dark switching, `light-dark()`, `prefers-color-scheme` (one theme = one scheme; mode switching = theme switching, future work).
- Contrast badges inside `PaletteEditor` (deferred).
- Any `tokens.css` / `default.json` value changes; any token vocabulary change; any migration.
- Editable Color Story proportions (fixed v1).
- Releasing/tagging (user-triggered CI).

