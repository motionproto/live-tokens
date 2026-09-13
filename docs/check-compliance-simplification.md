# Check-compliance simplification

**Execution model.** The plan runs unattended as a Workflow with a heartbeat
monitor. See Execution below. Each wave is one `wave-executor` on the model the Status table names,
reviewed by one `wave-reviewer` on Opus. Sonnet takes the waves whose
definition of done is a listed fixture or an existing pattern. Opus takes the
two waves that decide, per finding and per component, what code can establish
on its own.

## Goal and scope

Move the judgments the check-compliance skill makes today into code. After
this plan, one run of `npx live-tokens report --json` carries every finding,
each with its repair kind and the details a repair needs, and the skill
presents them. A component's declared behavior is proven under Vitest in
milliseconds. The browser proves only what a browser can: paint, persistence,
theme projection, and Sketch.

The base token names form a fixed vocabulary. Components declare semantic
properties, assign tokens to those properties, and consume them in their CSS.
Changing an assignment is normal operation. The contract covers three
relationships, and each pass below owns one:

1. Property names and assignments conform to the vocabulary and the supported
   composition forms. Plain Node proves this on every run.
2. Runtime declarations, editor schemas, saved assignments, and registration
   agree. Plain Node proves the source-level half on every run; Vitest proves
   the evaluated schema and the store round-trip under `--tests`.
3. Each component performs its declared behavior, and each property drives
   its intended rendered part. Vitest proves behavior under `--tests`;
   Playwright proves paint under `--tests`.

In scope: `bin/check-component.mjs`, `bin/check-page.mjs`, `bin/lib/report.mjs`,
`bin/lib/findings.mjs`, `bin/lib/tokenVocabulary.mjs`, `bin/contractRunner.mjs`,
`src/testing/`, the two compliance skills, and the create-component
references that describe contracts. Page compliance keeps its rules and its
`--tests` run unchanged; it gains the same finding fields every other rule
gains.

Out of scope: application process flows, moving catalogue descriptions into
the registry (see Deferred), and `report --tests`.

## Status

| Wave | Deliverable | Lane | Model | Budget | Status | Commit |
|---|---|---|---|---|---|---|
| 1 | One component inventory, and `config-token` | main | Sonnet | 90 min | Done | 6a019ce |
| 2 | Findings carry their repair; `unread-token` and `missing-description`; the report JSON contract | main | Opus | 120 min | Done | 0471d27, 4ccf66d |
| 3 | Behavior contracts under Vitest; `contract-preview` retired | B | Opus | 120 min | Done | 8faacb3 |
| 4 | Merge lane B; `contract-behavior` through the CLI and the gate | main | Sonnet | 60 min | Done | 8fe7671, 31862df, 57b6f86 |
| 5 | Guarded fixers behind `--fix` | main | Sonnet | 120 min | Done | 8393412, e79c5d2, 34c4917, fc81a6a, 2e90575, ea501eb, aa2bdf8, c356963, bfd2a16, 7531ca6, 6126023 |
| 6 | Skills, references, docs, atlas, changelog | main | Sonnet | 90 min | In progress | 22e9a15 |
| 7 | The static checkers read what this plan says they read | main | Sonnet | 90 min | In progress | 863c833 |
| 8 | One defect, one finding under `--tests`; a deterministic page test | main | Opus | 120 min | In progress | |

**Run of 2026-09-13.** Waves 1 to 4 approved. Wave 5 stopped `incomplete`
on Fable after two BLOCK reviews (Sonnet, then Opus) and one Fable repair;
the ladder is exhausted. Every gate is green at aa2bdf8, including
`test:e2e:contract` (262 passed), which the Fable executor had not confirmed.
Its review gate was rerun the same day with `reviewOnly: true` and model
Fable; that review blocked, its Fable repair landed c356963, the re-review
blocked on `<Card size = "small" />`, and the guard it named landed by hand
as bfd2a16 with the gate rerun once more. A further Fable review blocked on
the component-side `deep-import` patch and on `declarationDeletion`; its
Fable repair landed 7531ca6. Waves 7 and 8 were added the same
day from the findings the reviews carried forward; Wave 6 gained the prose
those findings owe. The next orchestrator starts at the first row not Done.

## Execution

The `workflow-execution` skill, user-level, runs the plan from the Status
table, arms the heartbeat monitor, and stops with a resume point when a wave
cannot be approved. Start it from a fresh session with:

```
/workflow-execution docs/check-compliance-simplification.md
```

The commit prefix is `Compliance W` from the Commit-unit protocol and the
heartbeat slug is `check-compliance-simplification` from the file name. The
longest background command in the plan is the consumer gate,
`check:smoke-component-tests`, at thirteen minutes. Any command that may pass
ten minutes runs in the background. No agent polls, sleeps in a loop, or greps
the process table for its own pattern.

**Lanes.** The Lane column names two. Lane `main` runs in the working tree,
wave after wave. Lane `B` holds Wave 3, the one wave whose files sit under
`src/testing/`, `tests/e2e/`, and `tsup.testing.config.ts` and nowhere
Waves 1 and 2 write, so it runs beside them. Its executor works in a
worktree: `git worktree add scratch/worktrees/B -b
check-compliance-simplification-lane-B main`, then `npm ci` and `npm run
build:lib` there, then every command from that directory, committing on that
branch. Its heartbeat file is the absolute path its prompt names, inside the
working tree's `scratch/`, so the monitor sees it. Its reviewer reads
`git log check-compliance-simplification-lane-B --grep` and runs the gates
in the worktree. Wave 4 merges the branch into the working tree and removes
the worktree before its own work. Waves 4 to 6 wait for both lanes and run in
order, since each reads the one before. The lane saves two hours of the
plan's ten hours of budget. Without the lane extension to the workflow
script, the same table runs sequentially in the working tree, Wave 3 after
Wave 2, and Wave 4's merge step finds no branch and skips itself.

**Operators.** Sonnet takes the waves whose definition of done is a listed
fixture or an existing pattern: 1, 4, 5, 6, and 7. Opus takes 2, 3, and 8,
which decide per finding and per component what code can establish on its
own. The reviewer is Opus.

**Escalation.** An executor that returns `incomplete` or `blocked`, dies, or
stays blocked after its one repair pass is rerun on the next model up the
ladder Sonnet, Opus, Fable, with a fresh budget and the resume point or the
review's findings in its prompt. A wave that reaches Fable is reviewed by
Fable. After Fable the run stops with the resume point.

## Current behavior

Measured on 0.78.0 in this repository, 26 shipped components, 5 pages:

| Run | Wall clock | Scope |
|---|---|---|
| `npx live-tokens report --json` | 1.5 s | Node start, `migrate --check`, both static checkers |
| Static `checkComponent`, all 26 | 335 ms | The 17 static rules, measured before this plan |
| `check-component toggle --tests --json` | 13.9 s | Registry suite under Vitest, then the Playwright leg with its dev server; nine obligations passed |
| Registry suite alone | 2.0 s | Vitest start, Svelte transforms, 28 assertions in 10 ms |
| The catalogue batch through the CLI | 729 s | One worker (`createPlaywrightConfig` sets `workers: 1`); CI runs `test:e2e:contract` on four |

**The skill today.** `live-tokens-check-compliance` makes one required call
and two kinds of follow-up. It runs `report --json`. It runs `components <id>`
or `tokens --scale <name>` when a finding needs details. It runs `report` a
second time to confirm three facts the checker loop never reports: unread
properties, missing description comments, and unregistered project
components. It then classifies each finding as Mechanical, Judgement, or
Deliberate, names the visible shift a geometry repair causes, and orders the
fix list. Code can supply all of that except the choice of a color role, the
meaning of an unknown prop, and the user's decision to record an exception.

**What is inconsistent today**, each verified against the source:

1. `bin/lib/report.mjs` computes `unread`, `described`, and
   `customUnregistered` as component facts. None is a rule, so none carries a
   severity, a fix slug, or a line, and `--strict` never sees them.
2. Two inventories disagree. `loadVocabulary` honours `componentDirs` in
   `live-tokens.config.json`; `discoverComponents` and `resolveComponentPaths`
   read `src/system/components` only. So `report.components` can list a
   component that `report.findings.components.checked` never checked.
   `discoverComponents` also requires an editor file, so a deleted editor
   drops its component from the batch and `missing-file` never fires.
3. `COMPONENT_RULE_FIX` maps every component rule to a fix slug and
   `bin/check-component.test.ts` pins it to `COMPONENT_RULES`. `PAGE_RULES`
   has no fix map; the fix-findings skill carries a hand-written table for
   page rules instead.
4. `summarise` in `report.mjs` calls `applySeverity` with no fix map and keeps
   only rule, severity, file, line, and message. The fix slug the CLI attaches
   under `check-component --json` never reaches `report --json`.
5. The `dimension-literal` message names four scales. The checker knows the
   property (`tokenSuffix` on the component side, the CSS property behind
   `THEMED_GEOMETRY` on the page side) and `describeTokens` already reads
   every scale's values, so the candidates and the pixel shift are computable.
6. `src/testing/support/contractHarness.ts` throws `contract-preview` for
   every state and interaction failure (fifteen sites). `bin/contractRunner.mjs`
   takes the rule in a `ContractViolation` message over the positional rule,
   so such a finding reaches the CLI as `contract-preview`, a rule neither
   `COMPONENT_RULES` nor `COMPONENT_RULE_FIX` names. It resolves to `error`
   through the `?? 'error'` default, carries no fix slug, cannot be turned
   off by its real name, and leaves `contract-states` or
   `contract-interaction` reading `incomplete` in coverage. Five fixtures in
   `tests/e2e/contract-defects/contract-defects.spec.ts` expect the drifted
   id. `ContractRule` in `src/testing/componentContract.ts` names
   `contract-preview` and omits the two real rules.
7. Behavior is untested where the editor preview cannot express it.
   `Toggle.svelte` is controlled: `onclick` calls `onchange?.(!checked)` and
   never flips `checked`. `ToggleEditor.svelte` drives `checked` from the
   state tab without wiring `onchange`, so the contract's interaction cases
   assert focus and omit activation, and the comment in
   `src/testing/contracts/toggle.ts` says so. Fourteen of the 26 shipped
   components carry a callback prop. No test under
   `src/system/components/__tests__/` observes one.
8. No saved assignment is validated without a browser. `checkRegistryEntry`
   proves every editable token has a seed in `default.json`; only the
   Playwright `assertAliasesResolve` proves the seed names a real token.

**What already exists and stays.** `unreadTokens` in `report.mjs` handles
`var()` reads, `style:` directives, padding mixins, SCSS interpolation, and
per-side names through their parent, with tests. `checkRegistryEntry` in
`src/editor/component-editor/contract.ts` checks uniqueness, runtime
declarations, default seeds, opacity floors, and a `setComponentAlias` store
round-trip. The eight Playwright obligations and the `contract-defects`
project prove paint, persistence, theme, Sketch, and that a known fault
produces its finding. `src/system/components/__tests__/` already mounts
shipped components under happy-dom with `mount` from `svelte` and dispatches
DOM events (`sideNavigationLabelToggle.test.ts`, `slotProse.test.ts`), which
is the pattern Wave 3 ships.

## Reserved judgment calls (already decided, do not re-litigate)

1. **One report, three skill steps.** `report --json` is the whole input to
   check-compliance: run it, present it in its own order, hand the chosen
   scope to fix-findings. `components <id>` and `tokens --scale <name>` stay
   for the authoring and repair skills. A finding the skill cannot explain
   from the JSON is a reporting gap, fixed in code.
2. **Every finding carries `fix`, `repair`, and `details`.** `fix` is the
   existing slug. `repair` is `auto`, `choice`, or `authored`. The rule's
   default is the ceiling: a finding may lower it to `choice` when its
   context is ambiguous. `details` is a per-rule object (the table under The
   rules). The skill's Mechanical and Judgement classes are `auto` and
   `choice`. Deliberate is the user's decision about any finding, so every
   finding names its `exception`, the config entry that records that
   decision. The rule id says which pass produced a finding, so there is no
   `tier` field.
3. **Report-only facts become rules.** `unread-token` and
   `missing-description`, both `warn`, both in `check-component`. Unregistered
   project components collapse into the existing `missing-registration` once
   the inventory covers `componentDirs`. Usage counts stay information. A
   page that renders no catalogue component stays a fact in `usage`;
   `native-control` reports the actionable case.
4. **One inventory.** `componentInventory(root)` is the single scan. It
   returns every runtime under `src/system/components` and every configured
   `componentDirs` entry, plus every registered id, each with `id`, `Id`,
   `origin`, `runtimePath`, `editorPath`, `registered`, and whether each path
   exists. `origin` is `shipped` when `builtInIds` holds the id and `custom`
   otherwise. It lives in `bin/lib/tokenVocabulary.mjs` beside `builtInIds`
   and `registeredIds`, which it reads. Incomplete entries stay in the
   list so a missing runtime or editor is a `missing-file` finding. Every
   caller reads it: `report`, the `check-component` batch,
   `resolveComponentPaths`, `runContractTests`, `registry.contract.ts`, and
   the `components` verb.
5. **Saved assignments are validated statically.** `config-token`, `error`,
   in `check-component`: every `--name` inside an alias string in
   `component-configs/<id>/default.json` is a design token or one of the
   component's own properties, whatever wraps it (`var()`, the opacity form
   the editor writes). A string with no `--name` is allowed only for a
   property the editor declares in `intrinsics`. Read as data with the
   vocabulary's `knows`, with no engine import.
6. **Behavior runs under Vitest.** `behavior` joins `ComponentContract` as
   `BehaviorExpectation | Inapplicable`. A shipped Vitest suite mounts the
   runtime under happy-dom by the registry entry's `sourceFile`, drives the
   declared cases with DOM events, and throws `ContractViolation` under the
   new rule `contract-behavior`. The browser suites keep listing, editor
   preview, paint, persistence, theme, and Sketch, and no browser obligation
   duplicates a behavior case. Keyboard activation of a native `<button>`
   holds by construction and needs no case.
7. **`contract-preview` is retired.** The harness throws `contract-states`
   from `assertStates` and `contract-interaction` from `assertInteraction`.
   `ContractRule` names both and drops `contract-preview`. The five defect
   fixtures expect the real ids.
8. **Four fixers, named preconditions.** `deep-import` when the specifier is
   `@motion-proto/live-tokens/src/system/components/<Name>.svelte`, rewritten
   to `/components/<Name>.svelte`; `dimension-literal` when every literal in
   the declaration resolves on the property's scale to one nearest step
   (a tie is `choice`); `control-size` and `property-override` by deleting
   the site the finding names, except a `setProperty` call, which is
   `authored`. A property-name repair is `authored`: the references live in
   the editor, `default.json`, eight preset themes, and a config migration.
9. **No browser validation record.** Selection is by id: the skills pass one
   id, `runContractTests(id)` runs one component, and a consumer's batch is
   their own components only, since shipped runtimes sit in `node_modules`
   where no inventory looks. The batch this repository runs is
   `test:e2e:contract` on four workers. Coverage decides completeness, which
   `reconcileCoverage` already does.
10. **Version.** New rules, new finding fields, a new contract obligation, and
    a `--fix` flag are a minor bump under `Unreleased`. `behavior` is a
    required field, so a consumer's `tests/contracts.ts` stops compiling
    until it declares one or marks it inapplicable; the changelog says so
    with the one-line fix.

## Global invariants (reviewer checklist)

1. **The static lint is unchanged except for the new rules.** `check-page`
   and `check-component` without `--fix` produce the same findings as `main`
   for every existing fixture; the only additions are `unread-token`,
   `missing-description`, and `config-token` findings and the new fields.
2. **Nothing loads a test tool or the compiled engine at module top.**
   `bin/engineLoadsLazily.test.ts` stays green with `dist-plugin/` moved
   aside. The checkers keep reading source as text.
3. **The data tree is untouched.** Tests write only to the isolated copy.
   `node scripts/check-production-is-default.mjs` at every wave boundary.
4. **One inventory.** After Wave 1 no second directory scan for components
   survives under `bin/` or `src/testing/`.
5. **`--fix` edits only the file a finding names.** `tokens.css` and the
   data tree are untouched, and applying it twice changes nothing the second
   time.
6. **A rule id is threaded everywhere or nowhere.** Each id appears in its
   rule table and fix map, in `docs/compliance-checks.md`, in the
   fix-findings table through its slug, and, for a contract rule, in
   `ALL_CONTRACT_RULES`, the reconciliation tests, and
   `scripts/lib/componentGate.mjs`.
7. `npm run check`, `npm test`, `npm run test:e2e:contract`,
   `npm run test:e2e:contract-defects`, `check:skills`, `check:cli-strings`,
   `check:skill-atlas`, `check:skill-sources` green at every wave boundary.
   Waves 4, 6, 7, and 8 also run `check:smoke-component-tests`.
8. Nothing pushed, tagged, or published by an executor.

## Commit-unit protocol

One wave, one commit. Run the wave's verification green before committing;
never commit red. Commit message `Compliance W<n>: <summary>` plus the
standard co-author trailer. Wave 4's merge commit is its own unit under the
same prefix. Do not push, tag, or release. Stop after each wave
for review. If reality contradicts this plan (a cited file is missing, a check
pins conflicting behavior), stop and report.

Never stash, reset, or checkout over uncommitted changes.

## The rules

### New and changed rules

| Rule | Checker | Default | Repair | Finding |
|---|---|---|---|---|
| `config-token` | check-component | error | choice | An alias string in `default.json` names something the vocabulary lacks, or a literal stands on a property with no intrinsic. |
| `unread-token` | check-component | warn | choice | A property the runtime declares in `:global(:root)` and reads nowhere in its own CSS. The message names the property. |
| `missing-description` | check-component | warn | authored | The runtime file opens with no HTML comment. Presence only; the catalogue's `descriptionOf` keeps its own parse. |
| `contract-behavior` | check-component `--tests` | error | authored | A declared behavior case failed under Vitest. Fix slug `runtime`. |
| `contract-states`, `contract-interaction` | check-component `--tests` | error | authored | Unchanged ids; they now reach the CLI for the failures the harness reported as `contract-preview`. |

### Finding fields

Every finding from both checkers, under `--json` and under `report --json`:

| Field | Value |
|---|---|
| `rule`, `severity`, `file`, `line`, `message` | As today. |
| `fix` | The slug from `COMPONENT_RULE_FIX` or the new `PAGE_RULE_FIX`. |
| `repair` | `auto`, `choice`, or `authored`. |
| `exception` | The narrower config entry: `{ "checks": { "exclude": ["<file>"] } }` for a page or CSS file, `{ "checks": { "rules": { "<rule>": "warn" } } }` otherwise. |
| `details` | Per rule, below. Absent when a rule has nothing to add. |

| Rule | `details` |
|---|---|
| `unknown-prop`, `unknown-prop-value` | `{ accepts: string[] }`, the list the message already prints. |
| `dimension-literal` | `{ scale, literals: [{ value, px, candidates: [{ token, px, shift }] }] }`. `scale` is `space`, `radius`, `border-width`, or `shadow`, from the property. `px` reads the scale's values through `describeTokens`; a `rem` literal converts at 16. `repair` is `auto` when every literal has exactly one nearest step, else `choice`. |
| `color-literal` | `{ scale, candidates }`. `scale` is `text` for `color`, `surface` for a background, `border` for a stroke, `null` otherwise; `candidates` is that scale's token list. The role stays the user's choice. |
| `deep-import` | `{ specifier, public }` when the components rewrite applies; otherwise `{ specifier, exports }` listing the package's public subpaths from `package.json`. |
| `hardcoded-columns` | `{ columns, candidates }` with the page-grid and sub-grid forms. |
| `unread-token`, `config-token` | `{ property }`, and `{ value }` for `config-token`. |
| `control-size`, `property-override` | `{ site }`: `attribute`, `declaration`, `directive`, or `script`. |

`PAGE_RULE_FIX` slugs: `page-token` for `unknown-token`, `color-literal`,
`dimension-literal`, `raw-text-axis`; `page-component` for
`unknown-component`, `unknown-prop`, `unknown-prop-value`, `control-size`,
`multiple-primary`, `danger-without-dialog`, `native-control`,
`property-override`; `page-layout` for `hardcoded-columns`, `page-grid`,
`page-overflow`; `page-paint` for `page-component-paint`, `page-text-style`,
`page-contrast`; `routing` for `reserved-route`, `site-css-in-main`,
`missing-source`, `deep-import`; `tooling` and `coverage` as the component
map already uses them. A test pins the map to `PAGE_RULES` the way the
component test does.

### Report order

`report --json` keeps its sections and defines their order in code:
`project`, `migrations`, `findings.pages`, `findings.components`, `usage`.
Within a section, findings sort by severity (errors first), then by rule
count descending, then by file and line. `formatReport` prints that order and
prints each finding's `repair` beside its rule. The `components[]` facts keep
`id`, `origin`, `file`, `registered`, and `tokens`; `unread`, `described`, and
`usage.customUnregistered` go, because the findings now carry them.

## Wave 1: one component inventory

**Files.** `bin/lib/tokenVocabulary.mjs`, `bin/check-component.mjs`, `bin/lib/report.mjs`,
`bin/lib/catalogue.mjs`, `bin/contractRunner.mjs`,
`src/testing/registry.contract.ts`, `bin/check-component.test.ts`,
`bin/report.test.ts`, `bin/contractRunner.test.ts`, `bin/catalogue.test.ts`.

**Do.**

- Write `componentInventory(root)` per judgment call 4. Resolve the on-disk
  filename the way `resolveComponentPaths` does (`cornerbadge` ships as
  `CornerBadge.svelte`) and the editor from `EDITOR_DIRS`. Include an id
  that is registered (`registeredIds`) but has no runtime, with
  `runtimePath` pointing where the runtime would be.
- `discoverComponents` returns the inventory's ids with a runtime present.
  `resolveComponentPaths` reads the inventory entry. `checkComponent` reports
  `missing-file` for a missing editor and continues into the rules that need
  only the runtime; a missing runtime still stops the check.
- `loadVocabulary` builds `components` from the same inventory plus the
  package's shipped directory, so `report.components` and
  `report.findings.components.checked` name the same ids.
- `registry.contract.ts` keeps importing from `bin/check-component.mjs`
  (the tarball ships `bin/`); the export it imports reads the inventory.
- Add `config-token` per judgment call 5. Extract every `--name` from each
  alias string with the same boundary `findTokenLine` uses, so
  `--card-default-body` never matches inside `--card-default-body-padding`.

**Verify.** Fixtures under `bin/`'s existing fixture pattern prove: a
component under a configured `componentDirs` directory is discovered,
resolved, and checked; a runtime with no editor produces `missing-file` and
stays in the batch; a registered id with no runtime produces `missing-file`;
an unregistered project component produces `missing-registration`; `report`
and `runContractTests` select the same ids. `config-token` fires on an alias
naming `--surface-nope`, on a bare literal for a property with no intrinsic,
and stays silent on the opacity form, on `var(--x)`, and on a literal for a
declared intrinsic. All 26 shipped `default.json` files pass it. Invariant 4
by grep: no `readdirSync` of a components directory outside the inventory.

## Wave 2: findings carry their repair

**Files.** `bin/lib/findings.mjs`, `bin/check-component.mjs`,
`bin/check-page.mjs`, `bin/lib/report.mjs`, `bin/lib/catalogue.mjs` (the
scale values), new `bin/lib/geometry.mjs`, their tests.

**Do.**

- `applySeverity` attaches `fix`, `repair`, and `exception` to every finding
  from a rule table that now carries `{ severity, fix, repair }` per rule.
  `COMPONENT_RULES` and `PAGE_RULES` keep their names and gain the two
  fields; `COMPONENT_RULE_FIX` becomes a view over the table so the existing
  test and `cli.mjs` keep working, and `PAGE_RULE_FIX` joins it.
- Each rule's `record` site attaches `details` per the table. `unknown-prop`
  and `unknown-prop-value` already have the list in hand.
- `resolveGeometryLiteral(value, scale, tokens)` in `geometry.mjs` returns
  the literals in a value, each with its pixel size, the candidates on the
  scale with their shifts, and whether the nearest step is unique. It reads
  the scale's values through `describeTokens`; a token name carries no pixel
  value. It meets only what `hasDimensionLiteral` flags: `px` and `rem`,
  non-zero, with no leading sign, since that regex excludes a signed
  literal. A term inside
  `calc()` or a shorthand resolves on its own; the declaration is `auto`
  only when every term is.
- Move `unreadTokens` into `check-component.mjs` as the `unread-token` rule
  with its tests intact, and add one fixture for an indirect read through a
  per-side parent and one through interpolation. Add `missing-description`.
- `summarise` in `report.mjs` passes the fix map, keeps every field, and
  sorts per Report order. `formatReport` prints the new lines and drops the
  three fact lines the rules replace.

**Verify.** A JSON contract test snapshots one finding per rule from both
checkers with every field present. `resolveGeometryLiteral` is pinned on:
`14px` (tie between `--space-12` and `--space-16`, `choice`), `15px`
(`--space-16`, shift `+1`, `auto`), `1rem` (`--space-16`, shift `0`), a
`padding: 8px 16px` shorthand (`auto`, two tokens), `calc(100% - 20px)`
(`auto`, `--space-20` inside the calc), and a radius `6px`
(`--radius-lg`). `report --json` on this repository lists 26 checked, zero
`unread-token`, zero `missing-description`, and the JSON key order is the
Report order. The check-compliance skill waits for Wave 6.

## Wave 3: behavior contracts under Vitest

**Files.** `src/testing/componentContract.ts`, new
`src/testing/component-behavior.contract.ts`, `src/testing/vitest.ts`,
`src/testing/support/contractHarness.ts`, `src/testing/contracts/*.ts`,
`tests/e2e/contract-defects/contract-defects.spec.ts`, and
`tsup.testing.config.ts`, which lists each contract file as its own entry
and gains the new suite. Nothing under `bin/` or `scripts/`; Wave 4 threads
the rule through the CLI. This wave runs in lane B.

**Do.**

- Add to `componentContract.ts`:

  ```ts
  export interface BehaviorCase {
    name: string;
    /** Props the fixture mounts with. A snippet-valued prop is not
     *  expressible; a component whose behavior needs one records that case
     *  as inapplicable with the reason. */
    props?: Record<string, unknown>;
    action?: { kind: 'click' | 'keydown' | 'input'; part: string; key?: string; value?: string };
    expect:
      | { kind: 'callback'; prop: string; args: unknown[] }
      | { kind: 'no-callback'; prop: string }
      | { kind: 'attribute'; part: string; name: string; value: string | null }
      | { kind: 'text'; part: string; value: string };
  }
  export interface BehaviorExpectation { cases: BehaviorCase[] }
  ```

  and `behavior: BehaviorExpectation | Inapplicable` on `ComponentContract`.
  `ContractRule` gains `contract-behavior`, `contract-states`, and
  `contract-interaction` and drops `contract-preview`.
- The suite is a Vitest file beside `registry.contract.ts` under
  `// @vitest-environment happy-dom`. It imports the registry setup the same
  way, selects contracts through `selectedContracts()`, resolves each
  entry's `sourceFile` against the package root for `origin: 'system'` and
  the project root otherwise, imports the runtime by `pathToFileURL`, and
  for each case mounts into a fresh element with `mount` from `svelte`, a
  `vi.fn()` per callback the case names, dispatches the action as a DOM
  event, calls `flushSync()`, and asserts. Part selectors come from
  `contract.parts` resolved inside the mount target. A failure throws
  `ContractViolation('contract-behavior', id, message)`. Measure first that
  `vitest.contract.config.ts` transforms a `.svelte` file imported by
  absolute path; record the fact in this section.
- `createVitestConfig`'s `CONTRACT_INCLUDE` matches both contract files, in
  `.ts` and compiled `.js` form.
- Retire `contract-preview` per judgment call 7: the harness throws
  `contract-states` from `assertStates` and `contract-interaction` from
  `assertInteraction`, and the five defect fixtures expect those ids.
- Declare `behavior` on all 26 shipped contracts. The census: Button,
  CollapsibleSection, Dialog, IconButton, InlineEditActions, Input,
  MenuSelect, Notification, RadioButton, SegmentedControl, SideNavigation,
  Slider, TabBar, and Toggle carry a callback prop. Each gets, where the
  runtime declares the prop: the callback fires with its documented argument;
  it stays silent when `disabled`; a controlled prop drives its attribute and
  an action leaves that attribute unchanged. Toggle's four cases: click with
  `checked: false` calls `onchange` with `[true]` and leaves `aria-checked`
  at `"false"`; click with `checked: true` calls it with `[false]`; mount
  with `checked: true` renders `aria-checked="true"`; click with
  `disabled: true` never calls it. ProgressBar and Tooltip get a prop-driven
  case. The remaining components declare `applicable: false` with a reason
  naming what they lack. happy-dom may deliver a click to a disabled
  `<button>` that a browser swallows; a component that relies on the browser
  for that suppression records the case as inapplicable with that reason,
  and this section records which components did.

**Verify.** `npx vitest run --config vitest.contract.config.ts` collects both
contract files and passes for all 26; record its wall clock here. A
deliberate fault (drop the `disabled` guard in `Toggle.svelte` on a scratch
commit, then revert it) makes the suite throw one `ContractViolation` under
`contract-behavior` naming the case. `npm run check`, `npm test`,
`test:e2e:contract`, and `test:e2e:contract-defects` green, the five fixtures
on their real ids. `check:production-is-default` OK in the worktree.

**Measured (wave executor, 2026-09-13).** `vitest.contract.config.ts` does
transform a `.svelte` file imported by absolute `file://` URL, so the suite
resolves each registry entry's `sourceFile` and imports the runtime through
`pathToFileURL`. The run collects both contract files and passes 79 tests in
1.8 s.

happy-dom swallows a click dispatched at a disabled `<button>`: a raw listener
on the element records nothing. A disabled case therefore pins that the prop
reaches the DOM as a real `disabled` attribute, not the component's own guard.
Dropping Toggle's `if (disabled) return` leaves the suite green, so the plan's
fault is silent; inverting the argument (`onchange?.(checked)`) throws two
`ContractViolation`s under `contract-behavior` naming their cases, which is the
fault this wave verified with. Slider and Input report through `input`, which
is delivered to a disabled control, so neither declares a disabled case and
`slider.ts` carries the reason. Ten components declare `behavior` inapplicable:
Badge, Callout, Card, CodeSnippet, CornerBadge, Image, ImageLightbox, Panel,
SectionDivider, Table.

Two files outside the stated list moved. `src/testing/playwright.ts` gained
`testIgnore: '**/component-behavior.contract.{ts,js}'` on the contract project,
because `component-*.contract.{ts,js}` collected the Vitest suite and the
project then reported that it collected nothing. `contracts/notification.ts`
gained a `closeButton` part and a Dismissible setup step, so the dismiss
callback has a declared part to click.

**Handoff.** `scripts/fixtures/component-tests/beacon/contracts.ts` and
`template/tests/contracts.ts` declare no `behavior`, so the suite reports
`contract-behavior` against them until Wave 6 updates them. That is what
`check:smoke-component-tests` runs, so Wave 4's background gate sees it first.

## Wave 4: merge lane B and thread `contract-behavior` through the CLI

**Files.** `bin/contractRunner.mjs`, `bin/check-component.mjs`,
`bin/check-component.test.ts`, `scripts/lib/componentGate.mjs`.

**Do.**

- Merge branch `check-compliance-simplification-lane-B` into the working
  tree with `git merge --no-ff` under the wave's subject prefix, then
  `git worktree remove scratch/worktrees/B`. When the run was sequential and
  no such branch exists, skip this step.
- Add `contract-behavior` to `COMPONENT_RULES` (error, fix `runtime`, repair
  `authored`) and to `ALL_CONTRACT_RULES`. `mapVitestResults` keys the rule
  on the report file's name; today it assumes `contract-registry` for every
  assertion.
- Add the mapping test judgment call 7 needs: a `[contract-states]` message
  resolves to `contract-states` with fix `editor`, and a `[contract-preview]`
  message no longer occurs anywhere the harness can throw it (a grep pins
  the absence).
- `componentGate.mjs` expects ten coverage rules.

**Verify.** `check-component toggle --tests --json` reports
`contract-behavior: passed` and ten rules. The Toggle fault from Wave 3,
applied in the isolated run, produces one `contract-behavior` finding naming
`Toggle.svelte`. `npm test`, `test:e2e:contract`, and
`test:e2e:contract-defects` green. `check:smoke-component-tests` green in the
background. The merge commit and the wave commit both carry the prefix, and
`git worktree list` shows the working tree alone.

## Wave 5: guarded fixers behind `--fix`

**Files.** New `bin/lib/fixers.mjs`, `bin/cli.mjs`, `bin/check-component.mjs`,
`bin/check-page.mjs`, `bin/lib/findings.mjs` (`parseCheckFlags` gains
`fix`), their tests.

**Do.**

- For each `auto` finding, the checker computes `details.patch` as
  `{ from, to }`, an exact substring of the line the finding names.
  `deep-import` rewrites the specifier. `dimension-literal` replaces each
  literal with `var(<token>)`, inside a `calc()` or a shorthand in place.
  `control-size` deletes the attribute. `property-override` deletes the
  declaration or the directive.
- `applyFixes(findings, root)` applies each patch at the first occurrence of
  `from` at or after the finding's line, refuses a patch whose `from` is
  absent (the file moved on) and reports it as not applied, writes the file
  once per file, and returns `{ applied, skipped }`.
- `--fix` on `check-page` and `check-component` applies, reruns the static
  check, and reports the applied patches with their shifts, then the
  remaining findings. `--fix` with `--tests` is refused with a one-line
  message; one thing at a time.

**Verify.** Per fixer, a fixture proves the exact patch, that a second
`--fix` applies nothing and leaves the file byte-identical, and that the
ambiguous case (`14px`, a shorthand with one unresolvable term, a
`setProperty` override, a deep import outside the components subpath) is
left untouched and reported as `choice` or `authored`. Invariant 5 by test:
`git status --porcelain src/live-tokens/data` and the hash of `tokens.css`
are unchanged across a `--fix` run on a fixture project. Running `--fix` on
this repository and on the template changes nothing.

## Wave 6: skills, references, docs, atlas, changelog

**Files.** `.claude/skills/live-tokens-check-compliance/SKILL.md`,
`.claude/skills/live-tokens-fix-findings/SKILL.md`,
`.claude/skills/live-tokens-create-component/references/contract-tests.md`,
`docs/compliance-checks.md`, `docs/compliance-loop.html`,
`src/editor/skill-atlas/trees/*.ts`, `template/` where it carries a
`ComponentContract`, `scripts/lib/skillChecks.mjs`, `CHANGELOG.md`.

**Do.**

- check-compliance becomes the three steps of judgment call 1. Its Report
  sections table becomes a Finding fields table (`fix`, `repair`,
  `exception`, `details`) and the sentences that call for a second `report`
  run or an inspection command go. The finding-class prose maps Mechanical
  to `auto` and Judgement to `choice`, and Deliberate to the `exception` the
  finding names.
- fix-findings runs `--fix` on both checkers as its first repair step and
  keeps its tables for `choice` and `authored` rules only. Rows for
  `unread-token`, `missing-description`, `config-token`, and
  `contract-behavior` join The remaining rules; the `fix:` rows cover the
  new page slugs.
- `references/contract-tests.md` documents `behavior` with a Toggle-shaped
  example and the one-line inapplicable form. It says what a disabled case
  pins, that the prop reaches the DOM as the `disabled` attribute, and names
  the fault the suite catches: a callback called with the wrong argument.
- The check-compliance skill states two facts Wave 2 settled: `exception`
  steps a rule down one level, error to warn and warn to off; and
  `report --json` carries no `components[].name`, `unread`, `described`, or
  `usage.customUnregistered`, with `components` after `migrations`.
- `docs/compliance-checks.md` and `compliance-loop.html` carry the new
  counts: check-component static 20, contract rules 11, 26 token contract
  scales with `border-width`, and the Vitest behavior suite. `CHANGELOG.md`
  gains `## Unreleased` per judgment call 10.
- Once both skills document `--fix`, delete the two `OMITTED_FLAGS` entries
  for it in `scripts/lib/skillChecks.mjs`; `check:skills` then proves the
  flag is documented rather than exempted.
- After the skill edits, run `npm run sync:skill-atlas` and
  `npm run sync:skill-sources`; re-point by hand any node whose anchor text
  is gone, and read the rendered card for a title that no longer matches its
  chips.

**Verify.** `check:skills`, `check:skill-atlas`, `check:skill-sources`
green. `check:cli-strings` green: the new messages use buffer, load, design
token, semantic property, and shipped default. The check-compliance skill
body names no command other than `report`. `check:smoke-component-tests`
green in the background.

## Wave 7: the static checkers read what this plan says they read

Five findings the Wave 1, 4, and 5 reviews carried forward, each a checker
reading less than the plan says it reads. All are fixture-shaped.

**Files.** `bin/lib/tokenVocabulary.mjs`, new `bin/lib/dataDir.mjs`,
`bin/contractRunner.mjs`, `bin/check-component.mjs`, `bin/check-page.mjs`,
`bin/check-component.test.ts`, `bin/check-page.test.ts`,
`bin/catalogue.test.ts`, `CHANGELOG.md`.

**Do.**

- `componentInventory` walks each directory with the module's own `walk()`,
  recursive and skipping `node_modules`, dot names, and `__` names, as
  `componentFiles` did before Wave 1. `Id` comes from the basename and
  `runtimePath` is the walked path. `loadVocabulary` takes its shipped half
  from `componentInventory(pkgRoot)` instead of `componentFiles`, so one
  scanner remains and invariant 4 holds with no exception.
- `resolveSourceDataDir` and `settingsFilePath` move from
  `bin/contractRunner.mjs` into `bin/lib/dataDir.mjs`, and `contractRunner`
  imports them from there. `checkConfigTokens` reads
  `component-configs/<id>/default.json` under the directory they resolve, the
  same directory `runContractTests` isolates, instead of the literal
  `src/live-tokens/data`.
- `config-token` accepts a design token or one of the component's own
  properties, per judgment call 5. The check reads the vocabulary's
  per-component `tokens` map for `id` rather than the union across every
  component.
- `checkComponent` records `missing-file` for a missing editor before it
  returns on a missing runtime, so an id with neither file gets both
  findings, as it did before Wave 1.
- `tagAttributes` in `check-page.mjs` starts at the first whitespace after
  the tag name rather than the first space, so an attribute on the line after
  the tag name is read, and it skips horizontal whitespace around `=`, so
  `<Card size = "small" />` reads `size="small"` as Svelte does.
  `attributeDeletion` already refuses a patch that crosses a line, so the
  findings the first change uncovers carry `repair: choice`. The guard it
  gained at the Wave 5 gate for a `=` past the span then has no reachable
  input and goes, with its fixture kept as a parser case.
- `CHANGELOG.md` records each under `## Unreleased`.

**Verify.** Fixtures under `bin/` prove: a runtime one directory below a
`componentDirs` entry is discovered, resolved, and checked; a project whose
`live-tokens.config.json` sets `dataDir` gets a `config-token` finding from a
broken alias under that directory and none from the default path; a project
whose `live-tokens.testing.ts` sets `dataDir` to anything but a string
literal skips `config-token` instead of throwing out of the static lint; an
alias in one component's `default.json` naming another component's property
is a `config-token` finding; a registered id with neither file yields two
`missing-file` findings; `<Card\nsize="small"\n/>` yields `control-size` and
`--fix` deletes the attribute, since the span it patches carries no newline;
`<Card size=\n"small" />` yields `control-size` with `repair: choice` and
`--fix` leaves it byte-identical, since the value itself crosses a line;
`<Card size = "small" />` parses with value `small`, yields `control-size`,
and `--fix` deletes the whole attribute. All 26 shipped `default.json` files
pass `config-token`; if one aliases a foreign property, stop and report.
Invariant 4 by grep: no `readdirSync` of a components directory outside
`walk`. Invariant 7, with `check:smoke-component-tests` in the background.

## Wave 8: one defect, one finding under `--tests`

Three findings from the Wave 4 review, where one fault reaches the CLI as
several findings or under the wrong rule, and the page test the Wave 4 and 5
reviews saw red and the executors saw green.

**Files.** `bin/cli.mjs`, `bin/lib/findings.mjs`,
`src/testing/component-behavior.contract.ts`,
`src/testing/registry.contract.ts`, `src/testing/support/pageHarness.ts`,
`bin/contractRunner.mjs`, `bin/contractRunner.test.ts`,
`bin/check-component.test.ts`, `scripts/lib/componentGate.mjs`,
`CHANGELOG.md`.

**Do.**

- A broken alias is one finding. The static `config-token` rule and the
  Playwright alias suite's `contract-alias` report the same string, and
  `cli.mjs` concatenates them with no dedupe. `check-component <id> --tests`
  drops a `contract-alias` finding whose unresolved names all carry a
  `config-token` finding for the same component in the same run; a
  `contract-alias` naming a token the vocabulary knows, declared yet
  unresolved at the root, stays. The dedupe is one function in
  `bin/lib/findings.mjs`, applied at the merge in `cli.mjs`. Fixture B in
  `componentGate.mjs` returns its decoy to a name outside the vocabulary,
  which Wave 7's `dataDir` resolution makes visible to the static rule, and
  the scenario pins one finding for the one defect.
- A missing runtime is the registry rule's finding. The behavior suite
  imports each component's runtime once, in that component's `describe`, and
  skips its cases with the reason when the file the registration names does
  not exist. `contract-behavior` then reads `incomplete` in coverage,
  explained by the failed `contract-registry`, and `reconcileCoverage` adds
  nothing. The gate's missing-file scenario pins one finding.
- No registry assertion is anonymous. The project-level assertion in
  `registry.contract.ts` that every authored component is registered becomes
  one assertion per inventory id, so a failure names its component, maps to
  `contract-registry` with fix `registration`, and never reaches the CLI as
  `tests-setup`. `tests-setup` keeps meaning the tooling did not run. The
  duplicate-alias scenario in `componentGate.mjs` pins the rules it now
  produces, none of them `tests-setup`.
- The page test at `bin/contractRunner.test.ts:337` is deterministic. Its
  finding depends on the projected theme's `--columns-gutter` reaching the
  page before `assertOverflow` measures, and `PageHarness.open` waits only
  for `--body-md-font-size`, which `tokens.css` sets on its own. Root-cause in
  the harness, in this order: the readiness gate at `pageHarness.ts:320-327`,
  the two-frame settle at `:331-333`, and the font wait at `:330`. The fix
  lands in the harness so every page obligation measures a page that has
  finished loading; the test keeps its assertions. If the cause lies outside
  this repository's control, record it in this section and stop for review.

**Root cause, measured 2026-09-13.** The failure the Wave 4 and 5 reviews
recorded is `expected 0 to be greater than 0` at `:337`
(`scratch/w4/pagetest.log`): the run found no finding at all, so the 390x844
obligation measured a page that did not overflow. The overflow is 9px wide.
Home's twelve-column grid holds 384px of content in a 375px container at that
viewport with the theme's 32px `--columns-gutter`, and `tokens.css` computes
`clamp(0.5rem, 1.5vw, 1.5rem)` there, an 8px gutter whose eleven gaps fit.
So the finding stands or falls on which value the page carries when the rule
reads it, which is what the plan says.

Four probes against this repository's own dev server, at 390x844: the
projected `--columns-gutter` reads 32px inline on `:root` in every sample,
including the one taken before the page container exists, and the geometry is
384px in 375px from that first sample through five seconds; blocking
`fonts.googleapis.com` and `use.typekit.net` drops the document from 60 font
faces to 10 and leaves the geometry unchanged, so the webfonts do not move
this page. A per-frame trace of the boot puts `--body-md-font-size` true at
503ms, the page container at 587ms holding only the dev overlay, and the
route's own content at 605ms. The readiness gate's own themed half therefore
establishes nothing about the theme: the property it reads is one `tokens.css`
sets, true 84ms before there is a page to measure. Ten runs in isolation
(five by the previous executor, five here) pass, so the window this opens is
narrow and takes a loaded machine to hit.

The fix is the one the plan names, at the gate. `PageHarness.open` keeps the
content half of the readiness gate, drops the property that proved nothing,
and replaces the two-frame settle with a quiet window: it waits until the
document's geometry, the count of custom properties the projection writes
inline on `:root`, and the font set all hold still for 300ms, bounded at 5s so
a page that never settles is still measured. That is what "has finished
loading" means for a rule that reads geometry, and it holds for whichever of
the three inputs is the late one on any given run.

**Alias message shape, measured 2026-09-13.** In a consumer run the browser's
alias finding carries the harness stack on the lines after the list, because
`messageBlock` ends a message at the first blank line and Playwright writes
none between the two: `beacon: aliases resolve to nothing at the root:
--beacon-track-surface` then `    at _ContractHarness.fail (...)`. In this
repository's own run the stack arrives as a code frame behind a blank line and
the message is one line. The dedupe therefore reads the names off the first
line and takes the component from the config file both rules name, not from the
message prefix.

- `CHANGELOG.md` records each under `## Unreleased`.

**Verify.** `check-component <id> --tests` on a fixture with one broken alias
reports one finding, `config-token`, with its details. The missing-runtime
scenario reports one `contract-registry` finding and `contract-behavior:
incomplete`. The duplicate-alias scenario reports no `tests-setup`. The page
test passes ten consecutive runs of
`CI=1 npx vitest run bin/contractRunner.test.ts -t "page-overflow"` and
`npm test` passes five consecutive runs, both in the background; record the
root cause in this section. Invariant 7, with `check:smoke-component-tests`
in the background.

## Deferred

**Description ownership.** The catalogue reads a leading runtime comment
through `descriptionOf` in `bin/lib/catalogue.mjs`. Moving it to a
`RegistryEntry.description` field is an organizational change that can
follow this plan: migrate the 26 comments, update the catalogue readers and
the create-component references, and make `missing-description` check the
field. Keep one authoritative description the CLI can read without booting
the editor.

**`report --tests`.** An opt-in that aggregates `check-component --tests`
over project-authored components and `check-page --tests` over routed pages,
reporting coverage per component and per page. Independent of this plan.
