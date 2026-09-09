# Shipped component validation

**Complete.** All eight units landed on branch `shipped-component-tests` on
2026-09-09, from W1 at 02:40 to W5b at 15:58, followed by the defect fixes and
Sketch work recorded below. Merged to `main` and released as 0.75.0 on
2026-09-09. The per-wave briefings this document carried during execution are
gone; the commits and the defect register hold that history.

## Status

| Unit | Summary | Status | Commit |
|---|---|---|---|
| 1 | The contract suites move into the shipped tree and open the owned route | Done | 347eecc |
| 2a | Contract types, shared assertions, two exemplar components, one defect fixture per rule | Done | 2a840d1 |
| 2b | Contract mappings and defect fixtures for the remaining shipped components | Done | 6990eeb |
| 3 | A Playwright config factory and a vitest contract runner ship | Done | ac83676 |
| 3b | `src/testing` ships compiled to JavaScript | Done | 50a268a |
| 4 | `check-component --tests` runs the suites and reports by rule | Done | 7cd201d |
| 5a | The consumer acceptance gate | Done | 58873de |
| 5b | Template, skills, atlas, and changelog | Done | 90f20bc |

After W5b, thirteen commits through ab432e7 fixed fourteen of the sixteen
defects the waves exposed, drew InlineEditActions, ImageLightbox, and
RadioButton in Sketch mode, split `contract-preview` into `contract-states`
and `contract-interaction`, and wrote the next plan,
[sketch-consolidation](sketch-consolidation.md).

**Verification after the last commit (2026-09-09, evening).**

| Gate | Result |
|---|---|
| `npm run check` | 0 errors, 0 warnings |
| `npm test` | 4549 passed, 123 files, 41s |
| `npm run test:e2e:contract` | 262 passed, 2.8 min |
| `check:skills`, `check:skill-atlas`, `check:skill-sources` | OK |
| `check:production-is-default` | OK |
| `check:smoke-install` | OK, 9s |
| `check:smoke-create` | OK, 8s |
| `check:smoke-component-tests` | OK, 2m41s |

## What shipped

`live-tokens-create-component` used to end with a human in the browser
confirming seven lines by eye at `/live-tokens/components`. The contract
suites that could have done it lived in `tests/e2e/`, opened the repo's demo
page, imported the store by a repo-relative path, and never left this
repository.

Now `npx live-tokens check-component <id> --tests` runs the lint, then the
registry contract under vitest, then the component contract suites under
Playwright for that one component, and reports every failure as a finding
with a rule id and a line. The skill's Verification is that one command. The
suites live once, under `src/testing/`, ship compiled to `src/testing-js/`,
run here against the library's own demo app and in a consumer against the
consumer's app. A consumer installs Playwright, vitest, and happy-dom; the CLI
finds all three from the consumer's project and names what to install when
one is missing.

Page composition and runtime page checks belong to
[shipped page validation](shipped-page-validation.md), which reuses the
server startup, data isolation, tool resolution, findings, coverage
reporting, and tarball fixtures built here.

## Design decisions, as built

1. **Opt in by flag, always on in the skill.** `check-component` without
   `--tests` is the static lint, byte-identical to before, so the template's
   `check:design` script and CI runs without a browser stay fast and green.
   The skills pass `--tests`. `report` carries no test rows.
2. **Optional peer dependencies.** `@playwright/test`, `vitest`, and
   `happy-dom` have supported ranges in `peerDependencies` and optional
   entries in `peerDependenciesMeta`. A missing one is a finding, rule
   `tests-not-installed`, whose message is the install command plus
   `npx playwright install chromium`. It is an error under `--tests`, never a
   silent skip.
3. **Location.** Suites, support module, config factories, and the registry
   contract live under `src/testing/` as `*.contract.ts`. The `!**/*.spec.ts`
   and `!**/*.test.ts` exclusions stay. The stateful editor suites
   (`live-editing`, `theme-workflow`) stay in `tests/e2e/` and do not ship.
4. **Navigation by owned route.** The suites go to `DEFAULT_COMPONENTS_PATH`
   from `src/editor/core/routing/ownedRoutes.ts` and wait for the editor page.
   A consumer who relocated the route passes the path to the config factory.
5. **The store handle.** The components editor page exposes
   `window.__liveTokensEditor` in dev only, carrying `editorState`, `mutate`,
   `getComponentRegistryEntries`, and `selectComponent`, and removes it on
   teardown. No suite imports a repo path.
6. **Automatic data isolation.** The runner resolves the consumer's effective
   `dataDir`, copies it into a unique temporary directory, and points both
   the test processes and the Vite plugin at the copy through
   `LIVE_TOKENS_TEST_DATA_DIR` and `LIVE_TOKENS_DATA_DIR`. One worker serves
   cases that share a server and theme state. No existing server is reused.
   Cleanup terminates child processes and removes the copy on success,
   failure, or interruption. The consumer gate proves it with source-tree
   hashes.
7. **One configuration path, two tool configurations.**
   `live-tokens.testing.ts` holds the shared settings: Vite config path, dev
   command, optional port, components route, data-directory override,
   registry setup module, and component contracts. `createPlaywrightConfig`
   and `createVitestConfig` read it; the repo's own `playwright.config.ts`
   and `vitest.config.ts` call the same factories, so every repo run
   exercises the shipped path. The runner generates explicit temporary
   configs and passes them to the child processes.
8. **Findings, not console output.** A failing assertion becomes
   `{ rule, file, line, message }`. The rule ids: `contract-registry`,
   `contract-render`, `contract-alias`, `contract-persist`, `contract-theme`,
   `contract-states`, `contract-interaction`, `contract-listed`,
   `contract-sketch`, `tests-not-installed`, `tests-setup`, and
   `tests-incomplete`. `file` and `line` name the consumer's own artifact:
   the component's editor or runtime file, or
   `component-configs/<id>/default.json`, with a documented line-1 fallback.
   Each finding carries its fix location, so the skills keep no rule table of
   their own.
9. **Version.** A new flag, a new export, and new optional peers are a minor
   bump, recorded under `Unreleased` in `CHANGELOG.md`.

## Coverage and component contracts

Every shipped component has a typed contract under `src/testing/contracts/`
declaring stable locators for painted parts, property-to-part expectations,
preview states, supported keyboard and pointer actions, expected outcomes,
and Sketch paint expectations. A custom component supplies its own through
the `contracts` setting. The runner validates each contract against the
registry and preview: every required token, state, and declared part has
coverage, every locator resolves, and interactive roles have applicable
actions. A missing contract fails. A noninteractive component marks
interaction checks inapplicable with a reason.

JSON under `--tests` includes a coverage section by component and rule with
`passed`, `failed`, `inapplicable`, `disabled`, and `incomplete` statuses.
Explicit `--off` settings show as `disabled` and cannot establish a complete
pass. Setup errors, zero selected targets, unexpected skips, missing reports,
timeouts, and child-process failures exit nonzero. The runner reconciles
expected cases with reporter results, including retries, before claiming
completion.

## Invariants

These held at every wave boundary and remain the reviewer checklist for any
change to the testing tree.

1. **One copy of each suite.** No spec under `tests/e2e/` duplicates a file
   under `src/testing/`.
2. **Shipped code imports shipped code.** Nothing under `src/testing/`
   imports from `src/app/` or `tests/`.
3. **The lint is unchanged without the flag.**
4. **Nothing loads a test tool at module top.** `bin/cli.mjs` and
   `bin/check-component.mjs` import neither `@playwright/test` nor `vitest`.
   The generated Vitest config imports `./testing/vitest`, never the barrel,
   which pulls `@playwright/test`.
5. **The data tree is untouched.** Tests write only to isolated copies.
   `node scripts/check-production-is-default.mjs` proves it.
6. `npm run check`, `npm test`, `npm run test:e2e:contract`, `check:skills`,
   `check:skill-atlas`, `check:skill-sources`, `check:smoke-install`,
   `check:smoke-create`, and `check:smoke-component-tests` green.
7. Nothing pushed, tagged, or published by an executor.

## Facts the waves measured

Each of these cost a review cycle. They explain shapes in the code that would
otherwise read as arbitrary.

- **Playwright reports no assertion location under `node_modules`.** It
  filters those frames from the stack it derives locations from, and
  sourcemaps do not change it. So findings anchor on the consumer's artifact,
  and the sourcemapped `src/testing/*.contract.ts` frame stays in the
  diagnostic context.
- **The consumer gate installs a real tarball, always.** A symlink or
  `file:<dir>` install gives two copies of `@playwright/test`, "Requiring
  @playwright/test second time", and `0 tests in 0 files`.
- **No omitted-id `--tests` batch in the gate.** A 27-component run cost 729
  of the gate's 800 seconds and re-proved what `test:e2e:contract` covers
  here in 2.5 minutes. The gate runs single-id `beacon` and `toggle`
  scenarios across the tarball boundary and finishes in about 3 minutes.
- **`fullyParallel: false` is load-bearing.** The editor suite carries the
  stateful tests with `describe.serial` per component; that is what keeps
  26 components' save and reset cycles from interleaving on one data tree.
- **The settings resolver scrapes source text for `dataDir`.** Only a plain
  quoted string works. A template literal, a computed value, or a commented
  `dataDir:` example copies the wrong tree. The template's generated
  `live-tokens.testing.ts` carries no commented example for that reason.
- **`contract-alias` from the catalogue-wide fan-out test attributes to
  `package.json:1`** with no coverage entry, because that test ignores
  `LIVE_TOKENS_COMPONENT`. One broken shipped alias fails every component's
  check.
- **`EDITOR_SUITE_POSITIONAL_RULES` in `bin/check-component.test.ts` pins
  the rule sequence** to the editor suite's `harness.assertX()` calls.
  Reordering, inserting, or deleting a `test()` there needs the same commit
  to update it. Rewording titles is free.
- **`publish.yml`'s `npm pack --dry-run` runs before anything builds**, so it
  covers neither `src/testing-js` nor `dist-plugin`. `prepublishOnly` covers
  the real publish.
- **The two real-browser round trips in the unit suite skip on CI**, which
  has no Chromium when `npm test` runs. `check:smoke-component-tests` is the
  only CI-run proof of the whole path.

## Open items

None blocks merge or release.

**Consumer gate follow-ups the Wave 5a review measured.**

1. `componentGate.mjs` overstates the decoy proof in its comment: hash
   equality shows the tree was not written; the real proof is the clean pass
   exiting 0.
2. `expectSketchInapplicable` is never passed `false` and its message
   hardcodes `beacon:` regardless of the id.
3. `--off` is never exercised in a consumer, so "a disabled check cannot
   establish a complete pass" stays unproven across the tarball boundary.
4. `tsconfig.json` includes only `src/**`, so the fixture sources sit outside
   `npm run check`. A change to `Token`, `ComponentContract`, or
   `registerComponent`'s signature surfaces only when the gate runs, as a
   collection failure.
5. `componentGate.mjs` rewrites the template's `main.ts` by literal string
   match. Assert that each replacement changed the file.

**Defects still open** in [contract-test-defects](../contract-test-defects.md):
the sticky preview band can still cover a control at 1280x720, so the
`contract` project runs at 1280x900; and a portalled part cannot be tested for
Sketch paint, so `imagelightbox` asserts its thumb alone.

**Decisions deferred.**

- Whether `report` should carry a test row per component, so
  check-compliance sees test results without a browser run of its own.
- Whether the `create` template installs Playwright by default. It stays
  opt-in and documented.
- A run against `../live-tokens-online` after release.

**Next.** [sketch-consolidation](sketch-consolidation.md), which moves the
shipped components onto the reserved Sketch classes the contract suite now
guards.
