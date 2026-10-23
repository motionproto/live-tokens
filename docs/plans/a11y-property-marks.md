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

**Built.** Waves 2 to 4 call these:

- `src/testing/support/traceProperties.ts` exports
  `traceProperties(page, { selector, scope }, axes, known): Promise<string[]>`,
  `TRACE_AXES` and the `TraceAxes` type. The plan's `target` argument
  became `{ selector, scope }`: the trace needs the scope to drop matches
  outside it and to stop its ancestor walk there. The component suite passes
  `SCOPE`, `[data-lt-a11y-stage]`. The result is sorted and unique.
- `TraceAxes` is `{ target, pseudoElements, ancestors, force? }`, each a
  list of CSS property names where a trailing `*` matches a prefix and `*`
  alone matches every property. `force` lists the pseudo-classes forced on
  the target while its styles are read; the trace releases them afterward.
  `TRACE_AXES` holds `color-contrast`, `SIA-R65` and `target-size`. Wave 4
  adds `focus-indicator-contrast` and `control-boundary-contrast` there.
- The trace keeps every matched declaration on an axis, overridden ones
  included, so an Input in its error state names both
  `--input-focused-border` and `--input-error-border`. It reads authored
  declarations from regular rules and inline styles. It follows a custom
  property through each declaration of it on the target, its
  pseudo-elements and its in-scope ancestors. A selector that does not
  parse, such as an Alfa label with an unusual id, traces nothing. An Alfa
  label that matches several elements in scope traces them all.
- One CDP session per page, cached in a `WeakMap`, with `DOM` and `CSS`
  enabled once.
- `ContractHarness.propertyVariables(): Promise<Set<string>>` returns the
  component's `schema` variables and every variant of its `intrinsics`, read
  from the registry entry in the page. The suite passes it as `known`.
- `A11yResult.variables?: string[]` in `src/testing/support/a11y.ts`.
  `Occurrences` in `component-a11y.contract.ts` takes a tracer in its
  constructor, and `add` is now async: it traces a result the first time
  its key appears and sets `variables` only when the trace found a name.
  An engine rule outside `TRACE_AXES` traces nothing.
- `a11yFinding` in `bin/contractRunner.mjs` copies a non-empty
  `result.variables` to `details.variables`.
  `A11yFinding.details.variables?: string[]` in `a11yReportTypes.ts`.
- Tests: `tests/e2e/trace-properties.spec.ts` (project `chromium`, four
  cases over a `setContent` fixture) and a mapping case in
  `bin/a11y.test.ts`.
- The plan's Verify command names `bin/live-tokens.mjs`; the CLI is
  `bin/cli.mjs`. `check-component` reads one id, so the wave ran it once
  per component. Each exited 0 on the default theme:
  - slider, 5 warnings: `target-size` at `.low` and `.high` names
    `--slider-range-thumb-size` and `--slider-range-track-border-width`.
    The three `SIA-R65` results trace nothing: the thumb's focus style sits
    on its sibling `.cap`, outside the target's axes.
  - input, 1 warning: `SIA-R65` names 11 variables, among them
    `--input-focused-border`, `--input-focused-border-width` and
    `--input-error-border`, beside the default border, surface and text,
    whose rules match the field in every state.
  - button, 38 warnings, all `a11y-review` `color-contrast`: each names the
    variant's `-text` and `-surface`, `--button-shimmer` from `::before`,
    and in hover views the `-hover-` pair and `--button-hover-tint-enabled`.
    The primary rows name `--button-primary-text`.

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

**Built.** Waves 3 and 4 call these:

- The trace narrows under a forced pseudo-class. `traceProperties` reads
  the target's matched styles once without the force and once with it. It
  keeps every declaration of a rule that matches only under the force, and
  every declaration of a later rule, or of the inline style, that sets one
  of the longhands those rules set. The page's CSSOM expands each shorthand
  to its longhands, so `outline` overrides `outline-color`. Rules that match
  in every state drop. Pseudo-elements, ancestors and the custom properties
  the trace follows keep Wave 1's reading. Input's `SIA-R65` result now
  names six variables: `--input-error-border`, `--input-error-border-width`,
  `--input-focused-border`, `--input-focused-border-width`,
  `--input-focused-surface` and `--input-focused-text`. No shipped
  component sets a private custom property in a focus rule, so the trace
  does not follow one that only focus changes.
  `tests/e2e/trace-properties.spec.ts` gains a plain field and an error
  field: the plain one names its ring alone, the error one its ring and its
  error outline, and neither names its resting border, surface or radius.
- `ComponentA11yIssues` gains `property: A11yFinding[]`. `a11yIssues` sorts
  an `a11y-review` finding into `review`, a finding whose engine rule is in
  `PROPERTY_FIX_RULES` (`focus-indicator-contrast`,
  `control-boundary-contrast`, exported from `a11yReport.ts`) into
  `property`, and every other `a11y-*` finding into `code`. Wave 4 adds no
  grouping code: its findings land in "Fix with a property" by engine rule.
- `a11yView.ts`: `issueCount` sums all four lists, so `componentsWithIssues`
  returns, and the rail marks, a component with check-by-eye results alone.
  `findingRows(findings): A11yFindingRow[]` merges findings that share the
  rule, the engine rule, the help text and the traced variables. The help
  joins the key because `aria-snapshot` and the keyboard cases vary their
  help under one engine rule; axe and Alfa keep it fixed per rule. A row
  carries `finding` (the first), `targets` (unique), `views` and
  `variables`. A lone finding keeps its `view` as the run wrote it. Merged
  views list each name once, up to four, then "and more", because each
  finding has already cut its own list at four. `findingText`,
  `elementsLabel` and `reviewResults` (now `{ component, label, row }`)
  join it.
- `propertyLabel(component, variable)` leads the schema label with the
  variable's words after `--<component>-` that the label lacks:
  "Focused border color", "Brand text color", "Single thumb size". An
  intrinsic names itself by its key ("Shimmer", "Hover tint"). Contrast
  rows read the same labels, so Badge's row now reads "Brand text color
  3.87:1, needs 4.5:1".
- `src/editor/ui/a11y/A11yFindingRow.svelte` renders one merged row:
  `{ component, row, review?, prefix?, onreveal? }`. Its detail reads the
  target in code, or "N elements", then the views. Its links line lists each
  traced property: a button reading the label and "→", named "Go to
  <label>" with the variable as its title, when `onreveal` is present, and
  the label as text otherwise.
- `A11yIssueRow` trades `marked` for `review`, which draws "?" in
  `--ui-text-tertiary` in place of the "!" in `--ui-highlight` and sets the
  class `review` on the row. It gains an optional `links` snippet under the
  detail.
- `A11yComponentIssues` takes `withReview`. It renders "Fix with a
  property" (the editor's contrast rows, then the property rows), "Fix in
  the component's code" and, with `withReview`, "Check by eye".
- `A11yPanel` shows for any finding, passes `withReview`, and drops its
  link to the view. Its reveal also finds rows by `data-token-variables~=`.
  A row of an intrinsic on a tab that is not open stays unreached: the
  VariantGroup's `tabHolding` reads only schema tokens, and the hover-tab
  toggles sit in `extraPropertyRows`.
- The Accessibility view counts check-by-eye results in its summary, rail
  and per-component counts. A component section with such results ends in a
  quiet "N results to check by eye" button that opens the collapsed list.
  The list merges its rows per component and leads each with the component
  label.
- Tests: `a11yReport.test.ts` sorts a property finding; `a11yView.test.ts`
  covers the counts, the merge, the views and the labels; `A11yPanel.test.ts`
  covers the inline group, a check-by-eye-only component, a merged row and
  the property links; `a11y-markers.spec.ts` checks Video Frame's rail mark
  and panel; `accessibility-view.spec.ts` checks the new totals and the
  section's link to the list.
- The docs chapter `accessibility.md` still describes the panel's two
  groups, the check-by-eye results kept apart from the counts, and the
  unqualified "Text color 3.87:1" row; Wave 6 rewrites it.

## Wave 3: property row marks

- `A11yPropertyMark.svelte` per D7, placed in each row host.
- A test that renders every registered component's editor with a report
  naming each of its variables and finds a mark on every row that carries
  the variable.
- `tests/e2e/a11y-markers.spec.ts`: the mark, its popover, and the "→"
  landing on a marked row.

**Verify.** `npm run check`, `npx vitest run src/editor`,
`npm run test:e2e:contract`.

**Built.** Waves 4 to 6 can rely on these:

- `a11yReport.ts` exports `a11yPropertyFindings`, a derived store of the
  last finished run's findings keyed by each variable in their
  `details.variables`. It reads `findings` alone, so the editor's own
  contrast failures add no mark (D7). A Wave 4 finding with variables marks
  its rows with no further code.
- `src/editor/ui/a11y/A11yPropertyMark.svelte` takes
  `{ variables: string[], placement?: 'inline' | 'gutter' }` and renders
  nothing when no finding names one of the variables. Otherwise it renders a
  `UIInfoPopover` whose button carries the count as its name: "N
  accessibility issues", or "N results to check by eye" when every finding
  is `a11y-review`. The button holds one empty span whose `::after` draws
  "!" in `--ui-highlight`, or "?" in `--ui-text-tertiary` for a row with
  check-by-eye results alone, so the mark adds no text node. The popover
  takes the same title and lists the findings through `findingRows` and
  `A11yFindingRow` without `onreveal`: the code fixes first, the
  check-by-eye rows last, each with its target or element count, its views,
  its help link and the properties it traces to.
- The mark renders in every row host:
  - `UITokenSelector`, and through it every selector that sets
    `data-token-variable` (palette, variant, font, padding, easing, text
    transform). The mark sits in `.ui-ts-trigger-wrap` with
    `placement="gutter"`: absolutely placed right of the label column, in
    the column gap, left of the trigger. Linked-block rows carry it too.
  - `GradientEditor`, after its section label ("Surface").
  - Each `.property-row[data-token-variables]` toggle, inside its
    `.property-label` after the text: the hover tint rows of Button, Icon
    Button, Menu Select, Segmented Control, Tab Bar and Side Navigation, and
    Button's shimmer row.
  - Card's hover control, after its "Use hover" label.
- The panel's "→" reaches an intrinsic's row on a tab that is not open.
  `revealVariable` now carries a `RevealRequest`,
  `{ variable, searches: Promise<void>[] }`. A rendered VariantGroup whose
  schema tokens and type groups lack the variable renders its
  `stateActions`, `extraPropertyRowsTop` and `extraPropertyRows` snippets
  for each tab in turn, inside a hidden, inert stage, until one carries the
  variable's `data-token-variable` or `data-token-variables`. It then opens
  that tab. It pushes the search onto the request, and `A11yPanel` waits
  for every search before it looks for the row. The search touches no
  shared store until it finds the tab.
- Tests: `A11yPropertyMark.test.ts` covers the count, the review style, the
  editor's contrast failures adding no mark, a row of two variables, and the
  popover's rows and views. `a11y-markers.spec.ts` gains three cases: an
  Input row reached by the "→" carries "1 accessibility issue" and its
  popover; the "→" for Button's shimmer opens the hover tab and lands on the
  marked row; and a sweep that gives every registered component a finding
  naming all its schema and intrinsic variables, walks each variant, part
  and state tab, and requires a mark on every visible row host that carries
  one of them. Removing the shimmer row's mark fails the sweep.
- Judgment calls. A row with check-by-eye results alone draws "?", the
  panel's glyph for those rows, where D7 names "!". The gutter mark sits
  next to the trigger, so a long label stands about 4px from it. The variable
  list of a `.property-row` mark repeats its `data-token-variables`; the
  sweep catches drift.
- Open items. Intrinsic rows that carry no `data-token-variables` get no
  mark and no "→" target: Section Divider's alignment, eyebrow and
  description display and hairline rows, Image's zoom and grow, and Image
  Lightbox's tile fit. Giving them the attribute also enrolls them in the
  contract suite's composite-control pass, so it waits for a wave that can
  run that suite against the change.

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

**Built.** Waves 5 and 6 can rely on these:

- `src/testing/support/nonTextContrast.ts` exports `scanFocusIndicators(page,
  scope, exclude)` and `scanBoundaries(page, scope, exclude, parts, root)`.
  Each returns `CheckedResult[]`, `{ result, trace }`, where `trace` is a
  `TraceRequest`, `{ selector, forceOn?, ancestorsFrom? }`. A violation
  reports under `a11y-component`, a gradient or image behind the edge under
  `a11y-review`, both with `impact: null` and the Understanding page for
  WCAG 2.2 SC 1.4.11 as `helpUrl`. Help reads "Focus outline on span.cap
  2.14:1 against the backdrop, needs 3:1" and "Track border 1.45:1 and
  surface 1.3:1 against the backdrop, needs 3:1". Ratios floor to two
  places, since WCAG does not round.
- The indicator rule, which settles Slider's open item from Wave 1. The
  check snapshots the outline, box shadow and border sides of the focused
  element, its descendants and its siblings with their descendants, forces
  `:focus` and `:focus-visible` through CDP, and takes the first of them,
  in that order, whose style focus changes. On that element it reads D8's
  order: an outline focus changes, else the first outer box shadow, else a
  border side. A fully transparent channel is no indicator. Chromium's
  `outline-style: auto` ring passes: it pairs a dark and a light band, one of
  which contrasts with any backdrop. Slider's ring on `.cap` now measures
  and traces to `--slider-*-thumb-border` and its width. A style tag turns
  transitions off while the check runs, so the forced colour reads at its
  end.
- The backdrop is every box, from the indicator or part outward, whose
  border box contains the ring's outer edge (the element grown by outline
  offset and width, or by shadow offset, blur and spread), composited over
  white up to the first opaque one. A box the ring overhangs, such as
  Slider's track, thinner than the ring around its thumb, counts for neither the ratio
  nor the trace. Colours resolve and composite on a 1px canvas. Ancestor
  `opacity` is ignored.
- A boundary part passes when its border, 1px or wider, or its surface
  contrasts 3:1 with the backdrop. A part is skipped when every form control
  in its root part (`button, input, select, textarea, [aria-disabled]`) is
  disabled, the inactive case SC 1.4.11 exempts.
- `ComponentContract.boundaries?: BoundaryExpectation[]`, with
  `BoundaryExpectation = { part, label }`. Declared on Input (field "Field"),
  RadioButton (dot "Circle"), Slider (track "Track", thumb "Thumb"), Toggle
  (track "Track", thumb "Thumb") and SegmentedControl (root "Bar"). The
  thumbs are there because their position shows the value; no other shipped
  control draws its own edge.
- `traceProperties` takes a `TraceTarget`, `{ selector, scope, forceOn?,
  ancestorsFrom? }`, and exports `cdpSession(page)`. `forceOn` forces the
  pseudo-classes on another element while the target's styles are read.
  `ancestorsFrom` narrows the ancestor axis to the boxes behind the edge;
  custom properties still follow through every ancestor. `TRACE_AXES` gains
  both rules. Deviation from D2: their border axis lists border colour,
  width and style and leaves out the radii, which carried
  `--videoframe-frame-radius` into a focus result and the track radius into
  a boundary result. `focus-indicator-contrast` also drops
  `text-decoration*`, which paints no ring.
- The suite's `Occurrences.add` takes plain results or `CheckedResult`s and
  hands the trace request to its tracer. Both checks run after
  `scanFocusVisible` in each view and after the axe contrast scan in each
  preset view. A target is a selector built in the page from tag and
  classes, with `:nth-of-type` and parents added until it is unique in
  scope, so state classes such as `selected` and `force-hover` make
  separate results, each traced with its own state's properties.
- Image's zoom and grow rows and Section Divider's alignment, eyebrow and
  description display, hairline (show and position) and all-caps rows carry
  `data-token-variables` and a mark. `StateBlock`'s element toggles take
  `variables`. Image Lightbox's tile fit has no row in its editor, so it has
  nothing to mark. The full contract suite passed after the change.
- Tests: `tests/e2e/non-text-contrast.spec.ts` (project `chromium`, six
  cases): a 2:1 ring, a ring on a sibling and a faint glow, a 2:1 field
  border with both ratios, a gradient backdrop, a passing fixture with the
  browser ring, and a disabled field. The end-to-end runner tests in
  `bin/check-component.test.ts` moved from Toggle, which now warns, to Icon
  Button.
- Verify on the default theme: `npm run check` clean; `npx vitest run bin
  src/testing` 563 passed; `npm run test:e2e:contract` 321 passed in 5.6
  minutes; `node bin/cli.mjs check-component --tests --a11y --json` exited
  0 in 215 s (3 min 35 s, against 3 to 3.5 minutes before the wave) with 24
  new warnings among 114 findings:
  - Boundaries: Input field 2.42:1 border, 1.09:1 surface; RadioButton
    circle 2.42:1, nine results across its three dots and the default,
    hover and selected views; SegmentedControl bar 2.42:1 and 1.24:1, at
    both sizes; Slider track 1.45:1 and 1.3:1; Toggle track 2.42:1 and
    1.71:1. Each names its border, border width and surface variables, and
    the state's own variables in hover and selected views.
  - Focus: Slider's three thumbs 2.14:1, tracing the thumb border and its
    width; Video Frame, Video Lightbox and five Slide Pager controls,
    1.06:1 to 1.09:1, whose `--ring-focus-md` shadow is a theme token and
    traces nothing but the scrim behind two of the controls.
- Open items. TabBar's selected tab and SegmentedControl's selected option
  show state by surface and could join `boundaries` as state indicators.
  The docs chapter does not yet name the two checks or `boundaries`;
  Wave 6 writes it.

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
