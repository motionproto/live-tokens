# Responsive columns

Plan of 2026-10-15. The user approved the eight decisions under "Decisions"
on 2026-10-15.

The column grid holds one count, gutter and margin at every width. Phones and
tablets get their own values, and the grid switches at fixed breakpoints in
`tokens.css`, the way the type scales switch font sizes. The editor's Columns
section edits each width's values, and the dev overlay follows the width the
window has.

## Ground truth

Measured on local main at `4cc1fa0`.

1. **The grid is fixed.** `tokens.css:500-506` declares `--columns-count: 12`,
   `--columns-max-width: 1440px`, `--columns-gutter: clamp(0.5rem, 1.5vw,
   1.5rem)` and `--columns-margin: 0`. No `@media` block in `tokens.css`
   declares a column token.
2. **Every shipped theme pins it.** All 10 files in
   `src/live-tokens/data/themes/` and all 9 in
   `src/live-tokens/data/colors-and-type/` hold `12`, `1440px`, `32px` and
   `0px` (for example `themes/default.json:2258-2261`). The pin dates from
   `3fdba07` ("clean defaults", 2026-05-30). `tokens.generated.css:11-14`
   carries the same four values, so the `clamp()` gutter never applies.
3. **The bake is flat.** `regenerateTokensCss()`
   (`vite-plugin/themeFileApi.ts:548`) writes theme values under `:root:root`
   and emits no `@media` block. A theme value beats a `@media` re-point in
   `tokens.css`, so a responsive token cannot be one name that a theme
   stores.
4. **The editor state is one set.** `ColumnsState` is `{ count, maxWidth,
   gutter, margin }` (`editorTypes.ts:40`). `slices/columns.ts:9` defaults it
   to 12 / 1440 / 16 / 0, which disagrees with both `tokens.css` and every
   theme. `deriveCssVars` emits all four vars once the state differs from
   that default (`editorRenderer.ts:30-31`), and the theme loader reads them
   back (`columns.ts`, `loadColumnsFromVars`; `editorStore.ts:371`).
   `ColumnsSection.svelte:18-78` writes through `mutate` with clamps (count
   1 to 24).
5. **The overlay reads computed values.** `ColumnsOverlay.svelte:15-20`
   reads the four vars from `getComputedStyle` and re-reads on `resize`
   (`:24-25`). It already follows any breakpoint `tokens.css` declares. It
   draws `position: fixed; inset: 0` in the top window.
6. **Pages leave the grid on narrow screens.** `src/app/Home.svelte:105-107`
   and `template/src/pages/Home.svelte:63-65` set `grid-template-columns: 1fr`
   at `max-width: 767px`. Demo sections, `Docs.svelte:660-663` and
   `TestingLoops.svelte` do the same at 600px to 1023px. The create-page skill
   tells every page to do it (`SKILL.md:52`) and fixes `grid-column` numbers
   to the count it reads (`SKILL.md:50`).
7. **Type switches at 768px and 480px.** `tokens.css:1043-1089` is
   `@media (max-width: 768px)` and `:1091-1110` is `@media (max-width:
   480px)`. The type-scale module names the viewports desktop, tablet and
   phone (`src/editor/core/typeScale/typeScale.ts:17-23`). Token names put the
   viewport before the property: `--heading-xl-desktop-font-size` (`:757`).
8. **The `page-grid` rule** (`src/testing/support/pageHarness.ts:695-730`)
   reads the computed `--columns-count`, finds every grid with that many
   tracks, and checks section edges against its lines. It runs at 1280px and
   390px (`src/testing/config.ts:28-31`). A page that collapses to `1fr`
   presents no matching grid at 390px. The rule reference in
   `TestingLoops.svelte:283` says "768px and wider".
9. **Migrations.** `tokens.css` migrations live in
   `vite-plugin/tokensCssMigrations/migrations/`; the latest is
   `2026-10-08-type-scales.ts`, a breaking one with a value backfill. Theme
   and colors-and-type migrations live in `src/editor/core/themes/migrations/`;
   `2026-09-21-wash-color-and-opacity.ts` rewrites stored keys. `types.ts:24-28`
   marks a migration `additive` or `breaking`; rewriting an existing token's
   value is breaking.
10. **Readers.** Pages: `Home.svelte:48-50`, `template/src/pages/Home.svelte:35`,
    `Demo.svelte:49-52`, `DemoBar.svelte:43-48`, `SectionKit.svelte:252-253,
    373-374`, `SectionLayers.svelte:32`, `FloatingTagsPlayground.svelte:29`,
    `TestingLoops.svelte:462-524`, `Docs.svelte:365`. Checks:
    `bin/rules/tokens.mjs:80-84, 276-282, 373` (`hardcoded-columns`). Tests
    that pin the names: `bin/check-page.test.ts:30, 490, 524, 742`,
    `bin/catalogue.test.ts:24`, `bin/contractRunner.test.ts:68-162`,
    `editorRenderer.test.ts:78`. Prose: create-page `SKILL.md:12, 41, 45, 47,
    50, 52`; `src/editor/docs/content/editing-tokens.md:71`.
11. **No CLI verb writes columns.** `bin/set-geometry.mjs` and
    `bin/save-theme.mjs` never name them.

## Target model

`{vp}` is one of `desktop tablet phone`.

| Token | Default | Theme |
|---|---|---|
| `--columns-max-width` | `1440px` | editable |
| `--columns-{vp}-count` | 12, 8, 4 | editable |
| `--columns-{vp}-gutter` | `32px`, `24px`, `16px` | editable |
| `--columns-{vp}-margin` | `0px`, `24px`, `16px` | editable |
| `--columns-count`, `--columns-gutter`, `--columns-margin` | `var(--columns-desktop-*)`, re-pointed per breakpoint | **structural** |

`tokens.css` declares the nine editable names and the three structural ones
in `:root`, then re-points the structural names to the tablet values in
`@media (max-width: 767px)` and to the phone values in
`@media (max-width: 480px)`. Every reader keeps reading the structural names
and needs no change to stay correct.

## Decisions

The user approved D1 to D8 on 2026-10-15.

- **D1. Token names.** Nine new names, `--columns-{vp}-count`,
  `--columns-{vp}-gutter` and `--columns-{vp}-margin`, with the viewport
  before the property as the type tokens have it (Ground truth 7). The three
  existing names become structural, and the editor never writes them.
- **D2. Breakpoints at 767px and 480px.** Tablet values apply at 767px and
  narrower, phone values at 480px and narrower. 767px matches every page's
  own switch and the create-page skill (Ground truth 6). The type blocks'
  768px would hand an 8-column grid to a page laid out on 12 at exactly 768px.
- **D3. Default values** as the Target model lists them. Desktop keeps the
  shipped themes' 12 / 32px / 0px. Tablet takes 8 / 24px / 24px and phone
  4 / 16px / 16px, so a phone grid fits 390px with room for its text.
- **D4. One max width.** `--columns-max-width` stays a single editable token.
  It binds only above 1440px, where only the desktop values apply.
- **D5. Fixed gutters.** The `clamp()` gutter goes. Each viewport holds a
  fixed length, and the breakpoints carry the change. No shipped theme has
  used the clamp since May (Ground truth 2).
- **D6. Theme migration.** A theme's stored `--columns-count`,
  `--columns-gutter` and `--columns-margin` move to the desktop names with
  their values. The theme stores no tablet or phone value until someone edits
  one, so it inherits the `tokens.css` defaults. The shipped theme files are
  rewritten through the migration, and `tokens.generated.css` is regenerated.
- **D7. Pages keep the grid at every width.** First-party pages and the
  `template/` scaffold drop their `grid-template-columns: 1fr` rules. Below
  768px, each section's children span `grid-column: 1 / -1`, or take spans
  counted on the tablet or phone grid. The page grid applies
  `padding-inline: var(--columns-margin)`. The create-page skill teaches the
  same, so the overlay and the page agree at every width. A consumer page
  that still collapses to `1fr` keeps working unchanged.
- **D8. A breaking release.** Re-pointing `--columns-count`,
  `--columns-gutter` and `--columns-margin` rewrites existing token values,
  so the `tokens.css` migration is `breaking` and the change lands under
  `### Changed (breaking)`. A consumer's hand-edited value for any of the
  three carries over into its desktop name.

## Invariants

1. **Token names are public API.** The four existing names keep their names
   and their meaning at desktop width. Every other change is an addition.
2. **The canonical `tokens.css` is a fixed point** of the migration fold.
   Folding the migrations over the current `tokens.css` yields the canonical
   file's names and top-level values.
3. **One declaration per line** in `tokens.css`.
4. **Structural names stay out of themes.** No theme JSON, `_working.json`
   or `tokens.generated.css` holds `--columns-count`, `--columns-gutter` or
   `--columns-margin` after Wave 1.
5. **One source of names and defaults.** `slices/columns.ts` exports the
   viewport list, the nine editable names, the three structural names and
   the defaults. The editor, the renderer and the tests read it. Migrations
   freeze their own copies and import nothing from `src/`.
6. **The editor writes through the store** with `mutate` or `transaction`,
   names only editable tokens, and emits a name only when its value differs
   from the default.
7. **The data tree is restored** after any wave that runs the editor or the
   generator, except for the shipped-theme rewrite D6 makes the deliverable.
   `node scripts/check-production-is-default.mjs` passes.
8. **The engine loads lazily.** `bin/engineLoadsLazily.test.ts` stays green.
9. **The editor stays greyscale** and styles itself with `--ui-*` tokens.
10. **Copy follows the writing rules** in UI strings, comments,
    `CHANGELOG.md`, docs and skill text: active voice, no em dashes, and no
    statement paired with its rejected opposite.
11. **Skills stay in sync.** After any `SKILL.md` edit, run
    `npm run sync:skill-atlas` and `npm run sync:skill-sources`.

## Out of scope

- A CLI verb that sets columns.
- Fluid gutters with `clamp()` or container queries.
- Drawing the overlay over the page area alone when the editor docks beside
  it. The overlay keeps covering the window.
- Moving the type scales' 768px blocks to 767px.
- Changing consumers' own pages. `CHANGELOG.md` tells them what changed.
- Releasing. Entries stay under Unreleased.

## Agents and workflow runs

| Wave | Execute | Verify | Review | Gate |
|---|---|---|---|---|
| 1 Tokens and migrations | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 2 Editor | `svelte:svelte-file-editor` | `test-verifier` | `wave-reviewer` | automatic |
| 3 Pages and checks | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 4 Skills and docs | `wave-executor` | `test-verifier` | `wave-reviewer` on Sonnet | automatic |
| 5 Visual pass | `visual-qa` | none | `wave-reviewer` | **the user** starts it; it opens the browser |

**Saved workflows.** `responsive-columns` is an entry in the `PLANS` tables
of `.claude/workflows/plan-wave.js` and `plan-all.js`. `/plan-all
responsive-columns` runs Waves 1 to 4; resume a stopped run with
`/plan-all responsive-columns from <wave>`. `/plan-wave responsive-columns 5`
runs the visual pass.

**Ledger.** Every executor commits with the subject prefix
`Responsive-columns W<n>:`.

## Wave 1: tokens and migrations

1. In `slices/columns.ts`, export `COLUMN_VIEWPORTS` (`desktop`, `tablet`,
   `phone`), name builders for the nine editable names, `STRUCTURAL_COLUMN_NAMES`,
   and `COLUMN_DEFAULTS` per the Target model. Remove the 16px default.
2. In `tokens.css`, replace the block at `:500-506` with the Target model's
   `:root` declarations, and add `@media (max-width: 767px)` and
   `@media (max-width: 480px)` blocks that re-point the three structural
   names. Keep the comment's description of how to consume the grid.
3. Add `vite-plugin/tokensCssMigrations/migrations/2026-10-15-responsive-columns.ts`,
   kind `breaking`. It adds the nine names, backfills each desktop name from
   the file's current top-level value of its structural name (the shipped
   `clamp()` gutter maps to `32px`), re-points the structural names with
   `setTokenValue`, and adds the two blocks with `appendMediaBlock`. Register
   it after `2026-10-08-type-scales`.
4. Add `src/editor/core/themes/migrations/2026-10-15-responsive-columns.ts`
   for themes and colors-and-type bundles per D6. Register it.
5. Run the theme migration over the 19 shipped files and regenerate
   `tokens.generated.css`.
6. Tests: the `tokens.css` migration on the 0.94.3 file, on a hand-edited
   count and gutter, and its idempotency; the fold's fixed point
   (`bin/tokensCssMigrations.test.ts`); the theme migration on a stored set,
   an absent set and an already-migrated theme; a test that no shipped theme
   holds a structural name.

**Reserved for review.** The `clamp()` mapping in step 3, and any shipped
theme whose values differ from 12 / 1440px / 32px / 0px.

**Verify.** `npx vitest run vite-plugin src/editor/core bin`, `npm run check`,
`node scripts/check-production-is-default.mjs`.

**Done when** the fold over the current `tokens.css` yields the canonical
file, and `grep -rl -- '"--columns-count"' src/live-tokens/data` prints
nothing.

## Wave 2: editor

1. `ColumnsState` becomes `{ maxWidth, viewports: Record<ColumnViewport,
   { count, gutter, margin }> }`. Update the empty state, the loader, the
   theme-load path and `deriveCssVars` to read and emit the editable names,
   each only when it differs from its default.
2. `ColumnsSection.svelte` gains a Desktop / Tablet / Phone
   `UISegmentedControl` above count, gutter and margin, which edit the picked
   viewport. Max width stays above it, shared by all three. Reset restores the
   picked viewport's defaults.
3. Update `editorRenderer.test.ts:78` and add tests for per-viewport emission
   and load round-trips.

**Reserved for review.** Whether the section should follow the window's
width when the user resizes it.

**Verify.** `npx vitest run src/editor`, `npm run check`.

**Done when** an edit to the phone count saves into the theme as
`--columns-phone-count` alone and survives a reload.

## Wave 3: pages and checks

1. Apply D7 to `Home.svelte`, `template/src/pages/Home.svelte`,
   `Demo.svelte`, `DemoBar.svelte`, the demo sections, `Docs.svelte` and
   `TestingLoops.svelte`. Note each page whose layout changes at any width.
2. Confirm what `page-grid` reports at 390px for a page with no matching
   grid, and record it in the wave report.
3. Correct the rule reference at `TestingLoops.svelte:283` to the widths the
   rule tests.
4. Update the tests in Ground truth 10 that pin column values.

**Reserved for review.** Any page whose desktop layout shifts.

**Verify.** `npm test`, `npx live-tokens check-page src/app/Home.svelte --tests --strict`.

**Done when** no first-party page sets `grid-template-columns: 1fr` on its
page grid, and `check-page` passes for every first-party page at both
viewports.

## Wave 4: skills and docs

1. Rewrite create-page `SKILL.md:41-52` for D7: the grid at every width,
   spans counted on each viewport's grid, and `--columns-margin` on the page
   grid.
2. Update `editing-tokens.md:71` and the Columns description in the docs.
3. Add the `CHANGELOG.md` entry under `## Unreleased — Responsive columns`,
   `### Changed (breaking)`.
4. Run both skill syncs.

**Verify.** `npm run check:skill-atlas`, `npm run check:skill-sources`,
`npm run check:cli-strings`.

**Done when** both sync checks pass and no skill or doc names the 1fr
collapse.

## Wave 5: visual pass

At 1280px, 768px, 600px and 390px, screenshot Home, the demo, the testing
page and the Docs with the column overlay on. Each screenshot shows the
overlay's columns lining up with the page's section edges.

## Run log

Empty until Wave 1 runs.
