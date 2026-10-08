# Type scales for text styles

Plan of 2026-10-08. The design is `docs/type-scales-proposal.md`, and the
editor's target look is `docs/type-scales-prototype.html`. Where this plan
differs from the proposal, this plan is current; "Revisions to the proposal"
lists the differences. The user approved the proposal's nine decisions on
2026-10-08.

Text styles split into five usages: display, heading, body, editorial and
code. Each usage owns a modular scale: a base and a ratio set every step's
desktop size across seven steps, 2xs to 2xl. Each step also has a tablet and a
phone size. Both start at a recommendation computed from the desktop size by a
power rule, and each can be edited and reset on its own. The editor's Text
Styles group becomes a tab per usage.

## Ground truth

Measured on local main at 0.91.2 (`ec6a241`).

1. **Text-style edits never persist.** `TextStylesSection.svelte:27-48` passes
   each selector only `variable`. A pick falls through to `setCssVar`
   (`UITokenSelector.svelte:152-156`), which writes the editor's and the
   parent's inline `:root` and nothing else (`cssVarSync.ts:119-131`).
   `state.cssVars` is assigned only at load (`editorStore.ts:410`), so the
   edit has no undo entry, no persistence, and never reaches Save. The
   save-time DOM scrape was removed on 2026-05-10 (`59ac13f`); text styles
   shipped on 2026-07-20. No theme in `src/live-tokens/data/themes/` holds a
   text-style key.
2. **The store's write path.** `mutate(label, fn)` (`editorCore.ts:259-296`),
   `transaction()` (`:321-332`) and `beginSliderGesture()` (`:304-314`). The
   renderer spreads `state.cssVars` and applies each through `setCssVar`
   (`editorRenderer.ts:29, 59-69`). Save copies `cssVars` into the theme's
   `cssVariables` (`editorStore.ts:432`).
3. **The bake has no breakpoints.** `regenerateTokensCss()` writes
   `cssVariables` flat under `:root:root` and emits no `@media` block
   (`vite-plugin/themeFileApi.ts:421-544`, `:449-466`). A theme value beats a
   `@media` re-point in `tokens.css`.
4. **Links are component-only.** The link state needs a component and a group
   key (`UITokenSelector.svelte:118-126`, `components.ts:151-263`), and
   `unlinked` exists only on `ComponentSlice` (`editorTypes.ts:99-103`).
   `UILinkToggle.svelte` only draws, and its tooltip reads "Locked across
   variants" (`:19`).
5. **Migration ops.** `cssTokenOps.ts` exports `collectDefinedTokens`,
   `collectTokenValues`, `collectReferencedTokens`, `ensureScale`,
   `renameToken`, `removeToken` and `removeTokensMatching`. None writes inside
   `@media`, and none sets an existing declaration's value. `ensureScale`
   inserts only into the top-level `:root` (`:128-137`). The ops assume one
   declaration per line (`:99-123`).
6. **Readers take the last declaration, `@media` included.**
   `collectTokenValues` (`cssTokenOps.ts:30`) and `buildTokenRegistry` /
   `getDeclaredValue` (`src/editor/core/palettes/tokenRegistry.ts:48-54`), so
   the editor reads `--font-size-4xl` as its phone value today.
   `resolveAliasChain` matches an unanchored `var()` (`tokenRegistry.ts:63`),
   and so does `parseRef` in `UIVariantSelector.svelte:56-66, 82-88`; both
   read `calc(var(--a) * 2)` as an alias of `--a`.
7. **Migrations.** Registered in order in `TOKENS_CSS_MIGRATIONS`
   (`vite-plugin/tokensCssMigrations/index.ts:50-68`), shaped by `types.ts:16-33`.
   `findContractViolations` (`index.ts:117-148`) forbids an additive migration
   from removing, renaming, or revaluing a token. `npx live-tokens migrate`
   folds every migration (`bin/migrate.mjs:60-88`); the dev plugin applies
   additive ones only (`themeFileApi.ts:689-706`); check-page reports a
   pending breaking one as `tokens-breaking-migration`
   (`bin/rules/tokens.mjs:383-422`). The precedent for a breaking rename with
   a backfill is `2026-08-27-editorial-size-steps.ts`.
8. **An idempotency trap.** `2026-07-20-semantic-text-styles.ts:53-58` seeds
   `--code-font-size`, `--code-line-height` and `--code-letter-spacing`. A
   later breaking rename of those names loses idempotency unless the earlier
   bundle stops seeding them; `2026-08-25-editorial-type-role.ts:17-20` states
   the rule.
9. **Migration tests.** `bin/tokensCssMigrations.test.ts:25-34` runs the pass
   over the canonical `tokens.css` and expects only the tint migration to
   apply after it strips the tints, so the canonical file must be a fixed
   point of the fold. `index.test.ts:203-224` covers the 07-20 bundle and
   `:262-268` the fold's idempotency; `contract.test.ts:24-78` runs against
   the canonical file.
10. **References to the three renamed code tokens:** `src/app/site.css:85, 87,
    92, 94, 95`; `src/demo/TestingLoops.svelte:610-613, 866-869, 904-907`;
    `src/editor/skill-atlas/SourcePane.svelte:177, 197, 198`; the 07-20
    migration.
11. **`site.css`.** The package ships it (`package.json:25, 157`), `create`
    copies it into a new project (`bin/create.mjs:22-26`), and the consumer
    owns that copy afterwards. Rules: h1 to h4 at `:12-53`, `p` at `:69-77`,
    list items at `:119-127` and `:138-146`, `code` at `:83-88` (no line
    height), `pre` at `:90-96`, classes at `:170-257`. No rule exists for
    `small`, `h5` or `h6`. check-page lints it (`check-page.test.ts:619-626`).
12. **`TEXT_STYLES`** (`src/editor/ui/sections/textStyles.ts`) feeds the
    editor and the `page-text-style` rule through
    `src/testing/page-compliance.contract.ts:2, 15` and
    `tests/e2e/page-defects/page-defects.spec.ts:12, 22`.
    `observeTextStyles` reads `${prefix}-{font-family,font-size,font-weight,line-height,letter-spacing}`
    (`src/testing/support/pageHarness.ts:257, 528-554`).
13. **Check vocabulary.** `CONTRACT_SCALES` lists heading, body, editorial,
    eyebrow and code (`bin/lib/tokenVocabulary.mjs:40-45`), mirrored by hand
    at `docs/compliance-checks.md:103`. `raw-text-axis` names the families in
    its guidance and messages (`bin/rules/tokens.mjs:74-79, 331, 347`), and so
    does `page-text-style` (`bin/rules/testRuns.mjs:98-103`).
14. **Skills.** create-page `SKILL.md:82` and its Type table `:111-120`;
    set-type `SKILL.md:28` and `:34`. Atlas nodes in
    `src/editor/skill-atlas/trees/create-page.ts` (cp-containers chips at
    `:97, :102`, the cp-hierarchy Type chip at `:166-169`) and
    `trees/set-type.ts:38-41` cite those lines.
15. **Editor parts.** No generic tab component exists. `UISegmentedControl`
    is a radiogroup (`value`, `options`, `ariaLabel`, `onchange`). No slider
    or number-input component exists; `ColumnsSection.svelte:112-141` builds
    them inline. The selectors take an `onwrite` prop
    (`UITokenSelector.svelte:67-74, 129-133`; used by
    `WashesSection.svelte:35-40, 76`). `check:editor-font-isolation` forbids
    `var(--font-*)` inside `<style>` under `src/editor/ui`
    (`scripts/check-editor-font-isolation.mjs:20, 41-45`) and does not scan
    inline `style=`.
16. **Release conventions.** `## Unreleased — <title>` with
    `### Changed (breaking)` (`RELEASING.md:24-30, 100-109`). Rewriting the
    value of an existing token is breaking. The repo is at 0.91.2, and the tag
    `v0.91.2` exists.

## Target model

Token names, with `{u}` one of `display heading body editorial code` and
`{s}` one of `2xs xs sm md lg xl 2xl`:

| Token | Value | Theme |
|---|---|---|
| `--type-tablet-scale-compression`, `--type-phone-scale-compression` | `0.75`, `0.63` | editable |
| `--{u}-font-family`, `--{u}-font-weight` | the usage's face and weight | editable |
| `--{u}-scale-base` | unitless rem count | editable |
| `--{u}-scale-ratio` | number | editable |
| `--{u}-{s}-font-family`, `--{u}-{s}-font-weight` | `var(--{u}-font-family)`, `var(--{u}-font-weight)` | editable |
| `--{u}-{s}-desktop-font-size` | `calc(var(--{u}-scale-base) * pow(var(--{u}-scale-ratio), n) * 1rem)`; at md, `calc(var(--{u}-scale-base) * 1rem)` | editable |
| `--{u}-{s}-tablet-font-size`, `--{u}-{s}-phone-font-size` | `min(var(--{u}-{s}-desktop-font-size), calc(pow(D, var(--type-{vp}-scale-compression)) * 1rem))`, where D is the scale term `var(--{u}-scale-base) * pow(var(--{u}-scale-ratio), n)` | editable |
| `--{u}-{s}-line-height`, `--{u}-{s}-letter-spacing` | per the proposal's tables | editable |
| `--{u}-{s}-font-size` | `var(--{u}-{s}-desktop-font-size)`, re-pointed at 768px and 480px | **structural** |
| `--eyebrow-font-family`, `--eyebrow-font-weight` | `var(--body-font-family)`, `var(--body-font-weight)` | editable |
| `--eyebrow-{vp}-font-size` | `var(--body-sm-{vp}-font-size)` | editable |
| `--eyebrow-font-size` | `var(--eyebrow-desktop-font-size)`, re-pointed | **structural** |
| `--eyebrow-line-height`, `--eyebrow-letter-spacing`, `--eyebrow-text-transform` | unchanged | editable |

`n` is the step's exponent, -3 at 2xs to 3 at 2xl. Default bases, ratios,
line heights, letter spacing and family pins are the proposal's "Default
values". When the editor writes an edited desktop size, the tablet and phone
recommendations' D becomes that size's rem count as a literal.

The editor writes only editable names, always through the store. A structural
name never appears in a theme, in `_working.json`, or in `tokens.generated.css`.

## Decisions

The user approved 1 to 9 on 2026-10-08, as the proposal words them:

1. Five usages; eyebrow stays a single style in the Body tab.
2. Seven steps per usage, md as the base, h1 at xl.
3. Bases are unitless rem counts outside the primitive scale.
4. Tablet and phone sizes per step, recommended by the power rule at 0.75 and
   0.63 and never above the desktop size, each editable and resettable on
   its own.
5. A "Below 12px" marker in place of a size floor.
6. The proposal's default values, including the larger h2 and h3.
7. Heading sm, xs and 2xs ship with family `var(--font-sans)`.
8. The default theme adopts the scales. Revised by P1 below.
9. The `site.css` additions.

Decisions this plan makes, each from Ground truth:

- **P1. No theme migration.** No theme can hold a text-style key (Ground
  truth 1). A consumer's hand edits to `tokens.css` carry over in the
  tokens.css migration instead: a step's `-font-size` that differs from its
  0.91.2 default moves into the step's desktop size.
- **P2. Link state lives in the values.** A linked token holds its link
  expression; an unlinked or edited one holds anything else. The editor needs
  no new slice, and the component link machinery stays untouched (Ground
  truth 4).
- **P3. Two new migration ops.** `setTokenValue` and `appendMediaBlock`
  (Ground truth 5).
- **P4. Readers take the top-level `:root` declaration** and match a
  whole-value `var()` only (Ground truth 6).
- **P5. One source of names and maths.** A TypeScript module under
  `src/editor/core/typeScale/` defines the usages, steps, exponents,
  defaults, token names, the power rule and the CSS expressions. The editor,
  the text-style registry and the tests read it. The tokens.css migration
  freezes its own copy of the values, as every migration does.

## Revisions to the proposal

- The proposal says the structural tokens stay out of themes "the way
  intrinsics do". Intrinsics exempt keys from the token grid but still store
  them. Here the editor never writes a structural name (Target model).
- The proposal's "Saved themes keep their desktop sizes as edits" falls away
  under P1.
- The proposal names `appendMediaOverride`. That op no longer exists; Wave 1
  adds `appendMediaBlock`.

## Invariants

1. **Token names are public API.** Every existing `--{u}-{s}-font-size` and
   `--eyebrow-font-size` keeps its name. Only `--code-font-size`,
   `--code-line-height` and `--code-letter-spacing` are renamed, to
   `--code-md-*`. Every other name change is an addition.
2. **The canonical `tokens.css` is a fixed point** of the migration fold, and
   folding the migrations over the 0.91.2 `tokens.css` yields the canonical
   file's token names and top-level values.
3. **One declaration per line** in `tokens.css`, however long.
4. **The editor writes through the store,** with `mutate` or `transaction`,
   and only names the type-scale module lists as editable.
5. **Structural names stay out of themes.** No theme JSON, `_working.json` or
   `tokens.generated.css` contains a structural `-font-size` name.
6. **The type-scale module is the one source** of the step list, exponents,
   defaults and expressions. A test pins the text-style block of
   `tokens.css` to its output.
7. **Migrations are frozen.** The new migration holds literal entries and
   imports nothing from `src/`. `check:no-tooling-imports` passes.
8. **The data tree is untouched.** A wave that runs the editor restores
   `src/live-tokens/data` as `CLAUDE.md` describes, and
   `node scripts/check-production-is-default.mjs` passes.
9. **The engine loads lazily.** `bin/engineLoadsLazily.test.ts` stays green.
10. **The editor stays greyscale** and styles itself with `--ui-*` tokens
    only, apart from the amber link tick. Samples render through inline
    `style=` with the text-style tokens. `check:editor-font-isolation` passes.
11. **Copy follows the writing rules:** active voice, no em dashes, and no
    statement paired with its rejected opposite. This covers UI strings,
    comments, `CHANGELOG.md` and skill text.
12. **Consumer breaks land under `### Changed (breaking)`** in a
    `## Unreleased — Type scales for text styles` section of `CHANGELOG.md`.
13. **Skills stay in sync.** After any `SKILL.md` edit, run
    `npm run sync:skill-atlas` and `npm run sync:skill-sources`.

## Out of scope

- Pointing `SectionHero`, `Home`, `SectionDivider` and
  `FloatingTagsPlayground` at display steps.
- Teaching set-type to choose ratios from a voice brief.
- A `check-page` finding for a used step under 12px.
- Fluid sizing with `clamp()`.
- Other callers of `UITokenSelector`'s store-bypassing write path. The final
  wave lists them in its report.
- A key filter in theme normalisation. No writer of structural names exists.
- Updating consumers' copies of `site.css`. `CHANGELOG.md` tells them what to
  change, and `unknown-token` flags a stale code token.
- Releasing. `CHANGELOG.md` entries stay under Unreleased.

## Agents and workflow runs

| Wave | Execute | Verify | Review | Gate |
|---|---|---|---|---|
| 1 Groundwork | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 2 Tokens and migration | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 3 Site styles and checks | `wave-executor` | `test-verifier` | `wave-reviewer` | automatic |
| 4 Editor | `svelte:svelte-file-editor` | `test-verifier` | `wave-reviewer` | automatic |
| 5 Skills and docs | `wave-executor` | `test-verifier` | `wave-reviewer` on Sonnet | automatic |
| 6 Visual pass | `visual-qa` | none | `wave-reviewer` | **the user** starts it; it opens the browser |

**Saved workflows.** `type-scales` is an entry in the `PLANS` tables of
`.claude/workflows/plan-wave.js` and `plan-all.js`.

| Command | Runs | Then |
|---|---|---|
| `/plan-all type-scales` | Waves 1 to 5 | Resume a stopped run with `/plan-all type-scales from <wave>` |
| `/plan-wave type-scales 6` | Wave 6 | The user reads the screenshots |

**Ledger.** Every executor commits with the subject prefix `Type-scales W<n>:`.
`git log --grep "Type-scales W"` is the record the reviewer reads.

**Control flow for one wave** is the same as in
`check-and-fix-unification.md`: execute returns units, gates, oddities and a
resume point; verify runs the wave's commands with one fix round; review
returns APPROVE or BLOCK with one fix round, and blocks when an oddity needs
the user.

## Wave 1: groundwork

1. In `vite-plugin/tokensCssMigrations/cssTokenOps.ts`, add
   `setTokenValue(css, name, value, opts?: { from?: string })`. It rewrites
   the value of the top-level `:root` declaration of `name`. With `from`, it
   rewrites only when the current value equals `from`. It leaves `@media`
   declarations alone and does nothing when the name is absent. Export it
   from `index.ts:34-42`.
2. Add `appendMediaBlock(css, query, entries)`. It finds the top-level
   `@media <query>` block whose query matches exactly and appends each entry
   that block does not already declare to its `:root`. With no such block, it
   appends one at the end of the file. Entries already present are skipped,
   so the op is idempotent. Export it.
3. Make `collectTokenValues` return the top-level `:root` value and ignore
   declarations inside `@media`. Do the same in `buildTokenRegistry` and
   `getDeclaredValue` (`tokenRegistry.ts:48-54`). Anchor `resolveAliasChain`
   (`:63`) and `parseRef` (`UIVariantSelector.svelte:56-66, 82-88`) so only a
   value that is exactly `var(--name)` counts as an alias.
4. Create `src/editor/core/typeScale/typeScale.ts` per P5 and the Target
   model: `USAGES`, `STEPS`, `EXPONENT`, `VIEWPORTS`, `INTERVALS` (the
   proposal's eight plus custom), `DEFAULTS` (bases, ratios, compression,
   faces, weights, line heights, letter spacing, family pins, element map),
   name builders for every editable and structural token, `EDITABLE_NAMES`
   and `STRUCTURAL_NAMES`, `scalePx(base, ratio, step)`,
   `recommend(desktopPx, compression)` (`min(d, 16 × (d / 16) ^ c)`), the
   expression builders for desktop and recommended sizes (scale form and
   edited-desktop form), and `typeScaleDeclarations()` and
   `typeScaleMediaDeclarations(viewport)` in `tokens.css` order. Every
   declaration is one line.
5. Tests: `cssTokenOps.test.ts` covers both new ops, including idempotency,
   the `from` guard, an existing block, a missing block, and declarations
   inside `@media` left untouched by `setTokenValue`. The reader changes get a
   test with a token re-declared inside `@media`, and an alias test with a
   `calc(var(...))` value. `typeScale.test.ts` pins every size in the
   proposal's "Sizes in px" table to 0.1px from `scalePx` and `recommend`, and
   asserts `EDITABLE_NAMES` and `STRUCTURAL_NAMES` are disjoint and sized 275
   and 36.

**Reserved for review.** A reader change that shifts any existing check's
result. The reviewer runs `node scripts/check-token-contract.mjs` before and
after and compares the output.

**Verify.** `npx vitest run vite-plugin src/editor/core bin`, `npm run check`.

**Done when** both ops are exported from `index.ts`, `typeScale.test.ts`
passes with the proposal's table, and the alias test with a
`calc(var(...))` value passes for both `resolveAliasChain` and `parseRef`.

## Wave 2: tokens and migration

1. Replace the text-style block of `src/system/styles/tokens.css`
   (`:661-740`) with `typeScaleDeclarations()`, keeping the section
   comments. Append the structural re-points to the existing
   `@media (max-width: 768px)` and `@media (max-width: 480px)` blocks.
   Generate the text with a throwaway script under `scratch/`; commit only
   `tokens.css`. Update the responsive comment at `:750-751` to cover the
   text styles.
2. Add `src/system/styles/typeScaleBlock.test.ts` (or the nearest existing
   tokens test file): the top-level declarations of every name in
   `EDITABLE_NAMES` and `STRUCTURAL_NAMES` equal `typeScaleDeclarations()`,
   and each breakpoint block holds exactly `typeScaleMediaDeclarations()`
   plus its primitive sizes.
3. Drop the three code entries from the 07-20 bundle
   (`2026-07-20-semantic-text-styles.ts:53-58`), with a comment that states
   the rule from Ground truth 8. Update `index.test.ts:203-224`.
4. Add `migrations/2026-10-08-type-scales.ts`, `kind: 'breaking'`, and
   register it last. Its `apply`:
   1. Renames the three code tokens to `--code-md-*`.
   2. For each 0.91.2 step (heading xl, lg, md, sm; body md, sm; editorial xl,
      lg, md, sm; code md) and the eyebrow, seeds `-desktop-font-size` with
      `ensureScale`: the step's current `-font-size` value when it differs
      from its 0.91.2 default, the Target model's value otherwise.
   3. Re-points each of those `-font-size` declarations to
      `var(...-desktop-font-size)` with `setTokenValue`.
   4. Re-points each 0.91.2 step's `-font-family` and `-font-weight`, and the
      eyebrow's, to its link expression with `setTokenValue(..., { from })`,
      where `from` is the 0.91.2 default. A changed value stays.
   5. Seeds every other new declaration with `ensureScale` from a literal
      `BUNDLE`.
   6. Appends the structural re-points with `appendMediaBlock` for both
      queries.
5. Save `git show v0.91.2:src/system/styles/tokens.css` as
   `vite-plugin/tokensCssMigrations/fixtures/tokens-0.91.2.css`. Tests: the
   fold over the fixture yields the canonical file's token names and
   top-level values, and the breakpoint blocks' declarations; a second fold
   changes nothing; the fold over the canonical file changes nothing; a
   fixture with `--heading-xl-font-size: 2.5rem` ends with
   `--heading-xl-desktop-font-size: 2.5rem`; a fixture with a changed
   `--heading-lg-font-family` keeps it.
6. Rename the code token references in Ground truth 10: `site.css`,
   `TestingLoops.svelte` and `SourcePane.svelte`. Update `site.css` only for
   the rename here; Wave 3 owns its new rules.
7. Fix every test the rename or the new values break, starting with
   `weightCoverage.test.ts`, `set-type.test.ts:88-91`, `check-page.test.ts`
   and `catalogue.test.ts`. A fixture that asserted a 0.91.2 value changes to
   the new value; an assertion never loosens.
8. Open `## Unreleased — Type scales for text styles` in `CHANGELOG.md`.
   Changed (breaking): the three code tokens become `--code-md-*`, with the
   lines a consumer's `site.css` needs; every text style's `-font-size` now
   resolves per viewport; heading sizes change per the proposal's "Changes
   from today". Added: the display usage, the new steps, the scale settings
   and the compression settings. Migration: run `npx live-tokens migrate`.

**Reserved for review.** The migration's carry rule in step 4.2. The reviewer
reads each of the eleven 0.91.2 defaults in the migration against the
fixture. Any `tokens.css` value that differs from the proposal's tables.

**Verify.** `npm test`, `npm run check`, `npm run check:no-tooling-imports`,
`npm run build:lib && npm run check:token-contract`.

**Done when** `grep -rnE -- "--code-(font-size|line-height|letter-spacing)" src bin tests template`
prints nothing outside the migrations and their fixture, and
`grep -c "pow(" src/system/styles/tokens.css` prints at least 70.

## Wave 3: site styles and checks

1. `src/app/site.css`: add `h5` (heading-xs) and `h6` (heading-2xs) beside
   h1 to h4, with the `overflow-wrap` h1 to h3 carry; add `small` (body-sm);
   add a class for every step of every usage (`.display-md`, `.heading-2xs`,
   `.body-xl`, `.code-sm` and the rest) after the existing classes; set
   inline `code` to `font-size: 0.875em` with `pre code { font-size: inherit; }`;
   give `pre` the code-md bundle. Each rule reads the step's five tokens,
   with `-font-size` the structural name.
2. Rebuild `TEXT_STYLES` in `src/editor/ui/sections/textStyles.ts` from the
   type-scale module: one entry per usage step plus the eyebrow, each with
   `name` and `prefix`. Keep the export's shape for
   `page-compliance.contract.ts` and `page-defects.spec.ts`.
3. Add `display` to `CONTRACT_SCALES` (`bin/lib/tokenVocabulary.mjs:40-45`),
   to the family lists in `raw-text-axis` (`bin/rules/tokens.mjs:74-79, 331,
   347`) and `page-text-style` (`bin/rules/testRuns.mjs:98-103`), and to
   `docs/compliance-checks.md:103`.
4. Tests: a `check-page` fixture page that uses a display step passes; a
   `--display-*` token is a contract token; the scaffolded `site.css` still
   passes `--strict` (`check-page.test.ts:619-626`).
5. `CHANGELOG.md`, Unreleased: Added h5, h6 and `small` rules and the step
   classes; Changed (breaking): inline `code` sizes relative to its parent.

**Reserved for review.** A `site.css` rule outside the approved additions.
The reviewer diffs `site.css` against decision 9.

**Verify.** `npx vitest run bin src/testing`, `npm run check:pages`,
`npm run check:docs-content`, `npm run check`.

**Done when** `node bin/cli.mjs tokens --scale display` lists the display
steps, and `grep -cE "^\.(display|heading|body|editorial|code)-" src/app/site.css`
prints 35.

## Wave 4: editor

Rebuild the Text Styles group in `VariablesTab.svelte` to the prototype. The
prototype fixes the layout; the store fixes the behaviour.

1. **Responsive scaling.** Two sliders with number readouts for the
   compression tokens, each with its effect on 72, 48 and 24px. A drag calls
   `beginSliderGesture` on pointerdown.
2. **Tabs.** An underlined tab bar following the ARIA tabs pattern: roving
   `tabindex`, arrow keys, Home and End. The active tab carries the bright
   underline; each tab shows its ratio's name.
3. **Usage settings.** Face and weight through `UIFontFamilySelector` and
   `UIFontWeightSelector` with `onwrite`; base as a px number input that
   writes a rem count; ratio as the interval list plus a custom number; a
   "Reset {usage}" pill.
4. **Step rows.** Seven per tab, 2xl to 2xs, each with its element chip, a
   "Below 12px" marker, desktop, tablet and phone size inputs, a sample at
   the preview viewport, face and weight with the link bar and a lock, and
   line height and letter spacing through their selectors with `onwrite`.
   The Body tab adds the eyebrow row, whose sizes follow body-sm until
   edited.
5. **Viewport preview** with `UISegmentedControl`: Desktop, Tablet, Phone. It
   highlights that row in each step's sizes and sets the samples' size token.
   It writes no token.
6. **Writes.** Every write goes through `mutate`, and multi-key writes
   through `transaction`. A size edit writes the rem literal to the editable
   name; a value within 0.05px of its recommendation deletes the key. A
   per-value reset deletes that one key. "Reset {usage}" deletes the usage's
   keys, and the eyebrow's on Body. "Reset all" in the group header deletes
   every type-scale key. Unlinking face or weight writes the usage's current
   value; relinking writes the link expression, or deletes the key when the
   declared default is the link expression.
7. **Desktop edits carry their recommendations.** The declared tablet and
   phone values compute from the scale, so an edited desktop size also
   writes that step's tablet and phone recommendation expressions with the
   edited rem count, in the same transaction. A tablet or phone size that
   holds an edit keeps it. Clearing the desktop edit deletes those
   expression keys again. A tablet or phone key counts as an edit only when
   it holds a literal.
8. **Display values** come from the type-scale module over the resolved
   settings: the store's value when present, `getDeclaredValue` otherwise.
   Samples read the real tokens through inline `style=`.
9. **Fixed widths.** Every control body has a fixed width. Unlinking indents
   a control by 6px and narrows it by 6px, so lock and reset icons never move.
   Reset icons sit on the label line. A size's icon appears when it holds an
   edit; every other control's icon appears when the store holds its key.
10. Move the write logic into a plain module beside the section, such as
    `src/editor/ui/text-styles/textStyleEdits.ts`, so tests can drive it
    without mounting.
11. Tests: a size edit stores the rem literal under the editable name; typing
    the recommendation deletes the key; a desktop edit writes both
    recommendation expressions and keeps an edited phone size; clearing it
    deletes the expressions; each reset deletes only its keys; no action ever
    writes a name outside `EDITABLE_NAMES`; `toColorsAndType` carries an
    edited key into `cssVariables`; a mounted section renders five tabs and
    moves between them with the arrow keys.
12. `CHANGELOG.md`, Unreleased. Fixed: Text Styles edits now save with the
    theme and undo like every other edit. Changed: the editor's Text Styles
    group, described in one paragraph.

**Reserved for review.** A write path that skips the store. The reviewer
searches the new files for `setCssVar` and `removeCssVar`. Copy that breaks
invariant 11.

**Verify.** `npx vitest run src/editor`, `npm run check`,
`npm run check:editor-font-isolation`.

**Done when** `git grep -n "setCssVar\|removeCssVar"` over every file Wave 4
added or changed prints nothing.

## Wave 5: skills and docs

1. create-page `SKILL.md`: rewrite the Type table (`:111-118`) and the
   `site.css` sentence (`:120`) for five usages, h1 to h6 and the step
   classes, with one rule for choosing a step: headings use the whole set,
   and the other usages mostly take md and sm. Update `:82`.
2. set-type `SKILL.md:28` and `:34`: the usages' faces and weights, in the
   new names.
3. Run `npm run sync:skill-atlas` and `npm run sync:skill-sources`. Re-point
   any node the atlas sync refuses, and check that each moved node's title
   and chips still agree.
4. `docs/type-scales-proposal.md`: mark it implemented by this plan and fold
   in "Revisions to the proposal".
5. List every remaining caller of `UITokenSelector`'s no-component write path
   in the wave report, for the user.

**Reserved for review.** A skill sentence that contradicts the shipped
defaults. The reviewer reads the Type table against `typeScale.ts`.

**Verify.** `npm run check:skills`, `npm run check:skill-atlas`,
`npm run check:skill-sources`, `npm run check:cli-strings`.

**Done when** `grep -n "display" .claude/skills/live-tokens-create-page/SKILL.md`
finds the Type table row, and the four skill gates pass.

## Wave 6: visual pass

Start the dev server and open the editor's Typography section beside
`docs/type-scales-prototype.html`. Compare the tab bar, the scaling row, the
usage settings and a step row, then fix CSS in the Wave 4 files until they
match. Check that lock and reset icons hold their positions while you edit a
size, unlink a face, and switch tabs. Screenshot each tab. Stop the server and
restore the data tree.

**Done when** the screenshots match the prototype's structure, and
`git status --short src/live-tokens/data` prints nothing.
