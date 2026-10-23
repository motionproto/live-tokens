# Accessibility testing report

Run of `docs/plans/a11y-testing.md` on 2026-10-23, on local main from
`c531b9a` to `32648c0`, unpushed and unreleased. Waves 1, 2, 3, 5 and 6 ran in
series, one session each. Wave 4 was cut after the probe. Every wave's Verify
commands passed. A final `npm run check`, `npx vitest run bin src/testing`
(552 tests) and `check-production-is-default` pass on the finished tree.

## Built

| Wave | Result | Verify |
|---|---|---|
| 1. Engines and findings | `src/testing/support/a11y.ts` (`scanAxe`, `scanFocusVisible`, `recordA11y`), seven `a11y-*` rules at `warn`, annotation mapping, axe and seven Alfa packages as optional peers | 542 tests, check clean |
| 2. Component suite | `component-a11y.contract.ts` over 213 variant and state views, preset sweep for `color-contrast`, 29 recorded accessibility trees, `--update-aria`, `data-preview-demo` marker, `temp/a11y-baseline.md` | contract run 321 passed, 2 min 54 s before, 5 min 06 s after |
| 3. Page suite | `page-a11y`, `page-text-spacing`, `page-reduced-motion` per page and viewport, three defect pages; `page-contrast` unchanged | page-defects 15 passed, contract 321 passed |
| 5. Keyboard cases | 27 `press` cases across the 15 interactive components; a failing case records `a11y-keyboard` at `warn`; a crashed accessibility scan reports `tests-setup` | contract 321 passed |
| 6. Skills and docs | check-compliance and create-component skills, `contract-tests.md`, docs chapter `accessibility.md`, README, CHANGELOG; atlas and skill sources synced; three billing eval cases rehashed | all five checks pass |

## Findings the suites report

Component suite, default theme plus presets, unique elements:

- MenuSelect: `aria-required-parent` (6), `listitem` (4), `aria-input-field-name`, `aria-required-children`.
- Slider: `target-size` on both range thumbs.
- CodeSnippet: `scrollable-region-focusable`.
- Badge, CornerBadge, Notification: 8 `color-contrast` failures in the brand, canvas and danger variants. Stepping variants found five failures the probe missed.
- Focus visibility: SegmentedControl's selected segment and Input's invalid field show no focus change. Slider's three results are probably false, because its focus paints a sibling.
- `a11y-review`: 100 unique, mostly Button's shimmer pseudo-element and tinted hover backgrounds. Presets add no contrast violation of their own.

Keyboard gaps:

| Component | Key | Expected | Observed |
|---|---|---|---|
| Dialog | Escape | dialog closes | dialog stays |
| MenuSelect | ArrowDown | focus on the second item | focus stays |
| RadioButton | ArrowDown | focus on the second option | focus stays |
| SegmentedControl | ArrowRight | focus on the second segment | focus stays |
| TabBar | ArrowRight | focus on the second tab | focus stays |

Pages: the template Home reports nothing. The demo app reports six
`a11y-text-spacing` warnings.

## Needs a decision or a fix

1. **The release smoke gate changed without a run.** Wave 3 edited
   `scripts/lib/pageGate.mjs` to expect eight coverage ids and to allow
   `a11y-*` warnings on the template Home. `check:smoke-page-tests` first
   runs at release. Run it before tagging.
2. **create-component lets its final run turn off `a11y-review`.** The skill
   ends on `--tests --strict` and needs exit 0, and Button's shimmer makes
   `a11y-review` warnings that never clear. Wave 6 allowed
   `--off=a11y-review` after a check by eye. Confirm or replace.
3. **A consumer project records no accessibility tree for its own components.**
   The trees ship under `node_modules`, which the suite never writes, so
   `--update-aria` works in the repository alone. Where a project's trees
   live is open.
4. **`check-page --tests` on the demo app exits 1.** The cause predates the
   plan: four `raw-text-axis` and two `page-text-style` errors, and the
   no-path run finds no routed page. The plan's Wave 3 Done-when assumed exit 0.
5. **The skills say "the eight component suites".** The accessibility suite
   may make nine. Wave 6 left the count alone.
6. **SIA-R65 names Input's target by a random element id,** so that
   finding's text changes from run to run.
7. **The Dialog Escape gap needs an editor change too.** The preview passes
   `open` as a constant, so the dialog cannot close there.
8. **Check limits.** Text spacing sees horizontal overflow alone. Reduced
   motion misses animations that end before the page settles. MenuSelect
   has no Escape case because it renders its list always open.

## Follow-ups the plan names

- Fix the findings above. Invariant 6 kept this plan to reporting.
- A forced-colours check for borders and focus indicators.
- Focus indicator contrast (SC 1.4.11).
- An editor panel that scans the preview live (the cut Wave 4).
