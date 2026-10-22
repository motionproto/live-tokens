# Accessibility testing

Plan of 2026-10-23. The user settled D2 and approved D1 and D3 to D12 as
recommended on 2026-10-23, and merged `contrast-checker` into main the same
day (D10). The waves run in an ordinary session, one at a time, with a
review after each.

The shipped components and the styling a user applies to them get tested
for accessibility. By default the tests alert: every accessibility finding
reports at severity `warn`, and the run exits 0. Under `--strict` the same
findings become errors and block, as every other `warn` rule does.

The plan builds on existing tools. axe-core is the main engine. Siteimprove
Alfa contributes one rule, SIA-R65, focus visibility, which axe lacks.
Playwright's own media emulation, accessibility-tree snapshots, and keyboard
API cover forced colours, reduced motion, structure, and keyboard operation.
Two checks remain custom, and both reuse code the repository already has:
text spacing reruns the page overflow observation, and the keyboard cases
extend the interaction contract.

## Ground truth

Measured on local main at `31af1c1`.

1. **Contrast is the only accessibility check today.** `page-contrast`
   (`src/testing/support/pageHarness.ts:952`) measures text on surfaces
   for consumer pages and skips text inside shipped components. It reports
   at `error` (`bin/rules/testRuns.mjs:104`).
2. **The contrast readout in the editor is unmerged.** Branch
   `contrast-checker` in `../live-tokens-contrast` carries 21 commits: a ratio
   beside every foreground colour row, declared per editor through
   `contrastPairs`. `temp/contrast-checker-defaults.md` on that branch records
   30 of 205 pairs failing in the shipped default theme.
3. **The finding system already has a non-blocking severity.** Every rule
   carries `severity: 'error' | 'warn'`. `bin/lib/findings.mjs:108-114`
   resolves it from the rule table, `live-tokens.config.json`, and
   `--off`/`--warn`/`--error`. `--strict` raises every `warn` to `error`
   (`:113`).
4. **The contract harness already opens a component in each state and
   theme.** `ContractHarness.open` (`src/testing/support/contractHarness.ts:68`)
   selects the component, `selectView` (`:91`) opens a variant and state
   tab, and `previewTheme` (`:760`) loads a theme through the Theme Picker.
   The component renders inside `.preview-stage`
   (`src/editor/component-editor/scaffolding/VariantGroup.svelte:410`).
5. **The interaction contract can press keys and test focus.**
   `InteractionAction` (`src/testing/componentContract.ts:148`) has `press`,
   and `InteractionOutcome` has `focused`. Two of the contracts in
   `src/testing/contracts/` use `press`.
6. **The runner already reads annotations from passing tests.**
   `readPlaywrightTests` (`bin/contractRunner.mjs:512`) keeps
   `test.annotations`. Today it reads only `inapplicable`.
   `ALL_CONTRACT_RULES` (`:76`) fixes the contract rule ids that coverage
   reconciles against.
7. **The page harness measures overflow.** `observeOverflow`
   (`pageHarness.ts:832`) returns document, element, and instance overflow
   failures. The text-spacing check reuses it unchanged.
8. **Test tooling ships as optional peers.** `@playwright/test`, `vitest`, and
   `happy-dom` are optional `peerDependencies` (`package.json:214-233`). The
   repository pins `@playwright/test` at `^1.62.1`.
9. **The themes are OKLCH.** axe-core fixed its contrast handling for `oklch`
   with `none` and for out-of-gamut OKLCH colours in 4.11.1. Earlier versions
   misread the shipped themes.
10. **Eight preset themes ship**: autumn, halloween, midnight-study, ocean,
    royal-velvet, sketchy, spring-meadow, sunset. The default theme makes
    nine.

## Tools

| Tool | Licence | Job in this plan |
|---|---|---|
| `axe-core` ≥ 4.11.1, `@axe-core/playwright` | MPL-2.0 | Names, roles, ARIA, contrast, target size, structure. Tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`. |
| `@siteimprove/alfa-playwright` | MIT | Rule SIA-R65 alone: focusing an element changes at least one pixel. |
| Playwright `emulateMedia` | Apache-2.0 | `forcedColors: 'active'` and `reducedMotion: 'reduce'`. |
| Playwright `locator.ariaSnapshot()` | Apache-2.0 | Each component's accessibility tree, read and compared without asserting. |
| Playwright keyboard | Apache-2.0 | `press` cases in the interaction contract. |

Rejected: Pa11y and Lighthouse wrap axe and add nothing. IBM Equal Access
duplicates axe's failures with more noise. Guidepup drives real screen
readers and costs more than it returns here.

## Decisions

**D1. Rule ids group by concern.** Axe's own rule id travels in the finding's
message. The rule table gains seven fixed ids, each `warn`:

| Rule | Source |
|---|---|
| `a11y-component` | axe violations inside a component's preview |
| `a11y-page` | axe violations on a consumer page, outside shipped components |
| `a11y-review` | axe `incomplete` results: gradients, images, backdrops axe cannot judge |
| `a11y-focus-visible` | Alfa SIA-R65 |
| `a11y-forced-colors` | axe and SIA-R65 rerun under forced colours |
| `a11y-text-spacing` | overflow under the WCAG 1.4.12 spacing override |
| `a11y-reduced-motion` | animations still running under `prefers-reduced-motion: reduce` |

A user silences one with `--off=a11y-review` or a config entry, the same way
as any other rule. *Approved.* One rule id per axe rule would put some
ninety ids outside the fixed rule table.

**D2. `--strict` makes accessibility findings block.** The `a11y-*` rules
take the existing severity path unchanged: `warn` by default, `error` under
`--strict` (`findings.mjs:113`), and per-rule overrides through
`--error`/`--off` or `live-tokens.config.json`. *User decision, 2026-10-23.*
No shipped gate runs `--tests` with `--strict`: `check:pages` is static, and
the template's `test:design` and both smoke gates run without `--strict`. So
releases and consumer builds alert, and a user who wants a blocking gate runs
`check-page --tests --strict` or `check-component --tests --strict`.

**D3. Results travel as annotations on passing tests.** Each accessibility
test pushes `{ type: 'a11y', description: <JSON> }` and passes.
`mapPlaywrightResults` turns each entry into a `warn` finding. A test fails
only when the scan itself breaks, which reports as `tests-setup`.

**D4. Missing engines skip.** When `axe-core` or Alfa is absent, the
accessibility tests annotate `inapplicable` with the package name, and
coverage shows the reason. `tests-not-installed` stays reserved for
Playwright, Vitest, and happy-dom.

**D5. The engines ship as optional peers.** `axe-core`,
`@axe-core/playwright`, and `@siteimprove/alfa-playwright` join
`peerDependencies` as optional and `devDependencies` pinned. The `create`
template adds them beside `@playwright/test`.

**D6. Component scans cover every declared state under the active theme.**
The scan scopes to `.preview-stage` and excludes the canvas toolbar.

**D7. The preset sweep runs in the repository only.** An environment flag,
`LIVE_TOKENS_A11Y_THEMES=all`, repeats each component scan under the eight
presets through `previewTheme`. The repository's contract project sets it.
A consumer's `check-component --tests` scans the active theme alone, which
keeps the consumer run inside its current 15 to 20 seconds per component.

**D8. `page-contrast` retires in favour of axe's `color-contrast`.** Its token
lookup (`observeContrast`, the `named` map) moves into a helper that names the
tokens behind each colour axe reports, so an `a11y-page` contrast finding
still reads "`--text-secondary` on `--surface-low`". The rule id stays in the
table as a deprecated alias of `a11y-page` for one minor release, so existing
`--off=page-contrast` settings keep working. *Approved.* Keeping both rules
would report each contrast failure twice.

**D9. The editor scans its preview live.** `ComponentEditorPage` imports
`axe-core` dynamically on first open, scans `.preview-stage` 500 ms after the
last token write, and lists violations beside the contrast readout. The scan
skips when `axe-core` cannot load. It never blocks a save or a promote. The
failing treatment reuses the contrast readout's amber and "!" glyph.

**D10. The editor panel waits on the contrast-checker merge.** Wave 4 builds
beside the readout that branch adds. *Done:* `contrast-checker`
merged into main on 2026-10-23.

**D11. Keyboard cases report at `warn`.** The new `press` cases run through
the interaction contract and report a failure as `a11y-keyboard` at `warn`,
outside `contract-interaction`, whose failures stay `error`. This makes eight
`a11y-*` ids. *Approved.* `--strict` raises them to
errors with the other `a11y-*` rules (D2).

**D12. Accessibility-tree snapshots record and compare.** Wave 2 writes each
component's `ariaSnapshot()` per state to
`src/testing/contracts/__aria__/<id>.yml`. A later run that differs reports
`a11y-component` with the diff. A deliberate markup change rewrites the file
with `--update-aria`.

## Invariants

1. No accessibility finding exits a command non-zero at its default
   severity. Under `--strict` each one is an error and the command exits
   non-zero (D2).
2. A missing engine never fails a run (D4).
3. Every `.mjs` module a test imports loads `axe-core` and Alfa lazily,
   inside the function that needs them. `bin/engineLoadsLazily.test.ts`
   covers the new modules.
4. `axe-core` resolves to 4.11.1 or later. A unit test reads the installed
   version.
5. The editor keeps one contrast implementation, `contrast.ts`, for its live
   readout. axe's contrast serves the test suites and the axe panel.
6. No theme token is added and no shipped default changes. Wave 2 records
   the baseline; fixes are a later plan.
7. Every run that touches the data tree restores it per `CLAUDE.md`, and
   `node scripts/check-production-is-default.mjs` passes after each wave.

## Out of scope

- Fixing the violations the baseline finds.
- Screen-reader automation.
- APCA or any contrast model other than WCAG 2.
- Focus indicator contrast (SC 1.4.11) beyond SIA-R65's visibility check.
  A follow-up can measure the outline through `contrast.ts`.
- Manual audits.

## Wave 1: engines and findings

- Add `axe-core`, `@axe-core/playwright`, and `@siteimprove/alfa-playwright`
  as pinned devDependencies and optional peers (D5).
- `src/testing/support/a11y.ts`: `scanAxe(page, scope, exclude)` and
  `scanFocusVisible(page, scope)`, each returning `A11yResult[]` with
  `rule`, `engineRule`, `impact`, `target`, `html`, `help`, `helpUrl`.
  `recordA11y(results)` pushes the D3 annotation. Engines import inside the
  functions (Invariant 3).
- `bin/rules/a11y.mjs`: the eight rules of D1 and D11, each `warn` with
  guidance that names the axe help URL.
- `contractRunner.mjs`: `mapPlaywrightResults` reads `a11y` annotations into
  findings anchored on the component's runtime file or the page file line.
- Tests: an `a11y-*` finding exits 0 by default and non-zero under
  `--strict`; `--off` silences it under `--strict`; an annotation maps to one
  finding per result; a missing engine yields `inapplicable` coverage and
  exits 0 under `--strict`; the axe version check (Invariant 4).

**Verify.** `npx vitest run bin src/testing`, `npm run check`,
`npx vitest run bin/engineLoadsLazily.test.ts`.

**Done when** every listed test passes and `check-component button --tests`
on an unchanged tree prints the same errors it printed before the wave.

## Wave 2: component suite and baseline

- `src/testing/component-a11y.contract.ts`: per contract and per declared
  state, `scanAxe` and `scanFocusVisible` over `.preview-stage` (D6), then
  the same two under `emulateMedia({ forcedColors: 'active' })`, recorded as
  `a11y-forced-colors`. The suite records `ariaSnapshot()` per D12.
- `LIVE_TOKENS_A11Y_THEMES=all` repeats the scans under each preset (D7).
  The repository's `contract` project sets it.
- Register the suite file in `structuralRule` and the shipped `./testing`
  exports.
- Run the full sweep once and write `temp/a11y-baseline.md`: one table per
  rule, sorted by component, with the theme and state of each finding.

**Verify.** `npm run test:e2e:contract`, `npm run build:testing`,
`node scripts/check-production-is-default.mjs`.

**Done when** the contract run passes with accessibility findings present,
`temp/a11y-baseline.md` exists, and every `__aria__` file is committed.

## Wave 3: page suite

- `page-compliance.contract.ts` gains `page-a11y`: `scanAxe` over the page
  container, excluding chrome and shipped component roots.
- Text spacing: inject the W3C 1.4.12 override stylesheet, rerun
  `observeOverflow`, and record each new failure as `a11y-text-spacing`.
- Reduced motion: `emulateMedia({ reducedMotion: 'reduce' })`, then record
  each entry of `document.getAnimations()` still running past 200 ms as
  `a11y-reduced-motion`.
- Retire `page-contrast` per D8, with the token-naming helper and the
  deprecated alias.
- `tests/e2e/page-defects/` gains one page per new rule, written to trigger
  it, and asserts the annotation.

**Verify.** `npm run test:e2e:page-defects`, `npm run test:e2e:contract`,
`npx vitest run bin`, `npm run check:smoke-page-tests`.

**Done when** each defect page yields its finding at `warn` and fails under
`--strict`, `check-page --tests` exits 0 on the demo app, and the smoke gate
passes from the tarball.

## Wave 4: editor panel

Starts after `contrast-checker` merges (D10).

- `src/editor/component-editor/scaffolding/A11yPanel.svelte`: count and list
  of axe violations for `.preview-stage`, one row per violation with the
  help text and a link to its help URL.
- `ComponentEditorPage` loads `axe-core` dynamically and rescans 500 ms after
  the last token write (D9).
- A Playwright test changes a text colour to fail contrast and reads the
  panel's count rise, then restores the colour.

**Verify.** `npm run check`, `npm run test:e2e:contract`, `npm run build`,
then confirm `axe-core` is absent from the main chunk in `dist/`.

**Done when** the test passes and the build's main chunk carries no axe-core
code.

## Wave 5: keyboard cases

- Add `press` interaction cases to the interactive components: Button,
  IconButton, Toggle, RadioButton, Slider, SegmentedControl, TabBar,
  MenuSelect, SideNavigation, CollapsibleSection, SlidePager, Input, Dialog,
  ImageLightbox, VideoLightbox. Each case covers activation (Enter or Space),
  arrow movement where the pattern has it, and Escape on overlays.
- Route these cases to `a11y-keyboard` at `warn` (D11). A case declares
  `rule: 'a11y-keyboard'`; `runInteraction` records its failure as an
  annotation.

**Verify.** `npm run test:e2e:contract`, `npx vitest run src/testing`.

**Done when** every listed component declares at least one `press` case and
the contract run passes with any keyboard gaps reported at `warn`.

## Wave 6: skills and docs

- `live-tokens-check-compliance`: the eight `a11y-*` rules appear in its
  findings walk-through as alerts the user reviews.
- `live-tokens-create-component` and `references/contract-tests.md`: a new
  component declares `press` cases.
- Docs content page `accessibility.md` under `src/editor/docs/content`.
- `CHANGELOG.md` under Unreleased.
- After the skill edits: `npm run sync:skill-atlas`,
  `npm run sync:skill-sources`, carry the edits into each billing eval copy
  in `.claude/evals/_skills/<case>/`, and run
  `node scripts/eval-stage-skills.mjs --rehash <case>`.

**Verify.** `npm run check:skills`, `npm run check:skill-atlas`,
`npm run check:skill-sources`, `npm run check:docs-content`,
`npm run check:cli-strings`.

**Done when** every listed check passes.
