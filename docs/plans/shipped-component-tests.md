# Shipped component validation

Branch off `main` as `shipped-component-tests`. Seven commit units in five
waves, each executable by a sub-agent with only this doc and this repo. Units
are strictly sequential; each ends green. Wave 5 also touches the `create`
template and the authoring skills.

**Execution model.** A fresh Opus session orchestrates from this doc and
writes no wave code itself. Each unit runs in a `wave-executor` sub-agent at
the model its section names, passed as the Agent tool's `model` override.
The review gate after each unit (`wave-reviewer`) runs at the model its
section names. Fable reviews the two design units and the skill copy; Opus
reviews the mechanical units. The executor runs only the automated commands;
a Playwright run is an automated command here.

**Model allocation.** Sonnet takes the units whose shape this doc fixes and
whose definition of done is a green command: the file moves, the mappings
that follow an exemplar, the CLI wiring, the consumer gate script, and the
skill edits. Opus takes the two units that decide something: the contract
shape and the isolation mechanism. Splitting Wave 2 is the largest saving.
Opus proves the contract on two exemplar components; Sonnet then maps the
other 24 from a working pattern instead of designing while mapping.

**Playwright cost.** An executor develops under
`LIVE_TOKENS_COMPONENT=<one id>` and runs the full 26-component suite once,
before committing. Wave 2a develops against its two exemplars only.

**Precondition.** Inspect the current branch, worktree, and baseline checks.
Preserve existing edits. Record pre-existing failures separately; repair any
failure that blocks a required gate before the first wave that requires it.
Do not rely on historical commit IDs, line counts, or dirty-tree assumptions.

## Scope and acceptance

This plan ships component validation. It covers registration, token wiring,
editor controls, rendered parts and states, interactions, persistence, themes,
and Sketch mode. Page composition and runtime page checks belong to
[shipped page validation](shipped-page-validation.md).

The release gate installs the actual package tarball into a fresh consumer
project outside this repository. The documented command must validate a new
custom component there. A valid fixture passes every required check;
deliberate defects fail with the expected rule and component context. The
consumer's source data remains unchanged on success, failure, and interruption.
This gate runs before release. A later run against a user's project supplements
it.

Shared infrastructure includes server startup, isolated data, test-tool
resolution, findings, coverage reporting, and tarball acceptance fixtures.
The page plan reuses those pieces and retains its own suites and command.

This supersedes the deferral recorded in `docs/plans/custom-component-path.md`
section 1, "the render contract as a Playwright spec in the `create`
template." The reason for deferring, that no consumer component had yet been
held to the runtime contracts, is the reason to do it now: the Slider exercise
showed the static gate passes and the runtime contracts catch the defects.

## Status

| Unit | Summary | Executor | Reviewer | Status | Commit |
|---|---|---|---|---|---|
| 1 | The contract suites move into the shipped tree and open the owned route | Sonnet | Opus | Done | 347eecc |
| 2a | Contract types, shared assertions, two exemplar components, one defect fixture per rule | Opus | Fable | Done | 2a840d1 |
| 2b | Contract mappings and defect fixtures for the remaining shipped components | Sonnet | Opus | Done | 6990eeb |
| 3 | A Playwright config factory and a vitest contract runner ship | Opus | Fable | Done | ac83676 |
| 3b | `src/testing` ships compiled to JavaScript | Sonnet | Opus | Not started | |
| 4 | `check-component --tests` runs the suites and reports by rule | Sonnet | Opus | Not started | |
| 5a | The consumer acceptance gate | Sonnet | Opus | Not started | |
| 5b | Template, skills, atlas, and changelog | Sonnet | Fable | Not started | |

The orchestrator updates this table after each review gate: `Not started` to
`In progress` to `Done` (or `Blocked`, with a one-line reason appended under
the table). Record the short commit SHA.

Waves 1 through 3 add shipped testing infrastructure while preserving the
CLI default. Wave 4 adds the flag and Wave 5 makes the skills use it. If the
run is cut short after Wave 3, the repo is coherent: the suites run here from
their new location, and consumers are unaffected. If it is cut short after
Wave 2a, the two exemplar components carry the full contract and the other
24 keep the migrated render and alias coverage.

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
registry contract test under vitest, then the component contract suites under
Playwright for that one component, and reports every failure as a finding
with a rule id and a line. The skill's Verification is one command. Remove
each manual check only after its acceptance cases prove equivalent
automated coverage. Report any remaining review obligation explicitly.

The suites live in the shipped tree, run here against the library's own demo
app and in a consumer against the consumer's app, and are one copy of each
file. A consumer installs Playwright, vitest, and happy-dom; the CLI finds
all three from the consumer's project and says what to install when one is
missing.

## Design decisions

1. **Opt in by flag, always on in the skill.** `check-component` without
   `--tests` is the lint it is today, so the template's `check:design` script
   and CI runs that lack a browser stay fast and green. The skills pass
   `--tests`. `report` gains no test rows in this plan.
2. **Optional peer dependencies.** `@playwright/test`, `vitest`, and
   `happy-dom` receive supported version ranges in `peerDependencies` and
   optional entries in `peerDependenciesMeta`. The package
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
   `__liveTokensEditor`, carrying `editorState`, `mutate`, `getComponentRegistryEntries`, and
   a component-selection operation. Replace the render suite's import of
   `/src/editor/core/store/editorViewStore.ts` as well. Define the handle's
   frame ownership and readiness contract; remove it on page teardown. Same behavior
   in both repos, no path arithmetic against `node_modules`.
6. **Automatic data isolation.** Resolve the consumer's effective plugin
   `dataDir`, then copy it into a unique temporary directory. Both the test
   processes and the Vite plugin must use that copy. Add a shared test-mode
   override to the plugin if needed; passing an environment variable to the
   tests alone does not redirect server writes. Tests restore a baseline
   between cases. Use one worker for cases sharing a server and theme state.
   Never reuse an existing server that may write the working data tree.
   Cleanup terminates child processes and removes temporary data on success,
   failure, or interruption. Compare source-tree hashes in acceptance tests.
7. **One configuration path, two tool configurations.** Add a documented
   `live-tokens.testing.ts` entry point for shared test settings: Vite config
   path (default `vite.config.ts`), dev command (default `npm run dev`),
   optional port, components route, data-directory override, registry setup
   module, and component contracts. Defaults support the create template.
   Relocated routes and custom server commands use explicit settings.
   The runner resolves settings against the consumer root, selects an
   available local port, creates temporary Playwright and Vitest configs,
   and passes those configs explicitly to the child processes. Consumers
   need no pre-existing Playwright project named `contract`.
   `createPlaywrightConfig` and `createVitestConfig` use this same path.
   Keep tool imports out of the CLI's module initialization.
8. **Findings, not console output.** A failing assertion becomes
   `{ rule, file, line, message }` like every lint finding. The rule ids are
   fixed here so `fix-findings` can map them: `contract-registry`,
   `contract-render`, `contract-alias`, `contract-persist`,
   `contract-theme`, `contract-preview`, `contract-listed`,
   `contract-sketch`, `tests-not-installed`, `tests-setup`, and
   `tests-incomplete`. Preserve reporter assertion locations when available;
   setup failures use the relevant configuration location or a documented
   line-1 fallback. Never invent assertion precision. Include component ID,
   property or part, expected and actual values, and artifact paths in the
   diagnostic context. Keep the existing finding fields compatible.
9. **Version.** A new flag, a new export, and new optional peers are a minor
   bump. Wave 5 records it under `Unreleased`. The release goes through CI
   and is the user's call.

## Coverage and component contracts

Add a typed component contract in the consumer's testing setup. It declares
stable locators for painted parts, editable-property-to-part expectations,
preview states, supported keyboard and pointer actions, expected outcomes,
and Sketch paint expectations. Supply contracts for all shipped components
and scaffold a contract for each new custom component. Derive standard
expectations from registry schemas where possible; require explicit contracts
for component-specific behavior. Contract declarations describe expectations;
the runner performs the actions and observations through shared helpers.

Validate contracts against the registry and preview: every required token,
state, and declared part has coverage, every locator resolves, and interactive
roles have applicable actions. Missing contracts or empty discovery fail.
A noninteractive component can mark interaction checks inapplicable with a
reason. Undeclared or unsupported coverage fails instead of silently skipping.
The initial inventory records the limits of automatic part discovery; mutation
fixtures must prove that omitted required markers and mappings are detected.

JSON under `--tests` includes a coverage section by component and rule, with
passed, failed, inapplicable, disabled, and incomplete statuses. Inapplicable
requires a contract reason. Explicit `--off` settings remain supported and
visible as disabled coverage; they cannot establish a complete pass.
Ordinary exit status respects existing severity overrides. The authoring skill
and release acceptance gate also require complete applicable coverage with no
disabled checks. Setup errors, zero selected targets, unexpected skips,
missing reports, timeouts, and child-process failures produce a nonzero exit.
The runner reconciles expected cases with actual reporter results, including
retries, before claiming completion.

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
   A tarball consumer can run the static CLI with all optional test tools
   absent. The repository unit suite still requires its Vitest runner.
5. **The data tree is untouched.** No wave writes under `src/live-tokens/data/`
   during verification. Tests write only to isolated copies. Run
   `node scripts/check-production-is-default.mjs` at every wave boundary.
6. `npm run check` clean, `npm run test` green, `npm run test:e2e:contract`
   green, and `check:skills`, `check:skill-atlas`, `check:skill-sources`,
   `check:smoke-install` OK at every wave boundary. Wave 5 also runs
   `check:smoke-create` and the new consumer contract acceptance gate.
7. Nothing pushed, tagged, or published by an executor.

## Commit-unit protocol

One unit, one commit. Run the unit's verification green before committing;
never commit red. Commit message `Shipped tests W<n>: <summary>` with the
unit's label as `<n>` (`W2a`, `W5b`) plus the standard co-author trailer. Do
not push, tag, or release. Stop after each unit for review. If reality contradicts this plan (a cited file is missing, a check
pins conflicting behavior), stop and report rather than improvise.

Never stash, reset, or checkout over uncommitted changes.

## Wave 1 — the contract suites move into the shipped tree

**Executor:** Sonnet. **Reviewer:** Opus. The one discovery item is the owned
route's actual frame structure; find it in the running page, then write the
handle's frame ownership and readiness contract from what you found.

**Files.**

- `src/testing/component-render.contract.ts` (from
  `tests/e2e/component-render-contract.spec.ts`)
- `src/testing/component-alias.contract.ts` (from
  `tests/e2e/component-alias-contract.spec.ts`)
- `src/testing/support/editor.ts` (from `tests/e2e/support/editor.ts`)
- `src/editor/pages/ComponentEditorPage.svelte`: expose
  `window.__liveTokensEditor = { editorState, mutate, getComponentRegistryEntries, selectComponent }`
  in dev only, guarded by `import.meta.env.DEV`.
- `playwright.config.ts`: `testDir` stays `./tests/e2e` for the stateful
  suites; add a second project, `contract`, with `testDir: './src/testing'`
  and `testMatch: '**/component-*.contract.ts'`. Keep the registry contract
  exclusive to Vitest and exclude these files from other projects.
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
   named error when the handle is absent. The render contract uses its
   selection operation, with no repo-relative browser imports. Verify the
   owned route's actual frame structure rather than assuming an overlay frame.
4. `discoverDefaultAliases` takes its root from `process.env.LIVE_TOKENS_DATA_DIR`
   with the default `src/live-tokens/data`. The repo's `playwright.config.ts`
   sets it from `LIVE_TOKENS_E2E_DATA_DIR`.

**Verify.** `npm run test:e2e:contract` green for all 26 components.
`check:smoke-install` shows `src/testing/` in the tarball and no `.spec.ts`
in it. Invariants 1, 2, 5, 6.

## Wave 2 — component contracts and assertions

Two commit units. Unit 2a decides the contract shape and proves it; unit 2b
applies it across the catalogue.

### Wave 2a — contract types, assertions, and two exemplars

**Executor:** Opus. **Reviewer:** Fable.

**Files.** `src/testing/component-render.contract.ts`, new
`src/testing/component-editor.contract.ts`, typed contract definitions and
shared assertion helpers under `src/testing/`, contracts for two exemplar
components, and one defect fixture per rule outside the shipped tree.

**Do.** Establish the typed component contracts and coverage inventory above.
Use separate assertions for each obligation, honoring `LIVE_TOKENS_COMPONENT`.
Choose one interactive exemplar with several painted parts and states
(Slider or Toggle) and one noninteractive exemplar (SectionDivider or
Card). Write their contracts in full. The six obligations below hold for
both exemplars at the end of this unit. Every rule id from design decision 8
that a contract can trip must fail once against a defect fixture in this
unit, so 2b has a pattern for each.

1. **Listed.** Assert the entry and correct CUSTOM or system group against the
   actual registry origin. Missing registration fails before preview tests.
2. **Persist and reset.** Exercise every supported persistence value shape
   through controls, including structured values where applicable. Wait for
   disk persistence, reload, and check both roots and the expected rendered
   part. Reset and assert the documented reset baseline. Distinguish runtime
   root defaults, default aliases, and active-theme overrides explicitly;
   use a fixture where those values differ to prove the intended semantics.
3. **Theme projection.** Apply deterministic test themes to the isolated data.
   Resolve expected aliases under each theme and compare both roots and
   mapped rendered properties with those values. Include a changed token,
   an intentionally unchanged token, and a component override. A property
   need not change merely because the theme changes.
4. **Preview and interaction.** Assert the selected state's visual properties
   and semantic state as well as any force-state class. Use the component
   contract's actions: activation for buttons, arrow keys and pointer movement
   for sliders, and the relevant actions for other roles. Verify disabled
   behavior. Test the real runtime instance in the preview, including portals.
5. **Sketch paint.** Assert every expected painted part exists, carries the
   required marker, and uses its expected stroke/fill values in Sketch mode.
   Distinctly colored parts must retain their individual paint. Include SVG,
   pseudo-elements, and portals when the component uses them. On exit, compare
   the relevant computed styles with the pre-toggle baseline.
6. **Property projection.** Strengthen the migrated render suite to check the
   mapped part and property. A change elsewhere in the preview cannot satisfy
   an assertion about the edited property's intended target.

**Verify.** Every applicable obligation passes for both exemplars, and the
migrated render and alias suites stay green for all 26. Add deliberate
defects for each rule: wrong target repaint, broken alias, failed
persistence or Reset, stale theme projection, incorrect preview, broken
keyboard or pointer behavior, missing list entry, missing Sketch part, and
wrong part color. Each defect must fail its expected rule. Keep positive
cases for unchanged theme values and the noninteractive exemplar.
Investigate failures against the documented contract before classifying
them as component or assertion defects; preserve the contract's intended
strength. Invariants 1, 5, 6. Run stateful assertions serially against reset
copies from this unit.

### Wave 2b — contracts for the remaining shipped components

**Executor:** Sonnet. **Reviewer:** Opus.

**Files.** Contract mappings for the 24 shipped components 2a did not cover,
and the remaining defect fixtures outside the shipped tree.

**Do.** Follow the two 2a exemplars. Derive each mapping from the registry
schema where 2a's helpers allow it and declare component-specific behavior
explicitly. Mark interaction checks inapplicable, with a reason, only on
components with no interactive role. Add a defect fixture wherever a
component exercises a part kind 2a's fixtures did not: SVG, pseudo-element,
or portal. Change no helper or contract type; if a component cannot be
expressed with the 2a types, stop and report which one and why.

**Verify.** Every applicable obligation passes for all 26 shipped components.
Each new defect fixture fails its expected rule. Zero undeclared or disabled
coverage in the JSON coverage section. Invariants 1, 5, 6.

## Wave 3 — the config factory and the contract runner ship

**Executor:** Opus. **Reviewer:** Fable. Design decision 6 touches the
plugin's write path; the reviewer confirms that no path from the runner can
write under the consumer's real `dataDir`.

**Files.**

- `src/testing/playwright.ts`: `createPlaywrightConfig(options)`.
- `src/testing/registry.contract.ts`: import an explicit registry setup module
  before selecting entries. The setup module exports the same registration
  definitions the consumer app uses and registers them without mounting the
  app. Update the template and component authoring recipe to share those
  definitions. Importing an editor alone does not register it.
  `discoverComponents()` currently returns IDs, not source paths; retain it
  for target discovery and reconcile its IDs with actual registry entries.
  Resolve custom runtime paths against the consumer and shipped runtime paths
  against the installed package. Pass the effective isolated configs directory
  to `checkRegistryEntry`. Fail on missing requested IDs or empty target sets.
- `src/testing/vitest.ts`: `createVitestConfig(viteConfig)` applying the
  `happy-dom` environment and the inline rules the reference documents.
- `package.json`: exports `./testing` (types and default at `src/testing/index.ts`
  re-exporting the factories and contract types), supported peer ranges and
  optional metadata for `@playwright/test`, `vitest`, and `happy-dom`.
- `references/contract-tests.md`: the consumer recipe becomes "use the
  shipped file through `check-component --tests`; here is the config if you
  run vitest yourself."
- `src/testing/support/editor.ts`: the Wave 1 review left three items here.
  `openOverlayEditor` navigates to `/demo` and clicks a button that exists
  only in this repo, so keep it out of `src/testing/index.ts` or move it back
  under `tests/e2e/support/`. Its `declare global` augmentation of
  `Window.__liveTokensEditor` is what typechecks
  `ComponentEditorPage.svelte`, so move that declaration next to the page and
  import it here. `playwright.config.ts` sets `LIVE_TOKENS_DATA_DIR` from a
  local constant rather than from `LIVE_TOKENS_E2E_DATA_DIR`; the factory
  must not treat the two names as interchangeable.
- Wave 2a's harness reads each component's `default.json` off
  `LIVE_TOKENS_DATA_DIR` in the runner process, the same coupling
  `component-render.contract.ts` carries. The config factory points both at
  the isolated copy.

**Wave 2b review carried these into this unit.**

1. **Timeout budgets.** `playwright.config.ts` sets no `use.actionTimeout`, so
   it defaults to unbounded and a stuck locator waits out the whole test
   timeout while reporting nothing. Set an explicit `actionTimeout` (about
   10s) and `navigationTimeout` in the factory. Pass explicit timeouts to the
   two `page.waitForResponse` calls in `save()` and `reset()`
   (`contractHarness.ts:597,614`). Per-test overrides are scattered across the
   suites today (180s, 60s, 600s); the factory owns the defaults so a consumer
   does not inherit a 600s ceiling with no action timeout under it.
2. **`settle()` returns too early.** `contractHarness.ts:29-35` calls
   `.finish()` on animations and returns before the queued `finish` event and
   the state it flips have run. Reorder it to finish animations, then await a
   frame. This is the root of the ImageLightbox hang that Wave 2b worked
   around by choosing a target immune to the gap.
3. **`fullyParallel: false` is load-bearing.** `--workers=4` parallelizes
   across files, and there are three. `component-editor.contract.ts` carries
   all 208 stateful tests with `describe.serial` per component, which is what
   keeps 26 components' save and reset cycles from interleaving against one
   data tree. `component-render.contract.ts:10` opts into `parallel`
   explicitly. The factory must not turn `fullyParallel` on.
4. **The runner process reads the data tree.** `shippedAliases()`
   (`contractHarness.ts:241-253`) reads `component-configs/<id>/default.json`
   off `LIVE_TOKENS_DATA_DIR` in the runner process for all 26 contracts, and
   `assertInventory` fails with `contract-alias` when it points elsewhere.
   `discoverDefaultAliases` reads the same root. Point the runner process and
   the plugin at the same isolated copy.
5. **`reuseExistingServer: false` plus `prepare:e2e` is the current
   isolation.** Whatever design decision 6 replaces it with must still
   guarantee the dev server never writes the real `dataDir`.

**Do.** Implement the configuration and automatic isolation decisions above,
including the plugin override and cleanup. The repo's own
`playwright.config.ts` and `vitest.config.ts` call the factories, so the factories are exercised by every repo run. The repo's
existing `registryContract.test.ts` over `builtInRegistry` stays as it is.

**Verify.** `npm run test:e2e:contract` and `npm test` green through the
factories. `check:smoke-install` resolves `./testing` off the real tarball.
Invariants 2, 4, 6.

## Wave 3b — `src/testing` ships compiled to JavaScript

**Executor:** Sonnet. **Reviewer:** Opus. Added after the Wave 3 review proved
the shipped consumer path cannot work from TypeScript source.

**The problem.** Node refuses to strip types from a `.ts` file under
`node_modules`, so a consumer's `playwright.config.ts` or `vitest.config.ts`
that imports `@motion-proto/live-tokens/testing` dies with
`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`. Playwright declines to
transform anything under `node_modules`, so a `testDir` pointing at the
shipped `*.contract.ts` suites collects `0 tests in 0 files`.

**The proof.** The Wave 3 reviewer compiled `src/testing` with tsup, installed
it in a fixture consumer, and measured: a consumer `playwright.config.ts`
importing the compiled factory collects **262 tests in 3 files** from
`node_modules`; a consumer `vitest.config.ts` runs `registry.contract.js`
there, 28 passed; and `LIVE_TOKENS_COMPONENT=toggle` against the consumer's own
dev server passed all 12, leaving the consumer's tree byte-identical and no
temp directories behind. `belongsToNodeModules` gates transformation alone.
Collection walks a `testDir` that is itself under `node_modules`, and Node has
nothing to strip from `.js`. The temp-directory copy alternative is
unnecessary.

**Do.** Build `src/testing` to JavaScript with sibling declarations, the way
`dist-plugin` already builds. Externals are `@playwright/test`, `vite`, and
`vitest`, plus the relative imports `registry.contract.ts` makes into
`../editor/component-editor/*` and `../../bin/*`. Five constraints the
reviewer measured:

1. `src/testing/playwright.ts:138` `testMatch: '**/component-*.contract.ts'`
   and `src/testing/vitest.ts:18` `CONTRACT_INCLUDE` must name `.js` in the
   shipped build and `.ts` in this repo, whose own `playwright.config.ts`
   imports the source. Substitute at build time, or use a `{ts,js}` glob with
   the `.ts` sources excluded from `files`.
2. `registry.contract.js` keeps its relative `../editor/...` and
   `../../bin/check-component.mjs` imports, which Vitest transforms under
   `deps.inline`. The `component-*.contract.js` files and the factory inline
   everything else.
3. `CONTRACT_TEST_DIR` (`playwright.ts:23`) is `dirname(import.meta.url)` and
   survives splitting only if the chunks share one flat output directory.
4. **Playwright reports no assertion location under `node_modules`.** The
   Wave 3b review measured this twice: outside `node_modules` a failure
   carries `error.location` even with the `.ts` deleted, and the identical
   compiled file inside `node_modules` returns `undefined` for both an
   `expect()` failure and a bare `throw`, because Playwright filters
   `node_modules` frames out of the stack it derives locations from.
   Sourcemaps do not change it. The only machine-readable location is
   `spec.file` plus `spec.line`, which names the `test()` declaration rather
   than the assertion and maps to a `src/testing/*.ts` path the tarball does
   not contain. Making that path resolve would mean shipping the `.ts`
   sources, which the `{ts,js}` glob turns straight into double collection in
   every consumer. Ship sourcemaps anyway, since they cost nothing and enrich
   the diagnostic context, and anchor findings as Wave 4 states.
5. `build:lib` gains this build. CI runs `npm test` before the build, so
   nothing in the unit suite may import the compiled output.

**Verify.** A fixture consumer outside this repo, built from the real tarball,
collects and runs a shipped contract suite and imports both factories from its
own tool configs. `check:smoke-install` resolves `./testing`. Invariants 4, 6.

## Wave 4 — `check-component --tests`

**Executor:** Sonnet. **Reviewer:** Opus. Isolation, cleanup, and the config
factories come from Wave 3; this unit wires the CLI to them and maps results.

**Files.** `bin/check-component.mjs`, `bin/cli.mjs`, `bin/check-component.test.ts`,
and a new `bin/contractRunner.mjs`.

**The Wave 3 review carried three items into this unit.**

1. **The Vitest half is not isolated.** `createVitestConfig` loads the
   consumer's `vite.config.ts`, so Vitest boots `themeFileApi`'s
   `configureServer` against the real tree. In the reviewer's fixture that
   seeded 26 `default.json` files, `themes/default.json`, both pointers, and
   rewrote `tokens.generated.css`: 30 files. Decision 6 requires the plugin to
   use the copy in both test processes, so the runner sets
   `LIVE_TOKENS_TEST_DATA_DIR` and `LIVE_TOKENS_DATA_DIR` for the Vitest child
   as well. `references/contract-tests.md` should say the standalone recipe
   boots the plugin.
2. **The runner must not call `isolateDataDir` in its own process**, or it
   must own its exit path. `isolation.ts:52-53` registers
   `process.once('SIGINT'|'SIGTERM')`, and in a process with no other SIGINT
   listener a `once` handler swallows the first Ctrl+C.
3. **Read `settings.viteConfig` or delete it.** It is a declared public
   setting with no reader, kept only because this unit generates a Vitest
   config that imports the consumer's Vite config by path.
4. **A finding's `file` and `line` name the consumer's own artifact.** Wave
   3b established that no assertion location survives from a suite running
   under `node_modules`. So `file` is the artifact under test, meaning the
   component's editor or runtime file, or
   `component-configs/<id>/default.json`, with decision 8's documented line-1
   fallback where no consumer artifact exists. The sourcemapped
   `src/testing/*.contract.ts` frame belongs in the diagnostic context and
   never in `file` or `line`, because that path is absent from the tarball and
   a reader cannot open it. Never invent assertion precision.
5. **Consumer contracts are unreachable, and Wave 5a's gate depends on them.**
   `component-editor.contract.ts:6` and `component-render.contract.ts:681`
   call `selectedContracts()` with no argument, so only `shippedContracts`
   runs. `LiveTokensTestingConfig.contracts` is a declared setting with no
   reader, the same shape as `viteConfig`. Static bundling makes an
   environment variable plus a dynamic import the only route. Wave 5a must
   "validate a new custom component there", so this unit opens the path.

**Do.**

1. `parseCheckFlags` accepts `--tests`. `check-component` without it is
   unchanged (invariant 3).
2. `contractRunner.mjs` exports `runContractTests(id, { root })`. Resolve all
   three optional dependencies from the consumer root. Generate explicit
   configs, run the registry and browser suites, and map structured results
   to stable rule IDs. Missing dependencies or Chromium produce installation
   guidance. Server/configuration failures use `tests-setup`.
3. Concatenate lint and runtime findings through `reportChecks`. Add the
   coverage section only with `--tests`; preserve ordinary lint output.
4. Register all rule IDs from the design decisions as errors. Honor explicit
   severity settings while preserving coverage status and hard failures for
   incomplete execution.
5. Test reporter mapping, retry reconciliation, missing tools/browser, bad
   config, failed server startup, malformed or absent reports, zero targets,
   missing registration, unexpected skips, timeout, interruption, and cleanup.
   Mapping tests use fixtures; process and browser acceptance cases exercise
   actual failures. Cover both one ID and omitted-ID batch discovery.

**Verify.** `npx live-tokens check-component toggle --tests --json` here
exits 0 and lists no findings. Break one alias in a scratch copy of a
component config and see a `contract-alias` finding with a line. The static
CLI runs in a consumer without optional test tools; the unit suite runs with Vitest installed. Invariants 3, 4, 6.

## Wave 5 — consumer acceptance and authoring workflow

Two commit units. Unit 5a proves the shipped path from a tarball; unit 5b
moves the template, skills, atlas, and changelog onto it. 5a runs first so
the skill edits in 5b cite a gate that exists.

### Wave 5a — the consumer acceptance gate

**Executor:** Sonnet. **Reviewer:** Opus. Extend the pattern of
`scripts/smoke-install.sh` and `scripts/smoke-create.sh`.

**Files.** A new `scripts/smoke-component-tests.sh`, its fixture project
sources under `scripts/`, the `check:smoke-component-tests` script, and the
CI workflow step.

**The gate installs a real tarball, always.** A symlinked or `file:<dir>`
install cannot run the shipped suites: two copies of `@playwright/test` give
"Requiring @playwright/test second time" and `0 tests in 0 files`. The source
layout fails the same way, so this is a property of the tool rather than a
regression to fix.

`.github/workflows/publish.yml:73` runs `npm pack --dry-run` before anything
builds, so it covers neither `src/testing-js` nor `dist-plugin`.
`prepublishOnly` covers the real publish, so no release can ship a missing
`./testing`. Only that step's advertised coverage is overstated.

**Consumer gate.** Add `check:smoke-component-tests` to CI before release.
Pack the built package and install it into a fresh temporary project outside
this repo. Use only tarball exports and the documented setup. Exercise:

- A custom interactive component with several painted parts and states.
- One shipped component through the same consumer command.
- Default configuration and relocated route/data-directory configuration.
- Single-ID and batch commands, with explicit coverage counts.
- The Wave 2 defect fixtures, with exact expected rule IDs.
- Missing setup, zero targets, and representative process failures.
- Source-data hashes before and after passing, failing, and interrupted runs.

The fixture must not resolve imports or tools from the library checkout.
Run the fresh create-template case as well as the explicit custom setup case.
The create-template case uses the template as it stands before 5b; 5b reruns
the gate after its template edits.

**Verify.** `check:smoke-component-tests` green, `check:smoke-install` and
`npm test` green. Invariants 5, 6, 7.

### Wave 5b — template, skills, atlas, and changelog

**Executor:** Sonnet. **Reviewer:** Fable. The reviewer reads every edited
skill line against the writing rules and checks each atlas card's title
against its chip labels.

**Files.**

- `template/package.json`: `check:design` unchanged; a new script
  `test:design` runs `live-tokens check-component --tests`; the README names
  the dependency install and Chromium install needed to enable it. Generate
  the shared registry setup and testing configuration from Wave 3.
- `.claude/skills/live-tokens-create-component/SKILL.md`: Workflow step 6
  becomes "Run **live-tokens-check-compliance**, then
  `npx live-tokens check-component <id> --tests --strict --json` until exit
  0 with complete applicable coverage, then the Svelte check and the build."
  Replace Step 7 and Verification step 4 only after the acceptance matrix
  proves equivalent coverage. Retain any outstanding review obligation.
  Remove Verification step 3 once the runner covers its registry contract. The rule table gains the
  contract and runner rule rows, each mapped to the
  section that fixes it. The file must stay under 250 lines
  (`check:skills`).
- `.claude/skills/live-tokens-fix-findings/SKILL.md`: the rule table it
  keeps gains the same rows, each mapped to the section of create-component
  that fixes it. Add setup and coverage repair guidance for runner failures.
- `.claude/skills/live-tokens-create-component/references/contract-tests.md`:
  line 10 still calls `src/testing/registry.contract.ts` "the shipped file".
  The shipped file is `src/testing-js/registry.contract.js`; the `.ts` path is
  absent from the tarball.
- `.claude/skills/live-tokens-check-compliance/SKILL.md`: one sentence that
  `report` does not run the tests and that `check-component --tests` does.
- `src/editor/skill-atlas/trees/create-component.ts`: the "Check the
  component in the editor" card follows the resulting review scope;
  "Run the checks" keeps its
  badges with "Contract test" replaced by "Component tests" pointing at the
  new Workflow line. `fix-findings.ts` re-anchors after its table grows.
- `src/editor/skill-atlas/trees/pick-component.ts`: repair handoff references
  if the baseline still reports missing skills.
- `CHANGELOG.md` under `Unreleased`: the flag, the export, the optional
  peers, coverage reporting, and the revised verification workflow.

**Do.** After every skill edit run `npm run sync:skill-atlas` and
`npm run sync:skill-sources`. Rebuild the create-component tree from the new
line numbers: every card cites its Workflow line and
its badges cite the sections.

**Verify.** `check:skills`, `check:skill-atlas` (the full run, now clean),
`check:skill-sources`, `check:smoke-create`, `check:smoke-component-tests`, and `npm test` green.
Invariants 6 and 7.

### Follow-up decisions

- Whether `report` should carry a test row per component, so
  check-compliance sees test results without a browser run of its own.
- Whether the `create` template installs Playwright by default. This plan
  leaves it opt-in and documented.
- An additional run against `../live-tokens-online` after release. The
  tarball consumer gate already proves the shipped path before release.
- **Theme-embedded component configs are re-migrated from version 0.**
  `src/editor/core/preview/themePreview.ts:52` and `:56` pass
  `config.schemaVersion`, a field `normalizeTheme.ts:179` strips from
  theme-embedded configs. `ComponentConfig.schemaVersion` is optional, so it
  typechecks, reads `undefined`, and `toComponentSlice` defaults it to `0`.
  `editorStore.ts:338` repeats the `?? 0`. Every theme preview and every theme
  apply re-runs all 27 component migrations over current data. The tabbar pair
  is non-idempotent, so
  `2026-05-29-tabbar-indicator-thickness-to-per-state-width` re-adds the token
  at the `--border-width-2` fallback and `2026-09-07-stroke-role-renames`
  renames it over halloween's `--border-width-4`. The fix passes
  `theme.componentSchemaVersion` and `defaults.componentSchemaVersion`. Today
  this costs four tabbar tokens in every theme. The defect class is any future
  non-idempotent migration.
- **Card's hover gate is invisible in the editor.** `Card.svelte:154-155` is
  the only rule reading `--card-hover-{border,shadow}-enabled`, and `:159-161`
  paints `.card.force-hover` from the unconditional tokens by design. The
  editor's hover preview shows the on state while the global "Use hover" gate
  is off.
- **Three shipped components are undrawn in Sketch mode.** `sketchLayer.ts`
  `PART_SPECS` has no entry for `imagelightbox`, `radiobutton`, or
  `inlineeditactions`. The three `sketch: { applicable: false }` contract
  reasons are accurate; the gap is in the product.
- **CollapsibleSection's header carries no interactive role.**
  `CollapsibleSection.svelte:71-72` is a `<div onclick>` behind three
  `svelte-ignore a11y_*` directives. The component is functionally interactive.
- **`assertNoSketchPaint` misreads icon fonts and ignores `pseudo`.**
  `contractHarness.ts:795-810` treats any `::before` `content` other than
  `'none'` as drawn, so a Font Awesome `<i>` always reads as drawn, and it
  evaluates `::before` on the host even for a part declared with
  `pseudo: 'after'`. Fix it before more sketch-inapplicable contracts land.
- The sticky preview band in
  `src/editor/component-editor/scaffolding/VariantGroup.svelte` has no
  `max-height`. It reaches 697px and covers the property controls at a 720px
  viewport for at least Image, SideNavigation, Card, ImageLightbox,
  CornerBadge, Notification, Table, Input, and Button. Wave 1 raised the
  `contract` project's viewport to 1280x900 to clear it, a number tuned to
  today's tallest preview. The fix is a `max-height` with `overflow: auto` on
  `.tabs-preview`, or a scroll container for the property panel. A later wave
  that hits this must repair the CSS instead of raising the viewport again,
  and `playwright.config.ts`'s viewport comment should name the defect.
