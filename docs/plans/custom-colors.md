# Custom colors

Plan of 2026-10-16. The user answered both open questions on 2026-10-16:
remove works from the picker (D7, D11) and gradient stops can name custom
colours (D3). The user approved D1 to D11 on 2026-10-16.

Every colour picker gains a **Custom** row. Custom colours are theme-owned
tokens, `--color-custom-1`, `--color-custom-2` and so on. A slot picks one the
way it picks a palette step. Unlike a palette step, a custom colour holds its
own OKLCH value, which the user sets in the same editor the palette steps use.
A slot can reuse a custom colour, so one edit moves every slot that names it.

## Ground truth

Measured on local main at `adfc1be`.

1. **One picker serves every colour slot.** `UIPaletteSelector.svelte` renders
   the White/Black/None band (`:622-637`), the ten family rows (`:638-658`),
   and the Gradients rows (`:659-669`). A family drill-in shows a back header
   and a Palette/Surface/Border/Text tab bar (`:672-740`).
   `GradientStopPicker.svelte:8` reuses it, so gradient stops get whatever the
   picker lists.
2. **The picker hard-codes its vocabulary.** `families` (`:80`), `paletteSteps`
   (`:95`), `getVarName` (`:202`) and `parseRef` (`:235`) accept only the ten
   families and the regex `^--color-([a-z]+)-(\d{3})$`. `initFromCurrent`
   (`:358`) parses the slot's stored value back into the chosen state, and the
   trigger meta goes blank for any value it cannot parse.
3. **Gradients are the precedent for a theme-owned token list.**
   `ColorsAndType.gradients?: GradientDiskToken[]` (`themeTypes.ts:179`) is
   optional and absent on older files. The store slice is
   `EditorState.gradients.tokens` (`editorTypes.ts:125`); mutators live in
   `slices/gradients.ts` and go through `mutate`, so undo needs no slice code.
   `nextGradientSlot` (`gradients.ts:23`) returns the lowest free N.
   `gradientsToVars` (`gradients.ts:134`) feeds `deriveCssVars`
   (`editorRenderer.ts:27-42`), which reaches live CSS through `cssVarSync`.
   `colorsAndTypeContent` (`editorStore.ts:432-450`) writes the list and folds
   the rendered vars into `cssVariables`, which is what the bake reads
   (`renderTokensCss`, `themeFileApi.ts:428-543`). No gradient-specific bake
   code exists.
4. **Loading an older file keeps defaults.** `colorsAndTypeToState`
   (`editorStore.ts:381-407`) starts from `emptyState()` and
   `loadGradientsFromFile` replaces the list only when the field is present
   and valid. `migrateGradients` (`editorPersistence.ts:66-74`) applies the
   same guard to localStorage.
5. **A slot stores a bare token name.** `UITokenSelector.writeOverride`
   (`UITokenSelector.svelte:130-158`) runs `cssStringToRef`
   (`cssVarRef.ts:41`); the disk value is `"--gradient-2"` and the CSS is
   `var(--gradient-2)`. Opacity uses `formatColorOpacity` on any name.
6. **Deleting a gradient leaves dangling refs.** `removeGradientToken`
   (`gradients.ts:254`) filters the list and never scans component aliases.
   A slot that named the deleted token keeps writing `var(--gradient-N)` and
   paints nothing.
7. **The palette editor already edits one OKLCH value with confirm and
   cancel.** `PaletteEditor.svelte` opens a scope (`openSession`, `:111`,
   `beginScope({collapseToOne:true, clipUndoFloor:true})`), writes each drag
   tick, and commits or cancels the scope (`:299-334`). `ColorEditPanel.svelte`
   is the generic OKLCH editor in Image 3: title, hex, eyedropper, H/C/L
   sliders, confirm/cancel.
8. **Checkers read `tokens.css` alone.** `bin/lib/tokenVocabulary.mjs:251-321`
   builds the vocabulary from `tokens.css` and component `:global(:root)`
   blocks. `checkPageValues` (`bin/rules/tokens.mjs:287-301`) would flag
   `var(--color-custom-1)` in page CSS as `unknown-token`.
   `checkConfigTokens` (`:210-245`) checks shipped `component-configs`
   defaults and never theme files. User-added `--gradient-5` and above hit the
   same wall today.
9. **`set-colors` carries gradients forward.** `bin/set-colors.mjs:80-85`
   passes `live.gradients` into `buildColors` (`buildColors.ts:432`).
   `buildColors` would drop any other structured field it does not name.
10. **No `--color-` parser collides with a numbered suffix.** Every
    `--color-<family>-` template and regex in `src/`, `bin/` and
    `vite-plugin/` builds a name from a known family or matches three digits.
    `aliasKinds.ts:77` routes on the `--color-` prefix, which places custom
    colours in the colour picker.

## Target model

`ColorsAndType.customColors?: CustomColorDiskToken[]`, where a token is
`{ variable: '--color-custom-N', color: Oklch }`. The store holds
`EditorState.customColors.tokens`. `customColorsToVars` renders each token as
`--color-custom-N: oklch(L C H)` into `deriveCssVars`, and
`colorsAndTypeContent` folds the same vars into `cssVariables`. The bake, the
production CSS build and theme export then carry them with no new code.

## Decisions

- **D1. Token names.** `--color-custom-N`, numbered from 1, with N the lowest
  free slot (the `nextGradientSlot` rule). The picker labels them by number,
  as it labels gradients. The user names no colour.
- **D2. Theme-owned and optional.** `customColors` sits in `ColorsAndType`
  beside `gradients`. An absent field loads as an empty list. The field is
  additive, so `THEME_SCHEMA_VERSION` stays 5 and no migration runs.
  `tokens.css` declares no custom colour; shipped themes carry none.
- **D3. Picker row.** A **Custom** row follows Danger in the family list and
  precedes Gradients. Its three mini swatches show the first three custom
  colours, with empty dashed squares where fewer exist. The row shows on
  every colour picker, including gradient stops, and obeys `familyFilter`
  like the other rows.
- **D4. Drill-in.** The Custom drill-in has the back header "Custom" and a tab
  bar with the single tab **Palette**. The grid lists every custom colour,
  then an empty dashed swatch with a plus. Clicking a swatch selects it,
  honours the opacity slider, and closes the picker, as a palette step does.
- **D5. Adding.** The plus adds the next `--color-custom-N`, seeded from the
  slot's current resolved colour, and opens `ColorEditPanel` inside the
  dropdown under the grid, titled "Custom › N". The slot previews the new
  colour while the user drags. Confirm assigns it to the slot and closes the
  picker. Cancel removes the new token and restores the slot. The add, the
  edits and the assignment collapse into one undo step through the
  PaletteEditor scope pattern (Ground truth 7).
- **D6. Editing.** Each custom swatch in the drill-in carries a pencil in its corner.
  The pencil opens the same panel, titled "Custom › N", on that token. The
  edit moves every slot that names the token. Confirm commits; cancel
  restores the old value.
- **D7. Removing.** Each custom swatch in the drill-in carries a bin button,
  and the Tokens view gains a Custom colours section beside
  `GradientsSection` with edit and remove on each token. A custom colour
  that nothing names goes at once. One that a slot names opens a replace
  step (D11) first. The user approved remove in the picker on 2026-10-16.
- **D11. Replace on remove.** Remove scans the current theme for every
  component alias, gradient stop, wash colour (scrim and tint) and literal
  alias that names the token. The washes pick through `UIPaletteSelector`
  with no `familyFilter`, so under D3 they offer custom colours. A literal
  alias carries the ref when a slot overrides a library gradient's angle. When it finds
  any, the panel shows a replace step:

  > Used by 4 properties in Button and Card. Replace with: [swatch]
  > [Replace and remove] [Cancel]

  The swatch opens the ordinary picker, preselected to the nearest token by
  OKLab distance among the palette steps, White, Black and the other custom
  colours. Confirm rewrites every reference to the chosen token, keeps each
  slot's opacity (`formatColorOpacity` on the new name), removes the custom
  colour, and lands as one undo step. Cancel changes nothing. Each theme owns
  its custom colours and the aliases that name them, so the scan covers one
  document, other saved themes stay untouched, and no dangling ref can arise.
  Two alternatives lose: blocking the remove makes the user hunt down every
  slot by hand, and baking the literal value into each slot cuts the slot
  off from the theme.
- **D8. Checkers stay as they are.** Custom colours reach a page only through
  component properties. A page that writes `var(--color-custom-1)` in its own
  CSS keeps getting `unknown-token`, since the name exists only in one theme.
  Shipped component defaults never name a custom colour.
- **D9. CLI carry-forward.** `set-colors` and `buildColors` carry
  `customColors` through untouched, as they carry gradients. `save-theme`
  captures the field with the rest of the buffer. No verb writes custom
  colours.
- **D10. Contrast.** Custom colours sit outside the AA gate in `buildColors`,
  which checks palette-derived text and surfaces only. The page-level
  `page-contrast` rule reads computed colours and covers them unchanged.

## Invariants

- Every `--color-custom-N` that a slot names exists in the same theme's
  `customColors`.
- Loading a file without `customColors` yields an empty list and leaves
  `cssVariables` unchanged.
- A theme saved, exported and imported again deep-equals the original
  `customColors`.
- The picker parses every value it writes: selecting a custom colour,
  reopening the picker, and reading the trigger meta yields
  `color-custom-N` with its opacity.

## Out of scope

- Naming custom colours.
- Custom surfaces, borders or text steps derived from a custom colour.
- A per-scheme value. A custom colour holds one value in light and dark.
- Teaching the skills or the CLI to create custom colours.

## Wave 1: model and store

- `CustomColorDiskToken` in `themeTypes.ts`; `customColors?` on
  `ColorsAndType`.
- `slices/customColors.ts`: `customColorsToVars`, `loadCustomColorsFromFile`,
  `nextCustomColorSlot`, `addCustomColor`, `setCustomColor`,
  `removeCustomColor`, `customColorUsages(state, variable)`,
  `nearestColorToken(color, state, exclude?)`, and
  `replaceAndRemoveCustomColor(variable, replacement)` for D7 and D11.
- `EditorState.customColors`, `emptyState`, `deriveCssVars`,
  `colorsAndTypeContent`, `colorsAndTypeToState`, and the localStorage
  hydrate guard.
- `buildColors` and `set-colors` carry the field (D9).
- Tests: round trip through `colorsAndTypeContent` and
  `colorsAndTypeToState`; absent field; `nextCustomColorSlot` reuses gaps;
  `customColorUsages` finds aliases and gradient stops;
  `replaceAndRemoveCustomColor` rewrites every reference, keeps opacity, and
  undoes in one step; `buildColors` carries the list.

**Verify.** `npx vitest run src/editor/core bin`, `npm run check`,
`node scripts/check-production-is-default.mjs`.

**Done when** every test the wave lists passes, and
`git grep -l -- '--color-custom-' src/live-tokens/data src/system/styles`
prints nothing (D2).

## Wave 2: picker

- `UIPaletteSelector`: the Custom row (D3), the drill-in (D4), add (D5),
  edit (D6), remove with the replace step (D7, D11), and
  `parseRef`/`getVarName`/`metaLabel` for `--color-custom-N`.
- The usage line names washes and library-gradient literals as well as
  components.
- D5 cancel cancels the PaletteEditor scope. `removeCustomColor` refuses while
  a slot names the colour, and the slot still previews the new token.
- Test: select, reopen, and read the meta for a custom colour at 100% and at
  60% opacity.

**Verify.** `npx vitest run src/editor`, `npm run check`,
`node scripts/check-production-is-default.mjs`.

**Done when** the wave's test passes, svelte-check reports 0 errors, and
`git status --short src/live-tokens/data` prints nothing.

## Wave 3: Tokens view section

- `CustomColorsSection.svelte` beside `GradientsSection` (D7), reusing the
  replace step from Wave 2.

**Verify.** `npx vitest run src/editor`, `npm run check`,
`node scripts/check-production-is-default.mjs`.

**Done when** the section lists, edits and removes custom colours through
the Wave 2 replace step, svelte-check reports 0 errors, and
`git status --short src/live-tokens/data` prints nothing.

## Wave 4: docs

- A short section in `src/editor/docs/content/` on custom colours, then
  `npm run sync:docs`.
- CHANGELOG entry: additive `customColors` field.

**Verify.** `npm run check:docs-content`, `npm run check`.

**Done when** `check:docs-content` reports no drift and
`grep -n customColors CHANGELOG.md` prints the new entry.

## Wave 5: visual pass

The user's: open a picker, add three custom colours, assign them across two
components, edit one, save, reload, switch themes, and adopt.

## Open questions

1. Answered 2026-10-16: remove from the picker too (D7).
2. Answered 2026-10-16: gradient stops can name custom colours (D3).
