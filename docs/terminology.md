# Skill terminology

The shared vocabulary for the nine bundled skills in `.claude/skills/`. A skill
that names one of these concepts uses the word below and no synonym. This
document defines the words. Each `SKILL.md` defines the work.

Skill text is public API. A change here that alters a `description` frontmatter
trigger belongs in the changelog.

## The information hierarchy

A whole-look request passes through five layers. Each layer is derived from the
one above it, and each has its own nouns.

| Layer | Term | What it is | Who writes it |
|---|---|---|---|
| 0 | the request | The user's own words, unstructured. | the user |
| 1 | the design direction | The requirements derived from the request: the mood, the hue family, the scheme, the type and geometry that mood implies, and the theme's name. Enough to derive the three intents, with the default named where the request leaves a dimension open. | create-theme |
| 2 | the color intent, the type intent, the geometry intent | What one dimension should achieve, in a line. | create-theme |
| 3 | the base color file, the pairing file, the ops file, the theme name | What each contributing skill writes for its CLI, plus the name create-theme hands `save-theme`. | set-colors, set-type, set-geometry, create-theme |
| 4 | the assembled report | What each contributing skill reported, with the design direction, any dimension left alone, and the theme `save-theme` wrote, read as one summary. | create-theme |

Every layer stands without the ones above it. A user who invokes
live-tokens-set-type directly supplies a type intent that no design direction
produced, so nothing at layer 2 or below may require one.

## Glossary

Each term is defined once here and repeated verbatim everywhere else.

| Term | Means |
|---|---|
| **anchor** | A feeling, an idiom, or an occasion listed in create-theme's `references/design-directions.md` and under that same name in each contributing skill's own reference. |
| **assembled report** | The layer-4 summary create-theme gives the user. |
| **base color** | The one color a palette's whole ramp derives from, ten per theme, and the field `baseColor` in a theme document. |
| **base color file** | `scratch/<slug>-base-colors.json`, the ten base colors set-colors hands `set-colors`. The slug in its path is the theme name create-theme intends. |
| **contributing skill** | One of the three that own a dimension: live-tokens-set-colors, live-tokens-set-type, live-tokens-set-geometry. live-tokens-create-theme routes to them. |
| **design direction** | The layer-1 sentence, always the full phrase. |
| **intent** | A layer-2 outcome, always compounded: color intent, type intent, geometry intent. |
| **look** | What the app renders now: the open theme plus any unsaved color, type, and geometry buffers. |
| **ops file** | `scratch/geometry-ops.json`, the moves set-geometry hands `set-geometry`. |
| **pairing file** | `scratch/font-pairing.json`, the two families set-type hands `set-type`. |
| **request** | The user's words. Layer 0. |
| **theme** | The document at `src/live-tokens/data/themes/<slug>.json`, schemaVersion 5. |
| **theme name** | The name a user reads, taken from the design direction and handed to `save-theme`, which derives the slug from it. |
| **voice** | The character of a typeface: dynamic, rational, geometric. |

**Two words are retired, and both were retired for reading as two things at
once.** *Brief* named layer 0 until 2026-09-03, while also naming the
generator's input JSON. *Seed* named a palette's base color, while also naming
the random seed that sketch mode displaces its strokes with, in copy a user
reads. Each survives only in its remaining sense: nothing, and sketch mode's
randomness.

Words that carry an unrelated everyday sense keep it. "A brief popover" is an
adjective. "Two faces look alike" is a verb. "Semantic intent" in
pick-component names what a control communicates to a user, which is a
different axis from a layer-2 intent. Rename by hand and read each hit, since a
scripted sweep mangles these.

## Naming against the CLI

A skill name matches its CLI verb where one exists: live-tokens-set-colors runs
`set-colors`, live-tokens-set-type runs `set-type`, live-tokens-set-geometry
runs `set-geometry`. Where no verb exists the skill names its own job.
live-tokens-create-theme runs `save-theme` and names its own job, because the
verb names the last step and the skill names the whole of it; the CLI validates
pages and components and the agent authors them.

The rule stops above the CLI. The CLI only ever receives layer 3: the base color
file, the pairing file, the ops file, the theme name. Layers 0 through 2 keep
their own vocabulary, which is why intent has no CLI counterpart and needs none.

**Each CLI's input is named for what it holds**, in prose and on disk:
`scratch/<slug>-base-colors.json`, `scratch/font-pairing.json`, and
`scratch/geometry-ops.json`.

**An intent is named for its dimension.** Layer 2 is color, type, and geometry,
because those are the three dimensions of a theme. `set-type` executes the font
half of a type intent, and the type scale, weights and line height stay editor
work. What a skill can reach is a fact about the skill and renames nothing.

**An anchor is one name across four files.** A feeling, an idiom, or an
occasion is written once in `design-directions.md` and once in each dimension
file that fixes it, always under the same first term: "Art deco, opulent,
luxurious" is the anchor named art deco everywhere. `check:skills` fails on a
name that reaches only some of the four, because a sibling handed an anchor it
cannot look up falls back silently.

## Marking a term of art

A `SKILL.md` is loaded as prose. Nothing parses it, nothing substitutes into it,
and no schema stands behind it. Markup signals a category to a reader and
nothing more, which makes the wrong markup worse than none.

| Form | Verdict |
|---|---|
| `<term>`, `{term}`, `${term}` | Never. Angle brackets already mean "substitute a value" here (`<slug>`, `<theme>`) and in CLI documentation generally. An agent fills them in. |
| `` `term` `` | Reserved for text typed verbatim: paths, flags, JSON keys, token names, commands. Backticking a concept sends an agent hunting for a field or flag that does not exist. |
| `camelCase` | Never in prose. It reads as a variable and invites the same false lookup. |
| `#term` | Never. `#` opens a heading in Markdown. |
| `**term**` | At the definition site, once. |
| plain prose | Everywhere else. |

Hyphenation follows English. No hyphen in the noun phrase, "the design
direction". A hyphen when it modifies a noun, "the design-direction step".

Two habits carry a term, and neither is typographic:

1. **Define it where it first appears**, in the sentence that names it.
2. **Repeat it verbatim.** A term written "the design direction" once and "the
   direction" later has already drifted. Markup cannot hold an inconsistent
   term together, and a consistent one needs none.

**Atlas copy takes no markup.** `TreeNodeCard.svelte` interpolates node text as
plain strings, so asterisks and backticks render literally on the card.
