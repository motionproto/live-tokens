# Accessibility property marks

Plan of 2026-10-23, approved and run the same day. It builds on `docs/plans/a11y-editor.md`
and `docs/plans/a11y-testing.md`, both executed the same day on local main.

Every finding of a run marks its component: the rail "!" and the panel count
every result, check-by-eye results included. Every finding that traces to a
component property puts a "!" beside that property's row. The run also gains
four checks that trace to properties: focus indicator contrast, control
boundary contrast, text spacing per component, and reduced motion per
component. Run test runs in the background, so these checks cost the reader no
waiting.

```
Component page (Input)
  ┌──────────────────────────────────────────────────────────────┐
  │ ! 4 accessibility issues                     Last run 14:02  │
  │ Fix with a property                                          │
  │   ! Focus ring 1.9:1 against the page, needs 3:1             │
  │       Focused border colour →                                │
  │ Fix in the component's code                                  │
  │   ! Focus changes nothing visible, error / field             │
  │       Focused border colour →  Error border colour →         │
  │ Check by eye                                                 │
  │   ? Text over a gradient, 2 elements                         │
  │       Default text colour →  Default surface →               │
  └──────────────────────────────────────────────────────────────┘
  Error border colour  !  [■ --input-error-border ▾]
```

## Ground truth

- The component suite `src/testing/component-a11y.contract.ts` scans each
  variant and state view with `scanAxe` and `scanFocusVisible`
  (`src/testing/support/a11y.ts`). `Occurrences` keeps one result per rule,
  engine rule and target, and lists the views it failed in.
- A result names its element by a CSS selector (`details.target`) and nothing
  else. No finding names a property today.
- Chromium alone runs the suites (`bin/contractRunner.mjs` installs it), so
  the DevTools protocol is open to a test through `newCDPSession`.
- A probe on 2026-10-23 against the running editor showed that
  `CSS.getMatchedStylesForNode` traces each sample finding to its property:
  - Slider `target-size` at `.low`: `height: var(--_thumb-size)`, and a matched
    ancestor rule sets `--_thumb-size: var(--slider-range-thumb-size)`.
  - Input `SIA-R65` in the error state, with `:focus` and `:focus-visible`
    forced through `CSS.forcePseudoState`: the focus rule sets
    `outline: var(--input-focused-border-width) solid var(--input-focused-border)`,
    and the later invalid rule overrides it with `--input-error-border`.
  - Button `color-contrast` that axe could not decide:
    `color: var(--button-primary-text)`,
    `background: var(--button-primary-surface)`, and the `::before` shimmer's
    `display: var(--button-shimmer, block)`.
  The probe script is `scratch/a11y-props/probe.mjs`.
- The page's matched rules include the editor's own (`--ui-*`) and the
  theme's (`:root`). The registry entry of each component, which
  `window.__liveTokensEditor.getComponentRegistryEntries()` returns, lists
  its `schema` tokens and its `intrinsics`. Together they name every property
  a row can set.
- Property rows carry `data-token-variable` (`UITokenSelector`,
  `UIPaletteSelector`, `GradientEditor`) or `data-token-variables` on a
  `.property-row` (config toggles such as `--button-shimmer`).
- `ComponentA11yIssues` (`src/editor/core/a11y/a11yReport.ts`) sorts a run
  into `contrast`, `code` and `review`. `issueCount` leaves `review` out, so
  a component with check-by-eye results alone has no rail mark and no panel.
- The last saved runs: 86 findings on royal-velvet, 59 of them `a11y-review`
  `color-contrast`, 30 of those on Button
  (`scratch/a11y-run.json`, `scratch/a11y-run-default.json`).
- No check measures a focus indicator's contrast or a control's boundary. The
  editor's contrast pairs carry `role: 'non-text'` for icons only.
- The page suite's `scanTextSpacing` and `scanReducedMotion`
  (`src/testing/support/pageHarness.ts`) run per page, never per component.
- Criterion numbers below are WCAG 2.2 success criteria. 1.4.11 Non-text
  Contrast and 1.4.12 Text Spacing entered in 2.1 and stand unchanged in 2.2.

## Decisions

**D1. The test traces a result to properties.** A new
`src/testing/support/traceProperties.ts` exports
`traceProperties(page, target, axes, known)`. It opens one CDP session per
page and calls `CSS.getMatchedStylesForNode` on the target, its pseudo-elements
and its ancestors up to the scan scope. It keeps the declarations whose CSS
property is on the rule's axis list (D2) and reads every `var(--name)` in
their values.

**D2. Each engine rule has an axis list.**

| Engine rule | Axes |
|---|---|
| `color-contrast` | the target's `color`, `background*`, `opacity`, `text-shadow`; every declaration on its pseudo-elements; `background*` and `opacity` on ancestors |
| `SIA-R65` | `outline*`, `box-shadow`, `border*`, `background*`, `color`, `text-decoration*` under forced `:focus` and `:focus-visible` |
| `target-size` | `width`, `height`, `min-*`, `inline-size`, `block-size`, `padding*`, on the target and its pseudo-elements |
| `focus-indicator-contrast` (D8) | as `SIA-R65`, plus `background*` on ancestors |
| `control-boundary-contrast` (D9) | `border*`, `background*` on the part; `background*` on ancestors |
| `text-spacing` (D10) | `height`, `max-height`, `width`, `max-width`, `line-height`, `padding*`, `overflow*`, `white-space` |
| `prefers-reduced-motion` (D11) | `animation*`, `transition*` |

Every other engine rule, the ARIA rules and the keyboard cases among them,
traces nothing. Its finding marks the component and the panel alone.

**D3. Tracing stops at a known property.** `known` is the component's
`schema` variables and `intrinsics` variables. A name in `known` is kept. A
name outside it whose declaration matches the target or an ancestor, such as
`--_thumb-size`, is followed through its value. Any other name drops: the
theme's and the editor's variables never reach a finding.

**D4. Tracing runs once per result.** `Occurrences.add` traces a result the
first time its key appears, while its view is on screen, and keeps the
variables for later views.

**D5. A finding carries `details.variables`.** It is sorted, unique, and
absent when the trace is empty. The runner passes it through `--json`, and
`A11yFinding.details` in `a11yReportTypes.ts` gains it. The field is
additive; no field changes.

**D6. Every finding counts.** `issueCount` adds `review`. The rail "!" shows
for any finding. The panel shows every group:

- "Fix with a property" holds the editor's contrast failures and the
  `focus-indicator-contrast` and `control-boundary-contrast` failures.
- "Fix in the component's code" holds every other `a11y-*` finding but
  `a11y-review`.
- "Check by eye" holds `a11y-review`, inline, where the panel had one link to
  the view. The Accessibility view keeps its collapsed list.

Rows group by engine rule and variables: findings that share both make one
row that names its element count and its views. Each row carries a "→" per
traced property, reusing the panel's reveal. A check-by-eye row and its
marks draw in `--ui-text-tertiary`, the rest in `--ui-highlight`.

**D7. A property row carries a "!" beside its label.** One component,
`src/editor/ui/a11y/A11yPropertyMark.svelte`, renders in every row host that
carries `data-token-variable` or `data-token-variables`. It shows when the
last finished run has a finding whose `variables` name the row's variable,
and opens a popover, through `UIInfoPopover`, that lists those findings and
their views. The editor's own contrast failures add no mark: the live
readout already shows a "!" in the value and moves as the value changes. The
mark carries no text node, as the rail mark does, because the contract
harness matches rows by their text.

**D8. Focus indicator contrast.** Engine rule `focus-indicator-contrast`,
reported under `a11y-component`, SC 1.4.11 at 3:1. In each view, the suite
forces `:focus` and `:focus-visible` on each focusable element in scope. The
indicator colour is the `outline-color` when the outline has a style and a
width, else the colour of the first non-inset `box-shadow`, else the
`border-color` when focus changes it. The adjacent colour is the backdrop
outside the element: the ancestors' `background-color`s composited in order
over the page background. Below 3:1 is a violation. A gradient or image
backdrop makes an `a11y-review` result. An element with no indicator is
`SIA-R65`'s finding and adds none here.

**D9. Control boundary contrast.** Engine rule `control-boundary-contrast`,
under `a11y-component`, SC 1.4.11 at 3:1. A contract declares the parts that
draw a control's visible edge in a new optional field,
`boundaries?: { part: string; label: string }[]`, in `componentContract.ts`.
The wave adds it to every shipped control that draws its own edge: Input,
RadioButton, Slider, Toggle, SegmentedControl and any other the wave finds. Per view, a part passes when
its border, at 1px or wider, or its surface contrasts 3:1 with the backdrop
behind it. A failure names both measured ratios.

**D10. Text spacing per component.** The suite applies the page suite's SC
1.4.12 override in each view and reports each element in scope that
overflows or clips under it and did not before, under `a11y-text-spacing`.
The override CSS and the before-and-after comparison move into a shared
support module, which the page harness and the component suite both import.

**D11. Reduced motion per component.** The suite records, in each view, the
animations in scope that run longer than `MOTION_MS`. After the plain views
it emulates `prefers-reduced-motion: reduce`, reselects only those views, and
reports each animation still running under `a11y-reduced-motion`. A
component with no long animation costs no second pass.

**D12. No new rule.** The new results report under `a11y-component`,
`a11y-text-spacing` and `a11y-reduced-motion`, all at `warn`, so `--off`,
`--strict`, the rule docs and the skills keep their shape. `--strict` raises
them as it raises the rest.

**D13. Time budget.** `check-component --tests --a11y` takes about 3 to 3.5
minutes for 29 components today. After Wave 5 it stays under 6 minutes on
this machine; Wave 5 records the measure.

## Invariants

1. No rule id, theme token or shipped default is added or changed.
2. Every existing `--json` and report field keeps its shape; `variables` and
   `boundaries` are additive.
3. Marks add no text to any element the contract harness matches by text.
4. The full contract run passes with no failure: the new results are
   warnings.
5. The editor's contrast checker stays the source of colour-pair contrast,
   and axe's `color-contrast` violations stay out of the editor report.
6. Every run that touches the data tree restores it per `CLAUDE.md`, and
   `node scripts/check-production-is-default.mjs` passes after each wave.

## Out of scope

- Fixing the findings.
- Forced colours, and SC 2.4.11 Focus Not Obscured.
- Focus appearance at SC 2.4.13, which is AAA.
- Skill text for `boundaries`. Wave 6 lists it as a decision: the
  create-component skill and `contract-tests.md` feed three billing eval
  cases, so naming the field there takes the syncs and a rehash.

## Running the plan

One orchestrator session runs the waves in series, one session per wave,
each writing the code, running its Verify commands and fixing what they
report. The orchestrator leaves one report at the end, in
`temp/a11y-property-marks-report.md`. Each wave commits on local main with
the prefix `A11y marks W<n>: `.

## Wave 1: property tracing

- `traceProperties.ts` per D1 to D3, and the axis table of D2 for the three
  engine rules that exist today.
- `A11yResult` gains `variables?: string[]`; `Occurrences` traces per D4;
  `recordA11y` and the runner carry the field to `details.variables` (D5).
- Tests: a Playwright spec in `tests/e2e/` over a fixture component that
  hides its property behind a private custom property, asserting the trace
  names the schema variable and drops `--ui-*` and `:root` names; the
  runner's mapping test gains `variables`.

**Verify.** `npm run check`, `npx vitest run bin src/testing`,
`node bin/live-tokens.mjs check-component slider input button --tests --a11y --json`
names `--slider-range-thumb-size`, `--input-focused-border` and
`--button-primary-text` among the findings' `variables`.

## Wave 2: every finding marks

- `issueCount` and the grouping of D6, in `a11yReport.ts` and `a11yView.ts`.
- The panel shows all three groups, merges rows per D6, and gives each
  traced property a "→".
- The Accessibility view counts check-by-eye results in its totals and its
  per-component counts.
- Tests: `A11yPanel.test.ts` and `a11yView.test.ts` for a component with
  check-by-eye results alone, for merged rows, and for property links;
  `tests/e2e/a11y-markers.spec.ts` for the rail mark on such a component.

**Verify.** `npm run check`, `npx vitest run src/editor`,
`npx playwright test tests/e2e/a11y-markers.spec.ts tests/e2e/accessibility-view.spec.ts`.

## Wave 3: property row marks

- `A11yPropertyMark.svelte` per D7, placed in each row host.
- A test that renders every registered component's editor with a report
  naming each of its variables and finds a mark on every row that carries
  the variable.
- `tests/e2e/a11y-markers.spec.ts`: the mark, its popover, and the "→"
  landing on a marked row.

**Verify.** `npm run check`, `npx vitest run src/editor`,
`npm run test:e2e:contract`.

## Wave 4: contrast checks

- `focus-indicator-contrast` per D8 and `control-boundary-contrast` per D9,
  both traced through Wave 1.
- `boundaries` declared in each shipped control's contract.
- Tests: a fixture with a 2:1 focus ring and one with a 2:1 input border,
  each reporting with its properties; a passing fixture reporting nothing.

**Verify.** `npm run check`, `npx vitest run bin src/testing`,
`npm run test:e2e:contract`,
`node bin/live-tokens.mjs check-component --tests --a11y --json` on the
default theme, with the new findings listed in the wave's summary.

## Wave 5: text spacing and reduced motion

- D10 and D11, with the shared support module.
- The page suite keeps its results: `page-defects` and the page contract
  tests pass unchanged.
- The run time of D13, measured and recorded in the wave's Built note.

**Verify.** `npm run check`, `npx vitest run bin src/testing`,
`npm run test:e2e:contract`, `npm run test:e2e:page-defects`,
`node bin/live-tokens.mjs check-component --tests --a11y --json`.

## Wave 6: docs

- `accessibility.md`: the property marks, the four checks with their
  criteria, and `boundaries`.
- `CHANGELOG.md` under Unreleased; `contract-tests` docs in the docs chapter
  name `boundaries`.
- The report, with the decision on skill text.

**Verify.** `npm run check:docs-content`, `npm run check:cli-strings`,
`npm run check:skills`.
