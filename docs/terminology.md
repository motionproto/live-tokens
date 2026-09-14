# Terminology

The shared vocabulary of this design system: the words the components, the
editor, the CLI, the docs, and the nine bundled skills in `.claude/skills/`
use for one concept each. A sentence that names one of these concepts uses
the word below and no synonym. This document defines the words. The code and
each `SKILL.md` define the work.

Skill text and CLI output are public API. A change here that alters a
`description` frontmatter trigger or a printed string belongs in the
changelog.

## Design vocabulary

Layout and visual terms come from graphic design, typography, and web
authoring. A standard term carries its meaning in; a coined one has none
until the text defines it, and a model reading a skill has no lookback.

| Term | Means |
|---|---|
| **section** | A horizontal region of a page with one purpose, titled by a SectionDivider or an `h2`. |
| **container** | An element that frames content: a Card, a Panel, a wrapper `div`. |
| **hairline** | The thin graphic line that separates or underlines. "Rule" is reserved for an instruction. |
| **chrome** | The frame, toolbar, and controls around content. |
| **stage** | The region of a tool page that shows the work. |
| **toolbar** | The row of controls along a stage's edge. |
| **hero** | The opening section of a page, usually with a headline over an image or a fill. |
| **gutter** | The space between columns, or between the page edge and its content. |
| **measure** | The width of a line of text, in characters. |
| **surface** | A filled area that content sits on; the `--surface-*` tokens name its fills. |
| **layer** | A sheet stacked over another, such as a Dialog over the page. |
| **element** | One rendered thing at one position. |
| **range** | A span of values on one axis, such as a price range or a lightness range. |

Retired words, each replaced by the standard term:

| Retired | Use instead |
|---|---|
| band | section, for a region of a page; range, for a span of values |
| box | container, or wrapper |
| place | element, or position |
| read (as a noun) | check |
| job | purpose |
| scaffolding, administration | chrome |
| retune | adjust |
| wiring | routing |
| rule (for the graphic line) | hairline |

Words that carry an unrelated everyday sense keep it: "the tone leans dark",
"the reader scans the rows". Rename by hand and read each hit, since a
scripted sweep mangles these.

## Editor and CLI vocabulary

One concept, one word, in editor labels, skill prose, and CLI output. A model
reads CLI output in the same turn as the skill, so two words for one concept
is drift.

| Term | Means |
|---|---|
| **design token** | A named value in `tokens.css`: `--space-16`, `--surface-neutral`, `--font-size-md`. |
| **token scale** | A prefix group of design tokens across its range: space, radius, each color ramp. `tokens --scale <name>` prints one. |
| **scale, step** | A token scale and one position on it. |
| **semantic property** | A component's editable CSS property, `--<id>-<part>-<kind>`, whose default names a design token. |
| **alias** | The binding of a semantic property to a design token in a component config file. |
| **shipped default** | The value a component's `:global(:root)` block assigns, as the package ships it. |
| **theme** | A complete document at `src/live-tokens/data/themes/<slug>.json`: color, type, and geometry. |
| **the buffer** | Edits the theme files do not hold yet. The editor's own badge for this state is "unsaved". |
| **load, the open theme** | The verb that makes a theme live, and the state it is then in. |
| **adopt, the production theme** | The verb that makes a theme the one the build ships, and the theme it names. |
| **catalogue** | The set of components a project can pick from, as `live-tokens components` prints it. British spelling. |
| **registered** | The state that puts a component in the catalogue, through `builtInRegistry` or a `registerComponent` call. |
| **registry** | The code mechanism only: `builtInRegistry`, `checkRegistryEntry`, the registry contract. |
| **finding** | One line of a checker's output: a rule, a severity, a file, a line, a message, and its repair. |
| **skip** | The one word for a case a command leaves alone, with one of its five printed reasons. |

Retired words:

| Retired | Use instead |
|---|---|
| theme token, component token | design token, semantic property |
| token family | token scale; "family" means a typeface, a hue family, or a component family |
| package default | shipped default |
| ladder, rung | scale, step |
| unsaved (in prose) | the buffer |
| publish | adopt |
| catalog, library | catalogue |
| clamp | skip |

## Component vocabulary

| Term | Means |
|---|---|
| **component** | A runtime Svelte file, an editor Svelte file, and one registration. |
| **catalogue entry** | The object the runtime file's `<script module>` block exports as `catalogue`, typed `CatalogueEntry`. |
| **description** | The entry's first field: one sentence saying what the component is. In rendered UI copy, a description sits under a title. |
| **useFor, notFor** | The entry's guidance fields: what to use the component for, and what to reach for instead. |
| **props map** | The entry's optional `props` field, keyed by a prop the file declares; the text says what that prop's values mean. |
| **prop** | A value a page passes to a component instance. |
| **variant** | The prop whose values pick one of the component's named styles; each value owns a full set of semantic properties. |
| **part** | A structural region of a component: Dialog's header, body, and footer. A part is never a state. |
| **component state** | One of default, selected, and disabled, mutually exclusive. Disabled is terminal: a disabled element has no other state. |
| **interaction state** | Default, hover, or active (pressed), a segment inside a property name such as `--button-outline-hover-surface`. Selected is a component state. A state is never a token. |
| **intrinsic** | A structural or display setting the editor exposes outside the token list: alignment, a hairline's position, a part's visibility. |
| **linked** | Two semantic properties that share one value because the component's author declared them siblings. Linkage is authored in code. |
| **label, title, text** | A prop: `label` names a control, `title` heads content, `text` is body copy. |
| **hint, summary** | A hint sits under a field, a summary beside a header. |
| **open** | The one prop for an open state. |
| **value** | The prop that holds a selection's id. |
| **size** | A size prop's values are `default` and `small`. |
| **callback prop** | `on` plus the event name, lowercase: `onchange`, `onclose`, `onsave`. |
| **hairline properties** | `-hairline-color`, `-hairline-width`, `-hairline-inset`. |
| **indicator** | The bar or stripe that marks the current item; `-indicator`, `-indicator-width`. |
| **a text part's color** | Its bare name; `-font-*` hang off it. |
| **fill** | `-surface`, in every component. |
| **prefix** | The component id verbatim. |
| **step name, role name** | A step name where only size differs, a role name where the value means something: Image's `banner`. |
| **interaction intrinsic** | Named for what it does: `hoverTint`, `hover`, `zoom`. |
| **bare, chromeless** | Card's `bare` drops the header; CollapsibleSection's `chromeless` drops the frame. |

Retired words, each replaced by the standard term:

| Retired | Use instead |
|---|---|
| `divider` (a property word, or a `set-geometry` op kind) | hairline |
| `accent` (for an indicator) | indicator |
| `thickness` | width |
| `background` (as a suffix) | surface |
| `active` (for selection) | selected |
| `expanded`, `show` | open |
| `compact`, `normal` (as size values) | small, default |
| `selectedTab` | value |
| `titleLabel` | title |
| `primary` (as a Badge variant) | brand |
| `--corner-badge-` | `--cornerbadge-` |

## Washes

Three names for three things paint does over what is already there.

| Term | Means |
|---|---|
| **scrim** | Dims what is behind it; the `--scrim-*` tokens. |
| **tint** | Shades the surface it sits on; the `--tint-low`, `--tint`, and `--tint-high` stops. |
| **backdrop** | The polarity of the surface behind an element, light or dark, as `data-backdrop` states it. Backdrop is a fact about a surface and paints nothing. |

## Theme skill terminology

The remaining sections define the vocabulary the theme skills share.

### The information hierarchy

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

### Glossary

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

### Naming against the CLI

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

### Marking a term of art

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

## Where the vocabulary is enforced

- `npm run check:cli-strings` sweeps every string literal in `bin/*.mjs`,
  `bin/lib/*.mjs`, and two editor modules for the retired CLI terms and the
  off-vocabulary words.
- `npm run check:skill-atlas` refuses an atlas title or chip that uses band,
  box, ladder, rung, or unsaved.
- `npm run check:skills` fails on an anchor named in one skill file and
  missing from a sibling.
- The registry contract test fails on a catalogue `props` key that names no
  declared prop, and on a built-in entry whose catalogue is a copy rather
  than the runtime file's own export.
