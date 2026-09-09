# Shipped page validation

## Goal and scope

Ship a page validator that a consumer can run against a new page in its own
application. The validator combines the existing source checks with browser
assertions over actual routes, viewports, themes, and declared interactions.
A fresh project must run the documented command using the package tarball
before release.

[Shipped component validation](shipped-component-tests.md) owns registration,
editor controls, component token wiring, component states and interactions,
persistence, and Sketch paint. This plan owns composition: correct component
usage, rendered typography and spacing, containment, semantic structure, and
page behavior. Page tests verify that composition preserves component
behavior. They do not rerun every component editor contract.

The plans share test configuration, tool resolution, server lifecycle, data
isolation, findings, coverage reporting, and consumer acceptance infrastructure.
Implement this plan after the component runner's public configuration and
coverage interfaces stabilize. Each plan retains its own acceptance gate.

## Current behavior

`bin/check-page.mjs` checks source files for component and prop usage, token
references, literal values, typography axes, grid conventions, primary-action
counts, destructive-action dialog imports, and route metadata. Its discovery
returns source files; it does not supply executable route scenarios.

The `live-tokens-create-page` skill then asks the author to inspect the page.
Some obligations have objective browser assertions: heading structure,
containment, default values, Reset, image alternatives, and behavior. Others
require editorial judgment: content priority, useful labels, visual reading
order, and whether decoration conveys information.

Source checks and component tests leave a composition gap. A page can use a
valid component but override its typography, clip its focus indicator, or wire
its destructive action directly to a mutation. This plan tests those outcomes.

## Public workflow

Keep `live-tokens check-page [paths...]` unchanged without `--tests`.

```sh
npx live-tokens check-page src/pages/Pricing.svelte --tests --strict --json
```

With `--tests`, resolve each target to explicit page scenarios, run source
checks, then execute the shipped browser contracts. With no paths, use the
existing source discovery and reconcile the results against page scenarios.
Supporting CSS receives static checks and coverage through the pages that
consume it. Explicit file-role metadata identifies supporting Svelte files;
a source file cannot disappear from coverage merely because it lacks a route.
Missing files, zero page targets, and missing route mappings fail explicitly.

Add `test:pages` to the create template. Keep its existing fast `check:design`
script. Keep the component test script separate. `report` remains a static
audit in this plan and states that scope in the compliance skill.

The command returns findings and machine-readable coverage. A complete pass
means every applicable automated obligation ran for the declared scenarios.
It establishes the page's automated design-system contract. The report also
lists the editorial review obligations that remain.

## Page scenarios

Extend `live-tokens.testing.ts` from the component plan with typed page
scenarios. Export the type and definition helper through `./testing`. Document
one minimal template example and one page with interactions.

Each page scenario declares:

- A stable ID, source file, concrete route, and page-root locator.
- Viewports derived from the page's supported layout range, including narrow
  and wide widths and relevant breakpoint boundaries. The template supplies
  explicit defaults; projects can replace them with their supported range.
- Deterministic content and app-state setup, including representative long,
  empty, loading, and error states when the page supports them.
- Named text roles and layout regions where generic semantics are insufficient.
- Component instances whose page integration requires behavioral checks.
- Form defaults, Reset outcomes, action groups, destructive actions, and
  long-running actions when present.
- Expected theme projections for representative text, surfaces, and geometry.
- Explicit exceptions or inapplicable checks, each with a reason and scope.

Static route tables may supply initial mappings. Dynamic, parameterized, and
gated routes require concrete URLs and local test setup. Do not guess parameter
values or import the application entry point into a Node test process. The
browser boots the real application through its ordinary entry point.

Use deterministic local fixtures and intercepted or local mock services for
application data. Destructive-action tests must verify a mock mutation and
must never call a production service. The scenario explicitly supplies that
setup. Reset browser storage, app state, and isolated token data between cases.
Missing required setup is a setup failure.

Contract metadata supplies expected outcomes. Shared helpers make the
observations and assertions. Require scenarios to cover discovered forms,
actions, and declared layout regions; report gaps instead of treating empty
locator sets as passing tests. Document the limits of inference for arbitrary
custom markup and JavaScript behavior.

## Automated contracts

| Rule | Obligation | Evidence |
|---|---|---|
| `page-route` | The intended page mounts at its declared URL. | Expected page root and identity appear; route errors and uncaught application errors fail. |
| `page-semantics` | Page structure follows the page skill. | One visible page `h1`, ordered heading levels, image alternative attributes with decorative exceptions, and accessible field/control names. |
| `page-typography` | Text roles render with their assigned type styles. | Compare computed font axes with the expected semantic token bundle; check label/body size relationships where the contract identifies them. |
| `page-layout` | Controls and declared regions fit their intended containers. | Bounding-box and overflow assertions at each viewport; explicit handling for intentional scroll regions, portals, and overlays. |
| `page-theme` | Page surfaces project the active design tokens. | Deterministic theme changes produce expected computed colors, type, and geometry for mapped surfaces; unchanged values remain valid. |
| `page-focus` | Keyboard use preserves access to page controls. | Declared tab sequence, focus reachability, focus return from dialogs, and visibility of the active control and its focus treatment. |
| `page-actions` | Action groups and destructive or long-running actions satisfy their contracts. | Primary/secondary roles, cancel behavior, confirmation before mock mutation, cancellation with no mutation, and observable progress during controlled pending state. |
| `page-form` | Defaults and Reset work in the composed page. | Compare declared defaults with rendered values, edit fields, invoke Reset, and assert values and dependent state. |
| `page-component-integration` | Page composition preserves required component behavior. | Execute the declared instance actions and check observable results, disabled behavior, and relevant style expectations in the page. |

Retain existing static rule IDs and severity settings. Static token checks
remain necessary: matching a computed value alone cannot establish that source
code uses the correct design token. Runtime checks catch cascade and state
problems that source inspection misses.

The first implementation uses Chromium and explicit viewport/theme scenarios.
It makes no cross-browser or exhaustive accessibility claim. Snapshot images
serve as failure evidence; screenshots alone do not determine compliance.

## Review boundaries

Create a coverage matrix from every current create-page verification item.
For each item, record the static rule, browser rule, explicit scenario
requirement, or editorial review obligation that owns it. No item disappears
when the skill changes.

Keep these obligations in the authoring review:

- Content priority and the intended first, second, and third points of attention.
- Labels that use the audience's language and meaningful image descriptions.
- Whether borders, headers, and containers convey useful information.
- Reading comfort and visual balance, including the skill's line-length advice.
- Placement of secondary settings and actions when purpose determines placement.

A declared contract can turn a specific design decision into an assertion,
such as the alignment of two regions or an action's position. Generic geometry
cannot decide the correct design intent for every page. The report identifies
those limits and the skill retains the corresponding review instructions.

## Runner and findings

Add page suites under `src/testing/page-*.contract.ts`. Keep them in a separate
Playwright project with an explicit match pattern. The registry Vitest suite
and component browser suites remain separate. Page tests require the shared
browser dependencies; resolve only tools this command actually invokes.

Extend the shared runner with page target selection, scenario setup, and
per-viewport/theme results. Reuse automatic isolated data and controlled server
startup. The server must write only to its isolated data copy. Default to one
worker for scenarios that share a server or mutable state. Parallel execution
requires separate state and data directories.

Keep `{ rule, file, line, message }` findings. Attach page/scenario ID, route,
viewport, theme, locator, expected value, actual value, and artifact paths as
structured context. Prefer a reliable consumer source location; otherwise use
the scenario definition or suite location and label that origin. Preserve the
actual reporter location and use the shared fallback policy for setup failures.

Reuse `tests-not-installed`, `tests-setup`, and `tests-incomplete`. Unknown
routes, authentication setup failures, missing roots, browser failures,
malformed reports, zero scenarios, and unexpected skips cannot produce a
complete pass. Reconcile the expected scenario matrix with actual results.
Explicit rule suppression remains visible as disabled coverage. The authoring
workflow requires complete applicable coverage under strict settings.

## Execution waves

Inspect the current worktree and record baseline checks before implementation.
Preserve existing edits. Each wave ends with its required checks green and a
review of its acceptance evidence. No wave publishes a release.

| Wave | Deliverable | Status |
|---|---|---|
| 1 | Page contract inventory, typed scenarios, and route selection | Not started |
| 2 | Browser assertions and deliberate-defect fixtures | Not started |
| 3 | CLI runner, coverage, diagnostics, and failure handling | Not started |
| 4 | Tarball consumer acceptance and authoring workflow | Not started |

### Wave 1 — contract inventory and scenarios

**Files.** `bin/check-page.mjs`, new `src/testing/pages.ts`, the shared testing
configuration types and `./testing` exports, and page fixture definitions.

**Work.** Record the coverage matrix for the current skill, define scenario
validation, and connect source targets to concrete URLs. Keep static discovery
and no-flag behavior compatible. Add positive fixtures for a simple content
page and a form page with dialog, Reset, and pending state. Add route cases for
static, parameterized, and locally gated pages. Specify CSS/supporting-file
coverage and scoped exceptions.

**Gate.** Unit cases prove target selection, route mapping, schema validation,
missing coverage, and zero-target failures. Existing static checker fixtures
retain identical output without the flag. Review the matrix before expanding
browser assertions.

### Wave 2 — page browser contracts

**Files.** New `src/testing/page-*.contract.ts`, shared browser helpers, and
consumer-shaped fixture pages and mock data.

**Work.** Implement each rule from the automated-contract table. Drive real
routes and user interactions. Wait for fonts, hydration, and deterministic
app readiness before observing layout. Use expected token projections and
explicit geometry tolerances. Restore baseline state between cases.

**Gate.** Valid fixtures pass at the declared widths and themes. One deliberate
defect per rule fails with the expected rule ID: wrong route, heading or label
defect, type override, narrow-width overflow, stale theme paint, lost focus,
unconfirmed mock mutation, broken Reset, and broken component integration.
Add positive exception cases for intentional scrolling, decorative images,
portaled dialogs, and unchanged theme values. Verify a missing required
locator or interaction scenario produces incomplete coverage.

### Wave 3 — command and diagnostics

**Files.** `bin/cli.mjs`, `bin/check-page.mjs`, shared contract runner, reporter
mapping, and command tests.

**Work.** Add `--tests` to page checking and generate explicit runner configs
through the shared infrastructure. Aggregate source and browser findings;
report coverage by page, scenario, rule, viewport, and theme. Keep ordinary
static output and severity behavior intact. Attach failure traces/screenshots
without making visual snapshots the pass criterion.

**Gate.** Test single-file, directory, and omitted-target commands. Exercise
unknown routes, missing scenario setup, missing Chromium, server failure,
malformed reports, timeout, interruption, unexpected skips, and disabled
rules. Confirm nonzero exits for incomplete runs and verify cleanup and
source-data hashes. The static command runs without browser dependencies.

### Wave 4 — consumer gate and workflow

**Files.** New `scripts/smoke-page-tests` implementation and package script,
CI release checks, create-template configuration and README,
`.claude/skills/live-tokens-create-page/SKILL.md`, fix-findings and compliance
skills, related atlas trees, and `CHANGELOG.md`.

**Work.** Add `check:smoke-page-tests`. Pack the built package and install it
into a fresh project outside the repository, alongside a freshly generated
create-template case. Create the fixture pages and run the documented commands.
Use only package exports and local fixture services. Include a custom component
whose component contract passes, then prove that a page-only override or event
wiring defect fails the page contract.

Update the page skill to run strict page tests with complete applicable
coverage after the static compliance report. Replace only the manual items
whose automated cases establish equivalent coverage. Retain the editorial
review list. Map page and shared runner findings to concrete repair guidance.
Sync skill sources and atlas references after each skill change.

**Gate.** Both fresh consumers pass their valid fixtures and reject the defect
matrix with expected findings. Exercise custom Vite settings and a parameterized
route. Verify source data stays unchanged on success, failure, and interruption.
Run the repository checks, unit tests, component acceptance gate, page browser
suite, skill checks, smoke install, and smoke create. Add the page consumer gate
to pre-release CI. Record the command, coverage totals, and expected defect
findings as acceptance evidence.

## Completion criteria

The installed package validates a new page through its documented command in
a fresh consumer. It reports objective violations with actionable context,
accounts for every required scenario, and preserves the consumer's data.
Its skill distinguishes the automated pass from the remaining editorial
review. Both this gate and the component gate must pass before the system
claims shipped validation for new components and pages.
