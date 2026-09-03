# Skill review

A reusable prompt. Run it once per skill, one skill per sitting.

## The task

Review one bundled skill against its Skill Atlas tree. Two texts describe the
same thing and both are under review:

- **The skill.** `.claude/skills/live-tokens-<name>/SKILL.md` and any
  `references/*.md`. An agent reads this and acts on it.
- **The atlas.** That skill's tree in `src/editor/skill-atlas/skillTrees.ts`:
  the tagline, and every node's title, description, chip labels, and branch
  labels. A person reads this and decides whether to trust the skill.

Judge each text on its own, then judge the pair. The goal is that an agent can
execute the skill without guessing, and a person can see what it does without
opening it.

## Materials

| What | Where |
|---|---|
| Atlas copy, per skill, in draw order | `scratch/skill-atlas-text/<n>-<name>.md` |
| The atlas itself | dev app, `/skills` |
| Skill text | `.claude/skills/live-tokens-<name>/` |
| Mechanical flag report | `scratch/skill-atlas-review/<name>.md` |
| Decisions | `docs/skills-walkthrough.md` |

Regenerate the first with `python3 scratch/skill-atlas-text.py` and the fourth
with `python3 scripts/skill-atlas-review.py`. Both are derived, so regenerate
after any change rather than editing them.

## Method

1. **Read the spine first.** Walk the tree top to bottom in the atlas and say
   what the skill claims to do, in one sentence, before looking at any wording.
   Settle the shape before arguing about a title.
2. **Then walk node by node**, with the atlas open on the node and the lines it
   maps beside it. The atlas highlights those lines when the node is selected.
3. **State every proposal in `docs/skills-walkthrough.md` before changing a
   file.** The discussion produces the brief. Applying it is a separate pass.

## The checks

**The skill, for an agent.**

- The `description` frontmatter fires on the requests this skill owns and stays
  quiet on its siblings' requests. It is the only trigger.
- The body opens with a numbered spine: run the command, read the result, apply
  the recipe, re-run, hand off.
- One action per step. A step that carries two actions hides one of them.
- Commands appear in full, with what a non-zero exit means.
- The skill names its gate and its hand-off. An agent knows when it is done and
  who takes over.
- Every rule the skill states is one an agent can act on without judgment it
  has no basis for.

**The atlas, for a person.**

- The tagline says what the skill is for in one line.
- Each title names the step in the imperative. A decision title asks a question.
- Each description adds information the title does not carry.
- Every fan-out edge names the answer that selects it.
- The drawn shape matches the skill's real flow, including its dead ends.

**The pair.**

- The node describes what its mapped lines actually say. Drift here is the
  failure this review exists to catch.
- A node exists for every step the skill teaches. Prose that no node opens is
  either unimportant or an unmapped step.
- The register matches across a node and its neighbours. A title written for one
  set of chip labels breaks when the labels are recast.

`scripts/skill-atlas-review.py` already enforces branch labels, decision forks,
decision titles, decision exits, path endings, and duplicate copy. Read its
report first and spend the sitting on what it cannot see.

## Writing rules

These bind both texts, per the global instructions:

- Active voice. Statements in positive form. Definite, concrete language.
- No needless words. No hedging qualifiers, no overstatement.
- No em-dashes. Use a period, a comma, or a rewrite.
- No antithetical parallelism. State the thing and drop the rejected half.
  "It is a reading, not a gate" states half its meaning by negation.
- Headings and titles take no wh-clauses. Use a noun phrase or a declarative
  sentence.
- No litotes, no irony.

## Constraints

- Editing a `SKILL.md` moves the atlas line ranges and changes the generated
  skill sources. After any edit run both:

  ```sh
  npm run sync:skill-atlas
  npm run sync:skill-sources
  ```

  `check:skill-atlas` and `check:skill-sources` are both in `prepublishOnly`
  and fail on drift. The atlas sync repairs a range that moved. It refuses a
  range whose anchor text is gone, which means re-pointing that node by hand to
  the text it now means.
- Changing a node's title or its chip labels changes what the card says. Read
  the rendered card, not the diff. Every automated check passes on a card whose
  title contradicts its labels.
- A tree carries a digest of the `SKILL.md` it cites. Editing the skill without
  syncing fails the check at release.
- Skill text is public API for anyone who installed the package. A rename that
  changes a trigger belongs in the changelog.

## Output

One section per skill in `docs/skills-walkthrough.md`:

- The one-sentence claim from step 1 of the method.
- Findings, each naming the node id or the `SKILL.md` line, what is wrong, and
  the proposed wording.
- Anything deferred, with the reason.

## Order

Consumer order, so the review judges whether each skill teaches the right thing
at the moment a reader meets it:

`pick-component`, `build-page`, `create-component`, `generate-theme`,
`pair-fonts`, `adjust-geometry`, `check-compliance`, `fix-findings`.

Start with `check-compliance` to calibrate. It is the smallest at 12 nodes and
854 words.
