# Execution plan: harmony preset icons + tetradic/compound presets

Branch: create **`harmony-preset-icons`** off **`harmony-axes-redesign`** @ `6442a4a`. Four waves, each a single commit unit executable by a sub-agent with only this doc and the repo. Waves are strictly sequential; each ends green (`npm run check` 0 errors, `npm test` all passing — baseline 3072 passing on the parent branch).

**Model guidance per wave** (orchestrator picks the executor):
- Wave 1 (asset intake): **Sonnet.** Mechanical SVG cleanup against an explicit spec.
- Wave 2 (engine): **Opus.** Small diff but invariant-dense (slot conventions, exhaustive switch, pinned tests).
- Wave 3 (UI wire-up): **Sonnet**, run inside the `svelte-file-editor` agent with the Svelte autofixer on every touched component.
- Wave 4 (visual QA + weight tuning): **the user (Mark) runs QA personally — no model executes this wave.** An agent may only apply the specific SVG weight edits the user requests, then re-run the Wave 3 icon test and commit.

**Precondition:** working tree on `harmony-axes-redesign` @ `6442a4a` whose ONLY dirty state is the untracked directory `src/img/color-wheel-icons/` containing exactly these 10 files: `analogous.svg`, `complementary.svg`, `compound-adobe.svg`, `custom.svg`, `monochromatic.svg`, `quad.svg`, `shades.svg`, `split-complementary.svg`, `tetradic.svg`, `triad.svg`. **These untracked files are the only copy of user-provided artwork. Never `git clean`, stash, reset, or checkout over them.** If the tree differs from this description, stop and report.

## What this builds

Two improvements to the harmony presets, in dependency order:

1. **Engine:** two new hue-geometry presets, `tetradic` (rectangle) and `compound` (Adobe's analogous-plus-complements hybrid). Both are 4-hue angular schemes, so they drop straight into the existing 4-axis, hue-only model with no new machinery.
2. **UI:** the mode row in `src/editor/ui/colors/ColorsTab.svelte` swaps its Font Awesome glyph approximations (the `MODES` array at lines 17–24) for the real color-wheel geometry icons the user provided, adds buttons for the two new presets, and gives `custom` a first-class button instead of only the eyebrow suffix.

### Decisions resolved (do not re-litigate during execution)

1. **`shades` is NOT a preset.** The engine rotates hue only (`colorHarmony.ts` header invariant); shades varies lightness at a fixed hue, which under this model is indistinguishable from `monochromatic`. A second button producing identical hue output is redundant machinery. `shades.svg` still moves into the icon directory in Wave 1 (it's provided artwork, co-located for a possible future lightness-ramp feature) but gets no registry entry and no button.
2. **Slot orders for the new modes** follow the existing priority convention (`harmonyHues` doc: slot 1 is the primary harmonic partner, and with the default trio bound, slots 0–2 go to Brand/Accent/Background):
   - `tetradic`: `[a, a+180, a+60, a+240]` — hue set {H, H+60, H+180, H+240}, i.e. two complementary pairs 60° apart. Slot 1 is the complement.
   - `compound`: `[a, a+180, a+30, a+210]` — hue set {H, H+30, H+180, H+210}: the anchor's analogous neighbor plus both of their complements. Slot 1 is the complement.
   Both have four distinct slots, so `modeHasQuaternary` returns true for them **by construction** — the Quaternary axis and its wheel handle enable automatically with zero UI changes (`ColorWheel.svelte:50`, `HarmonyAxesList.svelte:31`).
3. **`custom` becomes a button** at the end of the row, using `custom.svg`. Clicking it sets `activeMode = 'custom'` and writes nothing (no `setAxisHues` call, no undo entry — do not route it through `applyMode`'s no-op guard; special-case it). It renders active exactly when `activeMode === 'custom'`, which also happens automatically when the user drags the wheel (`onCustomize`). With the button present, drop the `· custom` suffix from the Harmony eyebrow (`ColorsTab.svelte:107`).
4. **Row order** follows the classical progression, single-hue → two → three → four → escape hatch: monochromatic, analogous, complementary, split-complementary, triadic, tetradic, square, compound, custom. (9 buttons.)
5. **Icons ship inline, not as asset files.** Each cleaned SVG is imported with an explicit vite `?raw` import (one `import` line per icon — NOT `import.meta.glob`; the docs-loading-bug taught us glob discovery is fragile across the package boundary, and explicit imports stay greppable). The strings compile into the JS bundle, so nothing new ships in `package.json#files` and the published tarball needs no asset handling.
6. **`activeMode` stays ephemeral UI state.** Persisting the mode into the theme is out of scope; a mode is a verb (deal this geometry), not document state. Non-goal.
7. **Icon staging dir is removed.** After Wave 1 relocates the files, `src/img/` must not exist.

### Icon-to-mode mapping

| File (as provided) | HarmonyMode | Notes |
|---|---|---|
| `monochromatic.svg` | `monochromatic` | 3 dots along one radius |
| `analogous.svg` | `analogous` | stylized ±45° arc (engine uses ±30; icons are pictograms, not diagrams — do not "fix" the angles) |
| `complementary.svg` | `complementary` | diameter |
| `split-complementary.svg` | `split-complementary` | arrowhead |
| `triad.svg` | `triadic` | equilateral triangle |
| `tetradic.svg` | `tetradic` (NEW) | rectangle |
| `quad.svg` | `square` | square, diagonals drawn |
| `compound-adobe.svg` | `compound` (NEW) | asymmetric analogous+complement pair |
| `custom.svg` | `custom` | freeform dots, no spokes |
| `shades.svg` | — | relocated, unused (decision 1) |

## Global invariants (hold in every wave)

- **Hue-only harmony.** No wave touches chroma/lightness handling, `paletteBaseColor.ts` write paths, `cssVarSync`, persistence, or the theme schema. The full diff surface is: `colorHarmony.ts` + its test (Wave 2), the new icon module + `ColorsTab.svelte` (Wave 3), icon SVGs (Waves 1/4).
- **Greyscale editor chrome.** Icons render via `currentColor` only — no literal colors survive cleanup, and no accent colors are introduced. Button chrome keeps the existing `--ui-*` token styling in `ColorsTab.svelte` (mode-btn rules, lines 292–318); any new CSS values must be `--ui-*` tokens, never hardcoded.
- **`harmonyHues` keeps its declared `number[]` return type** on the inner switch so a missing case is a compile error, and every mode's slot array has exactly `AXIS_COUNT` entries with all hues normalized via `norm`.
- Each wave ends with `npm run check` at 0 errors and `npm test` fully passing; Waves 3–4 additionally run the Svelte MCP autofixer on every touched `.svelte` file until clean.
- Commit messages follow the repo style (`git log --oneline` for reference), one commit per wave.

---

## Wave 1 — asset intake and cleanup (no behavior change)

Goal: the provided icons live in the repo, cleaned to spec, committed — getting the only copy of the artwork into history before anything else.

1. Create `src/editor/ui/colors/harmony-icons/` and move all 10 SVGs into it, renaming to match modes: `quad.svg` → `square.svg`, `triad.svg` → `triadic.svg`, `compound-adobe.svg` → `compound.svg`. Delete the now-empty `src/img/` tree.
2. Clean every SVG to this exact spec (the originals are Adobe Illustrator exports designed at 256×256 for large display; the buttons render them at ~22px, where the original weights are sub-pixel):
   - Strip: XML prolog, Illustrator generator comment, `version`, `xmlns:xlink`, `x`/`y`, `width`/`height`, `enable-background`, `xml:space`, the `<rect id="canvas">`, all `id` attributes, and all `stroke-miterlimit`s. Keep `viewBox="0 0 256 256"` and `xmlns`.
   - Wheel ring (the circle at r=90, stroke `#E5E5E5`): `stroke="currentColor"` `opacity="0.25"`, stroke-width stays 18.
   - Dots (`<circle r="10">`): `fill="currentColor"`, radius **10 → 24**.
   - Spokes/lines (stroke `#000000`, width 4): `stroke="currentColor"`, width **4 → 10**, keep `stroke-linecap="round"`.
   - Geometry (cx/cy/x1/y1 coordinates) is untouched — only weights and colors change.
   These weights are a starting point; Wave 4 owns the final optical tuning.
3. No source files reference the icons yet; `npm run check` and `npm test` must pass untouched. Commit (this wave is assets only).

## Wave 2 — engine: `tetradic` and `compound` presets

Goal: the two new modes exist in the geometry engine with pinned tests. No UI changes.

1. `src/editor/core/palettes/colorHarmony.ts`:
   - Extend the `HarmonyMode` union with `'tetradic'` and `'compound'` (insert between `'square'`-adjacent members in reading order — union order is cosmetic; alphabetical-by-progression preferred: after `'triadic'`).
   - Add the two cases to the `harmonyHues` switch per decision 2:
     ```ts
     case 'tetradic': return [a, norm(a + 180), norm(a + 60),  norm(a + 240)];
     case 'compound': return [a, norm(a + 180), norm(a + 30),  norm(a + 210)];
     ```
   - Nothing else changes. `modeHasQuaternary`, `applyHarmonyToAxes`, `boundColorPatch`, sanitizers, and defaults are already mode-generic.
2. `src/editor/core/palettes/colorHarmony.test.ts`:
   - Extend the geometry pin test (`pins each mode relative to the anchor`) with the two new modes' full slot arrays at a concrete anchor (follow the existing pin style — literal expected hues, not re-derived math).
   - Extend the `modeHasQuaternary` test: true for `tetradic` and `compound` (alongside `square`/`analogous`); the false list is unchanged.
   - Add one `applyHarmonyToAxes` case: `tetradic` with the default trio bound and Quaternary unbound deals all four hues (Quaternary axis moves to anchor+240 even while unbound).
   - Where existing tests iterate "every mode" (e.g. `every mode leaves L and C untouched`), confirm they iterate the union exhaustively (a literal list must gain the two new members).
3. Green, commit.

## Wave 3 — UI: real icons in the mode row

Goal: `ColorsTab.svelte`'s harmony row shows the 9 geometry icons; Font Awesome glyphs for harmony are gone.

1. New module `src/editor/ui/colors/harmonyModeIcons.ts`:
   - Nine explicit `?raw` imports, one per registry entry (`shades.svg` is not imported; decision 1).
   - Export `HARMONY_MODE_BUTTONS: { mode: HarmonyMode; label: string; svg: string }[]` in the decision-4 order, labels: Monochromatic, Analogous, Complementary, Split complementary, Triadic, Tetradic, Square, Compound, Custom.
   - Add a vitest (`harmonyModeIcons.test.ts`, colocated per repo convention) pinning: entry count 9, every `mode` is a distinct member of `HarmonyMode`, every mode of the union except none is present exactly once (custom included), and every `svg` string contains `viewBox="0 0 256 256"` and `currentColor` and does not contain `#000000` or `#E5E5E5` or `<rect`. This is the guard that keeps future icon edits inside the cleanup spec. (Vitest resolves `?raw` through the vite config; if the test environment fails to resolve `?raw`, stop and report rather than mocking.)
2. `src/editor/ui/colors/ColorsTab.svelte`:
   - Delete the local `MODES` array (lines 17–24) and its "Greyscale glyphs approximating the Adobe harmony row" comment; iterate `HARMONY_MODE_BUTTONS` instead.
   - Button body becomes `{@html m.svg}` in place of the `<i class="fas ...">` element; keep `title`, `aria-label`, `aria-pressed`, and the pointer/focus preview handlers exactly as they are. Hover preview must keep working for the two new modes (it already will — `ColorWheel` computes ghosts from `applyHarmonyToAxes(previewMode, …)`, and `previewMode === 'custom'` is already ignored at `ColorWheel.svelte:151`).
   - `custom` click path: `activeMode = 'custom'` only, no store write (decision 3). All other modes keep the existing `applyMode` path.
   - Drop the `· custom` eyebrow suffix (decision 3).
   - CSS: size the inline svg inside `.mode-btn` (`width/height ~1.375rem`, `display: block`); the svg inherits `color` from the button so the existing default/hover/active color transitions apply to the icon automatically. Buttons may stay 2.25rem square.
3. Autofixer clean on `ColorsTab.svelte`. Green, commit.

## Wave 4 — visual QA and optical tuning (user-run)

Goal: the row reads correctly at real size, in the running app. **The user performs this wave in the browser; no model does visual judgment here.** Execution stops after Wave 3 and hands off.

Checklist for the user:

1. Launch the dev app, open the editor's Colors tab.
2. Verify at the actual button size: every icon legible and distinguishable; dots read as dots (not specks), spokes visible, ring subordinate (it's context, not content). Check default, hover, active, and `aria-pressed` styling; check the active state after dragging the wheel (custom button lights up).
3. Functional spot-checks: apply tetradic → all four axes move, one undo entry, Quaternary handle appears; apply compound → same; hover each of the 9 buttons → ghost preview for 8, none for custom; monochromatic then square round-trip behaves as before (regression).

If tuning is needed, the user names the adjustments (e.g. "dots to r=28", "ring at 0.2") and an agent applies them mechanically: weights/opacity only, geometry untouched, re-run the Wave 3 icon test, green, commit. If nothing needs tuning, record the QA result in this doc's execution record; no commit.

## Reserved judgment calls (executor decides, records in the execution record)

- Final dot radius / spoke width / ring opacity after seeing them rendered (Wave 4).
- Whether the 9-button row needs a slightly smaller gap or icon size to stay on one line at the editor's minimum pane width (Wave 3/4 — stay inside existing `--ui-space-*` tokens).
- Exact insertion point of the new union members and test-case ordering (cosmetic).

## Explicit non-goals

- No `shades` preset (decision 1) and no lightness-ramp machinery.
- No persistence of `activeMode` in `EditorState` or theme JSON (decision 6).
- No changes to `ColorWheel.svelte`, `HarmonyAxesList.svelte`, `paletteBaseColor.ts`, sanitizers, or theme schema — if a wave seems to need one, stop and report instead.
- No analogous step-angle parameter, no per-mode configurability.
