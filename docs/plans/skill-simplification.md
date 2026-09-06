# Skill simplification

Rewrite each `.claude/skills/*/SKILL.md` for clarity and simplicity, one section at a time,
in conversation. Done: set-colors, set-type, set-geometry, create-theme (commit
`68a95f3 set skills` and earlier), check-compliance (`e6577d3`), fix-findings
(`c374575`), pick-component and create-page (whole rewrites under
`page-consistency.md`, 2026-09-06). Remaining: create-component. Each skill's
references are swept right after its SKILL.md.

## Method

Work one skill at a time, one section at a time. For each section, print two
fenced blocks labeled Current and Proposed, then a bullet list of changes. Each
change cites the writing rule it applies; a change with no rule carries a
one-line reason. Wait for "apply", then apply with an exact-match replacement
and move to the next section. When the user answers with an edited version,
apply that text verbatim and move on. Never edit two sections in one step. When
a change touches a sibling skill, apply it there in lockstep and say so.

The user edits the files too. One writer at a time; if the user asks for an
edit they may have the file open, so apply with a small exact-match script,
never a whole-file rewrite.

At the end of a file, print the whole file for a final read, then sweep it:

```sh
grep -n -i '\blook\b\|ladder\|rung\|report card\|\byou\b\|\byour\b\|unsaved\|→' <file>
```

Then sweep the skill's `references/*.md` with the same grep, run
`npm run sync:skill-sources`, and commit the skill, its references, and the
generated sources as one commit named "<skill> skill".

## Writing rules

These came out of the set-skill sessions and are settled. Do not re-argue them.

- **Imperative mood, no second person.** "Choose the families", never "You
  choose the families". Skill bodies are instructions to the model.
- **No antithetical pairs.** State the thing and drop the rejected half. Cut
  "X, not Y", "rather than", "never less", "not ones a relative tighter hands
  you". Applies to headings too: "Display family: shown, not asked" and "Colour
  by role, never by hue" are the pattern.
- **No coined vocabulary.** Use the discipline's own words. "Skeleton and flesh"
  became "form model" and "stroke contrast and serifs". "Ladder" and "rung"
  became "scale" and "step". "Levels of commitment" became L and C ranges.
  "Mints" became "creates". "Report card" became "report".
- **"Look" is banned.** "Theme" replaces it. The one exception is a trigger word
  in a description, where it is a word the user might type (create-theme keeps
  "a theme, look, vibe, or brand feel").
- **No length constraints on the reply.** "Reply with A, B, and C" and let the
  content set the length. Never "in a line" or "in one sentence".
- **No user actions.** Never tell the user to save, reload, or press a button.
  The skill runs `save-theme`; the product streams CLI results to the page. See
  the memory `feedback_cli_buffer_vs_running_editor`.
- **The CLI validates; the skill does not restate rejections.** Drop "X plus Y
  is an error", "`--space-64` is rejected", and any field that exists only to
  be ignored (the `name` bullets went).
- **No motivation clauses that the instruction stands without.** "So the report
  confirms a decision instead of reporting a surprise" went. Keep a reason only
  when the rule would otherwise read as a mistake.
- **Weasel words go**: actually, exactly, directly, by hand, really, outright,
  far, just, intact, again, back, at all, note that, so often.
- **Headings are noun phrases or plain sentences.** No colon explainers ("The
  font matrix: the decision rule" became "The font matrix"). No aphorisms
  ("Controls squeeze before containers" became "Compact containers before
  controls").
- **No arrows, no em-dashes.** "old → new" became "old and new".
- **Rule semantics live in the checkers.** A skill states the test for a
  class of finding and at most one example. Revisit the checkers for any
  case a skill had to spell out, after the last skill.

These are borrowed from ASD-STE100 (Simplified Technical English) and ISO
82079-1. The STE dictionary is not adopted; the discipline's own words stand.

- **One instruction per sentence.** Two actions are two sentences or two
  steps.
- **Condition before instruction.** "When the user accepts the result, run
  `save-theme`", never the instruction first with the condition trailing.
- **Noun clusters of at most three words.** "sibling group linked value"
  becomes "the value the sibling group shares".
- **Verbs, never "-ing" forms, for instructions.** "Read the report", not
  "Reading the report".
- **Repeat the noun in place of an ambiguous "it", "this", or "that".** The
  reader is a model; a referent that needs a lookback is a defect.
- **A sequence is a numbered list, one action per step.** A warning or
  precondition goes before the step it guards, never after.
- **A series of more than three items is a vertical list.** Three or fewer
  stay in the sentence. A description is one line. Its sentences follow the
  same caps; a trigger list of words may stay in one sentence. A table cell
  keeps its series.
- **Sentences of at most 20 words.** One topic per sentence. A sentence over
  the cap splits, or its series becomes a list.

## Description shape

Five sentences, in this order. Drop a sentence only when it has no content.

1. What it sets or does, opening with the verb of the CLI: "Set a live-tokens
   theme's type: ...".
2. Who calls it: "Called with an anchor and a type intent by
   live-tokens-create-theme, or with the user's request directly." Only when
   another skill invokes it. For the check/fix pair this is the handoff.
3. Triggers, one sentence per kind: "Use when the user asks to A, B, or C.
   Use when the user describes X by voice: ...". Trim synonyms that duplicate a
   listed word. Keep every word that maps to a row in the body's tables.
4. Scope, in positive form: "Changes type only."
5. Boundary in positive form, naming the skill to read: "For a request that
   also names color or geometry, read live-tokens-create-theme." A boundary that points at nothing
   the model can invoke ("use the editor") is dropped.

## Body shape for the set skills

Recorded so the remaining skills can match where their shape allows.

- H1 "Setting a theme's <dimension>".
- Intro: one paragraph of division of labour (imperative first sentence, then
  what the CLI does, then "Never hand-edit the data tree").
- Second paragraph, verbatim in all three: "The result is on screen as soon as
  the run finishes. The three set skills write the same buffer, so color, type,
  and geometry compose in any order. When the user accepts the result, run
  `save-theme` to keep it as a theme. Loading a theme in the editor discards it."
- Workflow: 1 read intent and anchor, 2 write the input file, 3 run, 4 read the
  report, 5 reply with content. Flags on their own line after the list.
- The input file section (each skill describes what the model must write).
- Domain sections.
- Scope: "<Dimension> only. <others> are untouched: <verb> writes ... and
  carries every other value forward. `save-theme` keeps the result; Adopt
  ships it."
- Verify: exit 0 and what the report names; the app shows it; one domain
  check; "To revert, run the previous <file>, or load the open theme to
  discard the buffer."

## The three remaining shapes

**CLI workflow skills: check-compliance, fix-findings.** Nearest to the set
skills. Same Workflow discipline. Each ends with its reply step; neither has a
Verify section, since the checkers are the verification. A literal the
checkers cannot see is a checker gap: add the rule and its test, after the
last skill. Description
sentence 2 is the handoff (check hands its findings to fix). Finish
check-compliance, then fix-findings. A term settled in check is applied to
fix when its section comes up, and the change list says so.
fix-findings owns the fix order, moved out of check-compliance: migrations,
then the largest group of errors, then the remaining errors, then warnings.
Translucent colour maps by role: scrim dims what is behind, tint shades the
surface, any other translucent colour is its role's token at an opacity in
the editor's canonical form, `color-mix(in srgb, var(--token) NN%, transparent)`.

**Reference skill: pick-component.** No CLI and no Workflow section; do not add
one. The test for each sentence is "does this decide between two components".
Sections are one per confusable family.

**Recipe skills: create-page, create-component.** Same prose rules with one added
constraint: cut explanation, never a step or a check. A step survives when a
file, command, or test names it; record the check in the change list ("step 4
kept: enforced by the Catalogue in pick-component"). The picker-catalogue step
in create-component is the known example of a step that looks optional and is
required (memory `feedback_picker_must_know_new_components`). create-component
has six reference files. Settled in check-compliance: both recipe skills invoke
live-tokens-check-compliance as their verification step, in place of a bare
`check-page` or `check-component` run.

## Reference sweep

Counts at 2026-09-05 (the set skills' references were clean):

| File | Hits |
|---|---|
| create-component/references/sketch-mode.md | 11 |
| create-component/references/intrinsics.md | 2 |
| create-component/references/contract-tests.md | 2 |
| create-component/references/token-naming.md | 1 |
| create-component/references/linked-siblings.md | 1 |
| create-theme/references/design-directions.md | 1 |

## Out of scope until the overhaul ends

`check:skill-atlas` is knowingly stale. The atlas will be rewritten after the
last skill; do not re-point anchors mid-overhaul.
