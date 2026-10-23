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

## What runs

**Components.** The component suite opens every variant and state the
component's contract names and scans the preview:

- **axe-core** checks names, roles, ARIA, contrast, target size, and
  structure.
- **Siteimprove Alfa**, rule SIA-R65, checks that each focusable element
  looks different when it takes focus.
- **Playwright** reads each view's accessibility tree and compares it with
  the tree recorded for that view.
- **Keyboard cases** in the contract press Enter, Space, the arrow keys, and
  Escape, and read what each key did.

A project's run scans the open theme. The library's own test run also repeats
axe's contrast rule under each of the eight preset themes.

**Pages.** `check-page --tests` runs three tests on each page at each
viewport:

- `page-a11y` runs axe over the page, leaving out the router's chrome and
  every component the component suite scans. axe's contrast rule stays off here, because
  `page-contrast` already reports text contrast at `error`.
- `page-text-spacing` applies the WCAG 1.4.12 text spacing override (line
  height 1.5, paragraph spacing 2em, letter spacing 0.12em, word spacing
  0.16em) and reports content that overflows under it.
- `page-reduced-motion` loads the page under `prefers-reduced-motion: reduce`
  and reports animations that keep running.

## Rules

| Rule | Checker | Reports |
|------|---------|---------|
| `a11y-component` | `check-component` | An axe failure inside a component's preview, or a changed accessibility tree. |
| `a11y-focus-visible` | `check-component` | An element that looks the same focused as at rest (SIA-R65). |
| `a11y-keyboard` | `check-component` | A keyboard case whose key failed to activate, move, or close. |
| `a11y-page` | `check-page` | An axe failure in the page's own markup. |
| `a11y-text-spacing` | `check-page` | Content that overflows under the text spacing override. |
| `a11y-reduced-motion` | `check-page` | An animation still running under reduced motion. |
| `a11y-review` | both | A check axe could not decide, for you to judge by eye. |

Each finding's message names the engine's own rule, the element, the view it
failed in, and a help page that states the requirement and its repair. The
rules take the same severity settings as every other rule. `--off=a11y-review`
silences one for a single run, `--error=a11y-page` raises one, and
`live-tokens.config.json` records either for good:

```json
{ "checks": { "rules": { "a11y-review": "off", "a11y-page": "error" } } }
```

A scan that crashes reports `tests-setup`.

## Review findings

`a11y-review` collects the checks axe left undecided. axe reads contrast from
the colour behind the text, so it returns no verdict for text over a
gradient, an image, or a backdrop, or under a pseudo-element that covers it.
Judge each element by eye against the help page the finding names.

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

## Accessibility view

The editor's Accessibility view runs the component checks from the browser.
**Run test** checks every component in the open theme as saved, in about
three minutes. With edits pending, it shows "Save the changes you want to have
checked." and starts nothing. Save the theme first, so the run and the editor
read the same values.

The report lists each component with issues and sorts them by repair:

- **Fix with a property** holds each colour pair below its WCAG floor, as the
  editor's contrast checker measures it, such as "Text color 3.87:1, needs
  4.5:1".
- **Fix in the component's code** holds axe failures, focus styles that
  SIA-R65 finds unchanged, and failed keyboard cases. Each row names the
  element, the view, and a help page.

The `a11y-review` results collect apart, in one closed list of results to
check by eye. axe's contrast results stay out of the report, because the
contrast checker measures the same pairs.

The last finished run also marks the rest of the editor:

- The component list carries a "!" beside each component the run named.
- That component's page opens with a panel under its title that lists its
  issues in the same two groups.
- A property row in the panel carries a "→" that opens the tab holding the
  property and highlights its row.

The marks and the panel keep the run's time and change when the next run
finishes. The contrast readout on each colour row stays live and measures
every edit as you make it.

When Playwright, axe, or Alfa is missing, the report names its install
command and Run test stays disabled. Install the package and press **Check
again**. The view runs its tests through the dev server, so it exists under
the dev server alone, with the rest of the editor.

The view runs `check-component --tests --a11y --no-fix --json --open-theme`.
`--a11y` runs the accessibility suite and the keyboard cases alone, and
`--open-theme` tests the theme the editor has open. A run without it tests
the `default` theme. Both work from the command line too.

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

- Text spacing measures widths, so it reports horizontal overflow alone. Text
  that grows taller and clips under a fixed height goes unreported.
- Reduced motion reports animations still running 200 ms after the page
  loads. A short entrance animation finishes first and goes unseen.
- The page scan leaves contrast to `page-contrast` and focus visibility to
  the component suite.
- SIA-R65 reads the focused element, its descendants, and its ancestors. A
  focus style painted on a sibling needs a look by eye.
- A project's own components get no recorded accessibility tree.
- Automated checks find part of what WCAG asks. Reading order, the meaning of
  labels and alt text, and screen reader behaviour still need a person.
