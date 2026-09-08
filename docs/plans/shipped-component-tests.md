# Component tests ship with the package and `check-component` runs them

Branch off `main` as `shipped-component-tests`. Five waves, each a single
commit unit executable by a sub-agent with only this doc and this repo. Waves
are strictly sequential; each ends green. Wave 5 also touches the `create`
template and the two skills.

**Execution model.** A fresh session orchestrates from this doc and writes no
wave code itself. Each wave runs in a `wave-executor` sub-agent. The review
gate after each wave (`wave-reviewer`) runs at the orchestrator's tier. The
executor runs only the automated commands; a Playwright run is an automated
command here.

**Precondition.** At the time of writing, the atlas reorders of `create-page`
and `create-component` are committed (`fb3c7d5`). The tree carries one
uncommitted file, `src/editor/skill-atlas/trees/create-component.ts`, with
the user's own copy edits to titles and descriptions. Commit that as its own
commit before Wave 1; note that its "Read the project" description trips the
atlas vocabulary rule on the word "look", and the title "Write the component
runtime" carries a trailing space. The full `check:skill-atlas` also fails on
two `pick-component` handoff cards that name no skill; that failure predates
this plan and Wave 5 repairs it in passing because it edits the same file. If
the tree is dirty in any other way, stop and report.

This supersedes the deferral recorded in `docs/plans/custom-component-path.md`
section 1, "the render contract as a Playwright spec in the `create`
template." The reason for deferring, that no consumer component had yet been
held to the runtime contracts, is the reason to do it now: the Slider exercise
showed the static gate passes and the runtime contracts catch the defects.

## Status

| Wave | Summary | Executor | Status | Commit |
|---|---|---|---|---|
| 1 | The contract suites move into the shipped tree and open the owned route | wave-executor | Not started | |
| 2 | The five manual checks become assertions | wave-executor | Not started | |
| 3 | A Playwright config factory and a vitest contract runner ship | wave-executor | Not started | |
| 4 | `check-component --tests` runs the suites and reports by rule | wave-executor | Not started | |
| 5 | The template, the skills, the atlas, and the changelog | wave-executor | Not started | |

The orchestrator updates this table after each review gate: `Not started` to
`In progress` to `Done` (or `Blocked`, with a one-line reason appended under
the table). Record the short commit SHA.

Waves 1 through 3 change nothing a consumer sees. Wave 4 adds the flag and
Wave 5 makes the skills use it. If the run is cut short after Wave 3, the repo
is coherent: the suites run here from their new location, and consumers are
unaffected.

## The problem

`live-tokens-create-component` ends with a human in the browser. Its
Verification step 4 opens `/live-tokens/components` and asks the reader to
confirm seven lines by eye. The atlas card for it is "Check the component in
the editor." The user's position is that this is exactly what automated
testing is for, and that a component passes when the tests say it passes.

The tests exist and do not ship.

- `check-component` is a static lint. It parses the runtime, the editor, and
  the registration, and reports by rule id and line. It never opens a browser.
- `checkRegistryEntry` is exported at `./component-editor/contract`. The
  skill's `references/contract-tests.md` tells a consumer how to write a
  vitest file around it. The consumer writes and runs the file; nothing calls
  it.
- `tests/e2e/component-render-contract.spec.ts` and
  `tests/e2e/component-alias-contract.spec.ts` discover every component from
  `src/live-tokens/data/component-configs/*/default.json`, boot the editor
  once per component, and prove that every control repaints its property and
  that every alias fans out set, update, and remove to both roots. They honor
  `LIVE_TOKENS_COMPONENT` to run for one component. The package excludes
  every `*.spec.ts` and `tests/` is not in `files`, so they never leave this
  repo. They open the repo's demo page at `/demo` and click its "Browse
  Components" button, the alias spec imports the store by the repo-relative
  path `/src/editor/core/store/editorStore.ts`, and `playwright.config.ts`
  starts this repo's dev server after `prepare:e2e` copies the data tree to
  `.playwright-data/`. None of that works from a consumer's project.
- Of the seven manual lines, the suites cover two: each control changes the
  matching part, and linked properties change together. Five have no
  assertion anywhere: an edit persists across a reload and Reset restores the
  root defaults; a theme change reaches every property; the preview matches
  the state being edited and keyboard and pointer behavior work; the
  component is listed under CUSTOM (or among the system entries when
  first-party); with Sketch mode on every painted part is drawn in its own
  colors and with it off the component is unchanged.

## The feature

`npx live-tokens check-component <id> --tests` runs the lint, then the
registry contract test under vitest, then the two contract suites under
Playwright for that one component, and reports every failure as a finding
with a rule id and a line. The skill's Verification is one command. The
manual list is gone because each of its lines is an assertion.

The suites live in the shipped tree, run here against the library's own demo
app and in a consumer against the consumer's app, and are one copy of each
file. A consumer gets them by installing Playwright and vitest; the CLI finds
both from the consumer's project and says what to install when one is
missing.

## Reserved judgment calls (already decided, do not re-litigate)

1. **Opt in by flag, always on in the skill.** `check-component` without
   `--tests` is the lint it is today, so the template's `check:design` script
   and CI runs that lack a browser stay fast and green. The skills pass
   `--tests`. `report` gains no test rows in this plan.
2. **Optional peer dependencies.** `@playwright/test`, `vitest`, and
   `happy-dom` go under `peerDependenciesMeta` as optional. The package
   bundles no browser. A missing dependency is a finding, rule
   `tests-not-installed`, whose message is the install command and the
   `npx playwright install chromium` step. It is an error under `--tests`,
   never a silent skip.
3. **Location.** The suites, their support module, the config factory, and
   the vitest contract file move under `src/testing/`. That directory is in
   `files`. The `!**/*.spec.ts` and `!**/*.test.ts` exclusions stay, so the
   shipped files take the names `*.contract.ts`, which Playwright's
   `testMatch` and the vitest include list are set to. The repo's stateful
   suites (`live-editing`, `theme-workflow`) stay in `tests/e2e/` and do not
   ship; they test the editor, not a component.
4. **Navigation by owned route.** The suites go to `DEFAULT_COMPONENTS_PATH`
   from `src/editor/core/routing/ownedRoutes.ts` and wait for the editor
   page, instead of `/demo` and a button. The repo's dev app already serves
   that route. A consumer who relocated the route with `editorRoutes` passes
   the path to the config factory.
5. **The store import goes through the package.** The alias spec's
   `import('/src/editor/core/store/editorStore.ts')` becomes a `window`
   handle the components editor page exposes in dev only, named
   `__liveTokensEditor`, carrying `editorState` and `mutate`. Same behavior
   in both repos, no path arithmetic against `node_modules`.
6. **The data tree is the consumer's own.** The suites read
   `component-configs` from the plugin's `dataDir` (default
   `src/live-tokens/data`). The repo keeps `prepare:e2e` and
   `LIVE_TOKENS_E2E_DATA_DIR` for its own runs because its data tree is the
   shipped defaults and must not be written by a test. A consumer's run uses
   the consumer's tree; the config factory takes a `dataDir` for a consumer
   who wants the same isolation.
7. **One config factory, one runner.** `createPlaywrightConfig({ dev, port,
   componentsPath?, dataDir? })` returns a Playwright config with the shipped
   `testDir` and `testMatch`, and `runContractTests(id)` runs the vitest file
   over the registry filtered to that id. `check-component --tests` calls
   both through `child_process`, so it needs no import of either tool at
   module top. `bin/engineLoadsLazily.test.ts` already enforces lazy loading
   for the compiled engine; the same rule applies here.
8. **Findings, not console output.** A failing assertion becomes
   `{ rule, file, line, message }` like every lint finding. The rule ids are
   fixed here so `fix-findings` can map them: `contract-registry`,
   `contract-render`, `contract-alias`, `contract-persist`,
   `contract-theme`, `contract-preview`, `contract-listed`,
   `contract-sketch`, `tests-not-installed`. `file` is the spec file and
   `line` the assertion's line, which the Playwright JSON reporter and the
   vitest JSON reporter both give.
9. **Version.** A new flag, a new export, and new optional peers are a minor
   bump. Wave 5 records it under `Unreleased`. The release goes through CI
   and is the user's call.

## Global invariants (reviewer checklist)

1. **One copy of each suite.** After Wave 1, no spec under `tests/e2e/`
   duplicates a file under `src/testing/`. The repo's `test:e2e:contract`
   script runs the shipped files.
2. **Shipped code imports shipped code.** Nothing under `src/testing/`
   imports from `src/app/` or `tests/`. Owned-route constants come from
   `src/editor/core/routing/ownedRoutes.ts`.
3. **The lint is unchanged without the flag.** `check-component <id>` with no
   `--tests` produces byte-identical output to `main` for the 26 shipped
   components and the `check-component.test.ts` fixtures.
4. **Nothing loads a test tool at module top.** `bin/cli.mjs` and
   `bin/check-component.mjs` import neither `@playwright/test` nor `vitest`.
   `npm test` passes with both absent from `node_modules` (the CI condition).
5. **The data tree is untouched.** No wave writes under `src/live-tokens/data/`
   except through `prepare:e2e`'s copy to `.playwright-data/`. Run
   `node scripts/check-production-is-default.mjs` at every wave boundary.
6. `npm run check` clean, `npm run test` green, `npm run test:e2e:contract`
   green, and `check:skills`, `check:skill-atlas`, `check:skill-sources`,
   `check:smoke-install` OK at every wave boundary. Wave 5 also runs
   `check:smoke-create`.
7. Nothing pushed, tagged, or published by an executor.

## Commit-unit protocol

One wave, one commit. Run the wave's verification green before committing;
never commit red. Commit message `Shipped tests W<n>: <summary>` plus the
standard co-author trailer. Do not push, tag, or release. Stop after each wave
for review. If reality contradicts this plan (a cited file is missing, a check
pins conflicting behavior), stop and report rather than improvise.

Never stash, reset, or checkout over uncommitted changes.

## Wave 1 — the contract suites move into the shipped tree

**Files.**
- `src/testing/component-render.contract.ts` (from
  `tests/e2e/component-render-contract.spec.ts`)
- `src/testing/component-alias.contract.ts` (from
  `tests/e2e/component-alias-contract.spec.ts`)
- `src/testing/support/editor.ts` (from `tests/e2e/support/editor.ts`)
- `src/editor/pages/ComponentEditorPage.svelte`: expose
  `window.__liveTokensEditor = { editorState, mutate, getComponentRegistryEntries }`
  in dev only, guarded by `import.meta.env.DEV`.
- `playwright.config.ts`: `testDir` stays `./tests/e2e` for the stateful
  suites; add a second project, `contract`, with `testDir: './src/testing'`
  and `testMatch: '**/*.contract.ts'`.
- `package.json`: `files` gains `src/testing`; `test:e2e:contract` and
  `test:e2e:components` point at the new paths.

**Do.**
1. Move the three files with `git mv`.
2. `openOverlayEditor(page, 'components')` becomes `openComponentsEditor(page,
   path = DEFAULT_COMPONENTS_PATH)`: `page.goto(path)`, wait for
   `.editor-page`, wait for the same root variable the old helper waited
   for. Keep the old helper for the stateful suites if they still use it;
   otherwise delete it.
3. The alias contract reads `editorState` and `mutate` from
   `window.__liveTokensEditor` inside `frame.evaluate`, and fails with a
   named error when the handle is absent.
4. `discoverDefaultAliases` takes its root from `process.env.LIVE_TOKENS_DATA_DIR`
   with the default `src/live-tokens/data`. The repo's `playwright.config.ts`
   sets it from `LIVE_TOKENS_E2E_DATA_DIR`.

**Verify.** `npm run test:e2e:contract` green for all 26 components.
`check:smoke-install` shows `src/testing/` in the tarball and no `.spec.ts`
in it. Invariants 1, 2, 5, 6.

## Wave 2 — the five manual checks become assertions

**Files.** `src/testing/component-render.contract.ts`, and a new
`src/testing/component-editor.contract.ts` for the checks that are not
per-property.

**Do.** One test per manual line, each honoring `LIVE_TOKENS_COMPONENT`.
1. **Listed.** The component's entry is present in the editor's component
   list. A custom component (registry `origin === 'custom'`) sits under the
   CUSTOM group; a first-party one sits among the system entries. The
   registry origin comes from `getComponentRegistryEntries()` through the
   window handle.
2. **Persist and reset.** Change one property through its control, reload,
   read the same variable on both roots and expect the changed value. Click
   Reset, expect the `:global(:root)` default. The default is read from
   `default.json` in the data dir.
3. **Theme reaches every property.** Load a second shipped theme through the
   editor's Theme panel (the stateful `theme-workflow` suite shows the click
   path), then for every alias in `default.json` expect the resolved value on
   the host root to differ from its value under the first theme, or to
   resolve through a token that changed. Restore the first theme at the end.
   This test writes `_active.json`, so it runs only against a data dir the
   config factory has isolated; the repo's run already is.
4. **Preview matches the state, and the control operates.** For each state
   tab in a `VariantGroup`, select it and expect the preview's root to carry
   the state's class (`force-hover`, `on`, `disabled`, as the shipped editors
   name them). For an interactive component, Tab to the preview and press
   Space or Enter, and expect the state to change; a disabled preview does
   not change.
5. **Sketch mode.** Toggle Sketch mode on, expect every element that carries
   the reserved class from `references/sketch-mode.md` to resolve a non-empty
   `--sketch-stroke` (or the first of the five values the reference names).
   Toggle it off, expect the component's computed styles to match the values
   captured before the toggle.

Each assertion's failure message names the property or the part, so the
finding's `message` in Wave 4 is that string.

**Verify.** All five pass for all 26 shipped components. Any shipped
component that fails a new assertion is a real defect: record it in the wave
report and stop for review rather than weakening the assertion. Invariants
1, 5, 6.

## Wave 3 — the config factory and the contract runner ship

**Files.**
- `src/testing/playwright.ts`: `createPlaywrightConfig(options)`.
- `src/testing/registry.contract.ts`: the vitest file from
  `references/contract-tests.md`, generalized: registers nothing itself,
  reads the registry after importing the consumer's editor files by the
  `sourceFile` paths `discoverComponents()` finds, filters to
  `origin === 'custom'` or to `LIVE_TOKENS_COMPONENT`.
- `src/testing/vitest.ts`: `createVitestConfig(viteConfig)` applying the
  `happy-dom` environment and the inline rules the reference documents.
- `package.json`: exports `./testing` (types and default at `src/testing/index.ts`
  re-exporting the two factories), `peerDependenciesMeta` for
  `@playwright/test`, `vitest`, `happy-dom` with `optional: true`.
- `references/contract-tests.md`: the consumer recipe becomes "use the
  shipped file through `check-component --tests`; here is the config if you
  run vitest yourself."

**Do.** The repo's own `playwright.config.ts` and `vitest.config.ts` call the
factories, so the factories are exercised by every repo run. The repo's
existing `registryContract.test.ts` over `builtInRegistry` stays as it is.

**Verify.** `npm run test:e2e:contract` and `npm test` green through the
factories. `check:smoke-install` resolves `./testing` off the real tarball.
Invariants 2, 4, 6.

## Wave 4 — `check-component --tests`

**Files.** `bin/check-component.mjs`, `bin/cli.mjs`, `bin/check-component.test.ts`,
and a new `bin/contractRunner.mjs`.

**Do.**
1. `parseCheckFlags` accepts `--tests`. `check-component` without it is
   unchanged (invariant 3).
2. `contractRunner.mjs` exports `runContractTests(id, { root })`. It resolves
   `@playwright/test` and `vitest` from `root` with `createRequire`; a missing
   one yields the `tests-not-installed` finding and skips that tool. It runs
   vitest with `--reporter=json` over `registry.contract.ts` and Playwright
   with `--reporter=json` over the `contract` project, both with
   `LIVE_TOKENS_COMPONENT=<id>`, and maps each failed test to a finding with
   the rule id from judgment call 8 by the test's title prefix, the spec
   file, the failing line, and the assertion message.
3. Findings from the lint and the runner concatenate and go through
   `reportChecks`, so `--json`, `--strict`, `--off`, and the project's checks
   config apply to test findings as to lint findings.
4. `COMPONENT_RULES` gains the nine rule ids, all `error`.
5. Tests: the runner's mapping from a reporter JSON fixture to findings, and
   the not-installed path, with no browser. The existing fixture project
   under `check-component.test.ts` gains one `--tests` case that asserts the
   `tests-not-installed` finding, because the fixture has no Playwright.

**Verify.** `npx live-tokens check-component toggle --tests --json` here
exits 0 and lists no findings. Break one alias in a scratch copy of a
component config and see a `contract-alias` finding with a line. `npm test`
green with Playwright moved aside. Invariants 3, 4, 6.

## Wave 5 — the template, the skills, the atlas, and the changelog

**Files.**
- `template/package.json`: `check:design` unchanged; a new script
  `test:design` runs `live-tokens check-component --tests`; the README names
  the two installs a consumer makes to enable it.
- `.claude/skills/live-tokens-create-component/SKILL.md`: Workflow step 6
  becomes "Run **live-tokens-check-compliance**, then
  `npx live-tokens check-component <id> --tests --strict --json` until exit
  0, then the Svelte check and the build." Step 7 and Verification step 4
  with its seven-line list are deleted. Verification step 3 (the contract
  test) is deleted, since the runner covers it. The rule table gains the
  nine `contract-*` and `tests-not-installed` rows, each mapped to the
  section that fixes it. The file must stay under 250 lines
  (`check:skills`); it is at 248 now, and the deletions make room.
- `.claude/skills/live-tokens-fix-findings/SKILL.md`: the rule table it
  keeps gains the same rows, each mapped to the section of create-component
  that fixes it.
- `.claude/skills/live-tokens-check-compliance/SKILL.md`: one sentence that
  `report` does not run the tests and that `check-component --tests` does.
- `src/editor/skill-atlas/trees/create-component.ts`: the "Check the
  component in the editor" card is deleted; "Run the checks" keeps its
  badges with "Contract test" replaced by "Component tests" pointing at the
  new Workflow line. `fix-findings.ts` re-anchors after its table grows.
- `src/editor/skill-atlas/trees/pick-component.ts`: the two handoff cards
  name their skills in the description (`live-tokens-create-component`,
  `live-tokens-create-page`), which clears the pre-existing
  `check:skill-atlas` failure.
- `CHANGELOG.md` under `Unreleased`: the flag, the export, the optional
  peers, the deleted manual step.

**Do.** After every skill edit run `npm run sync:skill-atlas` and
`npm run sync:skill-sources`. Rebuild the create-component tree from the new
line numbers the way this session did: every card cites its Workflow line and
its badges cite the sections.

**Verify.** `check:skills`, `check:skill-atlas` (the full run, now clean),
`check:skill-sources`, `check:smoke-create`, and `npm test` green.
Invariants 6 and 7.

### Open for the user after Wave 5

- Whether `report` should carry a test row per component, so
  check-compliance sees test results without a browser run of its own.
- Whether the `create` template installs Playwright by default. This plan
  leaves it opt-in and documented.
- The first consumer run: `../live-tokens-online` after a release carrying
  Wave 4, against its own custom components.
