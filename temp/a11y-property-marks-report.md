# Accessibility property marks report

Run of `docs/plans/a11y-property-marks.md` on 2026-10-23, on local main from
`ef826d1`, unpushed and unreleased. Waves 1 to 6 ran in series, one session
each, and every wave's Verify commands passed. The last full contract run
passed 321 of 321 in 6.1 minutes. The full `check-component --tests --a11y`
run takes 205 s, inside the plan's 6-minute budget.

## Built

| Wave | Result |
|---|---|
| 1. Property tracing | `traceProperties.ts` follows a result's element through `CSS.getMatchedStylesForNode` and private custom properties to the component's schema and intrinsic variables. `--json` findings carry `details.variables`. |
| 2. Every finding marks | Check-by-eye results count. The panel shows "Fix with a property", "Fix in the component's code" and "Check by eye", merges rows by engine rule, help text and variables, and gives each traced property a "→". The focus trace keeps only what forced focus brings in or overrides: Input's focus finding fell from 11 variables to 6. |
| 3. Property row marks | `A11yPropertyMark` puts a text-free "!" (or "?" for check-by-eye) on each row a finding names, with a popover listing those findings. The "→" now opens the tab that holds an intrinsic's row. |
| 4. Contrast checks | `focus-indicator-contrast` and `control-boundary-contrast` at WCAG 2.2 SC 1.4.11, 3:1. Input, RadioButton, Slider, Toggle and SegmentedControl declare `boundaries`. The focus check finds the element that draws the ring, which reaches Slider's sibling `.cap`. |
| 5. Text spacing and motion | Per-component `a11y-text-spacing` and `a11y-reduced-motion` from a module shared with the page suite, `textSpacingAndMotion.ts`. |
| 6. Docs | The accessibility chapter, the rule table, the rule guidance and CHANGELOG. |

## Findings on the default theme

The full run reports 160 findings, all warnings; 114 came before Wave 5.

| Check | Results | Where |
|---|---|---|
| Control boundary contrast | 14 | Input field 2.42:1; RadioButton circle 2.42:1 (nine results across states); SegmentedControl bar 2.42:1; Slider track 1.45:1; Toggle track 2.42:1 |
| Focus indicator contrast | 10 | Slider thumbs 2.14:1; VideoFrame, VideoLightbox and five SlidePager controls 1.06:1 to 1.09:1 |
| Reduced motion | 46 | Button shimmer 500 ms (38); Image zoom 300 ms (3); Image Lightbox thumbnail 250 ms; Progress Bar fill 400 ms; Buttons nested in Dialog (2) and Notification (1) |
| Text spacing | 0 | |

The 1.06:1 focus rings use the theme's `--ring-focus-md` shadow, so they
trace to no component property and carry no row mark.

## Changes beyond the plan

- The plan's Verify commands call `bin/live-tokens.mjs`. The CLI is
  `bin/cli.mjs`, and `check-component` reads only its first id.
- Property labels lead with the variable-name words the label lacks, such as
  "Focused border color". Existing contrast rows changed with them.
- Intrinsic rows in Section Divider and Image gained `data-token-variables`
  and marks.
- The new contrast checks trace border colour, width and style, leaving radii
  out. They also run in the preset theme sweep.
- Reduced motion reads declared timing and toggles the media emulation within
  each view. D11's second pass would have missed Button's shimmer, because
  the harness finishes finite animations when it selects a view.
- `a11y-text-spacing` and `a11y-reduced-motion` now sit in the component rule
  table at `warn`. Without that they would have defaulted to `error`.
- Reduced motion cites technique C39, which serves WCAG 2.2 SC 2.3.3. That
  criterion is AAA.

## Needs a decision

1. **Skill text for `boundaries`.** Wave 6 recommends three or four lines in
   `references/contract-tests.md`, with the `live-tokens-create-component`
   SKILL.md left as it is. Without them a custom control built through the
   skill never gets the boundary check. The same edit should fix line 56 of
   the `live-tokens-check-compliance` SKILL.md, which lists the a11y engines
   without the four new checks. Both files feed the billing eval cases, so the
   edit needs both syncs, the copies into `_skills`, and a rehash per case.
2. **Selected-state indicators.** TabBar's selected tab and
   SegmentedControl's selected option show state by surface alone. They
   could join `boundaries`.
3. **Image Lightbox tile fit.** `--imagelightbox-tile-object-fit` has no
   editor row, so nothing can carry its mark.

## Known limits

- `--json` lists Button's 38 shimmer results one by one. The editor merges
  them into rows.
- Components nested in a host, such as Buttons in Dialog, report under the
  host with no variables.
- The trace does not follow a private custom property that only focus
  changes. No shipped component sets one.
- `check-page --tests` exits 1 with "no page renders through a route yet". It
  did so before this plan, because the repo routes no pages of its own.

## Follow-ups

The user approved all three decisions on 2026-10-23.

1. `references/contract-tests.md` names `boundaries` and the suite's four
   new checks. The check-compliance SKILL.md lists them beside axe, Alfa and
   the keyboard cases. Both atlas syncs ran. No eval copy holds either file,
   so no rehash was due.
2. TabBar's selected tab, SegmentedControl's selected option and
   SideNavigation's four selected parts join `boundaries`. A part may name
   `when`, a selector it must also match. The check now keeps the best of
   the outline and the four border sides. On the default theme TabBar's
   selected tab measures 2.96:1 and SegmentedControl's selected option
   2.67:1. SideNavigation passes at 3.85:1. A private custom property now
   traces through its winning declaration alone.
3. Image Lightbox's Tile tab gains a "tile fit" row, Contain or Cover. The
   registry entry now lists the component's intrinsics, and a tile follows
   the theme's fit unless its `fit` prop is set.

Later the same day, at the user's request, TabBar and SegmentedControl
gained their WAI-ARIA keyboard patterns: tabs with roving focus, and a radio
group whose arrows move focus and selection. The selected segment draws a
neutral focus ring. TabBar's selected border and SegmentedControl's selected
outline now map to `--border-brand-medium`, at 3.47:1 and 4.31:1 on the
default theme. Each preset theme embeds its own copy of the old mapping, so
autumn, ocean, spring-meadow and sketchy (SegmentedControl only) still fall
below 3:1. SegmentedControl's bar still measures 2.42:1.

## Default theme sweep, 2026-10-24

Full `check-component --tests --a11y --json` runs on the default theme
listed the findings below, leaving out reduced motion and the check-by-eye
results. Each fix has its own commit on local main.

| Component | Finding | Cause | Fix |
|---|---|---|---|
| VideoFrame, VideoLightbox, SlidePager | `focus-indicator-contrast` 1.06:1 to 1.09:1 on seven controls | `--ring-focus-md`, a brand colour at 10% opacity | The neutral ring SegmentedControl uses: a `--border-width-2` box shadow in `--border-neutral-strong` |
| Badge, CornerBadge, Notification | `color-contrast` on the brand, canvas and danger badges and the danger title | Brand text 3.87:1, danger 3.30:1 and canvas 1.55:1 on their surfaces | Brand and danger move to the `-low` surface step (5.38:1, 4.56:1); canvas takes `--text-secondary` (7.15:1). Default theme, configs and the eight presets |
| CodeSnippet | `scrollable-region-focusable` | The code line scrolls sideways with no keyboard stop | `tabindex="0"` on the code element and the neutral focus ring |
| Input | SIA-R65 in the error views | The red error outline replaces the focus outline, and the focused surface equals the resting one | Focus adds a neutral ring outside the red outline |
| Slider | `target-size` on the range thumbs | Both inputs share one box, so neither passes axe's spacing exception, and each is 18px tall | The input and its native thumb take the pointer over `max(thumb size, --space-24)`; the cap draws at its own size |
| RadioButton | Arrow Down did not move focus | Each option was a plain button | `role="radio"` with `aria-checked`, a roving tab stop, and arrows that move focus and selection within the radiogroup or the shared parent |
| TabBar | Icon-only tabs had no name | The label rendered only as visible text | `aria-label` from the tab's label when `iconOnly` is set; the icon is `aria-hidden` |
| MenuSelect | `aria-required-children`, `aria-required-parent`, `listitem`, `aria-input-field-name`; Arrow Down did not move focus | The `li` wrappers broke the listbox to option chain, and the list had no name or key handling | `li role="none"`, an optional `ariaLabel` prop, a roving tab stop, and Up, Down, Home and End |
| Dialog | Escape did not close | No key handling, and no dialog role | `role="dialog"`, `aria-modal` outside the inline preview, `aria-labelledby` to the title, Escape takes the cancel path. The keyboard case became a behavior case: the editor's preview never closes, so the old case could not pass |

### Known false positives

- **Slider, SIA-R65, three thumbs.** The native thumb is transparent, and
  focus draws its ring on the sibling `.cap`. Alfa reads only the focused
  element, its descendants and its ancestors, so it sees no change. The
  focus indicator check, which also reads siblings, measures that ring at
  3.47:1 and reports nothing, which confirms the ring exists and passes.
- **Input, SIA-R65, focused view.** The view forces the focused look at rest
  through `.force-focus`, so real focus has nothing left to change. Input
  passes SIA-R65 in every view that leaves it at rest.

### Final run

The last full run, after every fix, reports 4 findings outside reduced
motion (46) and the check-by-eye results (57): the three Slider thumbs and
Input's focused view under SIA-R65, both listed above. Verify passed:
`npm run check`, `npm run check:component-defaults`,
`node scripts/check-preset-themes.mjs`, `npx vitest run bin src/testing
src/editor src/system` (4915 tests), and `npm run test:e2e:contract` (321
passed in 5.4 minutes).
