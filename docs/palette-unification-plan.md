# Palette unification: one editor, no enforced gray

## Goal

Collapse the `chromatic` / `gray` palette split into a single palette model and a
single editor. A neutral is no longer a special mode; it is an ordinary palette
that happens to start with low chroma. Principle: **reasonable defaults, no
enforcement.** The user gets full L/C/H + curve control over every palette,
neutrals included.

This is enabled by the "Lock base color to position 500" toggle: once the picked
base color *is* step 500, a gray palette is just a low-chroma palette derived
from its base, exactly like an accent.

### Bonus wins

Unifying retires two issues we hit while adding the L slider:

- **Picker-vs-500 chroma split.** With the chromatic model (saturation curve as a
  multiplier of base chroma), step 500's chroma equals the base chroma you pick.
  No more "I set 0.04 but the swatch shows 0.008."
- **Lock saturation spike.** There is no flat-20 gray saturation curve to spike
  when the lock injects a 100 anchor.

## Decisions (resolved)

1. **Reasonable defaults, not enforcement.** Neutral/Alternate ship with calm
   defaults (low chroma, neutral lightness ramp) but every value is editable,
   uncapped. (Confirmed.)
2. **Neutral keeps its semantic role.** `scaleToCssVar` maps `cssNamespace ===
   'neutral'` to the global `--text-*` / `--surface-*` tokens. That is keyed on
   namespace, not mode, so it is untouched. Editing Neutral now behaves like any
   palette; it just happens to feed the foundation tokens. Known consequence: a
   vivid Neutral yields vivid text/surfaces. That is the designer's call.
3. **Snapping for neutrals: enable it.** Drop the `canSnap = mode !== 'gray'`
   gate; neutrals gain derived-scale snapping like everyone else.
4. **Default lock state for new neutrals: locked, with a subtle tint.** Fresh
   Neutral/Alternate ship `anchorToBase: true` so 500 == the picked base (no
   split). The default base chroma is low but **non-zero** (~0.008, the old
   neutral's effective tint), not fully desaturated, so neutrals keep their
   barely-there color. With a flat-100 saturation curve the whole ramp carries
   that same subtle tint uniformly, which is how the old neutral looked. Lightness
   default keeps the neutral ramp (old `DEFAULT_GRAY_LIGHTNESS`, 92->3).
5. **Migration aims close, not exact.** (Per owner: exact preservation not
   required; "close would be nice," manual retune afterward is fine.) Existing
   neutrals migrate to the clean unified form: snap `baseColor` to the effective
   500 color (which already carries the subtle tint and lightness), adopt a
   flat-100 saturation curve, locked. Visually identical for default /
   flat-saturation neutrals; only diverges if a user hand-shaped their gray
   saturation curve, and they can re-tune. This drops the exact-preservation
   gymnastics and kills the split in one move. Rationale below.

## Target model

`PaletteConfig` loses the gray vocabulary entirely:

```
- tintHue            (drop)
- tintChroma         (drop)
- grayLightnessCurve (drop)
- graySaturationCurve(drop)
+ baseColor          (already present, now universal)
+ lightnessCurve     (already present, now universal)
+ saturationCurve    (already present, now universal)
```

`curveOffset` keeps `lightness` / `saturation` keys only; the `gray-lightness` /
`gray-saturation` keys are migrated into them.

One compute path: `computePaletteColor(index, baseColor, lightnessCurve,
saturationCurve, curveOffset)` for all palettes. `computeGrayColor` is deleted.

`PaletteSpec.mode` is removed. Each spec keeps `initialColor` plus a per-palette
**default config** (the "reasonable defaults"): neutrals seed the calm
lightness/saturation curves + low base chroma; accents seed the chromatic curves
+ their `initialColor`. Defaults live where `defaultPaletteConfig()` is today,
parameterized per palette role rather than per mode.

## Migration

`default.json` already has `schemaVersion`, and every `editorConfigs.*` carries
the union of fields (even chromatic palettes store `tintHue`/`grayLightnessCurve`
unused). So migration is: bump `schemaVersion`, then for each palette config:

**Chromatic palettes** (Background, Brand, Accent, Special, Info, Success,
Warning, Danger): drop `tintHue`, `tintChroma`, `grayLightnessCurve`,
`graySaturationCurve` (all vestigial there). Nothing else changes.

**Gray palettes** (Neutral, Alternate), close mapping (snap to effective 500):
```
baseColor      = gray500Hex   // computeGrayColor @ 500: correct L, subtle C (~tintChroma*satMul), H = tintHue
lightnessCurve = grayLightnessCurve                          // keep the neutral lightness ramp
saturationCurve= DEFAULT_PALETTE_SATURATION()  // flat 100; chroma now comes from baseColor
curveOffset    = { ...offset, lightness: offset['gray-lightness'] }   // drop gray-* keys; gray-saturation offset not carried
anchorToBase   = true                                       // base IS 500, no split
```
Because `baseColor` is the effective 500 (subtle tint preserved) and the
saturation curve is flat, the whole ramp carries that subtle tint uniformly,
matching the old default neutral. Hand-shaped gray saturation curves are not
reproduced; owner accepted approximate + manual retune.

**Where the migration runs.** `default.json` is regenerated from the new
defaults at ship time (no migration needed for it). Consumer themes need
conversion. Two options, pick one in implementation:
- (preferred) convert-on-load shim keyed on `schemaVersion`, rewrites to unified
  shape on next save. Cannot corrupt files; sunsets after a major.
- a `npx live-tokens migrate` pass (consistent with the tokens.css migration
  discipline) if we want it explicit on disk.

The `_imported` reconciler (`reconcilePalettesFromCssVars`) also branches gray
vs chromatic (sets `tintHue`+`tintChroma` for gray, `baseColor` for chromatic).
Unified, it always snaps `baseColor` to the imported `--color-{ns}-500`.

## Work breakdown (by surface)

1. **`themeTypes.ts`** — remove the four gray fields from `PaletteConfig`. Update
   the `_imported` docstring (no more "tintHue+tintChroma for gray palettes").
2. **`paletteMath.ts`** — delete `computeGrayColor`, `DEFAULT_GRAY_LIGHTNESS`,
   `DEFAULT_GRAY_SATURATION`, the `graySteps` array, `grayStepKey`, `grayStepToX`.
   Keep one step list + `computePaletteColor`.
3. **`paletteDerivation.ts`** — remove `PaletteMode` and `spec.mode`; collapse the
   `derivePaletteVars` branch (lines ~218-244) to the chromatic path; merge
   `GRAY_STEPS` into `PALETTE_STEPS` (identical); simplify the reconciler to the
   `baseColor` snap. Add per-palette default configs to the specs/seeding.
4. **`PaletteEditor.svelte`** — remove the `mode` prop and all ~10 branches; delete
   the duplicated gray rendering block (lines ~717-782); the single remaining path
   is today's chromatic path. Remove the `tintLightness`/`GRAY_500_X`/gray-offset
   wiring added earlier (lightness now flows through `baseColor` + the lock, like
   chromatic). Enable snapping for all (decision 3).
5. **`PaletteBase.svelte`** — remove the `mode` prop and the `pickerHue/Chroma/
   Lightness` gray branch; always derive picker channels from `baseColor`. Keep
   the calm-zone `chromaHint` as a per-palette default hint (neutrals pass it).
   The "Lock base color to position 500" toggle shows for all palettes.
6. **`VariablesTab.svelte`** — drop the two `mode="gray"` props.
7. **Tests** — `paletteDerivation.test.ts`, `PaletteEditor.test.ts`,
   `editorStore.test.ts` reference the gray model; update to the unified model.
   Add: migration round-trip test (old gray config in → identical vars out).

## Verification

- `npm run check` (svelte-check) clean.
- `npm test` green, including a migration-closeness test asserting a
  pre-migration default Neutral and its migrated form produce a step 500 within a
  small deltaE tolerance (exact for flat-saturation neutrals).
- `npm run check:token-contract` (token names unchanged: `--color-{ns}-*`,
  `--text-*`, `--surface-*` all preserved; this refactor changes config shape,
  not token names).
- Manual: open the editor, confirm Neutral now shows the full OKLCH picker with
  the lock toggle, snapping available, calm default unchanged on load.

## Out of scope / risks

- Token names are unchanged, so this is not a tokens.css migration; it is a
  theme-config schema migration. No consumer `tokens.css` edits.
- Risk: consumer themes with hand-shaped gray saturation curves migrate close,
  not exact (owner-accepted). Default / flat-saturation neutrals are unchanged;
  closeness test guards the default case.
- This is a multi-file refactor touching the runtime derivation. Recommend
  implementing in a fresh session pointed at this doc (per the project's
  plan-then-orchestrate workflow), not inline in the discussion thread.
