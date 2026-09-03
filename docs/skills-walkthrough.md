# Skills walkthrough

Decisions from the skill review. One section per skill, written before any file
changes.

---

## Conventions

Decisions that bind every skill, settled while reviewing generate-theme.

### Marking a term of art

A `SKILL.md` is loaded as prose. Nothing parses it, nothing substitutes into it,
and no schema stands behind it. Markup therefore signals a category to a reader
and nothing more, which makes the wrong markup worse than none.

| Form | Verdict |
|---|---|
| `<term>`, `{term}`, `${term}` | Never. Angle brackets already mean "substitute a value" in this corpus (`<slug>`, `<theme>`) and in CLI documentation generally. An agent fills them in. |
| `` `term` `` | Reserved for text typed verbatim: paths, flags, JSON keys, token names, commands. Backticking a concept sends an agent looking for a field or a flag that does not exist. |
| `camelCase` | Never in prose. It reads as a variable and invites the same false lookup. |
| `#term` | Never. `#` opens a heading in Markdown. |
| `**term**` | At the definition site, once. Ordinary practice for introducing a term. |
| plain prose | Everywhere else. |

Hyphenation follows English rather than any convention here. No hyphen in the
noun phrase, "the design direction". A hyphen when it modifies a noun, "the
design-direction step".

Two habits carry a term of art, and neither is typographic:

1. **Define it where it first appears**, in the same sentence that names it.
2. **Repeat it verbatim.** A term that appears as "the design direction" once
   and "the direction" or "the design intent" later has already drifted. Markup
   cannot hold an inconsistent term together, and a consistent one needs none.

**The atlas takes no markup at all.** `TreeNodeCard.svelte` interpolates node
text as plain strings (`<p class="desc">{node.desc}</p>`, `<Card
title={node.title}>`), so asterisks and backticks render literally on the card.

### The theme vocabulary

generate-theme, set-fonts, and adjust-geometry share four layers. Each layer
takes one noun, and the nouns stay distinct.

| Layer | Name | What it is |
|---|---|---|
| 0 | **the brief** | The user's own words. Unstructured, and the only thing this word may mean. |
| 1 | **the design direction** | One sentence the agent writes, fixing the mood, the hue family, the scheme, and the type and geometry that mood implies. |
| 2 | **the color intent**, **the type intent**, **the geometry intent** | What each dimension should achieve, derived from the direction together so the three agree. |
| 3 | the seed file, the theme, the font pairing, the alias moves | What each executor produces. |

**Intent is the what, and the executor owns the how.** `SKILL.md:131` already
draws this line: "`live-tokens-adjust-geometry` knows the mechanics. Hand it the
intent." A skill states the outcome in a line and never reaches for radius,
padding, or a Google Fonts family name on the sibling's behalf.

Two consequences worth stating in the skills themselves.

**The three intents are symmetric in derivation and asymmetric in execution.**
generate-theme executes the color intent in-house through the seed file, and it
delegates the other two. Naming all three the same way makes the decomposition
legible and gives the color half a name it currently lacks: steps 1 through 4
implement a color intent that the skill never names.

**The intent is the interface, and the design direction is optional upstream
context.** A user who invokes set-fonts directly ("make the type more
editorial") supplies a type intent with no design direction behind it. So each
sibling's contract is "receives an intent", and generate-theme is one of two
producers. The sibling skills must not require a design direction.

**"Brief" gets one meaning back.** Prose that now calls
`scratch/<slug>-brief.json` "the brief" (`SKILL.md:14`, `:15`, `:144`) says
"the seed file" instead. The filename is a path argument and stays as it is.

---

## generate-theme

Reviewed 2026-09-03. 22 nodes, 156 lines of `SKILL.md`, 3 references.
`scripts/skill-atlas-review.py` reports 0 mechanical flags.

### The claim

One brief becomes a voice sentence, the voice picks an anchor reference, the
anchor and the palette constraints produce ten OKLCH seeds, the CLI generates
and validates the colors, and the same voice goes to set-fonts and
adjust-geometry so the whole look comes from one reading.

The drawn shape matches that. Every numbered step in `SKILL.md` has a node, the
failure path loops back to the CLI, and the refinement path loops back to the
same node. The spine is sound. The findings below are about wording, one
contradiction inside the constraints, and five places where a node describes
something other than the lines it maps.

### Findings: the skill, for an agent

**S0. "Voice" names one concept in this skill and a different one next door.**
*Applied 2026-09-03 across generate-theme, set-fonts, and adjust-geometry. The
vocabulary now lives in `docs/terminology.md`. Findings S1 through P5 below
remain open.*

`SKILL.md:12` defines it: "name its voice in a sentence: the mood, the hue
family, the scheme, and the type and geometry that mood implies." That artifact
is real and load-bearing. One sentence, produced once, read by three skills, and
the reason the whole look holds together. The word is the problem, in four ways.

1. **It is overloaded across the pair.** set-fonts has a `## Voice` section
   whose table maps brief adjectives to type classification, the character of a
   typeface. That is the established typographic sense and it belongs there. So
   `SKILL.md:16`, "Invoke **live-tokens-set-fonts** with the same voice", is
   ambiguous in the receiving skill's own dictionary: an agent may pass the
   type-voice row instead of the one-sentence reading. The two skills already
   disagree about the hand-off noun, since `set-fonts:62` says "the same brief
   the color came from".
2. **The metaphor is auditory and the subject is visual.** `SKILL.md:17`, "the
   geometry the voice implies", asks the noun to carry corner radius.
3. **The atlas puts it first.** "Define the theme voice" is the first step card
   a person meets, where the term is undefined.
4. **The skill already has a plainer name for it.** `SKILL.md:8` says "the whole
   look comes from the same reading of the brief" and `SKILL.md:140` says
   "tuned to the same reading the color came from". Two names, one concept.

**"Theme" cannot take the job.** The pipeline runs brief, reading, seed JSON,
theme. Theme is a precise noun here with a file behind it: `data/themes/<slug>.json`
at schemaVersion 4, the Theme panel, `_active` and `_production`. The manifest
rename exists to make that word mean one thing.

**Proposed: "the design direction."** It names what the artifact does, since it
governs every later choice, and it is vocabulary a designer recognises on a
card. "Direction" has zero hits across all eight skills and no `--*-direction`
token competes with it in the color or gradient vocabulary.

`SKILL.md:131` already says "Hand it the intent" for the geometry hand-off.
Keep that word and let the two nest: the **design direction** is the whole
sentence, written once at step 1, and each sibling receives the **type intent**
or **geometry intent** that the direction implies.

| Site | Now | Proposed |
|---|---|---|
| `SKILL.md:12` | "name its voice in a sentence" | "state the design direction in one sentence" (definition site, bold the term) |
| `SKILL.md:13` | "matches the voice" | "matches the design direction" |
| `SKILL.md:16` | "with the same voice" | "with the type intent the design direction implies" |
| `SKILL.md:17` | "the geometry the voice implies" | "with the geometry intent the design direction implies" |
| `SKILL.md:129` | "## Geometry from the voice" | "## Geometry from the design direction" |
| `gt-direction` title | "Define the theme voice" | "State the design direction" |
| `gt-fonts` title | "Pair fonts from the same voice" | "Pair fonts from the same design direction" |
| `gt-geo` title | "Adjust geometry from the same voice" | "Adjust geometry from the same design direction" |
| `gt-geotab` chip | "Voice-to-geometry map" | "Direction-to-geometry map" |

Per the conventions above, the full phrase repeats verbatim at every site. A
short form at one site is how the term starts to drift.

`SKILL.md:8` gains the layer model in place of the bare triple, so the reader
meets the vocabulary before the workflow uses it:

> A theme is three decisions made from one brief: color, type, and geometry.
> This skill reads the brief once and states a **design direction**, one
> sentence that fixes all three. It executes the color intent itself and hands
> the type and geometry intents to its sibling skills, so the whole look comes
> from one reading.

That also gives the color half the name it lacks today. Steps 1 through 4
implement a color intent the skill never names.

set-fonts keeps "voice" for typefaces, which splits the two concepts.

Rejected candidates:

- **"theme sentence"**, the first proposal. It names the form and leaves the
  function unsaid.
- **"design brief."** "Brief" already carries two senses here, 27 uses in
  `SKILL.md` and 10 in the references: the user's request (`:12`, and the
  `| Brief |` column keying all three reference tables) and the seed JSON
  (`:14`, `:15`, `:144`). A third sense makes `:14` read "translate the design
  brief into a brief file" and puts all three senses in one paragraph at
  `:144`. In industry a design brief is also the client's statement of
  requirements, which is the input, so the term points at the wrong end of the
  pipeline.
- **"reading"**, though `SKILL.md:8` and `:140` already use it, because these
  skills lean on "reads as" for appearance and the noun would collide.
- **"art direction."** Photography and campaign vocabulary. This is a design
  system.

Skill text is public API. This changes no trigger in the `description`
frontmatter, so it needs a changelog line rather than a migration.

**S1. The chroma budget contradicts every other canvas rule. `SKILL.md:53`**

The Ground tier caps Canvas at `C 0.005 to 0.03`. The per-role band gives Canvas
`C 0.02 to 0.06` (line 64), commitment level 2 gives `C 0.05 to 0.10` (line 77),
and level 3 puts the theme color on the ground outright (line 78), which
`named-themes.md` seeds at `C 0.14`. An agent that reads the tiers in order caps
the canvas at 0.03 and produces the timid ground line 74 exists to forbid.

Canvas does not belong in the Ground row. Proposed:

| Tier | Palettes | Chroma |
|---|---|---|
| Ground (about 60% of every screen) | Neutral, Alternate | C 0.008 to 0.02 |
| Canvas (the ground's own rule) | Canvas | per the commitment levels below, C 0.02 to 0.14 |

This is the one finding that changes generated output.

**S2. Neutral and Alternate carry two chroma ranges. `SKILL.md:53`, `SKILL.md:65`**

The budget says `C 0.005 to 0.03`, the per-role band says `C 0.008 to 0.02`.
Resolved by S1: keep `C 0.008 to 0.02` in both places.

**S3. "Full saturation" has no number. `SKILL.md:55`**

Every other cell in the chroma budget gives a range. Proposed: "may exceed
Brand; at most one at its peak-chroma anchor (see Gamut guardrails)."

**S4. Step 4 carries four actions. `SKILL.md:15`**

One paragraph runs the command, reads the report, repairs a failed seed,
re-runs, and obliges the agent to warn the user that regeneration discards
editor palette edits. The atlas already splits this into `gt-cli`, `gt-fail`,
and `gt-pass`. Split the prose the same way:

> 4. Run `npx live-tokens generate-theme scratch/<slug>-brief.json`. It writes
>    `themes/<slug>.json`, opens that theme, and prints a contrast report.
> 5. Read the report. Exit 0 passes, and auto-corrected values count as passing.
>    Exit 1 means the seeds are unworkable; each failure line names the seed to
>    change, usually by raising its lightness or cutting its chroma. Fix the
>    brief and re-run under the same name.
> 6. Say once, when iterating, that a re-run replaces that theme's whole color
>    state, including palette edits made in the editor since the last run.

Renumbers steps 5 through 7 to 7 through 9.

**S5. The rule about what ships is parked in the flags paragraph. `SKILL.md:22`**

"Opening a theme never changes what the site ships. Only Adopt, in the editor,
does that." That sentence ends a paragraph about `--dry-run`, `--no-activate`,
and `--carry-from`. It is the load-bearing fact about the skill's blast radius
and it belongs in "Files each step writes" (line 150), next to "One Save in the
editor keeps all three."

**S6. "Never pure C = 0" is absolute, and two idiom entries break it. `SKILL.md:58`**

`style-vocabulary.md` seeds Brutalist at `Neutral C 0` and Swiss at `C 0.005`,
both marked deliberate. The reference states its own override, so an agent that
reads the reference is fine. An agent that reads only `SKILL.md` learns a rule
with no exception. Proposed: "never pure C = 0 unless an idiom entry calls for
it."

**S7. Line 121 restates line 13. `SKILL.md:121`**

"Read the matching reference before seeding, and apply the bands above on top of
it." Line 13 already says to read the anchor before seeding, and all three
references open by saying to apply the bands on top. Drop line 121 and let the
"Anchor references" section open with its list.

**S8. Antithetical parallelism, six places.**

Per the global writing rules, state the thing and drop the rejected half.

| Where | Now | Proposed |
|---|---|---|
| `SKILL.md:84` | "A dark scheme is a transform, not just a dark canvas" | "A dark scheme transforms every seed:" |
| `SKILL.md:98` | "keep your intent achievable rather than silently muted" | "keep the intent achievable" |
| `SKILL.md:144` | "the answer is a new brief rather than hand-edits" | "answer with a new brief" |
| `mood-vocabulary.md:3`, `named-themes.md:3`, `style-vocabulary.md:8` | "Entries are starting points, not seeds to copy: apply..." | "Entries are starting points. Apply..." |

`SKILL.md:109` ("Accent separated from Brand by L and C rather than hue") and
`SKILL.md:140` ("targeted rather than global") both name a real axis in the
negated half. Keep those.

**S9. Second person, three places. `SKILL.md:98`, `:115`, `:144`**

"your intent", "Say why you enabled it", "tells you the scheme". The skill
otherwise addresses the agent impersonally. Recast to match.

### Findings: the atlas, for a person

**A1. `gt-none` is labelled a reference and has none.**

Kind `ref` renders the card's chip as "reference" and then draws a filename
link only when `reference` is set. `gt-none` has no `reference` and no `desc`,
so the card reads "Use generic color and geometry rules / reference / line 127"
and offers nothing to open. It is the path that skips the reference read.

Proposed: kind `step`, and a description, since the card currently carries no
information beyond its title. "The chroma budget, the per-role bands, and the
geometry table carry a brief that names no feeling, idiom, or occasion."

**A2. `gt-pass`'s description repeats its edges.**

"The flow continues to the type and geometry decisions." The two outgoing edges
already say that. Proposed: "Every contrast floor is met. Auto-corrected values
count as passing."

**A3. The fourth anchor branch names its destination. `gt-anchor`**

Three labels name an answer to "Anchor category?": **feeling**, **idiom or era**,
**holiday, season, or scene**. The fourth is **generic rules**, which names the
node it points at. Proposed: **none**.

**A4. The three reference nodes carry no description.**

`gt-mood`, `gt-style`, and `gt-named` each show a title and a filename. A person
choosing a branch cannot see what is in each file or how much it decides.
Descriptions from `SKILL.md:123-125`:

- `gt-mood`: "Eighteen feelings placed on valence, energy, and dominance. A
  feeling the table omits still places on the three axes."
- `gt-style`: "Nineteen idioms, eras, and genres. Each entry fixes color, type,
  and geometry as one set, and its Type and Geometry columns go to the siblings
  verbatim."
- `gt-named`: "Holidays, seasons, and natural scenes. Each one is a statement
  brief: commitment level 2 or 3, with the named color on the ground."

**A5. The two hand-off questions face opposite directions. `gt-type-q`, `gt-geo-q`**

`gt-geo-q` asks "Does the theme need geometry changes?", so the common path
answers yes. `gt-type-q` asks "Preserve the current type?", so the common path
answers no. The two cards sit four rows apart and read as different kinds of
question. Proposed: `gt-type-q` becomes "Does the theme need new type?", labels
unchanged at **pair type** and **preserve type**.

**A6. The last card omits Adopt. `gt-done`**

"generate-theme has written the colors. Saving the open theme keeps any type or
geometry changes." `SKILL.md:150` continues "Adopt ships them." `gt-done` is the
last thing a person reads, and it stops one step before the only action that
changes what the site serves. Proposed: "generate-theme has written the colors.
One Save in the editor keeps the type and geometry too. Adopt ships the theme to
the site." Pairs with S5.

### Findings: the pair

**P1. `gt-cli` misstates `--carry-from`.**

The card says "--carry-from <theme> copies gradients, fonts, and component
aliases." `SKILL.md:22` says those carry forward from the live look by default,
and `--carry-from` redirects the source to a named theme. As written, the card
teaches that the flag is required to preserve them. Proposed: "--carry-from
<theme> takes gradients, fonts, and aliases from a named theme instead of the
live look."

**P2. `gt-geotab` carries two chips that are not geometry sources.**

The chipset is tagged "sources" and feeds the adjust-geometry hand-off.

- **Voice-to-geometry map** (129-140) belongs. Keep.
- **Safe operation order** (line 20) is about the order of the whole workflow,
  color against type against geometry. It answers a question the reader has at
  `gt-pass`, not at the geometry hand-off. Move it to `gt-cons` or to `gt-pass`.
- **Output files** (148-150) is what all three steps write. `gt-done` already
  maps the identical range, so the same three lines are drawn twice under two
  different labels. Drop the chip.

**P3. `gt-refine-q` and `gt-refine` map the identical range.**

Both cite 142-146. Selecting either highlights the same five lines, so the
decision and the step are indistinguishable in the source pane. The range holds
two content lines: 144 (answer with a new brief, and how to recover seeds) and
146 (one adjective moves one dial). Proposed: `gt-refine-q` maps 142-144,
`gt-refine` maps 144-146.

**P4. The "Canvas commitment" chip runs past its subject. `gt-cons`**

The chip spans 74-87. Lines 74-83 are canvas commitment. Lines 84-86 are three
separate rules: the dark-scheme transform, equal lightness across the statuses,
and status hues holding still under harmony. Proposed: narrow the chip to 74-83
and add a ninth chip, **Dark scheme and status lightness**, at 84-86.

**P5. `gt-anchor` describes a rule it does not map.**

Its second sentence, "When two match, the idiom sets constraints and the feeling
adjusts its dials", comes from line 127, which `gt-none` maps. `gt-anchor` maps
line 13. A person selecting the decision card sees a highlighted line that says
nothing about two anchors matching.

A node holds one contiguous range, so the fix goes in the skill: move the
two-match rule into line 13, where the decision is made, and leave line 127 with
the no-anchor fallback that `gt-none` stands for. Line 13 becomes:

> 2. Read the anchor reference that matches the voice (feeling, idiom, or
>    occasion; see Anchor references) before seeding. Each entry fixes all three
>    decisions together and overrides the generic defaults here. When a brief
>    matches two, the idiom sets the constraints and the feeling moves the dials
>    inside them.

### Repaired in passing

Stripping the stale anchors to re-derive them exposed three ranges that opened
or closed on a blank line. Stored anchors had masked them. All three now point
at the text they mean.

| Tree | Node | Was | Now |
|---|---|---|---|
| generate-theme | `gt-cons` chip "Canvas commitment" | 74-87 | 74-86 |
| set-fonts | `pf-matrix` | 35-44 | 35-43 |
| adjust-geometry | `ag-shapes` chip "Global, relative" | 20-25 | 21-25 |

P4 still stands: 74-86 remains wider than canvas commitment, since 84-86 cover
the dark-scheme transform and status lightness.

The node id `gt-voice` became `gt-direction`, since an id that contradicts its
own title is the drift this review exists to catch.

### Deferred

- **Gate titles split two ways across the atlas.** `gt-fail`, `pf-fail`, and
  `ag-fail` name a condition ("A seed fails validation"). `bp-fail`, `cc-fail`,
  `cc2-upgrade`, and `ff-blocked` name an imperative ("Fix page-check
  findings"). generate-theme matches its two closest siblings, so settle this in
  a pass over all eight trees rather than here.
- **`KIND_LABEL.done` renders as "verify".** `gt-done` shows the chip "verify"
  while sitting directly under `gt-ver`, titled "Verify the complete theme".
  The label is in `TreeNodeCard.svelte:27` and hits every tree.
- **No dead end for a missing CLI.** check-compliance and fix-findings both draw
  an upgrade gate for a package too old to carry the command. The three theme
  skills draw none, though `generate-theme`, `set-fonts`, and `adjust` all
  postdate the package's first release. Decide for the trio at once.

### Applying this

S4, S5, S7, S8, S9, and P5 edit `SKILL.md` and move every line range below the
edit. After applying, run both:

```sh
npm run sync:skill-atlas
npm run sync:skill-sources
```

P3 and P4 set ranges by hand, so apply them after the sync, not before. Read the
rendered cards for A1 through A6 in the dev app at `/skills`; every automated
check passes on a card whose title contradicts its chips.
