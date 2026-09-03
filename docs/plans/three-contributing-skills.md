# One direction, three contributing skills

Branch off `main` as `three-contributing-skills`. Four waves, each a single
commit unit executable by a sub-agent with only this doc and this repo. Waves
are strictly sequential; each ends green.

**Execution model.** A fresh session orchestrates from this doc and writes no
wave code itself. Each wave runs in a `wave-executor` sub-agent. The review
gate after each wave (`wave-reviewer`) runs at the orchestrator's tier. The
manual halves of each wave's verification belong to the user; the executor runs
only the automated commands and reports the manual checklist as pending.

**Precondition.** This tree carries an uncommitted terminology pass: the
pair-fonts to set-fonts skill rename, the `adjust` to `adjust-geometry` verb
rename, `docs/terminology.md`, `docs/skills-walkthrough.md`, the
`outcome-theme-from-brief` to `outcome-theme-from-request` eval rename, and
edits to every theme skill. `check:skills` passes on it; `check:skill-atlas`
and `check:skill-sources` do not, because the atlas has not been re-synced
since those edits. Commit that work as its own commit before Wave 1: run
`npm run sync:skill-sources` and `npm run sync:skill-atlas`, hand-repair the
one node whose anchor the sync refuses (`adjust-geometry` `ag-cli`, anchored on
the retired `npx live-tokens adjust`), confirm the three gates green, commit.
Do not stash, reset, or check out over that work. If the tree is dirty in any
other way, stop and report.

## Status

| Wave | Summary | Executor | Status | Commit |
|---|---|---|---|---|
| 0 | Precondition: commit the terminology pass, gates green | orchestrator | Not started | |
| 1 | CLI verbs become `set-colors`, `set-type`, `set-geometry` | wave-executor | Not started | |
| 2 | Four skills: create-theme routes, three siblings execute | wave-executor | Not started | |
| 3 | Atlas trees split and renamed, gates extended | wave-executor | Not started | |
| 4 | Docs, evals, changelog | wave-executor | Not started | |

The orchestrator updates this table after each review gate: `Not started` to
`In progress` to `Done` (or `Blocked`, with a one-line reason under the table).
Record the short commit SHA.

Wave 1 alone is a breaking CLI change with no skill that speaks it, so the tree
is only coherent again at the end of Wave 2. Waves 3 and 4 are recoverable
stopping points.

## The problem

`live-tokens-generate-theme` does two jobs. It reads the request and fixes a
whole look, and it executes the color layer itself: the base color file, the
chroma budget, the per-role bands, the canvas commitment levels, the gamut
guardrails, the harmony modes, and the refinement pass are all its own. Type
and geometry it hands to siblings.

So the three dimensions of a theme are not peers. Two are skills and one is a
section, the skill named for the whole look is also the skill that owns one
third of it, and `docs/terminology.md` has to spend a paragraph defending the
asymmetry ("color is the spine, and it stays inside generate-theme").

The asymmetry also splits the anchor references down the wrong axis. A row in
`mood-vocabulary.md` fixes color, type, and geometry together. The color column
is mechanics that generate-theme consumes; the type and geometry columns are
mechanics it hands to a sibling, which contradicts the rule the same document
states, that a skill passes a sibling an outcome and never the sibling's
mechanics.

## The model

One reading of the request, one direction, three peers.

| Layer | Term | Who writes it |
|---|---|---|
| 0 | the request | the user |
| 1 | the design direction | create-theme, once |
| 2 | the color intent, the type intent, the geometry intent | create-theme, from the direction and the anchor entry |
| 3 | the base color file, the pairing file, the ops file | each contributing skill |
| 4 | the assembled report | create-theme |

Layer 1 stays **the design direction**. "Intent" is reserved for layer 2 and
always compounded, so "design intent" would name two layers with one word.

Four skills:

| Skill | CLI verb | Owns |
|---|---|---|
| `live-tokens-create-theme` | none | the request, the design direction, the anchor index, the three intents, the routing order, refinement routing, the assembled report |
| `live-tokens-set-colors` | `set-colors` | the base color file, roles, chroma budget, per-role bands, canvas commitment, mood dials, gamut guardrails, harmony, canvas gradient, color anchors, base color recovery |
| `live-tokens-set-type` | `set-type` | the pairing file, body-face-first, the font matrix, voice, shortcuts, type anchors |
| `live-tokens-set-geometry` | `set-geometry` | the ops file, ladders, idioms, controls-squeeze, geometry anchors |

Each contributing skill accepts its intent on its own, so a user who invokes
one directly needs no design direction behind it. Each ends by reporting one
line back: what it wrote, what it skipped, and what it flagged. create-theme
assembles the three lines into the summary the user reads.

**References split by dimension.** The four anchor tables become one index and
three dimension files, each keyed on the same row names:

| File | Holds |
|---|---|
| `live-tokens-create-theme/references/design-directions.md` | every anchor name grouped as feeling, idiom, or occasion, with its valence/energy/dominance placement and a one-line direction. No mechanics. |
| `live-tokens-set-colors/references/color-anchors.md` | the Anchors (L, C, H) column of `mood-vocabulary.md` and `style-vocabulary.md`, plus all of `named-themes.md`. |
| `live-tokens-set-type/references/type-anchors.md` | the Type column of both. |
| `live-tokens-set-geometry/references/geometry-anchors.md` | the Geometry column of both. |

An occasion fixes color only. `design-directions.md` says so, and the type and
geometry files carry no occasion rows.

A row's key is the first comma-separated term of its first column, lowercased:
`joyful`, `swiss`, `christmas`. Aliases follow in the same cell as they do now.
Wave 3 gates the keys.

## Naming

The rule in `docs/terminology.md` that a skill name matches its CLI verb now
holds without exception for the three contributing skills. create-theme runs no
verb and names its own job.

No aliases and no legacy dispatch. This is pre-release; a renamed verb is
documented in the changelog and the old spelling is gone.

## Wave 1: the CLI verbs

Rename the three verbs and the modules behind them. No skill text changes in
this wave; `check:skills` will fail on the skills naming verbs that no longer
dispatch, so this wave and Wave 2 land as separate commits on a branch that is
green only at the end of Wave 2. Run `check:skills` at the end of Wave 2, not
this one.

Renames:

| From | To |
|---|---|
| verb `generate-theme` | verb `set-colors` |
| verb `adjust-geometry` | verb `set-geometry` |
| verb `set-fonts` | verb `set-type` |
| `bin/generate-theme.mjs` | `bin/set-colors.mjs` |
| `bin/generate-theme.test.ts` | `bin/set-colors.test.ts` |
| `bin/adjust.mjs` | `bin/set-geometry.mjs` |
| `bin/adjust.test.ts` | `bin/set-geometry.test.ts` |
| `bin/set-fonts.mjs` | `bin/set-type.mjs` |
| `bin/set-fonts.test.ts` | `bin/set-type.test.ts` |

Use `git mv` so the rename survives review.

Exported symbols follow: `runGenerateTheme` to `runSetColors`,
`formatGenerateThemeResult` to `formatSetColorsResult`, `runAdjust` to
`runSetGeometry` and its formatter likewise, `runSetFonts` to `runSetType` and
its formatter likewise. Grep for each old symbol before finishing; the callers
are `bin/cli.mjs`, `vite-plugin/writeScope.test.ts`, and the renamed tests.

Call sites to update:

- `bin/cli.mjs`: the header comment block, `USAGE`, the three imports, the
  three `command === ...` branches and every message inside them (including
  the `set-fonts has no --no-activate` explainer), and the `SAMPLE_PROMPTS`
  keys, which become `live-tokens-create-theme`, `live-tokens-set-colors`,
  `live-tokens-set-type`, `live-tokens-set-geometry`. Wave 2 authors the
  prompts; give each new key a placeholder prompt here and replace it there.
- `bin/schemaVersionCopies.test.ts`: the `bin/generate-theme.mjs` path.
- `bin/engineLoadsLazily.test.ts`: the `bin/adjust.mjs` assertion.
- `vite-plugin/writeScope.test.ts`: imports and both test names.
- `vite-plugin/themeFileApi.ts` lines 870 and 1692: both name the skill
  `"generate-theme"` in an error a user reads. They become `"create-theme"`.
- `scripts/lib/presetFonts.mjs` line 9 comment.
- `src/editor/docs/content/themes-workflow.md` line 66, then
  `npm run sync:docs` to regenerate `src/editor/docs/content.generated.ts`.
- `src/demo/sections/SectionClaude.svelte`: the skill chips.
- `CLAUDE.md` line 7: `live-tokens generate-theme` and `live-tokens adjust`.

`scripts/check-skills.mjs` needs no change in this wave. It derives the verb
set from `bin/cli.mjs`, so it follows.

**Verify:** `npm test` green (the `bin/` and `vite-plugin/` suites in
particular), `npm run check` clean, `npm run check:docs-content` green,
`node bin/cli.mjs --help` lists the three new verbs and no old one,
`grep -rn "adjust-geometry\|generate-theme\|set-fonts" bin/ vite-plugin/ scripts/ src/` returns
only `.claude/skills` hits (Wave 2 clears those) and the `generateColorsAndType`
plugin directory, which is an internal engine name and stays.

## Wave 2: the four skills

The commit unit is `.claude/skills/` plus `scripts/check-skills.mjs` plus the
`SAMPLE_PROMPTS` prompts.

### Directories

- `git mv .claude/skills/live-tokens-generate-theme .claude/skills/live-tokens-create-theme`
- `git mv .claude/skills/live-tokens-set-fonts .claude/skills/live-tokens-set-type`
- `git mv .claude/skills/live-tokens-adjust-geometry .claude/skills/live-tokens-set-geometry`
- new `.claude/skills/live-tokens-set-colors/`

### create-theme

Keep from the current SKILL.md: the design-direction step, the anchor
precedence rule (an idiom sets constraints, a mood moves dials within them),
the routing order and its safety note, "Files each step writes", and "Verify".

Drop everything that is color mechanics; it moves to set-colors.

The workflow becomes: read the request once and state the design direction;
read `references/design-directions.md` and name the anchor; state the three
intents, one line each; invoke `live-tokens-set-colors` with the color intent
and the anchor name; invoke `live-tokens-set-type` with the type intent and the
anchor name; invoke `live-tokens-set-geometry` with the geometry intent and the
anchor name; assemble the three reports into one summary and tell the user
where the result lives.

Color runs first and never skips, because its CLI writes the theme file the
other two adjust through unsaved buffers. Type skips when the user asked to
leave the type alone; geometry skips when the geometry intent is to leave it
alone.

Refinement routing is a new short section. An adjective that names one
dimension goes straight to that sibling: warmer, calmer, more contrast to
set-colors; a type voice to set-type; rounder or tighter to set-geometry.
create-theme handles a refinement that spans dimensions or names none.

`references/design-directions.md`: the three axes (valence, energy, dominance)
from the head of the current `mood-vocabulary.md`, then one row per anchor,
grouped feeling, idiom, occasion, each with its axis placement and a one-line
direction. Occasion rows carry the statement-request note (commitment level 2
or 3, the named color on the ground) and say that they fix color only.

### set-colors

Take from the current generate-theme SKILL.md, near-verbatim: "The base color
file" with the roles paragraph, "Chroma budget", "Per-role bands" with the
canvas commitment levels and the bullets under them, "Mood dials", "Gamut
guardrails", "Harmony", "Canvas sky and shadows", and "Refining a theme that
exists" including base color recovery from
`colorsAndType.editorConfigs.<Palette>.baseColor`.

Its workflow: translate the color intent into ten base colors, using
`references/color-anchors.md` when the direction named an anchor; write
`scratch/<slug>-base-colors.json`; run
`npx live-tokens set-colors scratch/<slug>-base-colors.json`; read the contrast
report and fix base colors on exit 1; report back.

It documents `--dry-run`, `--no-activate`, and `--carry-from`, which
`check-skills` gates.

`references/color-anchors.md` merges the color column of both vocabularies with
all of `named-themes.md`, in one table per kind. Keep the "entries are starting
points, apply the chroma budget on top" preamble and the note that riso,
Memphis, and brutalist break the budget on purpose.

### set-type

Rename the frontmatter, the verb, and every mention of the siblings. Add
`references/type-anchors.md` and a line in the Voice section saying that a named
anchor overrides the generic voice table. Add the report-back line.

### set-geometry

Rename the frontmatter, the verb, and the sibling mentions. Fold the current
"Geometry from the design direction" table out of generate-theme into the
Idioms section, and add `references/geometry-anchors.md` with the same override
note. Add the report-back line.

### Descriptions

The frontmatter description is the trigger surface and public API. Draft:

- **create-theme**: a whole look from a request. Theme, look, vibe, brand feel,
  by mood, style, era, season, holiday, or hue; a request that names only a
  color; a refinement that spans dimensions. Not a single token (the editor),
  not one dimension alone (name the three siblings).
- **set-colors**: color from a color intent. Palette, colors, hues, lighter or
  darker ground, warmer, cooler, more or less contrast, when type and geometry
  stay as they are. Also invoked by create-theme. Changes color only.
- **set-type**: the current set-fonts description with the sibling names and
  the verb updated.
- **set-geometry**: the current adjust-geometry description with the same
  updates.

### The gate

`scripts/check-skills.mjs` gains one check: anchor-key parity. Every row key in
`set-colors/references/color-anchors.md`,
`set-type/references/type-anchors.md`, and
`set-geometry/references/geometry-anchors.md` appears in
`create-theme/references/design-directions.md`, and every key in
`design-directions.md` appears in at least one of the three. The key is the
first comma-separated term of a table row's first column, lowercased. Failure
names the file and the key, both directions.

Everything else in `check-skills.mjs` follows automatically: it reads the skill
directory list, the verb set, and the flags off `bin/cli.mjs`.

**Verify:** `npm run check:skills` green, and each skill under the 250-line
ceiling. `node bin/cli.mjs setup-claude` in a scratch consumer lists four theme
skills with sample prompts. Manual: read each of the four SKILL.md files end to
end against `docs/terminology.md` and confirm no skill reaches for a sibling's
mechanics.

## Wave 3: the atlas

`src/editor/skill-atlas/skillTrees.ts` keys trees by the skill id with the
`live-tokens-` prefix stripped. The sync script repairs line numbers from
anchor text; it cannot invent nodes, so the split trees are authored by hand.

- `generate-theme` becomes two trees. `create-theme` keeps the trigger, the
  design-direction step, the anchor decision, the three-intent step, the three
  routing edges, the refinement branch, and the assembled report. `set-colors`
  takes the base color file, the chroma and band decisions, the canvas
  commitment branch, the CLI run, the contrast-report branch, and the
  refinement recovery path.
- `set-fonts` and `adjust-geometry` are renamed in place, with `id`, `title`,
  `tagline`, node descriptions, and anchors updated for the new verbs and
  sibling names.
- Node id prefixes follow the tree: `ct-`, `sc-`, `st-`, `sg-`.
- Cross-skill edges: the two thin edges recorded in `docs/skills-audit.md` plus
  the three new routing edges out of create-theme.
- Re-read every `anchor` and `anchorEnd`; Wave 2 rewrote the text they quote.

Then `npm run sync:skill-atlas -- --write` and
`npm run sync:skill-sources -- --write`, which stamp digests and regenerate
`skillSources.generated.ts`.

`SkillAtlas.svelte` needs no change; it enumerates `skillTrees`. Confirm the
key order still reads sensibly in the picker, since it is `Object.keys` order.

**Verify:** `npm run check:skill-atlas` and `npm run check:skill-sources`
green, `npm run check` clean. Manual: open `/live-tokens/skill-atlas` in the
dev app, walk all four trees, and confirm every card's title agrees with its
chip labels and its cited lines.

## Wave 4: docs, evals, changelog

- `docs/terminology.md`: rewrite the pipeline table for five layers, replace
  the "color is the spine" section with the split and the reason it now holds,
  update the CLI naming section (the rule holds for the three siblings;
  create-theme names its job), and add the anchor-key convention.
- `docs/skills-walkthrough.md`: record this decision and supersede the
  generate-theme section.
- `docs/skills-audit.md`: the six-skill count and the per-skill notes.
- `README.md`: the CLI table (lines 331 to 333) and the skill sections (366
  onward), which become four.
- `RELEASING.md` lines 124 and 127: the verb and skill lists.
- `CHANGELOG.md`: one breaking-change entry naming all three renamed verbs,
  the four skill names, and the fact that no alias survives.
- `.claude/evals/`: rename `trigger-rounder-mid-build` and
  `trigger-density-phrasing` criteria to expect set-geometry,
  `trigger-type-voice` to expect set-type, `outcome-theme-from-request` to
  expect create-theme routing to three siblings. `trigger-refine-warmer`
  changes meaning: "warmer" is a color-only refinement, so it now expects
  set-colors. Update `README.md`'s case table and its six-descriptions
  sentence.

**Verify:** `npm run check:docs-content`, `npm run check:skills`,
`npm run check:skill-atlas`, `npm run check:skill-sources`, `npm test`, and
`npm run check` all green. Manual: `npm run check:smoke-create` and
`check:smoke-install`, then the end-to-end run below.

## The end-to-end manual check

After Wave 4, with the dev server running, ask for a theme in plain language
("make it feel like a cozy autumn reading room"). Confirm create-theme states
one design direction, names an anchor, states three intents, invokes the three
siblings, and assembles one summary. Then restore the data tree per `CLAUDE.md`
before finishing.

## Invariants

1. No CLI alias and no legacy dispatch survives any wave.
2. A contributing skill never receives its sibling's mechanics. create-theme
   passes prose and an anchor name, never an OKLCH triple, a family name, or a
   token.
3. Every contributing skill works when invoked directly, with no design
   direction behind it.
4. Color runs first and has no skip clause. Type and geometry write buffers
   that a color re-run carries forward.
5. Each skill stays under the 250-line ceiling, and long material goes to
   `references/`.
6. The data tree under `src/live-tokens/data/` is unchanged at every wave
   boundary. Any run that exercises a CLI restores it per `CLAUDE.md`.
7. `skillTrees.ts` node text carries no markdown; the atlas renders it as
   plain strings.

## Reserved judgment calls

- Whether `set-colors` also absorbs the `--carry-from` set-generation advice,
  or create-theme keeps it as a routing concern. The executor decides on the
  reading and records which.
- Whether the three dimension anchor files keep one table per kind or one
  merged table. Parity gates the keys either way.
- Node-level shape of the two new atlas trees, within the sections Wave 3
  names.
