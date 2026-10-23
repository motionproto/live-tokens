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
