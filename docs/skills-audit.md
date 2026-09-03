# Skills audit
/Users/mark/Documents/repos/motionproto-repos/live-tokens/.claude/skills

**Names below are pre-2026-09-03.** generate-theme has since split into
live-tokens-create-theme and live-tokens-set-colors, set-fonts is
live-tokens-set-type, and adjust-geometry is live-tokens-set-geometry. The
findings still stand against the text they were written for; this document is
the record of that pass, not a description of the current tree.

Six bundled skills, four reference files, reviewed one tree at a time from the
SKILL.md down to every file it names. This document records what the
optimization pass changed and what I would change next. The changes are already
applied; the recommendations are not.

Verification after the pass: `check:skills` green, `svelte-check` 0 errors,
`bin/` and `registryContract` suites green (213 tests), no churn under
`src/live-tokens/data/`.

## Status

The recommendations below were worked through after the audit was written.
Every item is closed except the two the audit itself made conditional.

| # | Recommendation | Status | Commit |
|---|---|---|---|
| 1 | The atlas pins line numbers into the skills | Done | ae9e4a0 + 3a9b6bd |
| 2 | Gate the suffix tables against `KNOWN_SUFFIXES` | Done | ca43d51 |
| 3 | Gate the flags a skill owes its CLI verb | Done | 55952c1 |
| 4 | Nothing measures triggering | Authored, unrun | f136573 |
| 5 | Facts that cost a round trip belong in the skill | Adopted | — |
| 6 | The tree is a DAG with two thin edges | Done | a9eb0ef |

Per-skill: generate-theme's step 1 split, its anchor precedence rule, and an
atlas node for the refinement section landed in cdfc522; create-component's
suffix extraction in ca43d51; build-page's route scaffold in 781fadf;
set-fonts' superfamily list now reads as a starting set rather than a closed
one. adjust-geometry needed nothing, as the audit said.

Three items resolved differently than recommended, each for a reason found
while doing them:

- **Rec 1 took the better fix, not the cheap one.** The audit ranked
  text-anchoring above a snapshot gate and then recommended the gate as
  cheaper. They are not alternatives: `scripts/sync-skill-atlas.mjs` derives
  every line number from anchor text, so `check:skill-atlas` fails on drift
  and `sync:skill-atlas` repairs it. Editing a skill now costs a sync.
- **Rec 2 was worth doing only after rec 1's neighbour.** The argument for
  deferring — that `check-component` catches a bad suffix downstream, and the
  tables sat inline beside the rule they serve — stopped holding once the
  tables moved to `references/token-naming.md`. Extraction created the drift
  surface; the gate closes it.
- **Rec 4 is authored but unrun.** `claude plugin eval` is in early access and
  refuses on this account. The eight cases in `.claude/evals/` follow the
  documented layout and are unverified against the runner.

Still open, both conditional and neither yet met:

- **pick-component's outcome index.** The audit set the threshold at thirty
  components; the catalogue holds 25.
- **create-component's line ceiling.** The extraction bought 39 lines of
  headroom, so the next addition no longer forces a cut.

One correction to the audit's own text. Recommendation 4 asserts that "the
risk is not mis-triggering between siblings. It is undertriggering." Nothing
measured that, in a recommendation whose headline is that nothing measures
triggering — and sibling contention had already happened once, when
generate-theme advertised "warmer" with no body path for it. The eval suite is
built so either answer can show up rather than assuming this one.

## What the pass changed

| Skill | Change | Why |
|---|---|---|
| generate-theme | Documented `--carry-from` and the batch trap | The flag exists in `bin/cli.mjs` and in `--help`, and in no skill. Two runs without it silently carry the first theme's fonts and geometry into the second. |
| generate-theme | New section: refining a theme that exists | The description triggers on "warmer", "more contrast", "calmer". The body had no path for them. Seeds are recoverable from `colorsAndType.editorConfigs.<Palette>.baseColor`. |
| generate-theme | Brief is `scratch/<slug>-brief.json` | A theme file never records its brief, so the brief on disk is the only copy of the seeds. One fixed filename destroyed it on the next run. |
| set-fonts | Reload before Save, with the mechanism | The trap that cost a full round trip on 2026-08-25. The editor writes the buffers from its own browser copy, so a Save in a tab that was open during the run puts the stale copy back. |
| set-fonts | Named the weights the type scale asks for | The scale asks the display face for 600 and the body face for 400; markup adds 700 and italic. The skill guessed "400 or 700". Now the model screens candidates before running rather than reading a surprise out of the report. |
| set-fonts | Adopt is what rewrites `fonts.css` | A build with no editor in it loads nothing until then. |
| adjust-geometry | Reload before Save | Same trap, same mechanism, and this skill also ends by telling the user to reload. |
| adjust-geometry | Pointed `target` at the picker's Catalogue | The Catalogue is gate-checked complete against `component-configs/`, so it is the one component list that cannot go stale. |
| pick-component | New Display family section | `Image`, `ImageLightbox`, `Table`, `ProgressBar`, `SideNavigation` were in the Catalogue with no guidance at all. `Image` against `ImageLightbox` and `SideNavigation` against `TabBar` are both real confusable pairs. |
| build-page | Slot typography and the `prose` opt-out | A page author putting text in a `Card` hits this immediately, and only `pick-component` mentioned it, in passing. |
| build-page | `/live-tokens/*` is reserved | The namespace exists so package surfaces can never shadow consumer routes. Nothing said so to the model writing the routes. |
| create-component | Naming scheme admits the variant segment | The documented scheme was `<part>[-<state>][-<element>]`, with no slot for a variant, while the shipped set is full of `--badge-accent-surface` and `--callout-danger-border`. |
| create-component | "five `--sketch-*` colours" is now "values" | One of the five is a radius. |
| create-component | Ends by handing off to build-page | The tree had no edge from authoring to placing. |
| references/intrinsics.md | Registration example uses `bootLiveTokens` | It showed a bare `registerComponent(...)` call that the parent SKILL.md explicitly warns against. |
| references/fixed-overlays.md | One paragraph became structured | Six distinct claims, including the modal accessibility requirements, were in a single block. |
| all | `[[wiki-links]]` became bold sibling names | Four skills used bold, two used `[[ ]]`. The brackets carry no meaning in a skill. |

`src/app/skill-atlas/skillTrees.ts` was re-anchored to match. Only line numbers
moved; no node text changed.

## Size of the change

Body size only. Every `description` is byte-identical to what it was, so the
always-in-context metadata cost of the six skills did not move; all of this
lands in the second tier, loaded when a skill triggers. Token figures are
characters divided by four, which is close enough for prose and tables to be
worth reading and not worth trusting to the digit.

| SKILL.md | Lines | Δ | Characters | Δ | ≈ Δ tokens |
|---|---|---|---|---|---|
| `live-tokens-generate-theme/SKILL.md` | 149 → 155 | +6 | 13,127 → 14,567 | +1,440 | +360 |
| `live-tokens-set-fonts/SKILL.md` | 88 → 90 | +2 | 6,739 → 7,403 | +664 | +166 |
| `live-tokens-adjust-geometry/SKILL.md` | 93 → 93 | +0 | 8,056 → 8,382 | +326 | +82 |
| `live-tokens-pick-component/SKILL.md` | 88 → 95 | +7 | 9,271 → 10,210 | +939 | +235 |
| `live-tokens-build-page/SKILL.md` | 39 → 42 | +3 | 3,931 → 4,452 | +521 | +130 |
| `live-tokens-create-component/SKILL.md` | 243 → 243 | +0 | 20,970 → 21,323 | +353 | +88 |
| **Six skills** | **700 → 718** | **+18** | **62,094 → 66,337** | **+4,243** | **+1,061** |

| Reference | Lines | Δ | Characters | Δ | ≈ Δ tokens |
|---|---|---|---|---|---|
| `create-component/references/fixed-overlays.md` | 3 → 12 | +9 | 1,097 → 1,187 | +90 | +22 |
| `create-component/references/intrinsics.md` | 58 → 60 | +2 | 3,239 → 3,365 | +126 | +32 |
| **Two references** | | | **4,336 → 4,552** | **+216** | **+54** |

Net across everything the pass touched: **+4,459 characters, roughly +1,115
tokens**, against a 66,430-character corpus. About 7% growth. Per skill it runs
from 2% (`create-component`, which was already at its ceiling) to 13%
(`build-page`, which was the thinnest and had the most missing). Only one
skill's body loads on any given trigger, so no reader pays the total.

Three notes on where it went:

- **`generate-theme` took a third of it** (+1,440 characters). The refinement
  section is most of that, and it is new capability rather than new prose: the
  skill previously advertised a job in its description that its body could not
  do.
- **`fixed-overlays.md` grew nine lines and 90 characters.** That is one
  paragraph broken into structure, not new material.
- **`create-component` stayed at 243 lines** against the 250-line ceiling, and
  gained 353 characters inside them. It has 7 lines of headroom left, which is
  the arithmetic behind the extraction recommendation below.

The two skills carrying the reload-before-Save trap paid 326 and 664 characters
for it. That is the cheapest line in the set: one round trip lost on 2026-08-25
cost more than every character added this pass.

## Per-skill assessment

### generate-theme

The strongest of the six. It owns one decision, delegates two, and explains the
physics behind every band rather than asserting them. The chroma budget and the
canvas commitment levels are the parts a model could not derive on its own, and
they are the parts written most carefully.

Remaining:

- **The anchor references have no precedence rule.** A brief can match two at
  once ("cozy brutalist", "clinical Swiss"). `style-vocabulary.md` says an idiom
  sets constraints where a mood moves dials, which implies the idiom wins, but
  the SKILL.md never says so and the model has to infer it. One sentence in the
  Anchor references section fixes it.
- **Step 1 carries two decisions**: name the voice, then route to a reference. It
  reads as one step because renumbering would break the atlas (see the first
  cross-cutting item). Worth splitting once that coupling is gone.
- **The new refinement section has no atlas node.** The tree in `skillTrees.ts`
  still shows a straight line from brief to verify.

### set-fonts

Clear, and the font matrix is the rare piece of design instruction that gives a
rule rather than a taste. The skeleton/flesh model does real work.

Remaining:

- **No reference files, and it does not need any at 90 lines.** If the
  vocabulary grows, the Voice and Shortcuts tables are the extractable half.
- **The superfamily list is a static enumeration of a moving catalogue.** Low
  risk, because `set-fonts` verifies every family against the API and fails
  loudly, but it will drift quietly out of usefulness rather than out of
  correctness.

### adjust-geometry

The clearest reasoning-to-instruction ratio in the set. "Controls squeeze before
containers" is a design principle stated as an operational rule, with the
arithmetic that justifies it, and the text-inset floor is derived rather than
declared.

Remaining:

- **Nothing structural.** This is the skill I would use as the model for the
  others.

### pick-component

The decision tables are good, and the "don't" bullets carry more weight than the
tables do because they name the specific wrong choice.

Remaining:

- **The description promises outcome-driven lookup** ("how do I show / let the
  user / capture some UX outcome") and the body is organized by component family.
  A model reading the whole file resolves it anyway, so this is a latent cost
  rather than a live one. If the catalogue grows past thirty, an outcome index
  earns its lines.
- **The Catalogue is one prose line** because `check-skills.mjs` parses the first
  paragraph after the heading. That is a reasonable trade, but it means the
  format is pinned by the gate rather than by the reader.

### build-page

The thinnest skill, and it is thin because it delegates well: components go to
the picker, authoring goes to create-component. The two rules at the top are the
right two rules.

Remaining:

- **It never points at the theme skills.** "Make these cards rounder" arriving
  mid-page-build is an `adjust-geometry` request, and nothing in this skill says
  so. The other direction is covered by the descriptions; this one is not.
- **No page scaffold.** It tells the model to wire the route "the way
  `App.svelte` already wires routes", which works in this repo and in the
  template, and assumes a consumer has not diverged.

### create-component

The most demanding subject and the most disciplined treatment. The state model
section is the piece that would be hardest to reconstruct from the code, and the
verification checklist correctly separates what a static check catches from what
only a running editor shows.

Remaining:

- **It sits at 243 lines against a 250-line ceiling.** The next real addition
  forces a cut. The obvious extraction is the three suffix tables, roughly 40
  lines of pure lookup, into `references/token-naming.md`. The honest counter is
  that naming tokens is step 1 of the recipe, so those tables are on the hot path
  and moving them costs a read on every invocation. My recommendation is to move
  them and leave a one-line summary inline, because the authoritative list is
  `KNOWN_SUFFIXES` in `bin/check-component.mjs` and `check-component` enforces it
  either way.
- **Step 4 asks the model to edit a sibling skill.** That is correct and it is
  also the only place in the set where one skill writes another. It works because
  `check:skills` gates the result. Worth keeping in mind as a precedent.

## Cross-cutting recommendations, ranked

### 1. The atlas pins line numbers into the skills

`src/app/skill-atlas/skillTrees.ts` holds 137 hard-coded, one-based, inclusive
line ranges into the six SKILL.md files, and nothing checks them. Any edit to a
skill silently mis-highlights the Skill Atlas, and the failure is invisible
until someone opens the page and reads the wrong paragraph.

This is the single change that most constrains editing the skills: it taxes
every insertion above a referenced line, and it is why the generate-theme
workflow is still numbered the way it is.

Two fixes, in order of preference:

- **Anchor by text.** Store the first line of each range, or a heading plus an
  offset, and resolve to line numbers when the atlas builds. Edits inside a
  paragraph then cost nothing, and only a deletion breaks.
- **Gate the current ranges.** Snapshot each range's text next to it and fail
  `check:skills` when the text at those lines no longer matches. Cheaper, and it
  turns a silent drift into a build error. I used exactly this mechanism to
  re-anchor this pass; the logic is about thirty lines.

Related: the atlas is curated rather than exhaustive, so a new section does not
automatically want a node. The generate-theme refinement section is the current
gap.

### 2. Gate the suffix tables against `KNOWN_SUFFIXES`

`create-component`'s three suffix tables list exactly the 23 entries in
`KNOWN_SUFFIXES` in `bin/check-component.mjs` today. Nothing holds them there.
This is the same shape as the picker-catalogue gate that already exists, and it
is about eight lines in `check-skills.mjs`.

`check-skills.mjs` opens by saying every check in it is a drift that has
actually happened. This one has not happened yet, which is an argument for
waiting. It is also the cheapest gate left, and the failure mode is a model
naming a token the editor cannot give a picker to.

### 3. Gate the flags a skill owes its CLI verb

`--carry-from` shipped in `bin/cli.mjs`, appeared in `--help`, and never reached
`live-tokens-generate-theme`. `check-skills.mjs` already extracts CLI verbs and
checks that every verb a skill names is dispatched. The reverse check is the
useful one: for the three skill-owned verbs (`generate-theme`, `adjust`,
`set-fonts`), every flag the CLI documents should appear in the owning skill, or
be listed as a deliberate omission. An explicit opt-out list keeps it honest
rather than noisy.

### 4. Nothing measures triggering

`check:skills` is a good static gate and it checks structure, not behaviour.
The untested question is whether these descriptions fire when they should. The
mutual-exclusion clauses are well built ("Not for a single token, use the
editor"), so the risk is not mis-triggering between siblings. It is
undertriggering: none of the six fires on a bare "the buttons look wrong" or
"this page feels cluttered", and nobody has measured whether they fire on the
phrasings a real user reaches for.

The skill-creator bundles a description optimizer that runs each query three
times against a held-out split. Twenty queries per skill, weighted toward
near-misses, is a few hours and it is the only part of the skill-creator loop
this project has never run.

### 5. Facts that cost a round trip belong in the skill

The reload-before-Save trap was written down, in memory, after it cost a full
round trip. It was not in either skill that writes a buffer and then tells the
user to reload. Both skills now carry it.

The general rule is worth adopting: when a session loses time to a mechanism,
the fix lands in the skill that would have prevented it, not only in the notes.
The two skills involved both ended with instructions that were correct and
incomplete, which is the hardest kind of gap to notice.

### 6. The tree is a DAG with two thin edges

```
generate-theme ──> set-fonts
               └─> adjust-geometry

pick-component ──> build-page
               └─> create-component ──> pick-component (step 4)
                                    └─> build-page (added this pass)
```

`set-fonts` and `adjust-geometry` never point back up at `generate-theme`,
which is right: they are leaves and they say so in their descriptions.
`build-page` points at neither theme skill, which is the one edge I would add.
