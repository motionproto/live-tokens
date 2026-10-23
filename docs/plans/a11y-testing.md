# Accessibility testing

Plan of 2026-10-23. The user settled D2 and approved D1 and D3 to D12 as
recommended on 2026-10-23, and merged `contrast-checker` into main the same
day (D10). An orchestrator session runs each wave in a session of its own
and stops for the user after each. Running the plan gives the rules.

**The probe comes first.** Wave 0 runs axe and Alfa over every component
state in a throwaway script and reports what they find, touching no product
code. The user then marks each later wave Build, Change, or Cut in the
Probe outcome table. A wave runs only when that table marks it Build or
Change. Waves 1 to 6 below stand as the full design; the probe decides how
much of it earns its place.

**Every Verify step finishes in minutes.** No wave runs an eval, a smoke
gate, or a tarball install. The release gates run those once. Each wave
states a budget, and a verify step past twice its budget is treated as stuck
and stopped.

The shipped components and the styling a user applies to them get tested
for accessibility. By default the tests alert: every accessibility finding
reports at severity `warn`, and the run exits 0. Under `--strict` the same
findings become errors and block, as every other `warn` rule does.

The plan builds on existing tools. axe-core is the main engine. Siteimprove
Alfa contributes one rule, SIA-R65, focus visibility, which axe lacks.
Playwright's own media emulation, accessibility-tree snapshots, and keyboard
API cover reduced motion, structure, and keyboard operation.
Two checks remain custom, and both reuse code the repository already has:
text spacing reruns the page overflow observation, and the keyboard cases
extend the interaction contract.

## Ground truth

Measured on local main at `31af1c1`.

1. **Contrast is the only accessibility check today.** `page-contrast`
   (`src/testing/support/pageHarness.ts:952`) measures text on surfaces
   for consumer pages and skips text inside shipped components. It reports
   at `error` (`bin/rules/testRuns.mjs:104`).
2. **The editor shows a contrast readout.** Merged from `contrast-checker`
   as `16e4303`: a ratio beside every foreground colour row, declared per
   editor through `contrastPairs`. `temp/contrast-checker-defaults.md`
   records 30 of 205 pairs failing in the shipped default theme.
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
| `@siteimprove/alfa-act`, `alfa-rules`, `alfa-dom` and the packages they need | MIT | Rule SIA-R65 alone: focusing an element changes at least one pixel. |
| Playwright `emulateMedia` | Apache-2.0 | `reducedMotion: 'reduce'`. |
| Playwright `locator.ariaSnapshot()` | Apache-2.0 | Each component's accessibility tree, read and compared without asserting. |
| Playwright keyboard | Apache-2.0 | `press` cases in the interaction contract. |

Rejected: Pa11y and Lighthouse wrap axe and add nothing. IBM Equal Access
duplicates axe's failures with more noise. Guidepup drives real screen
readers and costs more than it returns here.

## Decisions

**D1. Rule ids group by concern.** Axe's own rule id travels in the finding's
message. The rule table gains six fixed ids, each `warn`:

| Rule | Source |
|---|---|
| `a11y-component` | axe violations inside a component's preview |
| `a11y-page` | axe violations on a consumer page, outside shipped components |
| `a11y-review` | axe `incomplete` results: gradients, images, backdrops axe cannot judge |
| `a11y-focus-visible` | Alfa SIA-R65 |
| `a11y-text-spacing` | overflow under the WCAG 1.4.12 spacing override |
| `a11y-reduced-motion` | animations still running under `prefers-reduced-motion: reduce` |

A user silences one with `--off=a11y-review` or a config entry, the same way
as any other rule. *Approved.* One rule id per axe rule would put some
ninety ids outside the fixed rule table. The probe cut `a11y-forced-colors`:
under forced colours axe pairs the author's text colour with the forced
background, so the rerun added only false contrast findings.

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
`@axe-core/playwright`, and every `@siteimprove/alfa-*` package that
`scanFocusVisible` imports join `peerDependencies` as optional and
`devDependencies` pinned. The probe imported `alfa-act`, `alfa-rules`,
`alfa-dom`, `alfa-device`, `alfa-web`, `alfa-http`, and `alfa-url`, all at
0.119, and never used `alfa-playwright`. The Alfa packages share one minor
version. The `create` template adds them beside `@playwright/test`.

**D6. Component scans cover every variant and declared state under the
active theme.** The scan scopes to `.preview-stage` and excludes the canvas
toolbar and the editors' own demo content. The contracts' `properties` lists
name each variant and state pair. The probe opened only each contract's
default variant and missed eight of the contrast checker's eleven failing
text pairs.

**D7. The preset sweep runs in the repository only.** An environment flag,
`LIVE_TOKENS_A11Y_THEMES=all`, repeats each component scan under the eight
presets through `previewTheme`. The repository's contract project sets it.
A consumer's `check-component --tests` scans the active theme alone, which
keeps the consumer run inside its current 15 to 20 seconds per component.

**D8. `page-contrast` keeps page contrast.** `a11y-page` runs axe with its
`color-contrast` rule off, so each contrast failure reports once, through
`page-contrast` at `error`. *Changed after the probe.* axe returns no verdict
for text on gradients or behind a full-size pseudo-element, and three presets
paint gradient surfaces.

**D9. Cut after the probe.** The editor scans its preview live. `ComponentEditorPage` imports
`axe-core` dynamically on first open, scans `.preview-stage` 500 ms after the
last token write, and lists violations beside the contrast readout. The scan
skips when `axe-core` cannot load. It never blocks a save or a promote. The
failing treatment reuses the contrast readout's amber and "!" glyph.

**D10. Cut with D9.** The editor panel waits on the contrast-checker merge. Wave 4 builds
beside the readout that branch adds. *Done:* `contrast-checker`
merged into main on 2026-10-23.

**D11. Keyboard cases report at `warn`.** The new `press` cases run through
the interaction contract and report a failure as `a11y-keyboard` at `warn`,
outside `contract-interaction`, whose failures stay `error`. This makes seven
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
   readout. axe's contrast serves the component suite.
6. No theme token is added and no shipped default changes. Wave 0 records
   the baseline; fixes are a later plan.
7. Every run that touches the data tree restores it per `CLAUDE.md`, and
   `node scripts/check-production-is-default.mjs` passes after each wave.

## Out of scope

- Fixing the violations the baseline finds.
- Screen-reader automation.
- APCA or any contrast model other than WCAG 2.
- Focus indicator contrast (SC 1.4.11) beyond SIA-R65's visibility check.
  A follow-up can measure the outline through `contrast.ts`.
- A forced-colours check. A follow-up can test that borders and focus
  indicators survive `forcedColors: 'active'`.
- An editor panel that scans the preview live (D9).
- Manual audits.

## Running the plan

One orchestrator session runs the plan. It starts one session per wave, and
that session does the whole wave: it writes the code, runs the wave's Verify
commands, fixes what they report, and returns a summary. The orchestrator
reads the summary and the diff, then stops for the user before the next wave
starts. A wave stays in one session from start to finish, with no separate
executor, verifier, or reviewer. The plan registers no saved workflow and uses
neither `plan-wave` nor `plan-all`.

Wave 1 runs first. Waves 2, 3, and 5 each build on Wave 1 alone, so the
orchestrator may run them at once, each session in its own git worktree, and
merge them in order. Wave 6 runs last. A wave runs only when the Probe outcome
table marks it Build or Change.

## Wave 0: probe

Throwaway. Everything lives in `scratch/a11y-probe/`, which git ignores.

- Install the engines without saving them:
  `npm install --no-save axe-core@^4.11.1 @axe-core/playwright @siteimprove/alfa-playwright`.
  `package.json` and the lockfile stay untouched.
- `scratch/a11y-probe/playwright.config.ts` builds on
  `createPlaywrightConfig`, as the contrast checker's Wave 5 script did, so
  the dev server and the isolated data copy come from the shipped factory.
- `scratch/a11y-probe/probe.spec.ts`: for each contract in `allContracts()`,
  open it with `ContractHarness.open`, and for each declared state run axe
  (tags `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`) and Alfa SIA-R65 over
  `.preview-stage`. Repeat under the default theme and the eight presets
  through `previewTheme`. Under the default theme alone, repeat once more
  with `emulateMedia({ forcedColors: 'active' })`. Write every result,
  `incomplete` included, to `results.json`, with the wall time per theme.
- `scratch/a11y-probe/report.md`, generated from `results.json`:
  - one row per axe or Alfa rule: violations, `incomplete` count,
    components, themes;
  - for each rule, up to five examples with component, state, theme,
    target, and the HTML snippet;
  - axe `color-contrast` findings set beside the matching failures in
    `temp/contrast-checker-defaults.md`, counting the overlap and each
    side's extras;
  - the run's wall time, total and per theme, as the measured cost of D7's
    preset sweep.
- Restore the data tree per `CLAUDE.md`.

**Budget.** About an hour to write, under 20 minutes to run.

**Verify.** `node scripts/check-production-is-default.mjs`, and
`git status --short` lists nothing outside `scratch/`.

**Done when** `scratch/a11y-probe/report.md` exists and the session stops
with a summary of it for the user.

## Probe outcome

The user marked this on 2026-10-23 after reading the probe's report. The
waves below carry the changes.

| Wave | Build, Change, or Cut | Note |
|---|---|---|
| 1. Engines and findings | Change | Depend on the Alfa packages the probe imported (D5). `scanFocusVisible` prunes the document before the audit. Six rules plus `a11y-keyboard`. |
| 2. Component suite | Change | Step through variants (D6). Adjust the stage, exclude demo content, and preview themes with the stage uncovered. No forced-colours pass. |
| 3. Page suite | Change | `page-contrast` stays and axe's `color-contrast` stays off on pages (D8). |
| 4. Editor panel | Cut | axe sees no contrast in the stage as the editor draws it, and its other findings never move with a token edit. |
| 5. Keyboard cases | Build | |
| 6. Skills and docs | Build | Covers the rules that survive. |

## Wave 1: engines and findings

- Add `axe-core`, `@axe-core/playwright`, and the Alfa packages of D5 as
  pinned devDependencies and optional peers.
- `src/testing/support/a11y.ts`: `scanAxe(page, scope, exclude)` and
  `scanFocusVisible(page, scope)`, each returning `A11yResult[]` with
  `rule`, `engineRule`, `impact`, `target`, `html`, `help`, `helpUrl`.
  `recordA11y(results)` pushes the D3 annotation. Engines import inside the
  functions (Invariant 3).
- `scanFocusVisible` serialises the document with `@siteimprove/alfa-dom/native`
  and keeps the head, the scope's ancestor chain, and the scope's subtrees
  before it builds the Alfa page. SIA-R65 otherwise audits every tabbable
  editor control: 2.5 s a scan against 0.3 to 0.8 s pruned, with identical
  outcomes. `scratch/a11y-probe/probe.spec.ts` holds the working version.
- `bin/rules/a11y.mjs`: the seven rules of D1 and D11, each `warn` with
  guidance that names the axe help URL.
- `contractRunner.mjs`: `mapPlaywrightResults` reads `a11y` annotations into
  findings anchored on the component's runtime file or the page file line.
- Tests: an `a11y-*` finding exits 0 by default and non-zero under
  `--strict`; `--off` silences it under `--strict`; an annotation maps to one
  finding per result; a missing engine yields `inapplicable` coverage and
  exits 0 under `--strict`; the axe version check (Invariant 4).

**Budget.** Verify under 3 minutes.

**Verify.** `npx vitest run bin src/testing`, `npm run check`,
`npx vitest run bin/engineLoadsLazily.test.ts`.

**Done when** every listed test passes and `check-component button --tests`
on an unchanged tree prints the same errors it printed before the wave.

**Built.** The later waves call these:

- `scanAxe(page, scope, exclude, rule)`, where `rule` is `a11y-component` or
  `a11y-page`; the page rule turns `color-contrast` off.
  `scanFocusVisible(page, scope, exclude)`. `scope` is a selector. axe
  `incomplete` reports as `a11y-review`, and SIA-R65 `cantTell` as
  `a11y-focus-visible`. `recordA11y(results)` pushes the annotation.
- `missingEngine(['axe', 'alfa'])` returns the `inapplicable` reason or null.
  A page test reports a missing engine through `test.skip`, the path
  `mapPageResults` already reads.
- `structuralRule` maps `component-a11y.contract.ts` to `a11y-component`
  ahead of the positional branch. `ALL_CONTRACT_RULES` still lacks it, so
  Wave 2 adds it once the suite runs.
- An `a11y` finding leaves coverage to the test's own pass. A page result
  carries `line`. The page title pattern now admits digits, for `page-a11y`.
- `PAGE_RULES` holds `a11y-page`, `a11y-review`, `a11y-text-spacing`, and
  `a11y-reduced-motion`. A page scan that adds SIA-R65 adds
  `a11y-focus-visible` there too; an id missing from a table resolves to
  `error`.

## Wave 2: component suite

- `src/testing/component-a11y.contract.ts`: per contract and per variant
  and declared state, `scanAxe` and `scanFocusVisible` over
  `.preview-stage` (D6). The suite records `ariaSnapshot()` per D12.
- Before each scan the suite hides `.tabs-preview::after` and paints the
  stage's `.shadow-backdrop` with `--page-bg`. Without both, axe returns
  every text node in the stage as `incomplete` and measures transparent
  components against `#050505`.
- Editor demo content in the stage carries one marker attribute, and the
  scan excludes it: Card's content placeholder, Tooltip's demo targets,
  CodeSnippet's "Preview text" label, CollapsibleSection's body paragraph.
- A theme preview leaves the stage uncovered by the Theme Picker backdrop,
  and the harness reaches the picker trigger when an overlay such as
  ImageLightbox's covers it.
- `LIVE_TOKENS_A11Y_THEMES=all` repeats the scans under each preset (D7).
  The repository's `contract` project sets it.
- Register the suite file in `structuralRule` and the shipped `./testing`
  exports.
- Copy the probe's report to `temp/a11y-baseline.md` as the baseline the
  suite starts from.

**Budget.** Verify within the contract run's current time plus 3 minutes,
the preset sweep the probe measured on 4 workers.

**Verify.** `npm run test:e2e:contract`, `npm run build:testing`,
`node scripts/check-production-is-default.mjs`.

**Done when** the contract run passes with accessibility findings present,
`temp/a11y-baseline.md` exists, and every `__aria__` file is committed.

**Built.** The later waves rely on these:

- `component-a11y.contract.ts` runs one test per contract, titled
  `<id> records its accessibility findings in every variant and state`. It
  scans the union of the views the contract's `properties` and `states` name,
  each once. Views without a setup of their own run first and select their
  tabs again under each preset. A view with its own setup runs once, with
  each preset previewed over it, because a setup control such as Button's
  Small size hides the tabs a second selection would click.
- The default theme runs axe, SIA-R65, and the tree snapshot. Each preset
  runs axe's `color-contrast` alone, through `scanAxe`'s fifth argument,
  `only`. The probe found every other rule theme-independent.
- Editor demo content inside the stage carries `data-preview-demo`: Card's
  and Panel's content placeholders, Tooltip's demo targets, CodeSnippet's
  "Preview text" label, CollapsibleSection's body paragraph, TabBar's
  placeholder tab content, InlineEditActions' "Editing value..." text, and
  Image's zoom help. The scans exclude it with the canvas toolbar.
- `ContractHarness.previewThemeUncovered(slug)` and
  `cancelUncoveredPreview()` dispatch each click on its element and hide the
  Theme Picker's backdrop while the preview lasts.
- `A11yResult.view` names the views a result failed in; the runner prints it
  as `at <target> in <view>` and keeps it in `details.view`. One result
  stands for one element and engine rule across views and themes.
- Trees live in `src/testing/contracts/__aria__/<id>.yml`, one block per view
  label. A change reports `a11y-component` with engine rule `aria-snapshot`.
  A missing file records itself. `check-component --tests --update-aria`
  sets `LIVE_TOKENS_UPDATE_ARIA=1` (`UPDATE_ARIA_ENV`), which rewrites the
  files. `build:testing` copies them to `src/testing-js/__aria__`; a copy
  under `node_modules` is read and never written.
- `LIVE_TOKENS_A11Y_THEMES=all` (`A11Y_THEMES_ENV`) comes from the
  repository's `playwright.config.ts`. `ALL_CONTRACT_RULES` holds
  `a11y-component`.
- The contract run took 2 min 54 s before the wave and 5 min 10 s after, at 4
  workers. Wave 6 still has to document `--update-aria` in the README's
  command table and the docs.

## Wave 3: page suite

- `page-compliance.contract.ts` gains `page-a11y`: `scanAxe` over the page
  container, excluding chrome and shipped component roots.
- Text spacing: inject the W3C 1.4.12 override stylesheet, rerun
  `observeOverflow`, and record each new failure as `a11y-text-spacing`.
- Reduced motion: `emulateMedia({ reducedMotion: 'reduce' })`, then record
  each entry of `document.getAnimations()` still running past 200 ms as
  `a11y-reduced-motion`.
- `page-a11y` turns axe's `color-contrast` off; `page-contrast` stays (D8).
- `tests/e2e/page-defects/` gains one page per new rule, written to trigger
  it, and asserts the annotation.

**Budget.** Verify under 10 minutes.

**Verify.** `npm run test:e2e:page-defects`, `npm run test:e2e:contract`,
`npx vitest run bin`. The tarball smoke gate, `check:smoke-page-tests`, runs
at release.

**Done when** each defect page yields its finding at `warn` and fails under
`--strict`, and `check-page --tests` exits 0 on the demo app.

## Wave 4: editor panel

**Cut after the probe.** Kept as the design a follow-up would start from.

- `src/editor/component-editor/scaffolding/A11yPanel.svelte`: count and list
  of axe violations for `.preview-stage`, one row per violation with the
  help text and a link to its help URL.
- `ComponentEditorPage` loads `axe-core` dynamically and rescans 500 ms after
  the last token write (D9).
- A Playwright test changes a text colour to fail contrast and reads the
  panel's count rise, then restores the colour.

**Budget.** Verify under 8 minutes.

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

**Budget.** Verify under 6 minutes.

**Verify.** `npm run test:e2e:contract`, `npx vitest run src/testing`.

**Done when** every listed component declares at least one `press` case and
the contract run passes with any keyboard gaps reported at `warn`.

## Wave 6: skills and docs

- `live-tokens-check-compliance`: the seven `a11y-*` rules appear in its
  findings walk-through as alerts the user reviews.
- `live-tokens-create-component` and `references/contract-tests.md`: a new
  component declares `press` cases.
- Docs content page `accessibility.md` under `src/editor/docs/content`.
- `CHANGELOG.md` under Unreleased.
- After the skill edits: `npm run sync:skill-atlas`,
  `npm run sync:skill-sources`, carry the edits into each billing eval copy
  in `.claude/evals/_skills/<case>/`, and run
  `node scripts/eval-stage-skills.mjs --rehash <case>`.

**Budget.** Verify under 2 minutes.

**Verify.** `npm run check:skills`, `npm run check:skill-atlas`,
`npm run check:skill-sources`, `npm run check:docs-content`,
`npm run check:cli-strings`.

**Done when** every listed check passes.
