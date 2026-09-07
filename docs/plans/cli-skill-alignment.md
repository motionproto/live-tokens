# CLI and skill alignment

Audit of 2026-09-07. Each `.claude/skills/*/SKILL.md` and its references were
read against the CLI verb it describes. The CLI sources are `bin/*.mjs`,
`bin/lib/*.mjs`, the engine under `src/editor/core/`, and their tests. The
editor strings in `src/editor/ui/*.svelte` were read for the concepts all three
surfaces share. Nothing in this document is applied. Each section ends with a
proposal for discussion.

Applied 2026-09-07. The vocabulary table's proposals are the settled terms,
including the buffer row and the alias row as written. Every CLI string in the
lists below is rewritten, every skill row is corrected, and
`bin/cliStrings.test.ts` sweeps the CLI strings for the banned words and the
retired terms. The four CLI gaps are described in the skills as the CLI behaves
today, and the code is unchanged. They stay open under "CLI gaps left open".

The trigger was one label. `set-geometry` printed "already at the ladder end"
while the skill said "at the end of the scale". That pair is fixed. The audit
found the same drift in three forms. The editor, the skills, and the CLI name
one concept three ways. A skill describes behaviour the CLI does not have. CLI
output uses words the skills were rewritten to drop.

## Shared vocabulary

One concept takes one word in every surface a model or a person reads. The
surfaces are editor labels and dialogs, skill prose, and CLI help and report
lines. The table records what each surface says today. The last column is the
proposal.

| Concept | Editor UI | Skills | CLI output | Proposal |
|---|---|---|---|---|
| The whole design | theme | theme | theme, and "look" in 3 strings (`cli.mjs:121`, `cli.mjs:268`) | theme |
| Edits the theme files do not hold yet | "unsaved changes", "unsaved edits", badge `unsaved` | buffer (one leftover "unsaved", `set-colors/SKILL.md:146`) | "unsaved edits", "unsaved buffer", "your unsaved edits", source label `working` | The editor keeps "unsaved" as its state badge, since a badge names a state. The CLI and the skills say "the buffer". A CLI source label reads "the buffer", `theme "x"`, or "the shipped default". A skill that describes the badge quotes the editor's word. |
| Making a saved theme the live one | button `Load`, dialog "Loading a theme will replace ..." | load (verb), "the open theme" (state) | "Opened", "Not opened", "previously open", flag `--no-activate`, file `_active.json` | Verb "load", state "open". CLI messages say "Loaded" and "Not loaded". The flag name is API and stays. Its help line says "writes the theme and does not load it". |
| Making the open theme the one the site ships | button `Adopt`, "production" in labels, `promote` in CSS class names only | Adopt, "ships" | "Adopt it there to publish", "production theme" | Verb "Adopt". Noun "the production theme". "Ships" for what the site serves. Drop "publish". |
| A token family ordered by size | scale, step | scale, step | "ladder" in one message (`adjustAliases.ts:185`), identifiers `LADDERS`, `rungsFor`, `snapRung`, `off-ladder` | scale, step. Rename the message now. Rename the identifiers when the file is next touched. They never reach a reader. |
| A `--name` in tokens.css | token | design token | "theme token" in 9 strings (`cli.mjs:51,59,71`, `report.mjs:123`, `catalogue.mjs:123`, `check-page.mjs:386`, `check-component.mjs:272,273,281,290`) | design token, per the 2026-09 overhaul vocabulary. |
| A component's editable CSS property | alias (78 uses, code and labels) | semantic property (create-component), alias (set-geometry) | alias, "component token" (`check-component.mjs:273`) | Decision needed. "Semantic property" is the name a component author writes. "Alias" is the binding of that property to a token in a config file. If both survive, each skill says which it means. "Component token" goes. |
| The values a fresh install carries | "default theme" | shipped default | "shipped default" and "package default" (`set-colors.mjs:33`, `set-type.mjs:29`, `save-theme.mjs:152`) | shipped default |
| An op the CLI did not apply | | skip, clamp | "skipped, <reason>". "clamp" is never printed | skip. The skills drop "clamp". The five printed reasons are the vocabulary. |
| A weight a family lacks | | "weight gap" (set-type) | "Weight coverage:" | coverage |
| The check verbs' unit of output | | finding, rule, severity | finding, rule, severity, `error` / `warn` | Aligned. No change. |

Two skill-side sweep hits remain from the simplification pass:
`set-colors/SKILL.md:146` ("marks the open theme unsaved") and
`create-theme/references/design-directions.md:10` ("when you state an intent").

## Skill claims the CLI contradicts

Each row was checked against the cited source line. A row that says "verified"
was re-run by hand during this audit. The other rows cite the line the agent
read.

### set-geometry

| Skill | Says | CLI | Kind |
|---|---|---|---|
| `SKILL.md:105` | A shift that would push an alias under `--space-4` "reports as clamped and writes nothing" | An overshooting shift lands on the end of the scale and writes it (`adjustAliases.ts:167-170`). Only an alias already at the end is skipped. Verified. | skill wrong |
| `SKILL.md:73` | `padding shift: -2` "takes a button from 8px to 4px" | Button padding sits beside a `-text-font-size`, so its scale floors at `--space-6` (`adjustAliases.ts:120-126`, `button/default.json:13,19`). The example contradicts the skill's own Floors section. Verified. | skill wrong |
| `SKILL.md:3,40`, `cli.mjs:92` | `kind` is one of four: `radius`, `padding`, `gap`, `border-width` | The engine accepts six: `divider-width` and `accent-width` too (`aliasKinds.ts:51-66`, `adjustAliases.ts:175`). `border-width` matches only `-border-width`. Verified. | skill and help incomplete |
| `references/geometry-anchors.md:8,27,35,55` | Hairline rules move with a "borders" op | A `border-width` op leaves every divider alias untouched. Rules need `divider-width`. | skill wrong |
| `geometry-anchors.md:24,45,53` | "No borders" is a border-width shift down | A shift never reaches `--border-width-0`. An alias at 0 prints "no line drawn, preserved (use "set" to draw one)". "No borders" needs `set: "--border-width-0"`. | skill incomplete |
| `SKILL.md:23` | Live config is "the buffer, else the open theme, else the shipped default" | The source label is `working` or `theme`. A shipped-default fall-through prints `(from: theme "default")` (`liveState.mjs:107`). | vocabulary |

### set-colors

| Skill | Says | CLI | Kind |
|---|---|---|---|
| `SKILL.md:49` | `l` is 0 to 1, `c` about 0.37 max | `l` must be in (0, 1) exclusive, and `c` in [0, 0.4] (`buildColors.ts:132-133`). | skill imprecise |
| `SKILL.md:27-51` | Fields are `baseColors`, `scheme`, `canvasGradient` | The file also accepts `harmony: { mode }`, validated against nine modes, advisory only (`buildColors.ts:36,92-95`). The skill describes harmony but never names the field. | skill incomplete |
| `SKILL.md:124` | Canvas sky needs "a committed canvas (level 2 or 3)" and is skipped at the ramp edge | Skip fires at L >= ~0.905 or <= ~0.10. Level 2 as the skill defines it (L 0.85 to 0.92) is still skipped at 0.91 to 0.92. | skill imprecise |
| `SKILL.md:132` | A re-run replaces the buffer's whole color state, including editor palette edits | User-tuned swatch gradients ride through unchanged, and the report says so (`buildColors.ts:351-356`, `set-colors.mjs:163-166`). | skill wrong |
| `SKILL.md:130` | Base colors sit in the theme "in either form the file accepts" | Hex input is converted. The saved theme always holds `{l, c, h}` (`buildColors.ts:124-129`). | skill wrong |
| `SKILL.md:22` | Exit 1 names the base color to change | The contrast failure does. Every other `fail()` path (bad JSON, missing file, missing engine) also exits 1 and names no color. | skill imprecise |

### set-type

| Skill | Says | CLI | Kind |
|---|---|---|---|
| `SKILL.md:28` | `editorial` "tracks the body face until a theme repoints it" | Omitted slots are left as they are. Setting `body` never moves `--font-editorial`. It was seeded once by migration (`applyFontPairing.ts:109,116`). | skill wrong |
| `SKILL.md:16,28` | Coverage is reported per family, and `editorial` is a first-class slot | `weightCoverage.ts:19` covers display, sans, serif, mono only. A family bound to `editorial` gets no coverage line. | CLI gap |
| `SKILL.md:28,91` | A pinned `{ name, url }` is verified, and "each URL matches the family's weights" | A pinned URL is not probed. The report prints "single weight, no italics" whatever the URL carries, and coverage skips it (`set-type.mjs:124-128,139,204`). | CLI gap or skill wrong |
| `SKILL.md:16-17` | Outcomes: changes, weights, URL, gaps, or a failed run | Two more: "Nothing to change: those faces are already bound to those stacks." and the buffer-discard case when the pairing equals the open theme. | skill incomplete |

### save-theme and create-theme

| Skill | Says | CLI | Kind |
|---|---|---|---|
| `create-theme/SKILL.md:53-55` | Gradients carry forward into the theme `save-theme` writes, and stock ones rebuild from the new families | `save-theme` copies by value and rebuilds nothing. The rebuild belongs to `set-colors` (`save-theme.mjs:79-96`, `set-colors.mjs:164-166`). | skill wrong |
| `create-theme/SKILL.md:33` | `--dry-run` "prints what it would write" | It prints the file path and the layer summary. The document is never printed. | vocabulary |
| `create-theme/SKILL.md:33` | The name comes from the design direction | A blank name and the slug `default` both exit 1. An existing slug is overwritten in place (`save-theme.mjs:64-69`). The skill names none of these. | skill incomplete |
| `create-theme/SKILL.md:47` | set-type decides "the two families" | set-type binds up to five slots. | skill imprecise |
| `create-theme/SKILL.md:46` | set-colors decides "the canvas commitment" | No input or output carries that name. The field is `canvasGradient`. | vocabulary |

### check-compliance and fix-findings

| Skill | Says | CLI | Kind |
|---|---|---|---|
| `check-compliance/SKILL.md:28`, `fix-findings/SKILL.md:14` | "Run `migrate --check`, then `--write`" | Plain `migrate` writes tokens.css and heals the data tree. `--write` only adds route rewrites (`cli.mjs:349-376`). Verified. | skill wrong |
| `fix-findings/SKILL.md:8,37` | tokens.css is the only file `migrate` touches | `migrate --write` also rewrites route references in page source, and the data heal moves files under `src/live-tokens/data/`. | skill incomplete |
| `fix-findings/SKILL.md:31` | `--tokens <path>` scopes the checkers to a tokens.css | Only `migrate` parses `--tokens`. `check-page --tokens x` checks a page called `x`. `check-component --tokens` runs id `--tokens`. | skill wrong |
| `check-compliance/SKILL.md:29` | Findings by rule, counted under project severities "and again with every warning as an error" | `byRule` exists only under project severities. Strict is one total (`report.mjs:42-52`). | skill imprecise |
| `check-compliance/SKILL.md:28` | `migrations`: whether tokens.css is behind | `migrations.status` is one of four strings. The skill names none. | skill incomplete |
| `fix-findings/SKILL.md:75` | `migrate --check` names the rename | It prints the migration id and the added lines. The retired name is never printed. | skill wrong |
| `check-compliance/SKILL.md:30-35` and the handoff | `unread`, `described`, `customUnregistered` are fixes the checkers verify | No checker rule reports an unread token or a missing description, and a custom component with no editor file is never discovered. The fix list holds items the exit code cannot confirm. | checker gap |
| `fix-findings/SKILL.md:81` | `multiple-primary`: use `secondary` or `outline` | A Button with no `variant` counts as primary. The message says "make the other N secondary". | skill imprecise |
| `fix-findings/SKILL.md:82` | `danger-without-dialog`: "the danger Button" | Fires for Button and IconButton, once per page, only when the page imports no Dialog. | skill imprecise |

### create-component, create-page, pick-component

| Skill | Says | CLI | Kind |
|---|---|---|---|
| `create-component/SKILL.md:32,76`, `cli.mjs:53-57` | `components` lists every component "with its props" and prints `interface Props` | The bare list prints id, origin, name, variants, and the description. Props print only for `components <id>`, as `name: type` lines. The help text makes the same wrong claim. | skill and help wrong |
| `create-component/SKILL.md:74,211` | A component in `componentDirs` is checked by `check-component` until exit 0 | `check-component` resolves the runtime only under `src/system/components` (`check-component.mjs:332`). A `componentDirs` component exits 1 with "runtime missing". Verified. | CLI gap |
| `create-component/SKILL.md:197` | Call `registerComponent(entry)` before `mount` | The registration regex needs the id literal inside the call (`check-component.mjs:492-494`). A variable argument fails with "no registration". Verified. | skill wrong or checker gap |
| `create-component/SKILL.md:65,126` | No name pairs `disabled` with `hover` or `selected` | `disabled-is-terminal` also rejects `focus`, `focused`, `on`, `active`, `checked`. | skill incomplete |
| `references/token-naming.md:39-83` | The geometry table is the full suffix vocabulary | `-indicator-width` is accepted and never listed. `check:skills` already fails on it. | skill incomplete |

## Behaviour the CLI has and no skill names

- `set-colors`, `set-geometry`, and `set-type` read a top-level `name` and print
  "Ignored "name"". Harmless. The skills' `name` bullets were dropped on purpose.
- `set-geometry` prints five skip reasons. The skill now says "every skip with
  its reason" and enumerates none, which is the intended shape.
- `tokens --family=space` (equals form) is not parsed and prints every family.

## CLI output that breaks the skills' writing rules

The skills were rewritten under the rules in `skill-simplification.md`. A model
reads CLI output in the same turn, so the same rules apply to every string a
verb prints. The groups below follow those rules.

**A user action in a CLI message.** The rule from
`feedback_cli_buffer_vs_running_editor`: the product streams CLI results to the
page, and the skill runs `save-theme`. These strings tell the reader to act in
the editor.

- `set-colors.mjs:175`, `set-type.mjs:234`, `set-geometry.mjs:193`: "This is an
  unsaved edit: save the open theme in the editor's Theme panel to keep it, or
  load a theme to discard it." Proposal: "The buffer holds this edit. Run
  save-theme to keep it as a theme."
- `save-theme.mjs:165-166`: "Switch back any time from Load in the editor's
  Theme panel. Adopt it there to publish it to tokens.generated.css."
- `save-theme.mjs:172-173`: "Load "<slug>" from the editor's Theme panel to see
  it."
- `cli.mjs:87-89, 97-98, 107-109` (help for the three set verbs): "so save the
  open theme in the editor to keep it". Only the set-colors line also names
  `save-theme`.

**Second person.**

- `set-colors.mjs:31,144,165`
- `set-type.mjs:27`
- `set-geometry.mjs:20`
- `save-theme.mjs:155,172`
- `cli.mjs:118,124`
- `migrate.mjs:151` ("so it is yours")
- `migrate-routes.mjs:173`

**"unsaved".** Every string above, plus these. See the vocabulary table.

- `set-colors.mjs:183-184`
- `set-type.mjs:239`
- `save-theme.mjs:158`
- `cli.mjs:87,97,107,113,116`

**"look".** `cli.mjs:121,268`. The verb sense in `check-page.mjs:386` and
`check-component.mjs:272` ("looks like a theme token") is ordinary English and
stays.

**Antithetical pairs.**

- `cli.mjs:65` "A reading, not a gate"
- `set-geometry.mjs:25` "raw value, not a token"
- `check-page.mjs:399` "Use a theme token, not a colour literal"
- `check-component.mjs:270` "a segment of a property name, not a token of its own"
- `check-component.mjs:384` "(e.g. -hover-surface, not -surface-hover)"
- `migrate.mjs:157` "a colors-and-type file, not a theme"

**Arrows.** The old-to-new report lines are the largest group. The skills say
"old and new".

- `set-type.mjs:199`
- `set-geometry.mjs:178`
- `save-theme.mjs:145`
- `buildColors.ts:385`
- `migrate.mjs:130,136`
- `migrate-routes.mjs:152`
- `cli.mjs:424,445`
- `create.mjs:81`

**Em-dashes.**

- `set-colors.mjs:159`
- `buildColors.ts:310,374`
- `check-component.mjs:515`
- `migrate-routes.mjs:153,163,172,173`

**Weasel words.** `cli.mjs:106` "the weights it actually has".

**"ladder".** `adjustAliases.ts:185`, printed as `set-geometry failed: "x" is
not on the radius ladder`.

## CLI gaps left open

The skills now state each of these as the CLI behaves. Closing one is a code
change with its own tests.

- `check-component` finds a runtime under `src/system/components` only, so a
  `componentDirs` component is listed by `components` and `report` and never
  checked.
- `set-type` reports weight coverage for `display`, `body`, `serif`, and `mono`.
  A family bound to `editorial` gets no coverage line.
- `set-type` does not probe a pinned URL, so the report shows no weights for it.
- The check-to-fix handoff carries three items no checker rule can confirm:
  unread tokens, a missing description, and an unregistered custom component
  outside the shipped directory.
- `check-component` finds a registration only by an id literal inside the
  `registerComponent` call.

## Order applied

1. Settle the vocabulary table. Two rows need a decision: the buffer's name
   across editor, CLI, and skills, and alias versus semantic property.
2. Rewrite the CLI strings under the settled words and the writing rules. One
   verb per commit, with the test expectations that quote the strings. The
   three buffer closers and the help text come first, since every set skill
   reads them.
3. Correct the skills where the CLI is right:
   - the geometry clamp sentence and the button example
   - the six kinds, and the divider rows in the anchors reference
   - the migrate flag order and `--tokens` in fix-findings
   - the gradient carry claim in create-theme
   - the editorial slot claim in set-type
4. Decide the CLI gaps:
   - `componentDirs` in check-component
   - editorial coverage and pinned-URL probing in set-type
   - the three fixes in the check-to-fix handoff that no checker can confirm
   - `registerComponent(entry)` with a variable argument
5. Add the CLI strings to the sweep. The plan's grep runs on skills only. A
   test over every string in `bin/*.mjs` and `bin/lib/*.mjs` that reaches
   stdout would hold the line. The `check:skills` script already has the shape.
6. Sync the atlas after every skill edit.
