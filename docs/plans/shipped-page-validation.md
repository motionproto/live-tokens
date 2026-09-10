# Shipped page validation

**Execution model.** The plan runs unattended as a Workflow with a heartbeat
monitor, never as a session that spawns an agent and waits. See Execution
below. Each wave is one `wave-executor` on the model the Status table names,
reviewed by one `wave-reviewer` on Opus. Sonnet takes the waves whose
definition of done is a listed fixture or an existing pattern. Opus takes the
two waves that calibrate a rule against a real page, where deciding whether a
failure is the page's or the rule's is the work.

## Goal and scope

Prove that a page uses the shipped components and the design tokens, as
rendered. `check-page` proves it in source today. This plan adds the part only
a rendered page can prove: that the cascade left every component painting from
its semantic properties, that every run of text sits in one shipped text style,
that every text and surface pair the page composes meets AA, that sections sit
on the page grid, and that nothing overflows its container. It also closes two
source-level gaps the static checker can catch on its own.

`npx live-tokens check-page <file> --tests` runs the source rules, then a
Playwright suite against the page's own route in the consumer's own app, and
reports every failure as a finding with a rule id and a line in the page file.

[Shipped component validation](shipped-component-tests.md) owns registration,
editor controls, token wiring, states, interactions, persistence, and Sketch.
This plan reuses its runner, data isolation, tool resolution, findings,
coverage, and consumer gate. Page tests never rerun a component contract.

Out of scope, and kept in the create-page skill's editorial review: routes and
parameters, forms and Reset, dialog confirmation, progress indication, focus
order, heading levels, alt text, labels, content priority, and reading order.
Those are usability and accessibility. This plan is design-system compliance.

## Status

| Wave | Deliverable | Model | Budget | Status | Commit |
|---|---|---|---|---|---|
| 1 | Two static rules: `native-control` and `property-override` | Sonnet | 45 min | Done | 40c2210, e17dcad |
| 2 | Page targets, the page suite, `page-component-paint` and `page-text-style` | Opus | 120 min | In progress | 0521a42, 868cdcc |
| 3 | `page-contrast`, `page-grid`, `page-overflow`, and the defect fixtures | Opus | 120 min | Not started | |
| 4 | `check-page --tests`: runner, reporter mapping, coverage | Sonnet | 90 min | Not started | |
| 5 | Consumer gate, template, skills, atlas, changelog | Sonnet | 120 min | Not started | |

## Execution

Three parts keep an overnight run from hanging: a workflow that owns the
waiting, a monitor that owns the deadline, and budgets that own the stopping.
The `workflow-execution` skill, user-level, does all three from this document.

**The workflow.** The `workflow-execution` skill runs the waves in order
from this table. Each wave is one executor agent followed by one reviewer
agent. A BLOCK gets one repair pass and one re-review. A second BLOCK, an
incomplete wave, or an agent that dies stops the run, and the result carries
the resume point. Progress shows in `/workflows`, every agent's return value
is journaled, and a rerun replays approved waves from cache. Start it from a
fresh session with:

```
/workflow-execution docs/plans/shipped-page-validation.md
```

The skill derives its arguments from this document: the waves, models, and
budgets from the Status table, the commit prefix `Page tests W` from the
Commit-unit protocol, and the heartbeat slug `shipped-page-validation` from
the file name. The script is `~/.claude/skills/workflow-execution/
workflow-execution.js`.

**The monitor.** The skill arms `monitor.sh` from the same directory as a
persistent Monitor on `scratch/waves/shipped-page-validation/` before the
workflow starts. Every executor and reviewer appends a timestamped line there
before and after each step; that rule is in their agent definitions. The
monitor emits one line per wave commit, `DONE` when Wave 5's commit lands,
and `STALE` once when no heartbeat has been written for twenty minutes, then
exits so the event is never repeated. On `STALE` the session checks
ListAgents and the process table. Nothing live means the run is stuck: the
session stops the workflow, reads its journal, and resumes it from the stuck
wave, then re-arms the monitor. The longest single background command in the
plan, the component gate, takes thirteen minutes, so twenty is silence.

**The budgets.** The Status table gives each wave a wall-clock budget. The
executor's prompt carries it, and the executor stops at it with an exact
resume point instead of overrunning. The reviewer gets a third of the wave's
budget and blocks on anything it could not verify in time. An incomplete
wave with a resume point is a normal outcome the next run picks up; a silent
agent is the only failure, and the monitor turns it into an event.

**What cannot hang.** A command that may exceed ten minutes runs in the
background and the harness re-invokes the agent on exit. No agent polls,
sleeps in a loop, or greps the process table for its own pattern. Every
child the runner and the gate scripts spawn carries a deadline in code, which
Wave 4 adds to the shared spawn helper and Wave 5 to the gate. Nothing an
agent runs can prompt: `CI=1`, `npx --yes`, `GIT_TERMINAL_PROMPT=0`.

## Current behavior

`bin/check-page.mjs` proves, per page: every imported component is in the
catalogue, every prop is declared and every prop value is in its union, every
`var()` names a design token or a semantic property, and no color literal, no
themed-geometry literal, and no raw font axis survives. `report` lists the
pages that render no catalogue component. `discoverPages` returns source files
and knows nothing about routes.

What a page can still do wrong, and what each rule below catches:

| Defect | Passes today because | Rule |
|---|---|---|
| A raw `<button>` or `<input>` where Button or Input belongs | Markup carries no token | `native-control` |
| `--card-default-body-padding: var(--space-8)` on one instance | The value is a token | `property-override` |
| `button { border-radius: var(--radius-full) }` in site.css | The value is a token; only the cascade knows it reached every Button | `page-component-paint` |
| Paragraphs inside a container set in a heading style | Inheritance is invisible to source | `page-text-style` |
| `--text-secondary` on `--surface-brand` | The theme gates its own pairs; the page made a new one | `page-contrast` |
| A section whose edges sit off the column lines | A `grid-column` number is not a value the checker can place | `page-grid` |
| A Button clipped by a narrow column, or a horizontal scrollbar at 390px | Geometry is not in source | `page-overflow` |

## Reserved judgment calls (already decided, do not re-litigate)

1. **Opt in by flag, always on in the skill.** `check-page` without `--tests`
   is the lint it is today, byte-identical. The create-page skill passes
   `--tests --strict`. `report` stays static and says so.
2. **No scenario file.** A page target is a source file plus the route whose
   entry names it in `source`. The suite derives everything else from the
   rendered page and the shipped component contracts. There is no page
   contract type, no declared regions, no text roles, no app-state setup, no
   mock services, no declared expectations of any kind.
3. **Routes come from the route table.** The file that renders
   `LiveTokensRouter` is found by import; its `pages` object is read the way
   `missing-source` already reads `lazy:` entries, and `source` maps each
   route to a page file. A route the table cannot express, one served by
   `resolve()`, is mapped in `live-tokens.testing.ts` under a new
   `pageRoutes` setting, page path to concrete URL. A target with neither is
   a `tests-setup` finding naming the file. Parameter values are never
   guessed, and the app entry point is never imported into Node.
4. **Two fixed viewports.** 1280x900, the contract project's own, and
   390x844. The settings file may replace the list under `pageViewports`.
   Nothing is derived from a page's breakpoints.
5. **One theme.** The isolated data copy strips the session pointers, so the
   run boots the project's default theme. The static rules prove the page is
   written in tokens; `page-component-paint` proves the cascade kept them.
   A theme change then follows by construction and is not retested.
6. **Instances are found by contract root selectors.** Each shipped contract
   declares `root` and `parts`. The suite resolves the root selector inside
   the mounted page container, never the overlay, and reads the instance's
   variant from its root class list against the contract's variant labels
   lowercased. Button renders `class="button primary"`; every variant-keyed
   contract follows that convention or the wave records the exception.
7. **Rules read the theme from `:root` at the same viewport.** Text styles
   carry media overrides at 768px and 480px, so the expected axes are the
   computed custom properties at that viewport, never values read from a
   file.
8. **Findings anchor on the page file.** `file` is the route's `source`.
   `line` comes from Svelte's dev-build element metadata, which names the
   file and line of every element the page renders. For an element inside a
   component, the nearest ancestor whose metadata names the page file gives
   the line of the instance. When metadata is absent, line 1, as the
   component plan documents.
9. **Rule ids.** Static: `native-control`, `property-override`, both `warn`
   by default, on the same reasoning as `control-size`. Runtime:
   `page-component-paint`, `page-text-style`, `page-contrast`, `page-grid`,
   `page-overflow`. Shared: `tests-not-installed`, `tests-setup`,
   `tests-incomplete`. Runtime rules accept `--off`, which shows as
   `disabled` coverage and cannot establish a complete pass.
10. **Inapplicable is a status with a reason**, never a silent pass:
    `page-grid` below 768px, `page-contrast` over an image, gradient,
    translucent ancestor, or blend mode, `page-component-paint` on a page
    with no shipped instance, `page-text-style` on a page with no text.
11. **Playwright only.** The page suite spawns no Vitest run. The runner's
    required tools stay the three the component run lists, so one install
    serves both commands.
12. **Version.** A new flag, two new settings, two new static rules, and
    five new runtime rules are a minor bump under `Unreleased`.

## Global invariants (reviewer checklist)

1. **The lint is unchanged without the flag.** `check-page` with no `--tests`
   produces byte-identical output to `main` for `check-page.test.ts` and the
   template, except for the two static rules Wave 1 adds, whose fixtures are
   the only diff.
2. **Shipped code imports shipped code.** Nothing under `src/testing/`
   imports from `src/app/` or `tests/`. The contrast helper comes from
   `src/editor/core/palettes/contrast.ts`.
3. **Nothing loads a test tool at module top.** `bin/cli.mjs`,
   `bin/check-page.mjs`, and `bin/contractRunner.mjs` import neither
   `@playwright/test` nor `vitest`. `bin/engineLoadsLazily.test.ts` stays
   green with `dist-plugin/` moved aside.
4. **No scenario type reaches `./testing`.** The two new settings,
   `pageRoutes` and `pageViewports`, are the whole public surface.
5. **The data tree is untouched.** Tests write only to the isolated copy.
   `node scripts/check-production-is-default.mjs` at every wave boundary.
6. **Defect fixtures never ship and are never discovered.** They live under
   `tests/e2e/page-defects/`, mount only on the demo app's dev-only defect
   routes, and appear in no consumer run.
7. `npm run check`, `npm test`, `npm run test:e2e:contract`, `check:skills`,
   `check:skill-atlas`, `check:skill-sources`, `check:smoke-install`,
   `check:smoke-create`, and `check:smoke-component-tests` green at every
   wave boundary. Wave 5 adds `check:smoke-page-tests`.
8. Nothing pushed, tagged, or published by an executor.

## Commit-unit protocol

One wave, one commit. Run the wave's verification green before committing;
never commit red. Commit message `Page tests W<n>: <summary>` plus the standard
co-author trailer. Do not push, tag, or release. Stop after each wave for
review. If reality contradicts this plan (a cited file is missing, a check pins
conflicting behavior), stop and report rather than improvise.

Never stash, reset, or checkout over uncommitted changes.

## The rules

### Static, in `bin/check-page.mjs`

| Rule | Finding | Message names |
|---|---|---|
| `native-control` | A `<button>`, `<input>`, `<select>`, or `<textarea>` tag in a page's markup. | The shipped component for the element: Button or IconButton, Input, MenuSelect, Input. |
| `property-override` | A page declares or sets a name in the vocabulary's `componentTokens`, in a style block, an inline `style`, a `style:` directive, or `setProperty`. | The component, and that the whole project retunes it at `/live-tokens/components`. |

`declaredHere` already collects the names a page declares in every one of
those places, so `property-override` is the intersection of that set with
`vocab.componentTokens`, and `unknown-token` is unchanged.

### Runtime, in `src/testing/page-*.contract.ts`

| Rule | Obligation | Evidence |
|---|---|---|
| `page-component-paint` | Every shipped component instance on the page paints each contracted part from its semantic property. | For each instance found by a contract root selector, and for each `paints` entry that applies to its variant with no `state` or `setup`, the part's computed value equals the resolved value of the named property on that instance, normalized the way `assertPaintsFromToken` normalizes. |
| `page-text-style` | Every block-level element with its own text renders in one shipped text style. | Family, size, weight, line-height, and letter-spacing equal one bundle among `heading-*`, `body-*`, `editorial-*`, and `code`, read from `:root` at the viewport. Elements inside a shipped component root are the paint rule's; inline phrasing elements are skipped. The message names the nearest bundle and the axis that missed. |
| `page-contrast` | Every text and surface pair the page composes meets AA. | Effective background is the first opaque ancestor background. Ratio at or above 4.5, or 3.0 at 24px, or 18.66px at weight 700 and above. The message names both computed colors and the tokens on the element and the surface ancestor when their resolved values match one. |
| `page-grid` | Sections sit on the page grid. | The page grid is any element whose computed track count equals `--columns-count`. Each direct child's left and right edges land on a track edge within 1px. A page with no such element is a finding: the skill says the page is the column grid. Inapplicable below 768px. |
| `page-overflow` | Nothing overflows its container. | `documentElement.scrollWidth` is at most the viewport width. No element in the page has `scrollWidth` beyond `clientWidth` plus 1px unless its `overflow-x` is `auto` or `scroll`. Every shipped instance root's box lies inside its nearest clipping ancestor. |

Each rule runs at both viewports except as marked. Coverage is reported by
page, rule, and viewport. A rule that observed nothing on a page reports
`inapplicable` with the reason, never `passed`.

## Wave 1 — the two static rules

**Files.** `bin/check-page.mjs`, `bin/check-page.test.ts`,
`.claude/skills/live-tokens-fix-findings/SKILL.md` gains two rows in The
remaining rules, and the atlas syncs.

**Do.** Add `native-control` and `property-override` to `PAGE_RULES` at
`warn`. `native-control` reads the markup region with the same tag scan
`checkComponentUsage` uses, skipping tags inside `{@html}` and skipping
`<input type="hidden">`. `property-override` intersects `declaredHere` with
`vocab.componentTokens`, one finding per name at its first site.

**Verify.** A fixture per rule fails, a clean page passes, and every existing
fixture's output is unchanged. `npx live-tokens check-page` on the template
and on this repo adds no finding. `check:skills`, `check:skill-atlas`,
`check:skill-sources` OK.

## Wave 2 — page targets and the first two runtime rules

**Files.** New `bin/lib/pageRoutes.mjs`, `src/testing/config.ts`,
`src/testing/playwright.ts`, new `src/testing/page-compliance.contract.ts`,
new `src/testing/support/pageHarness.ts`, and `src/editor/overlay/
LiveTokensRouter.svelte` if the page container needs a stable attribute.

**Do.**

- `resolvePageTargets(paths, root)` returns `[{ source, route }]`. It finds
  the router file by its `LiveTokensRouter` import, reads the `pages`
  object's `source` fields, merges `pageRoutes` from the settings file with
  the same static scrape `scrapeSettingsField` uses, and fails a target with
  no route. With no paths, every mapped page is a target.
- `pageRoutes` and `pageViewports` join `LiveTokensTestingConfig` and
  `resolveTestingConfig`, exported through `./testing`.
- `createPlaywrightConfig` gains a `page` project matching
  `**/page-*.contract.{ts,js}`, workers 1, targets passed through a
  `LIVE_TOKENS_PAGES` environment variable as JSON.
- The harness opens a route, waits for the page container, `fonts.ready`,
  and network idle, and exposes `instances()`, `textElements()`, and
  `lineOf(element)` from Svelte's element metadata. Verify the metadata is
  present under the consumer's default Vite dev build; record the fact.
- The suite implements `page-component-paint` and `page-text-style` and
  throws `PageViolation`, a sibling of `ContractViolation` carrying rule,
  source, and line.

**Verify.** The suite runs green against the template's Home page and
against this repo's `src/app/Home.svelte` and `src/demo/Demo.svelte`, or
each finding it raises on them is either fixed in the page or recorded here
as a calibration note with the rule change it caused. Concrete instances
before architecture: the two demo pages are the first ground truth, and a
rule that fails on a correct page is the rule's defect.

### Wave 2 calibration record

**Rule changes the ground truth forced.**

1. *A resting instance is in the `base` and `default` states.* Read literally,
   "each `paints` entry with no `state` or `setup`" leaves Button contributing
   nothing: every one of its entries carries a state label (`base` for layout,
   `default` for resting colour) and the entries with no label carry `setup`.
   The rule skips a *transient* label instead — one naming hover, active,
   disabled, focused, error, selected, open, menu, or option — and takes every
   other label as painting at rest, including the structural part labels
   (Header, Body, Footer). Resting entries in `contract.states` join the
   `properties` entries for the same reason.
2. *A variant-less entry inherits `contract.view.variant`.* Button's `states`
   name no variant and paint `--button-primary-*` because the contract's view
   opens on Primary. Matched against every instance, they reported a Secondary
   button as painting the primary surface. The entry's variant is now
   `entry.variant ?? contract.view.variant`.
3. *The normalization probe carries the part's own font size.*
   `assertPaintsFromToken` appends its probe to the part's parent, which on a
   page is the wrong ruler for a unitless line height: a Button at 15px inside
   a Card body at 16.67px made `--button-primary-text-line-height: 1.5` read as
   25px against a painted 22.5px. The probe now seeds `font-size` from the part
   before setting the property under test, so a `font-size` token still
   overwrites the seed and resolves its own relative units against the parent.
   The component suite's probe has the same blind spot and the preview stage
   hides it. Flagged, not changed.
4. *Eyebrow is a shipped text style.* The rule reads `TEXT_STYLES`
   (`src/editor/ui/sections/textStyles.ts`) rather than the plan's list of
   `heading-*`, `body-*`, `editorial-*`, and `code`, so the bundles cannot
   drift from the editor's twelve.
5. *A component the page never renders is absent, not an unmatched variant.*
   Decision 6's exception is reported only when the page renders an instance
   whose root classes name none of the contract's variants.
6. *A contract's `view` lends a page instance its variant and nothing else.*
   The first cut also inherited `contract.view.setup` and `contract.view.state`
   into the resting filter. `view` opens the *component editor*: its `setup`
   drives preview-stage controls no page has, and its `state` names a tab.
   Inheriting them disqualified every entry that declared no setup of its own,
   so `restingPaintSpec` returned null for Input, Notification, and Image
   Lightbox, and the rule asserted nothing for those three on any page while
   the run still reported a pass. An entry is now filtered on its own `setup`
   and its own `state`, and inherits only `variant`. That restores 24 checks
   for Input, 72 across Notification's four variants, and Image Lightbox's five
   tile paints. Menu Select and Segmented Control, whose views open on a
   transient tab, label every entry themselves, so the state half changed
   nothing for them.

**What the pages proved.** `src/app/Home.svelte` at 1280x900: 25 instances,
276 contracted paints, 0 failures. `src/demo/Demo.svelte` passes
`page-component-paint` at both viewports. Both still pass after note 6's
repair; neither renders an Input, a Notification, or an Image Lightbox, so
`pageHarness.test.ts` is what holds the checks the repair restored until Wave
3's fixtures render one.

**The demo pages are not compliance targets.** `live-tokens.config.json`
already excludes `src/demo` and `src/app/Home.svelte` from `check-page`.
`page-text-style` reports 40 of 43 runs of text on `/demo` and 13 of 13 on the
floating-tags playground, and every one composes type from single-axis scale
tokens (`--font-size-7xl`, `--font-display`, `line-height: .9`) that the static
`raw-text-axis` rule already calls an error. The rule agrees with the checker
the project already runs on the pages it does check. The three runs that pass
are the demo's plain `<p>` elements, which site.css leaves in `body-md`: the
positive case works. Wave 3's clean fixture is where a whole compliant page
proves the pass.

**Home has no text of its own.** Every run of text on `src/app/Home.svelte` and
on the template's Home sits inside a `Card`, so `page-text-style` is
inapplicable there by construction and the paint rule carries the card's own
parts, `--card-default-body-*` among them. The two rules partition a page's
text rather than overlapping, and where the partition leaves a seam is the
first item under For review.

**Svelte's element metadata is present under the default dev build.**
`__svelte_meta.loc` carries `{ file, line }` with `file` a project-root-relative
POSIX path (`src/editor/overlay/LiveEditorOverlay.svelte`), so `lineOf` matches
by suffix. Neither this repo's Vite config nor the template's sets
`compilerOptions.dev`, so both take vite-plugin-svelte's serve-mode default.
A page that delegates to section components anchors every finding on the
delegating element: all 40 findings on `src/demo/Demo.svelte` land at line 11,
its `.kit` wrapper, because Svelte stamps metadata on elements and a
`<SectionHero />` tag is not one. Decision 8, working as written.

**The page container is an attribute, not a wrapper.**
`LiveTokensRouter` marks `.lt-app` with `data-live-tokens-page`, and the two
chrome children — the editor overlay and the column guides — with
`data-live-tokens-chrome`. A wrapper element around the page would have broken
`SkillAtlas.svelte`'s `:global(.lt-app.lt-app:has(> .skill-atlas))`.

**Deferred to Wave 5.** Running the suite inside a fresh `create` project is
the consumer gate's own work (`check:smoke-page-tests`). The template's Home
is this repo's Home in shape: a Card holding an h1, a p, and two Buttons.

**For review.** Five boundary questions the ground truth raised, none
resolved here.

*Slot children neither rule sees.* `src/app/Home.svelte` sets its own `h1` to
`--font-display` and `--font-size-4xl` inside a `Card`. `page-text-style`
skips it as the paint rule's, and the paint rule checks Card's declared parts
(`.card-body`, `.card-title`), not an arbitrary slot child, so the raw axes
pass both. Card pins its own typography onto nested `p`/`ul`/`ol`/`li`, which
is why the exclusion is right for those; an `h1` is outside that set. Holding
slot children to a bundle would be the change, and it belongs with Wave 3's
fixtures, where a clean page can prove which way is correct.

*Chrome a page draws itself.* `page-text-style` holds a
`<span class="ftt-tag-label">`, a decorative chip label inside a diagram, to
the same obligation as a paragraph. Whether page-drawn UI chrome owes a text
style is a judgment for the fix-findings guidance in Wave 5.

*A font stack that names the same face.* `page-text-style` compares
`fontFamily` as an exact computed string, so an element that declares
`--font-sans` through a shorter stack than the bundle's reports a family miss
while rendering in Manrope. On the demo those elements sit on raw single-axis
declarations `raw-text-axis` already errors on, so the findings are true there,
and the rule's only proof of the positive case is the demo's three plain `<p>`
elements. Wave 3's clean fixture has to carry a page that composes a bundle
through a token and passes.

*A setup that only reveals a part.* Section Divider declares
`showOptionalContent` on all three of its entries, so the rule's own-setup
filter leaves it with no page obligation at all. That setup makes the
description and the eyebrow visible in the editor; on a page they are either
rendered or absent, and an absent part is already skipped. Reading `setup` as
two kinds, one that reveals a part and one that changes a value, would give
Section Divider its resting paints back. Wave 3's fixtures are where a Section
Divider on a clean page can decide it.

*A prop-driven component state.* The rule measures every instance against its
resting paints, whatever state the page put it in. A disabled Button on a
correct page paints `--button-primary-disabled-surface`
(`src/system/components/Button.svelte:308`) and fails the
`--button-primary-surface` check; an `<Input error="...">` paints
`--input-error-border` through `.input-field.invalid`
(`src/system/components/Input.svelte:292`) and fails `--input-default-border`.
Note 6 widened the exposure by restoring Input's checks. Neither calibration
page renders a disabled or errored instance, so the ground truth could not
raise it. Two resolutions: skip an instance whose root matches one of the
contract's own non-default state selectors, or read the instance's state from
its root classes the way the variant is read and select that state's paints.
Wave 3's fixtures decide it, and they render one disabled Button and one
errored Input so the chosen rule is proved on a page.

## Wave 3 — the last three rules and the defect fixtures

**Files.** `src/testing/page-compliance.contract.ts`,
`src/testing/support/pageHarness.ts`, new `tests/e2e/page-defects/` with one
page per rule and one clean page, `src/app/App.svelte` for the dev-only defect
routes, and `playwright.config.ts` for a `page-defects` project.

**Do.** Implement `page-contrast`, `page-grid`, and `page-overflow`. Write
one deliberate defect per runtime rule: a site.css radius on every button, a
heading-styled container with paragraphs inside, secondary text on a brand
surface, a section spanning columns 2 to 12 with an edge off the line, and a
fixed-width control in a 390px column. Write the positive exceptions: a
gradient hero marked inapplicable, a horizontally scrolling code block, a
local three-column grid inside a section, and a page with no shipped
instance.

**Verify.** Each defect fails with its rule id and the page file's line.
Each exception passes or reports `inapplicable` with its reason. The clean
page passes at both viewports. `test:e2e:contract` unchanged.

## Wave 4 — `check-page --tests`

**Files.** `bin/cli.mjs`, `bin/check-page.mjs`, `bin/contractRunner.mjs`,
`bin/check-page.test.ts`, `bin/contractRunner.test.ts`.

**Do.** Extract from `runContractTests` the parts both runs share: tool
findings, isolation, generated configs, spawn, report reading, infrastructure
classification, and cleanup. Add `runPageTests(targets)`, which writes the
Playwright config with only the `page` project, sets `LIVE_TOKENS_PAGES`, and
maps the report: `PageViolation` to a finding at the page file and line,
timeouts and interruptions to `tests-incomplete`, and expected page, rule,
and viewport triples reconciled against results. `check-page --tests` runs
the static rules first and appends the runtime findings and a coverage
section to `--json`. Static output and severity behavior are untouched.

The shared spawn helper gains a deadline, fifteen minutes by default and
`LIVE_TOKENS_TESTS_TIMEOUT` to change it: at the deadline it sends SIGINT,
then SIGKILL after five seconds, and the run reports `tests-incomplete`
naming the tool and the bound. `createPlaywrightConfig` sets `globalTimeout`
to the same bound. Both runs, component and page, get this; a hung child can
no longer hold a caller open.

**Verify.** Single file, directory, and omitted targets. Unknown route,
missing Chromium, dev-server failure, malformed report, timeout,
interruption, `--off` on a runtime rule, and zero targets each exit nonzero
with the expected rule. `node scripts/check-production-is-default.mjs` after
a run that failed and a run that was interrupted. The static command runs
with `@playwright/test` absent.

## Wave 5 — the consumer gate, the template, the skills, and the changelog

**Files.** New `scripts/smoke-page-tests.sh` and `scripts/lib/pageGate.mjs`,
`package.json`, `.github/workflows/publish.yml`, `template/package.json`,
`template/README.md`, `.claude/skills/live-tokens-create-page/SKILL.md`,
`.claude/skills/live-tokens-check-compliance/SKILL.md`,
`.claude/skills/live-tokens-fix-findings/SKILL.md`, the atlas trees, and
`CHANGELOG.md`.

**Do.**

- The gate packs the built package into a fresh project outside the
  repository, alongside a fresh `create` case, and runs the documented
  command on a clean page and on one page carrying a site.css override. The
  clean page passes; the override fails `page-component-paint` at the page
  file. Source-tree hashes prove the data tree is unchanged. Keep the run to
  those two pages; the component gate measured what a batch costs. The gate's
  Node half carries a deadline of its own, twenty minutes, and exits nonzero
  naming the step that did not finish. `componentGate.mjs` gets the same
  deadline in the same commit.
- The template's `test:design` becomes
  `live-tokens check-component --tests && live-tokens check-page --tests`.
- create-page's Verify runs `npx live-tokens check-page <file> --tests
  --strict` after live-tokens-check-compliance. The manual line "every
  control stays inside its wrapper" moves to the automated run. Every other
  editorial line stays.
- check-compliance gains one paragraph: `report` stays static; `check-page
  --tests` is what create-page runs for the rendered page, and its five rule
  ids are read the same way.
- fix-findings gains five rows in The remaining rules, each naming the page
  file line the finding carries and the repair: remove the global rule and
  retune in the editor, set the container's text style on the text element,
  pick the text token the surface pairs with, move the edge to the column
  line, give the control its shipped width.
- After every skill edit run `npm run sync:skill-atlas` and
  `npm run sync:skill-sources`.

**Verify.** `check:smoke-page-tests` OK and wired into `publish.yml` beside
the component gate. `check:skills`, `check:skill-atlas`, `check:skill-sources`,
`check:smoke-install`, `check:smoke-create`, `check:smoke-component-tests`,
`npm run check`, `npm test`, `test:e2e:contract`, and the page defects
project all green. Record the command, the coverage totals, and the expected
defect findings here as acceptance evidence.

## Completion criteria

In a fresh consumer, the installed package proves through its documented
command that a page's rendered components paint from their semantic
properties, that its text sits in the theme's text styles, that its text and
surface pairs meet AA, that its sections sit on the page grid, and that
nothing overflows, and it names the page file line of each failure. The
static checker catches raw controls and per-instance property overrides
before a browser opens. The create-page skill runs the command and keeps its
editorial review for what no rule decides.
