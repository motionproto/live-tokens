# Accessibility view

Plan of 2026-10-23, awaiting approval. It builds on
`docs/plans/a11y-testing.md`, executed the same day on local main.

The editor gains a fifth view, Accessibility, beside Tokens, Components,
Colors and Sketch. The view holds a Run test button and the report of the
last run. A run checks every component in the open theme as saved, tags each
violation, and writes the report. Unsaved edits stay out of a run: with edits
pending, Run test shows an alert and starts nothing. Each component the report names
carries a "!" in the component list and a notification panel on its editor
page, and each failing property row carries the same "!".

```
Sidebar                    Accessibility view
  ▣ Badge          !       ┌────────────────────────────────────────────┐
  ◉ Radio Button   !       │ Accessibility              [ Run test ]    │
  ⊟ Segmented Ctrl !       │ Last run 14:02, theme Royal Velvet         │
  ▤ Table                  │ 9 components with issues, 41 issues        │
                           │                                            │
                           │ ▾ Badge                         3 issues   │
                           │   ! Brand text 3.87:1, needs 4.5:1         │
                           │ ▾ Radio Button                  1 issue    │
                           │   ! ArrowDown leaves focus in place     ↗  │
                           │ ▸ 100 results to check by eye              │
                           └────────────────────────────────────────────┘

Component page (Badge)
  Badge                                        [file controls]
  ┌──────────────────────────────────────────────────────────────┐
  │ ! 3 accessibility issues                     Last run 14:02  │
  │ Fix with a property                                          │
  │   ! Brand text 3.87:1, needs 4.5:1        Text colour  →     │
  │ Fix in the component's code                                  │
  │   (none)                                                     │
  └──────────────────────────────────────────────────────────────┘
  Text colour  [■ --badge-brand-text ▾]   ! 3.87:1
```

## Ground truth

Measured on local main at `4df9684`.

1. **A test run tests the `default` theme.** `copyIsolatedDataDir`
   (`bin/contractRunner.mjs:197-212`) copies the data tree and deletes
   `_working.json`, `_active.json` and `_production.json` (`:62`). With no
   `_active.json` the run resolves to `default`.
   `src/testing/isolation.ts:18-33` gives the reason: a CLI run must not pass
   or fail on whichever theme the maintainer has open.
2. **The editor already knows when edits are pending.** ThemePanel derives
   `unsavedEdits` from `colorsAndTypeDirty`, `componentDirty` and
   `sketchOffTheme` (`ThemePanel.svelte:92-95`). Save "keeps your edits in
   the theme you have open" (`ComponentFileManager.svelte:394`).
3. **The CLI runs every suite or none.** `runContractTests`
   (`contractRunner.mjs:1075-1164`) runs the Vitest registry suite and the
   whole `contract` project with no grep or file filter (`:1131-1132`,
   `:416-417`). `--json` prints the findings to stdout
   (`bin/lib/findings.mjs:195-202`). Without `--no-fix` the command edits
   source files first (`bin/cli.mjs:329-337`).
4. **The runner owns its process.** It sets `process.env` (`:1118-1123`),
   installs SIGINT and SIGTERM handlers (`:238-269`), and keeps a
   module-global child (`:218`). The dev server can only run it as a child
   process. The dev plugin spawns no child today.
5. **The test server runs beside the user's.** It starts its own dev server
   (`reuseExistingServer: false`, `src/testing/playwright.ts:140`) on 4173 or
   a free port (`src/testing/port.ts:30-43`) with its own data copy. The
   user's server defaults to 5173.
6. **The accessibility checks live in two suites.** The scans run in
   `component-a11y.contract.ts`, one test per component. The keyboard cases
   run inside the editor suite's fifth serial test, "answers the pointer and
   the keyboard" (`component-editor.contract.ts:53-59`).
7. **The dev server pushes over one SSE stream with one event type.**
   `handleEvents` (`vite-plugin/themeFileApi.ts:1814-1828`) writes
   `live-state` on data-tree changes; `liveStateStream.ts:17-25` listens.
   No broadcast registry exists. Routes are a `{method, pattern, handler}`
   table (`themeFileApi.ts:2112-2211`, `vite-plugin/files/routeTable.ts`).
   A legacy-layout guard answers 409 to any non-GET on an unmigrated tree
   (`:2331-2339`).
8. **Views are a closed list.** `EditorView` (`editorViewStore.ts:3`),
   `isEditorView` (`:10`), the switcher's `CYCLE`, `ICONS` and `LABELS`
   (`EditorViewSwitcher.svelte:24-36`) and four if-chains in
   `EditorShell.svelte` (`sectionNav` `:118`, sidebar `:252-312`, main pane
   `:361-373`) enumerate them. A view missing from `sectionNav` throws in
   the narrow layout (`:131-136`). `editing-tokens.md:6-15` says "four
   views".
9. **The component list has a marker precedent.** The unsaved dot,
   `.dirty-dot` (`EditorShell.svelte:587-597`), sits in the icon column in
   `--ui-highlight` and survives the condensed rail. The list appears three
   times: EditorShell's sidebar (`:314-349`), its narrow menu (`:218-225`),
   and `ComponentEditorPage.svelte:156-191`. The contract harness finds a
   rail item by its exact text (`contractHarness.ts:196-199`), so a marker
   must add no text node.
10. **Property rows already carry a contrast "!".** `UIContrastReadout`
    (`src/editor/ui/UIContrastReadout.svelte:52-54`) marks a failing colour
    row live, through `UIPaletteSelector` (`:747-749`). 27 of 29 components
    declare `contrastPairs`; Image and Panel declare none.
    `allContrastPairs()` (`contrastPairRegistry.ts:16-18`) returns every
    pair, and `measurePair` reads tokens from the document root, so the
    editor can measure every component's pairs without mounting it.
11. **The contrast checker covers what axe reports.** Stepping variants in
    the component suite found axe `color-contrast` failures on Badge,
    CornerBadge and Notification, each also a failing pair in the checker.
    The checker also measures non-text pairs (SC 1.4.11), which axe skips.
    `temp/contrast-checker-defaults.md` records 30 of 205 pairs failing in
    the default theme.
12. **The component page has a slot under the title.** `DemoHeader.svelte:19`
    renders `ComponentFileManager` (the title row) and knows `component`.
13. **`--ui-highlight` is the editor's one status accent**
    (`src/editor/styles/ui-editor.css:51`).
14. **`test-results/` is ignored** in the repository and in
    `template/_gitignore`.

## Decisions

**D1. The view id is `accessibility`.** Its sidebar lists the components the
report names, each with its issue count; a click opens that component's
report section. Its main pane holds the Run test button and the report.

**D2. A run tests the open theme as saved.** A runner option,
`--open-theme`, keeps `_active.json` in the copy and still deletes every
`_working.json`, so the run reads the open theme's saved file. A CLI run
without it keeps today's behaviour. The report records the theme it tested.
*User decision, 2026-10-23.*

**D2a. Pending edits stop a run with an alert.** When `unsavedEdits` holds,
Run test shows "Save the changes you want to have checked." and starts
nothing. The editor's existing unsaved-edits signal decides; the plan adds no
tracking of its own. *User decision, 2026-10-23.*

**D3. The runner gains an accessibility-only mode.** A flag, `--a11y`, on
`check-component --tests` runs `component-a11y.contract` and the editor
suite's interaction test alone, through Playwright's file filter and
`--grep`, skips the Vitest suite and coverage reconciliation, and keeps only
`a11y-*` and `tests-*` findings. The editor's run adds `--no-fix --json
--open-theme`.
Wave 1 measures a full run; the probe's figures put it near three minutes.

**D4. Contrast comes from the contrast checker.** The editor keeps one
contrast implementation (a11y-testing Invariant 5). When a run starts the
editor measures every pair in `allContrastPairs()` and adds each failure to
the report, named by its property. A run starts only with no edits pending
(D2a), so the editor's values match the saved theme the run tests. The report drops axe's `color-contrast`
findings, which the checker covers (ground truth 11). The CLI keeps them.

**D5. The dev server runs one test at a time.** `POST /a11y/run` spawns the
CLI as a child and answers 409 while a run is going. `GET /a11y/report`
returns the last report. The SSE stream gains an `a11y` event that carries
the run state (`running`, `finished`, `failed`) and, when finished, the
report. The report persists in `test-results/live-tokens/a11y-report.json`,
so a reload keeps it.

**D6. A finding sorts by its fix.** Contrast failures read "Fix with a
property" and name the row. Every other `a11y-*` finding reads "Fix in the
component's code". `a11y-review` results carry no "!" and collect in one
collapsed "check by eye" line.

**D7. The "!" follows the last run.** The component list and the panel show
the report as it stood when the run finished, with its time and theme. The
property readout stays live, as today.

**D8. Every marker is text-free.** The list's "!" is a pseudo-element on an
`aria-label`led span in the icon column, beside the unsaved dot, in all three
copies of the list. It survives the condensed rail and leaves
`contractHarness`'s text match intact.

**D9. A missing tool explains itself.** When Playwright, axe or Alfa is
absent, the view names the install command and Run test is disabled. Test
runs exist in development alone; the view shows nothing in a production
build.

## Invariants

1. A CLI run without the new options behaves as today: it strips the session
   files and runs every suite.
2. No run reads an unsaved edit: every run deletes `_working.json` from its
   copy.
3. The editor never blocks a save, promote or theme load on a finding.
4. No theme token is added and no shipped default changes.
5. The rail keeps its text match: no marker adds text to a nav item.
6. Every run that touches the data tree restores it per `CLAUDE.md`, and
   `node scripts/check-production-is-default.mjs` passes after each wave.

## Out of scope

- Fixing the findings.
- Checking unsaved edits.
- Running the page suite from the editor.
- A progress bar per component. The view shows the run state and the
  elapsed time.
- Marking focus and target-size findings on property rows. A follow-up can
  map a contract part to its properties.

## Running the plan

One orchestrator session runs the waves in series, one session per wave,
each writing the code, running its Verify commands and fixing what they
report. The orchestrator leaves one report at the end. Each wave commits on
local main with the prefix `A11y view W<n>: `.

## Wave 1: runner

- `check-component --tests --a11y`: the suite filter of D3.
- A runner option and flag, `--open-theme`, that keeps `_active.json` in the
  copy (D2).
- `--json` output carries the theme the run tested.
- Tests: `--a11y` runs the two suites alone and keeps only `a11y-*` and
  `tests-*` findings; `--open-theme` keeps `_active.json` and deletes every
  `_working.json`; a plain run strips both (Invariants 1 and 2).
- Measure one full `--a11y --open-theme` run and record its wall time
  under this wave.

**Verify.** `npx vitest run bin`, `npm run check`, one CLI run of
`check-component --tests --a11y --no-fix --json`.

**Built.** Wave 2 calls these:

- `check-component [id] --tests --a11y` runs Playwright's `contract` project
  with the file filters `component-a11y.contract` and
  `component-editor.contract` and a `--grep` on the two test titles
  (`A11Y_SELECTION` in `contractRunner.mjs`). It skips the Vitest suite,
  the static checks and fixes, and coverage reconciliation, and keeps only
  `a11y-*` and `tests-*` findings. The editor test maps through its own
  positional table, `['contract-interaction']`, so a pointer failure counts
  against that rule and drops out of the findings. A test in
  `bin/check-component.test.ts` pins the grep to the real titles.
- `--open-theme` keeps `themes/_active.json` in the copy. Every
  `_working.json`, `_production.json` and legacy per-layer pointer still
  goes. Both flags need `--tests`; either one without it exits 1.
  `src/testing/isolation.ts` needs no change: the CLI sets
  `LIVE_TOKENS_TEST_DATA_DIR`, so the config's own isolation reuses the
  runner's copy.
- `--json` prints `{ check, checked, errors, warnings, theme, findings,
  coverage }`. `theme` holds the slug the copy's pointer names, or
  `default`. Under `--a11y` coverage holds `a11y-component` and
  `contract-interaction` per component. A `failed` interaction entry means
  the keyboard cases after the failing case did not run.
- The exit code is 0 while every finding stays at `warn`; `--strict` or a `tests-*`
  finding makes it 1. The JSON goes to stdout, and the run writes nothing to
  the data tree.
- Measured on this repository with `_active.json` naming `royal-velvet`:
  `check-component --tests --a11y --no-fix --json --open-theme` took
  198 s at one worker and exited 0. It checked 29 components and returned
  86 findings across 17 of them: 61 `a11y-review` (59 `color-contrast`, 2
  `video-caption`), 15 `a11y-component`, 5 `a11y-focus-visible` and 5
  `a11y-keyboard`. The same run without `--open-theme` took 191 s and
  tested `default`. It returned 91 findings, among them 8 axe
  `color-contrast` violations, where royal-velvet returns none.
- A theme with a sketch style boots the run with the sketch layer on, as
  `isolation.ts` notes, so the scans then read the sketch paint.

## Wave 2: dev server

- `POST /a11y/run`, `GET /a11y/report`, and the `a11y` SSE event (D5), with
  a broadcast set in `handleEvents`.
- The run spawns the package's own CLI with `--tests --a11y --no-fix --json
  --open-theme` and writes the report file.
- A client store, `a11yReport`, keyed by component id, beside
  `componentDirty`, fed by `GET` on load and by the event.
- Tests: the route answers 409 during a run; the report survives a reload;
  a missing Playwright yields a `tests-not-installed` report.

**Verify.** `npx vitest run vite-plugin src/editor/core`, `npm run check`.

**Built.** Waves 3 and 4 call these:

- Types live in `src/editor/core/a11y/a11yReportTypes.ts`. The editor
  sends `A11yContrastFailure[]`, one entry per failing pair:
  `{ component, variable, backdrop, role, ratio, floor, context? }`, where
  `variable` is the pair's `foreground` and `role` is `'text' | 'non-text'`.
  `ContrastPair` has no view, so the entry carries none. `A11yReport` is a
  union on `state`. Every state carries `startedAt` and `contrast`.
  `finished` adds `finishedAt`, `theme?` and `findings`. `failed` adds
  `finishedAt` and `error`. `theme` is absent when a missing tool stopped
  the run before it copied the tree.
- `POST ${API_BASE}/a11y/run` with `{ contrast }` answers 202 and the
  running report. It answers 409 `A11Y_RUN_IN_PROGRESS` while a run goes,
  400 `INVALID_BODY` to a malformed list, and 409 `LEGACY_LAYOUT` on an
  unmigrated tree through the existing guard. It spawns
  `node <pkg>/bin/cli.mjs check-component --tests --a11y --no-fix --json
  --open-theme` from `process.cwd()`. The plugin resolves `<pkg>` as `..`
  from its own file, the same way it finds the shipped components, so the
  path holds from `vite-plugin/` and from `dist-plugin/`. A dev-server close
  sends the child SIGINT.
- `GET ${API_BASE}/a11y/report` answers `{ report: A11yReport | null }`:
  the running report while a run goes, otherwise
  `test-results/live-tokens/a11y-report.json` under the project root. The
  file holds the last settled report alone, so a restart never reads back
  an orphaned run. The report drops every finding whose
  `details.engineRule` is `color-contrast`. Output that parses as no report
  makes a `failed` report with the exit code and the tail of stderr. A
  missing tool makes a `finished` report of `tests-not-installed` findings,
  each naming its install command.
- The `/events` stream sends `event: a11y` with the report on start and on
  settle, to every open stream. `live-state` is unchanged.
- The runner adds `component` to every Playwright finding that names one,
  so the store reads the id from that field. `reportChecks` now prints
  through `writeOut`. On macOS, `console.log` followed by `process.exit` cut
  piped output at 64 KiB.
- `src/editor/core/a11y/a11yReport.ts`, re-exported from `editorStore.ts`:
  `a11yReport` (the latest report), `a11yFinishedReport` (the last finished
  one, which the markers follow during a run), `a11yIssues`
  (`Record<componentId, { contrast, code, review }>`), and
  `startA11yRun(contrast)`. `code` holds each `a11y-*` finding other than
  `a11y-review`, and `review` holds the `a11y-review` findings, which carry
  no "!". A component appears in `a11yIssues` when it has any of the three.
  `startA11yRun` throws an `Error` carrying `status` and `code`. Boot reads
  `GET` after the stream opens, and `liveStateStream.ts` feeds the store from
  the one `EventSource`. A tab reloaded mid-run shows no markers until that
  run finishes.
- Measured on this repository with `_active.json` naming `royal-velvet`: a
  POST to a dev server on port 5199 settled in 185 s. It returned
  `finished` with 27 findings across 10 components, every one of which
  carried `component`, and no `color-contrast` finding. A second POST
  answered 409, and the stream carried two `a11y` frames.
- The spawned CLI copies the data tree that `live-tokens.config.json`
  names. A dev server under `LIVE_TOKENS_TEST_DATA_DIR` therefore runs the
  check against the project's own tree, which Wave 3's Playwright test must
  allow for.

## Wave 3: Accessibility view

- `accessibility` joins `EditorView`, `isEditorView`, the switcher and
  EditorShell's sidebar, main pane and `sectionNav` (ground truth 8).
- The view: Run test, which shows the D2a alert while edits are pending and
  otherwise posts the run; the run state and elapsed time; the report
  grouped by component, with the contrast failures of D4, the "check by eye"
  line of D6, and the run's time and theme.
- `unsavedEdits` moves from ThemePanel into a shared derived store, so the
  view and ThemePanel read one signal.
- `editing-tokens.md` names five views.
- A Playwright test presses Run test on the library's own demo app and
  reads a finished report.

**Verify.** `npm run check`, `npx vitest run src/editor`, the new
Playwright test.

## Wave 4: markers and panels

- The list "!" of D8 in all three copies of the list.
- `A11yPanel` under the title in `DemoHeader`, grouped per D6. A property
  row in the panel scrolls to its row through `data-token-variable`.
- Tests: a component the report names shows the marker and the panel; a
  clean component shows neither; `npm run test:e2e:contract` still finds
  every rail item.

**Verify.** `npm run check`, `npx vitest run src/editor`,
`npm run test:e2e:contract`.

## Wave 5: docs

- The docs chapter `accessibility.md` gains the view.
- `CHANGELOG.md` under Unreleased; the README names `--a11y` and
  `--open-theme`.

**Verify.** `npm run check:docs-content`, `npm run check:cli-strings`.
