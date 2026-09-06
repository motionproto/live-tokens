# Page consistency

Overhaul of build-page and pick-component so a generated page takes the
shipped components at their established defaults: one type scale from the
shipped text styles, the default size on every control, one primary action.
No new type size, token, or definition is created. The simplification method
in `skill-simplification.md` still applies to the prose; this plan settles the
content first. Robosprite (built 2026-09-03 to 09-04 with the current skills)
is the evidence of what went wrong. It is not repaired here; the aim is that
no page built with the skills does this again.

## Diagnosis

### The generated page

Counts over `robosprite/src`, pages and system components:

| Prop or token | Count |
|---|---|
| `Button size="small"` | 12 |
| `Button variant="primary"` | 1 |
| `Button variant="secondary"` | 8 |
| `Badge size="small"` | 6 |
| `SegmentedControl size="small"` | 5 |
| `IconButton size="small"` | 3 |
| `Card size="compact"` | 2 |
| `var(--font-size-lg …)` in page CSS | 21 |
| `var(--font-size-sm …)` in page CSS | 14 |
| `var(--body-sm-font-size)` | 21 |
| `var(--body-md-font-size)` | 17 |
| `.heading-*` / `.eyebrow` classes | 6 |

Small is the working size of the app. Raw `--font-size-*` axes outnumber the
text styles the skill asks for. Three text vocabularies (raw axis, text style
token, site.css class) mix in one tree. Every one of these is a per-instance
choice the page made against the shipped default.

### The shipped defaults

For the record, the default text size of each control at its default size:

| Component | Default text | Small text |
|---|---|---|
| Button, IconButton | lg, 18px | sm, 14px |
| Card body | xl, 20px | sm, 14px (compact) |
| Card title | 2xl, 24px | md, 16px (compact) |
| Badge, SegmentedControl, RadioButton | md, 16px | |
| Input, Toggle label | sm, 14px | |

These defaults stand. A project that wants a different voice for a component
retunes it once, for the whole project, in `/live-tokens/components`. A page
never sizes a control. The skill states this and the checker holds it.

Size prop values differ by component: `default | small` on Button,
IconButton, Badge, CornerBadge, SegmentedControl; `default | compact` on Card;
`normal | compact` on Notification; `lg | md | sm` as `variant` on
SectionDivider. These stay. The rule "omit `size`" holds regardless of the
value names; the SectionDivider levels are hierarchy and are bound to a place
in A.

### Component usage documentation

`npx live-tokens components` prints each component's leading HTML comment as
its description. Three of the 26 shipped components carry one (CodeSnippet,
Slider, Toggle), and those three describe token mechanics, not usage. The
create-component recipe requires the comment of every consumer component and
`report` flags a custom component without one; the shipped set is exempt from
the same check. The picker's per-component prose lives in pick-component's
SKILL.md, so the two sources the model reads at build time disagree in
coverage.

### The skill prose

build-page's Density section says `size="small"` belongs in "toolbars, compose
rows, and any band that holds more than a couple of actions", and the Layout
section says "give the controls the smallest size that still works". Both
rules ask for the extreme, and both contradict "take the shipped default".
Neither skill states a type scale by place, a one-size rule, an emphasis rule,
or a spacing-by-place rule. The Layout section teaches separation (Tufte) and
says nothing about hierarchy.

The user-level `frontend-design` skill also triggers on "build a page" and
asks for asymmetry, grid-breaking elements, and distinctive fonts. In a
live-tokens project that guidance competes with the theme. build-page's
description should claim the case.

## Sources

Layout and separation sources stay in `references/layout-sources.md`. These
add hierarchy, sizing, and documentation form.

**Cloudscape** (the user's pointer). Each heading level is bound to a place:
page title is heading x-large, container title heading large, card section
header heading medium, paragraph title heading small. "Use headings according
to their importance and information hierarchy, not for their visual
appearance." Spacing is bound to a place the same way: 8px between buttons in
an action stripe, 16px inside a card, 20px between form fields; "spacing
inside components uses smaller units, spacing between components uses larger
units". Actions: "Use only one primary button per page"; fewer than five
actions are individual buttons, more collapse into a dropdown; a fixed action
order. Each component page has a Usage tab with General guidelines as Do and
Don't lines, Features, and Writing guidelines. This is the model for the
component comment shape in D.
https://cloudscape.design/foundation/visual-foundation/typography/
https://cloudscape.design/foundation/visual-foundation/spacing/
https://cloudscape.design/patterns/general/actions/global-actions/

**Material 3.** One high-emphasis button per screen; emphasis is carried by
variant, and size is a separate axis whose middle step is the standard. The
lesson for this system: size and emphasis are two axes, and a page holds one
size while emphasis varies.
https://m3.material.io/components/buttons/guidelines

**DESIGN.md (Google Labs, April 2026).** Tokens in YAML front matter, prose in
Markdown, eight fixed sections ending in Components and Do's and Don'ts. The
Do's and Don'ts form is a flat list of "Do …" and "Don't …" lines, e.g. "Do use
the primary color only for the single most important action per screen" and
"Don't use more than two font weights on a single screen". For this project
the token half already exists as `npx live-tokens components <id>`; the prose
half is what is missing.
https://github.com/google-labs-code/design.md

**Vercel web-interface-guidelines.** 107 MUST / SHOULD / NEVER lines, mostly
interaction and accessibility. Relevant here: "Deliberate alignment to
grid/baseline/edges", hit target at least 24px, "Balance icon/text lockups".
The form lesson: a rule an agent can check is one line with a modal verb.
https://github.com/vercel-labs/web-interface-guidelines

**shadcn registry.** Each item carries `title`, `description`, `docs`,
`categories`; the agent is told to fetch docs before using a component. Same
shape as the component comment plus the CLI; confirms the fix is content, the
delivery path exists.
https://ui.shadcn.com/docs/registry/registry-item-json

## Proposal

Every rule below is stated in shipped values: the text styles in tokens.css,
the `--space-*` scale, the props each component declares. Nothing is added
to the system.

### A. Hierarchy rules in build-page

A new Hierarchy section replaces Density. Four rule groups, each a short table
or list.

Type by place. One text style per place, and a page uses each level in order
with no skipped level:

| Place | Style |
|---|---|
| Page title | `--heading-xl`, or `SectionDivider variant="md"` |
| Band or section title | `--heading-lg`, or `SectionDivider variant="sm"` |
| Card or box title | the Card `title` prop; its own tokens type it |
| Label above a group | `--body-sm` in `--text-secondary` |
| Body | `--body-md` |
| Secondary line, count, status | `--body-sm` |
| Command or value | `--code` |

Raw `--font-size-*` and other single axes never appear in page CSS. Text
styles carry the family and weight, so a raw axis is the way a page drifts
from the theme's fonts. Text inside a shipped container takes the container's
type; the page types only its own elements.

One size. Omit `size` on every control and container. The shipped default is
the page's size. When a component's default voice is wrong for the project,
retune it in `/live-tokens/components`; that moves every instance at once.

One primary action. One `variant="primary"` Button per page or dialog. Other
actions are `secondary`; a tertiary action is `outline`; `danger` marks a
destructive action only. In a row of actions the primary sits last (right).
Fewer than five actions are individual buttons; more collapse into a
MenuSelect behind one Button.

Spacing by place, on the `--space-*` scale. Cloudscape's shape: inside a
control row, between fields, inside a box, between boxes, between bands, each
one named step, and inside is always smaller than between. The existing band
rule (`--space-16` plus a hairline) stays; the other steps are chosen in the
wave from the shipped scale.

The Verify section gains the matching reads: no `size` prop on the page, one
primary button, heading levels in order with no gap, no raw type axis.

### B. Checker guardrails

`check-page` gains rules with tests, each greppable in one file:

- `control-size`: a `size` prop on a shipped component in a page file.
  Warning; the message names the components editor as the place to retune.
- `multiple-primary`: more than one `variant="primary"` Button in one page
  file. Warning.
- Raw type axis in page CSS: `raw-text-axis` exists as a warning today, and
  it fires only on a literal (`18px`, a family name). It skips every value
  that contains `var(`, so the 35 axes Robosprite shipped, all of the form
  `var(--font-size-lg)`, pass it. The rule gains the single-axis token
  families (`--font-size-*`, `--line-height-*`, `--letter-spacing-*`,
  `--font-sans` and the other family stacks) on a text property; a text
  style token (`--body-md-font-size`) stays clean, and so does a
  `--font-weight-*`, which alone cannot move the scale or the fonts
  (Decision 5). Then the
  rule is promoted to an error. The run fails until the page is clean;
  fix-findings rewrites each raw axis to the text style of its place.

### C. The Density rules go

The Density section is deleted, with its "small in toolbars" rule and the
"smallest size that still works" sentence in Layout. The toolbar and picker
recipes that survive (the MenuSelect-behind-a-Button pattern, `fullWidth` in a
stacked rail) move under Containers by job without a size.

### D. Component usage comments

Every shipped component gets a leading HTML comment in one shape. The CLI
already prints it; pick-component and build-page read it at build time.

```
<!--
  Button.svelte. A labelled action.
  Use for: an action that needs a word to be unambiguous.
  Not for: an icon-only action (IconButton); a link to another page.
  Emphasis: one primary per page; secondary for the rest; outline for a
  tertiary action; danger for a destructive one.
-->
```

Brief by rule: at most four lines, one sentence each, no token or mechanics
talk. Svelte strips the comment from compiled output, so it costs the source
tarball a few hundred bytes per component and a consumer's bundle nothing.
The three existing comments (CodeSnippet, Slider, Toggle) are rewritten to the
shape; their token notes move to a code comment below the script tag if they
are still needed. Three labelled lines: what it is, Use for, Not for with the
alternative named. A fourth line only where the component has a hierarchy or
emphasis axis:
Emphasis on Button and IconButton, Level on SectionDivider (`md` page title,
`sm` section title), Variant on Image and CollapsibleSection. No comment
mentions `size`. `report` checks the shipped set for the comment the same way
it checks custom components. pick-component keeps the decision trees for the
confusable families and drops the per-component prose the comments now carry.
The create-component recipe cites the shape.

### E. Skill rewrites

After A to D, under the simplification method. build-page: Rules, Hierarchy
(new), Layout (as is, minus the size sentence), Containers by job, Wiring,
Avoid, Verify. Avoid gains "a `size` prop on a shipped component". The
description adds "sizes, type scale, and button emphasis" to its triggers so
it claims the case from `frontend-design`. pick-component: description states
the boundary ("emphasis and placement are build-page's"), catalogue line, one
section per confusable family, and a closing pointer to `components <id>` for
the usage comment.

## Waves

Ledger: `git log --grep "page-consistency Wave"`. Wave 1 done 2026-09-06
(fa3297c, fd1e904, 3134e71, 7f1d9d6 after review). Wave 2 done 2026-09-06
(2ead221, 8c70d2d, 285bdcc, d1a06da, then the review fixups, Decision 5,
and Decision 6); the review's block is cleared, and the repo-page debt is
Wave 4. Wave 3 done 2026-09-06 (c6227d2, 78c6bd5 after review) as one full
rewrite of both skills at the user's direction; Decision 4 settled there.
Wave 4 done 2026-09-06: the page rewrite (2fc658f, 407fc5f, 5ddb5ac, 2d6b228)
was reverted at the user's direction and the demo excluded instead; 6dd093f
and 17c2894 stand. Wave
5 done 2026-09-06: target met, see Acceptance below; its checker gap
(`multiple-primary` and the default variant) is fixed on main.

1. D. 26 comments in the fixed shape; `report` checks shipped components;
   create-component recipe cites the shape. Gate: `components` prints a
   description for every id, and no description mentions size.
2. B. Checker rules with tests over fixture pages in `bin/`. Gate: a fixture
   with two button sizes, two primaries, and a raw axis fails; the same page
   with the props removed passes.
3. A, C, E. build-page then pick-component, section by section per the
   simplification method; `sync:skill-sources`. Gate: the sweep grep is clean
   and no sentence in either skill chooses a size.
4. The package's own pages. Promoting `raw-text-axis` to an error turned
   `check:pages` (in `prepublishOnly`) red on `src/app` and `src/demo`.
   Those pages are the library's showcase, built before the skills and
   outside their scope, so `live-tokens.config.json` excludes them and the
   demo stays as it is (user's decision 2026-09-06; a rewrite was tried and
   reverted). `src/app/site.css`, the starter `create` copies, is clean and a
   scaffold gate test checks a scaffolded project under `--strict`. The
   repo-pages test asserts `[]` with default rules. CHANGELOG entry done.
5. Acceptance. Build one new tool page from a brief (a stage, a form of
   inputs, a toolbar) in a scratch `create` project with the new skills, and
   run the counts from Diagnosis over it. Target: zero `size` props, one
   primary, zero raw axes, `check-page --strict` exit 0.

Wave 3 runs in conversation: the simplification method prints Current and
Proposed per section and waits for "apply".

## Decisions

Settled 2026-09-06:

1. A raw type axis in page CSS is an error. The checker fails the page until
   every text value is a text style.
2. Usage prose is embedded as the component's leading comment, kept to the
   four-line cap in D. A sidecar file was weighed and declined: it adds a
   second convention for consumers and a second file to keep in sync, and the
   CLI is the reader either way.
3. No eyebrow. The skills never recommend the `--eyebrow-*` text style or the
   `.eyebrow` class; a label above a group is `--body-sm` in
   `--text-secondary`. build-page's current mentions (`.eyebrow` for "a quiet
   section label"; the eyebrow layer in Layout) go in Wave 3. The style and
   the SectionDivider part stay in the system for a project that asks for
   them; nothing recommends or uses them by default. The SectionDivider
   comment names `eyebrow` as an opt-in prop.

Open:

4. Settled 2026-09-06 in build-page's Hierarchy table: controls in a row
   `--space-8`, inside a box `--space-16`, between fields `--space-20`,
   between boxes `--columns-gutter` across and `--space-24` down, between
   bands `--space-16` above the hairline.

5. Settled 2026-09-06: (c). `--font-weight-*` is not a single-axis family;
   `strong` and `::marker` keep their weight.
   The case: a lone `font-weight` has no bundle. `strong { font-weight:
   var(--font-weight-semibold) }` and `ol li::marker` in `src/app/site.css`
   (lines 105 and 140) are errors under the Wave 2 rule, and the only bundle
   answer, `--body-md-font-weight`, is `normal`, which removes the emphasis.
   `create` copies that file into every new project and `build` runs
   `check:design`, so a fresh project fails its own build until this is
   settled. Three paths:
   (a) exempt `font-weight` from the `var()` path when it is the only text
       axis the declaration block sets; a block that also sets a size or a
       family still fires.
   (b) keep the rule as listed and have `create` write a `checks.exclude`
       for `site.css`; every fresh project then starts with an exclusion for
       a file the package wrote.
   (c) drop `--font-weight-*` from the single-axis families. A weight alone
       cannot move the scale or the fonts, which is the drift the rule
       exists for; "at most two weights on a screen" is build-page prose.
   Recommendation: (c). It is the smallest rule and needs no block-level
   reasoning. Whichever path, the fix-findings row states it in Wave 3.

7. `--editorial-*` has no row in the Hierarchy table. Whether a lead
   paragraph or pull quote gets a row, or is `--body-md-*`, is a skill
   question for the Acceptance gaps below.

6. Settled 2026-09-06: the serif list voice is not carried over; `ul li`
   is `--body-md-*`.
   The case: `ul li` in `src/app/site.css` (lines 114 to 117) sets `--font-serif`,
   `--font-size-md`, and `--line-height-relaxed`: a deliberate departure from
   `p`, with no exact bundle. By place it is `--body-md-*`, which turns the
   starter's bulleted lists sans and tightens their leading. `ol li` already
   moved to `--body-md-*` (an exact match). The list voice is the user's call
   before Wave 4 rewrites the file.

## Acceptance

Wave 5, run 2026-09-06. One tool page built from a brief in a fresh `create`
project with the Wave 3 skills, then read back through the skill's Verify
section. The project is `scratch/acceptance/app`, left in place and gitignored.
The page is `scratch/acceptance/app/src/pages/SpriteSlicer.svelte` (244 lines),
wired at `/slicer` in the scaffold's `App.svelte` pages table. The brief asked
for a stage with a slice grid drawn over the sheet, inputs for columns, rows,
padding, and an export name, a toolbar of three actions, a status line, and a
callout that fires when the padding leaves a fractional frame.

### Counts

Robosprite is a whole app (pages plus its own components); the slicer is one
page. The comparison is of kind, not of scale.

| Prop or token | Robosprite | Slicer |
|---|---|---|
| `Button size="small"` | 12 | 0 |
| `Button variant="primary"` | 1 | 1 |
| `Button variant="secondary"` | 8 | 1 |
| `Badge size="small"` | 6 | 0 |
| `SegmentedControl size="small"` | 5 | 0 |
| `IconButton size="small"` | 3 | 0 |
| `Card size="compact"` | 2 | 0 |
| `var(--font-size-lg …)` in page CSS | 21 | 0 |
| `var(--font-size-sm …)` in page CSS | 14 | 0 |
| `var(--body-sm-font-size)` | 21 | 1 |
| `var(--body-md-font-size)` | 17 | 1 |
| `.heading-*` / `.eyebrow` classes | 6 | 0 |
| any `size=` prop (the rows above, summed) | 28 | 0 |

The page sets type from three bundles (`--heading-lg`, `--body-md`,
`--body-sm`) and spacing from four steps (`--space-8`, `--space-16`,
`--space-20`, `--space-32`). The targets in the wave line are met: zero `size`
props, one primary, zero raw axes.

### The checker

`node bin/cli.mjs check-page --strict` from the scaffold root: **exit 0**, 5
files clean, no finding, on the first run and after the two Verify repairs
below. `check-component --strict` reports no authored component. The page also
compiles under the repo's Svelte compiler with no warning.

Negative control, to prove the checker reads this page shape: a copy with
`size="small"` on the Reset Button, that Button switched to `variant="primary"`,
and one `--body-sm-font-size` swapped for `--font-size-sm` returns exit 1 with
`control-size`, `multiple-primary`, and `raw-text-axis`.

The Verify read changed two things the checker cannot see. The Padding field
carried a `hint`, which made it taller than the other three and broke the one
bottom line; the unit moved into the label. The page title's own hairline and
the first band's rule stacked two edges sixteen pixels apart; the band rule now
starts at the second band.

### Gaps and contradictions

Each is a place the skills left the build without an answer, or two rules that
pulled apart, with the sentence that caused it.

1. **The page title has two forms and no test.** "| Page title |
   `--heading-xl-*`, or `SectionDivider variant="md"` |". The two render
   differently: the divider draws a hairline, centres itself, and offers an
   eyebrow and a description. Nothing chooses.

2. **The page title's hairline stacks with the band rule.** "A band's rule is
   `padding-top: var(--space-16)` with `border-top: var(--border-width-1) solid
   var(--border-neutral)`." against "Do not stack these separators."
   `--sectiondivider-md-hairline: below-label` puts a rule under the title, so
   the first band's rule lands one space step below another rule. Following
   both sentences produces the shape Layout forbids. `sm` defaults to no
   hairline, so a band title does not have the problem.

3. **A page titled with a SectionDivider has no `h1`.** Verify: "Heading levels
   run in order with no gap." SectionDivider renders the title in a `<span>`,
   so the first heading element on the page is the band's `h2`. The sentence
   also never says whether "heading levels" means the document outline or the
   type scale.

4. **site.css already types the bare elements, so the Hierarchy rule writes the
   CSS twice.** "A text style carries `-font-family`, `-font-size`,
   `-font-weight`, `-line-height`, and `-letter-spacing`. Set all five from one
   style." The `site.css` that `create` copies sets those five on `h2` from
   `--heading-lg-*` and on `p` from `--body-md-*`. The page restates both. No
   sentence says the bare element arrives typed.

5. **The shipped `p` colour contradicts the layer rule.** "Content is
   `--text-primary`. A label is `--text-secondary`." `site.css` paints `p` with
   `--text-secondary`, so every paragraph in a fresh project is already in the
   label colour and the rule asks the page to override the file the package
   shipped.

6. **A status line has a style and no colour.** "| Secondary line, count,
   status | `--body-sm-*` |" with "Content is `--text-primary`. A label is
   `--text-secondary`." "12 slices, 64 × 64 px each" is a read-out of the
   stage, which is content, and the row that names it calls it secondary. The
   page chose `--text-secondary` with nothing behind the choice.

7. **Four fields in a row have no allowed layout.** "Never write a local
   `repeat(N, 1fr)` with a hardcoded count", and the sub-grid recipe
   "Redeclare `repeat(var(--columns-count), 1fr)`" with `--columns-gutter`,
   against "| Between fields in a form | `--space-20` |". The checker's
   `hardcoded-columns` threshold is four, so a four-up is either on the page
   grid, which forces `--columns-gutter` between the fields, or a flex row,
   which no sentence mentions. The page uses flex at `--space-20`.

8. **Giving a shipped component a width has no sanctioned move.** Avoid: "A
   utility class that overrides a shipped component." `Input` has no width or
   flex prop and its root is `width: 100%`. Four in a row needs a flex basis
   somewhere. The page wraps each `Input` in a `div` it owns. Passing `class`
   to `Input` and reaching it with `:global` would read as the forbidden
   override.

9. **A native control the catalogue lacks has no rule.** pick-component: "When
   nothing in the catalogue fits (a `DatePicker`, a `Stepper`, a custom
   widget), author it with **live-tokens-create-component**." "Load a sheet"
   needs `<input type="file">`. Authoring a component for a hidden file input
   is out of proportion, and neither skill says a page may use a bare HTML
   control or how to hide one.

10. **A value that comes from data, not the theme, has no rule.** "Every color,
    spacing, radius, stroke, and shadow in page CSS is a `var(--token)`. That
    holds in the `<style>` block, an inline `style=` attribute, and a `style:`
    directive." The slice grid's column gap is the user's padding in sheet
    pixels. It is spacing, it is set through a `style:` directive, and no token
    can carry it. The checker skips it only because the value is a `{}`
    expression, so the rule and the checker disagree about the same line.

11. **A mark drawn over content has no layer.** "Put each element in one of
    three layers, and color it from that layer. Content is `--text-primary`. A
    label is `--text-secondary`. Scaffolding is `--border-neutral`." The slice
    grid sits on top of arbitrary pixels and has to stay visible;
    `--border-neutral` vanishes on a mid-grey sheet. The page uses
    `--border-brand`, which the three layers do not name.

12. **Tertiary is undefined, and Reset's emphasis is unsettled.** "Every other
    action is `secondary`. A tertiary action is `outline`. `danger` marks a
    destructive action only." Reset discards the loaded sheet and all four
    field values, which is destructive in the plain sense, and `danger` in a
    three-button toolbar would out-shout the primary. The page made Load
    secondary and Reset outline on no stated rule.

13. **The page's own padding is in no row of the spacing table.** The five rows
    cover controls in a row, inside a box, between fields, between boxes,
    between bands. The page's outer padding, and the gap between two bands when
    one has no hairline, are in none of them. The page took `--space-32` from
    the scaffold's `Home.svelte` and `--space-16` for the un-ruled gap.

14. **A stage's height is invented.** "Sizing is layout and stays literal: a
    hero's height, a max content width, a column's minimum width." `Panel
    minHeight="420px"` obeys the rule, and the number comes from nowhere.
    Nothing says a stage height belongs in the page rather than in the
    components editor.

### A checker gap

`multiple-primary` reads the `variant` attribute, and `Button`'s default
variant is `primary`. A page with `<Button>Save</Button>` and
`<Button>Cancel</Button>` therefore has two primary Buttons and passes
`check-page --strict` clean (verified against a two-line fixture). The skill
sentence has the same shape: "One `variant="primary"` Button per page or
dialog." The scaffold's own `Home.svelte` relies on the implicit default for
its one primary, so the rule has to count a variant-less `Button` as a primary
rather than require the prop.

### Oddity

The template's `Home.svelte` calls `<Button on:click={...}>`, and `Button`
declares `onclick` with the note "Preferred over `on:click` from 0.5.0 onward".
Every page built from the scaffold copies the older form. `check-page` skips
any attribute whose name holds a colon, so nothing reports it.

### Triage

2026-09-06. Each gap is one of: a skill sentence (S), a decision the user
makes (U), or closed (C). Every S proposal is stated in shipped values.

| Gap | Class | Proposal |
|---|---|---|
| 1 Page title has two forms | S | One form. The Page title row becomes `h1` in `--heading-xl-*`. `SectionDivider` stays the band title (`sm`). Its comment still says `md` titles a page; the component can, the skill does not recommend it. |
| 2 Title hairline stacks with the band rule | C | Closed by 1: an `h1` draws no hairline. |
| 3 No `h1` under a divider title | C | Closed by 1. Verify's read becomes "Heading elements run `h1`, `h2`, `h3` with no gap", which names the outline. |
| 4 site.css already types bare elements | S | Add to Hierarchy: "The scaffold's `site.css` types bare `h1` to `h4`, `p`, `code`, `pre`, and list items from these styles. A bare element arrives typed. Type an element only when its place differs from its tag." |
| 5 `p` is `--text-secondary` in site.css | U | Either site.css paints `p` in `--text-primary` (every fresh project's body copy darkens), or the layer rule reads "Content is `--text-primary`, or the colour `site.css` gives the element." Recommendation: the second; the starter is the design source and the skill describes it. |
| 6 Status line has no colour | S | Split the row. "Secondary line" stays `--body-sm-*` in `--text-secondary`. New row "Count, status, read-out" is `--body-sm-*` in `--text-primary`: a read-out of the stage is content. |
| 7 Four fields in a row | S | Add to Containers by job: "A row of fields is a flex row with `gap: var(--space-20)`; each field wrapper takes `flex: 1`." No checker change; `hardcoded-columns` keeps its threshold, and a form row is not a grid claim. |
| 8 Width on a shipped component | S | Same sentence as 7 carries it, plus one in Rules: "A shipped component fills its parent. To size one, size the element the page wraps it in." |
| 9 Native control the catalogue lacks | S | Add to Rules 1: "A native element with no chrome of its own needs no component: an `<input type="file">` behind a Button, a `<canvas>`, an `<img>` inside a stage." |
| 10 Value from data | S | Add to Rules 2: "A value that comes from data (a sheet's padding in pixels, a chart's scale) is not a theme value. Set it through a `{}` expression." The checker already skips expressions, so rule and checker then agree. |
| 11 Mark over content | S | Add a fourth layer sentence: "A mark drawn over content that must stay visible on any pixel (a grid, a selection) is `--border-brand`." |
| 12 Tertiary undefined | S | Rewrite the emphasis sentences: "`secondary` is every other action the task needs. `outline` is an action that undoes or leaves: Reset, Cancel, Back. `danger` destroys saved work." Reset is `outline`. |
| 13 Page padding and un-ruled gap | S | Two rows: "Page edge: `--space-32`" and "Page title to first band: `--space-24`, no rule". Every later band takes the rule. |
| 14 Stage height invented | S | One sentence under Panel: "Its `minHeight` is a literal chosen from what the stage must show at the page's width." Sizing stays the page's judgment; the sentence names the source. |
| Checker gap | C | Fixed on main, 5ab81f6. |
| Oddity `on:click` in the template | S | Change the two calls in `template/src/pages/Home.svelte` to `onclick`, the form Button prefers. |
