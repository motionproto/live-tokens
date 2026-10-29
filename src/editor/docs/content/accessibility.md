# Accessibility

`check-component --tests` and `check-page --tests` test the shipped
components, your own components, and your pages against WCAG 2 A and AA. Every
accessibility finding reports at `warn`: the run prints it and leaves the exit
status to the other rules. `--strict` turns each one into an error that fails
the run, as it does every other warning.

```bash
npx live-tokens check-component statcard --tests
npx live-tokens check-page src/pages/Home.svelte --tests --strict
```

## Suites and checks

**Components.** The component suite opens every variant and state the
component's contract names and scans the preview:

- **axe-core** checks names, roles, ARIA, contrast, target size, and
  structure.
- **Siteimprove Alfa**, rule SIA-R65, checks that each focusable element
  looks different when it takes focus.
- **Focus indicator contrast** measures each focus ring against the backdrop
  around it, at 3:1 under WCAG 2.2 SC 1.4.11.
- **Control boundary contrast** measures each part the contract lists in
  `boundaries` against the backdrop behind it, at 3:1 under WCAG 2.2
  SC 1.4.11.
- **Text spacing** applies the WCAG 2.2 SC 1.4.12 override inside the
  component and reports text that clips under it.
- **Reduced motion** reports motion longer than 200 ms that still runs under
  `prefers-reduced-motion: reduce`.
- **Playwright** reads each view's accessibility tree and compares it with
  the tree recorded for that view.
- **Keyboard cases** in the contract press Enter, Space, the arrow keys, and
  Escape, and read what each key did.

A project's run scans the open theme. The library's own test run also repeats
axe's contrast rule, and both contrast checks, under each of the eight preset
themes.

**Pages.** `check-page --tests` runs three tests on each page at each
viewport:

- `page-a11y` runs axe over the page, leaving out the router's chrome and
  every component the component suite scans. axe's contrast rule stays off here, because
  `page-contrast` already reports text contrast at `error`.
- `page-text-spacing` applies the WCAG 2.2 SC 1.4.12 text spacing override
  (line height 1.5, paragraph spacing 2em, letter spacing 0.12em, word
  spacing 0.16em) and reports content that overflows under it.
- `page-reduced-motion` loads the page under `prefers-reduced-motion: reduce`
  and reports animations that keep running.

## Rules

| Rule | Checker | Reports |
|------|---------|---------|
| `a11y-component` | `check-component` | An axe failure inside a component's preview, a focus ring or control boundary below 3:1, or a changed accessibility tree. |
| `a11y-focus-visible` | `check-component` | An element that looks the same focused as at rest (SIA-R65). |
| `a11y-keyboard` | `check-component` | A keyboard case whose key failed to activate, move, or close. |
| `a11y-page` | `check-page` | An axe failure in the page's own markup. |
| `a11y-text-spacing` | `check-component`, `check-page` | Content that overflows under the text spacing override. |
| `a11y-reduced-motion` | `check-component`, `check-page` | Motion that still runs under reduced motion. |
| `a11y-review` | both | A check the engine could not decide, for you to judge by eye. |

Each finding's message names the engine's own rule, the element, the view it
failed in, and a help page that states the requirement and its repair. The
rules take the same severity settings as every other rule. `--off=a11y-review`
silences one for a single run, `--error=a11y-page` raises one, and
`live-tokens.config.json` records either for good:

```json
{ "checks": { "rules": { "a11y-review": "off", "a11y-page": "error" } } }
```

A scan that crashes reports `tests-setup`.

## Focus indicator contrast

The suite forces `:focus` and `:focus-visible` on each focusable element in
each view and looks for the style focus changes. It searches the element, its
descendants, and its siblings with their descendants, so a ring painted on a
sibling, such as a slider thumb's cap, counts. The indicator is the outline
when focus changes one, else the first outer box shadow, else a border side.

The backdrop is every box behind the ring's outer edge, composited in order
over white. The walk stops at the preview's edge and ends on `--page-bg`, so a
part that fills its preview edge to edge is measured against the page. A ring below 3:1 against it reports under `a11y-component` with
engine rule `focus-indicator-contrast`, such as "Focus outline on span.cap
2.14:1 against the backdrop, needs 3:1". Ratios floor to two places, because
WCAG does not round. Chromium's own `outline-style: auto` ring passes: it pairs
a dark band with a light one. An element with no indicator at all is
SIA-R65's finding and adds none here. Alfa reads only the element, its
descendants, and its ancestors, so a ring this check finds on a sibling settles
SIA-R65's "can't tell" for that element.

A state view that forces the focused look with a class, such as Input's
focused state, would leave focus nothing to change. Both focus checks lift
that class while they measure, then put it back.

## Control boundary contrast

A control whose edge shows where to click or what it holds needs that edge
at 3:1 against the backdrop behind it. So does a selected or current item
whose surface or edge alone shows that state. The contract lists these parts
in `boundaries`. Each part passes when its border, on any side, or its
outline, 1px or wider, or its surface reaches 3:1. A failure names both ratios, such as "Track border
1.45:1 and surface 1.3:1 against the backdrop, needs 3:1", and reports under
`a11y-component` with engine rule `control-boundary-contrast`. A part whose
form controls are all disabled is skipped, because SC 1.4.11 exempts inactive
controls.

The shipped controls that draw their own edge declare it: Input's field,
RadioButton's circle, Slider's and Toggle's track and thumb, and
SegmentedControl's bar. The selected states that show by surface and edge
alone declare their part too: TabBar's selected tab, SegmentedControl's
selected option, and SideNavigation's selected title, section, item and
footer. Each measures against the bar or panel behind it, the surface the
unselected items show. MenuSelect's selected option carries a check mark, so
it declares none.

## Text spacing and motion per component

The text spacing check measures every element of the component that holds
text: its root part, its portaled parts, and their descendants. It applies
the override inside the preview alone and reports each element the override
pushes more than 1px past its box, on an axis it does not scroll. An element
already cut at rest adds nothing. The help names the measure: "Under the text
spacing override, `<span>` holds 24px of content in 18px of height, and its
overflow-y is hidden".

The reduced motion check reads the declared animations and transitions of
the same elements and their `::before` and `::after`, along with every
script animation running on them. Motion that lasts past 200 ms, its delay
included, is recorded. The check then emulates
`prefers-reduced-motion: reduce` in the same view and reports each motion
still that long, such as "A transition of left lasts 500 ms under
prefers-reduced-motion: reduce". A view with no long motion costs no second
read. The help page is WCAG technique C39, which serves WCAG 2.2 SC 2.3.3
Animation from Interactions.

## Property tracing

A finding that a property can fix names that property. The suite reads the
CSS rules that match the failing element through the Chrome DevTools
protocol, keeps the declarations the finding depends on, such as the outline
and border of a focus ring or the height and padding of a clipped label, and
follows each `var()` to the component's semantic properties and intrinsics.
A component's private custom properties lead through to the property behind
them. Theme and editor variables drop out.

`--json` output carries the result in each finding's `details.variables`,
sorted, and leaves the field out when the trace finds nothing. An excerpt:

```json
{
  "rule": "a11y-component",
  "component": "slider",
  "details": {
    "engineRule": "focus-indicator-contrast",
    "target": "span.cap",
    "variables": ["--slider-range-thumb-border", "--slider-range-thumb-border-width"]
  }
}
```

axe's contrast and target size rules, SIA-R65, both contrast checks, text
spacing, and reduced motion trace. The ARIA rules, the keyboard cases, and
the accessibility tree mark the component alone.

## Review findings

`a11y-review` collects the checks an engine left undecided. axe reads contrast
from the colour behind the text, so it returns no verdict for text over a
gradient, an image, or a backdrop, or under a pseudo-element that covers it.
The focus indicator and control boundary checks do the same for a ring or an
edge over a gradient or an image. Judge each element by eye against the help
page the finding names.

Two sources account for most of them. Button's shimmer pseudo-element and its
tinted hover surfaces leave every Button view undecided, so a Button run lists
many `a11y-review` warnings. A theme that paints gradient surfaces does the
same for every component that sits on one.

## Accessibility trees

The package records each shipped component's accessibility tree, one block
per view, in `src/testing/contracts/__aria__/<id>.yml`. A run that reads a
different tree reports `a11y-component` with engine rule `aria-snapshot` and
the lines that changed.

Inside the live-tokens repository, after a deliberate markup change,
`--update-aria` records the tree anew, and `LIVE_TOKENS_UPDATE_ARIA=1 npm run
test:e2e:contract` rewrites every file:

```bash
node bin/cli.mjs check-component button --tests --update-aria
```

In a project the trees sit under `node_modules`, where the suite reads them
and never writes. A project's own components therefore have no recorded tree
yet.

## Keyboard cases

A component contract declares its keyboard cases among its interaction
cases, each marked `rule: 'a11y-keyboard'`: Enter or Space activates, an
arrow key moves where the component's WAI-ARIA pattern moves, and Escape
closes an overlay. A failed keyboard case reports `a11y-keyboard` at `warn`.
A case without the mark fails as `contract-interaction`, an error. The
`live-tokens-create-component` skill writes these cases for a new component,
and its `references/contract-tests.md` describes their shape.

An editor that adds placeholder content to its preview, such as a demo label
or a hover target, marks it `data-preview-demo`, and the scans skip it.

## Boundaries in the contract

`boundaries` is an optional contract field,
`{ part: string; label: string; when?: string }[]`, for the parts that draw a
control's visible edge or show its selected state. `part` is a key of the
contract's `parts`, and `label` names the part in a finding. `when` is a
selector the part must also match to be measured, for a part that carries its
selected state as a class in some views only.

```ts
boundaries: [
  { part: 'track', label: 'Track' },
  { part: 'thumb', label: 'Thumb' },
],
```

List a part whose border or surface is the only thing that shows the control
is there, a thumb whose position shows the value, or a selected item whose
surface or edge is the only thing that shows it is selected. Leave out a part whose
text or icon already shows it. A contract without the field runs no boundary
check.

## Accessibility view

The editor's Accessibility view runs the component checks from the browser.
**Run test** checks every component in the open theme as saved, in about
three and a half minutes. With edits pending, it shows "Save the changes you
want to have checked." and starts nothing. Save the theme first, so the run
and the editor read the same values.

Each theme keeps its own report. Opening another theme shows that theme's
last run, or none if it has never run. The dev server keeps each report in
`_a11y-reports/` in the data directory, and deleting a theme deletes its
report. A failed run leaves the theme's last report in place.

The total counts the findings a fix clears. A result to check by eye counts
apart, because only a person can settle it. An overview opens the report. It
shows the total, the count in each repair group below, and a table of every
component with a finding and its count per group. The "Check by eye" figure
scrolls to the By eye list. The table
lists first the components with the most findings a property fixes, then those
with the most a code change fixes. A component's name in the table scrolls to
its section.

Each component's section heads its count with **Open component**, which opens
the component's page at its accessibility panel. The section sorts its rows
by repair:

- **Fix with a property** holds each colour pair below its WCAG floor, as the
  editor's contrast checker measures it, such as "Brand text color 3.87:1,
  needs 4.5:1", and every focus ring and control boundary below 3:1.
- **Fix in the component's code** holds every other finding: axe failures,
  focus styles that SIA-R65 finds unchanged, failed keyboard cases, text that
  clips under the spacing override, and motion that ignores reduced motion.
- **Check by eye** holds the `a11y-review` results, each led by an eye. The
  By eye list gathers them for the whole report.

Findings that share an engine rule, a help text, and their traced properties
merge into one row. The row names its element, or its element count, and the
views it failed in, up to four. An issue's text is amber, and a result to
check by eye is grey. The row's links sit beside its text:

- Each property the row traces to links with a "→" to its row on the
  component's page, which scrolls to the row and highlights it. A row that
  traces to no property links to the component's page instead.
- The link on the right opens the page the finding cites and names its kind:
  "Rule" for an axe or Alfa rule, "Success criterion" with its number for a
  WCAG criterion, "Technique" for a WCAG technique, and "Pattern" for a
  WAI-ARIA pattern.
- A result to check by eye has **Looks right** at the row's right edge.
  Press it once you have judged the element and found it passes. The row's
  eye turns to a check, its text dims, and it stops counting and stops
  marking the editor. Press it again to clear the mark. The mark belongs to
  the open theme's report, and each later run of that theme keeps it while
  the run finds the same result.

A property's label leads with the words from its variable name that the
editor's label leaves out, so `--input-focused-border` reads "Focused border
color" where the editor's row reads "Border color". The contrast rows read
the same labels.

The overview's "Check by eye" column counts the results no one has marked.
A component whose results all look right leaves the table, the sections, and
the view's sidebar. A component section lists only issues and fixes, so the
view's sidebar lists the components with one of those.

The **By eye** list closes the view and holds every result to check by eye,
merged per component. The results to check come first, under a tally such
as "2 to check, 18 look right" and a bar that fills as you mark them. Pressing
**Looks right** moves focus to the result that takes the row's place, so
Enter or Space walks the list. **Mark all as looking right** marks every
result still to check in one step. The marked results follow in **Looks
right**, a group that starts closed and shows their count. Open it to
revisit them, each with its button pressed, or to clear a mark. A component's
section with results still to check ends in a link such as "2 results to
check by eye" that scrolls to the list. axe's contrast
violations stay out of the report, because the contrast checker measures the
same pairs.

When Playwright, axe, or Alfa is missing, the report names its install
command and Run test stays disabled. Install the package and press **Check
again**. The view runs its tests through the dev server, so it exists under
the dev server alone, with the rest of the editor.

The view runs `check-component --tests --a11y --no-fix --json --open-theme`.
`--a11y` runs the accessibility suite and the keyboard cases alone, and
`--open-theme` tests the theme the editor has open. A run without it tests
the `default` theme. Both work from the command line too.

## Marks in the editor

The last finished run marks the rest of the editor. A result marked as
looking right is acknowledged and marks nothing: no sidebar mark, no panel,
and no property mark. The By eye list keeps it to revisit.

- The component list leads the name of each component with a finding with a
  warning triangle, or with a grey eye when its only results are unmarked
  results to check by eye. A condensed list shows the mark on the
  component's icon.
- That component's page opens with a panel under its title that lists its
  findings in all three groups, check by eye included, and leaves out the
  results marked as looking right. The panel heads with
  the triangle and the issue count, or with the eye and the count to check by
  eye when no issue remains.
- Each "→" in the panel opens the tab holding the property and highlights
  its row.
- Each property row a finding traces to carries a mark beside its label: a
  warning triangle in the highlight colour, or a grey eye when every finding
  on the row is a result to check by eye. A result marked as looking right
  adds no mark. On a colour or size row the mark sits between the
  label and the value. On a toggle row it follows the label.

Click a row's mark to open its findings: the count, then each merged row
with its element, its views, its help page, and the properties it traces to. The
editor's own contrast failures add no row mark, because the contrast readout
on the colour row already shows them.

The marks and the panel keep the run's time and change when the open
theme's next run finishes. The contrast readout on each colour row stays live and measures
every edit as you make it.

The editor also re-measures each contrast failure of the run as you edit.
Once one passes, its row in the panel and in the Accessibility view turns
green and shows the run's ratio beside the ratio now, such as
"Fill color 2.66:1 → 5.31:1". A fixed row counts as no issue, so a component
whose only issues are fixed loses its triangle in the component list. The
run's other findings change only when the next run finishes.

## Installing the engines

The engines ship as optional peer dependencies. A project made with `create`
has them. Any other project installs them beside `@playwright/test`:

```bash
npm install -D axe-core @axe-core/playwright \
  @siteimprove/alfa-act@^0.119.0 @siteimprove/alfa-device@^0.119.0 \
  @siteimprove/alfa-dom@^0.119.0 @siteimprove/alfa-http@^0.119.0 \
  @siteimprove/alfa-rules@^0.119.0 @siteimprove/alfa-url@^0.119.0 \
  @siteimprove/alfa-web@^0.119.0
```

The Alfa packages share one minor version. axe-core needs 4.11.1 or later to
read OKLCH colours, which every shipped theme uses. A test whose engine is
missing reports as inapplicable, and its coverage names the package. A
missing engine leaves the exit status to the other rules, under `--strict`
too.

## Limits

- The page's text spacing test measures widths, so it reports horizontal
  overflow alone. The component check measures both axes.
- The page's reduced motion test reports animations still running 200 ms
  after the page loads. A short entrance animation finishes first and goes
  unseen.
- The component's reduced motion check reads the preference within each
  view. A script that reads it only when the component mounts goes unseen.
- The page scan leaves contrast to `page-contrast` and focus visibility to
  the component suite.
- SIA-R65 reads the focused element, its descendants, and its ancestors, so
  it reports a focus ring painted on a sibling as missing. The focus
  indicator check measures that ring; confirm it by eye.
- A view that forces the focused look at rest, such as Input's focused
  state, leaves real focus nothing to change, so SIA-R65 reports it there.
  The same element passes in the views that leave it at rest.
- A finding traces to the component's own semantic properties and
  intrinsics. A ring or colour that a theme token paints directly, such as
  SegmentedControl's `--border-neutral-strong` focus ring, traces to
  nothing. A finding on a component nested
  inside another, such as a Button inside a Dialog, marks the host and names
  none of the nested component's properties.
- A literal value in the component's code, such as a transition's duration,
  has no property to name. The finding traces to whatever property governs
  the same declaration, or to none.
- A project's own components get no recorded accessibility tree.
- Automated checks find part of what WCAG asks. Reading order, the meaning of
  labels and alt text, and screen reader behaviour still need a person.
