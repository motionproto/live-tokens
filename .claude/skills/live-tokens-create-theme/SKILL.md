---
name: live-tokens-create-theme
description: Create or modify a complete live-tokens theme from a natural-language request. Derives one design direction and routes a color intent, a type intent, and a geometry intent to live-tokens-set-colors, live-tokens-set-type, and live-tokens-set-geometry. Use when the user asks for a theme, look, vibe, or brand feel by mood, style, era, season, holiday, or hue. Use when the user names only a color and wants a theme around it. Use when the user refines a theme across more than one dimension. For color, type, or geometry named on its own, read that set skill.
---

# Creating a theme from a request

A theme is built of three dimensions: color, type, and geometry. This skill
reads the user's prompt, the **request**, and derives the **design direction**,
a short summary covering three **intents**, one per dimension, each naming an
outcome rather than a value. Each set skill receives the design direction and
the intent for its own dimension as a goal, and reports back. The three reports
combine into one **assembled report** for the whole theme.

One **anchor** carries the direction across all three dimensions. It is a row
label that `references/design-directions.md` and each set skill list under the
same names: a feeling, an idiom, or an occasion. Naming it once points every set
skill at the same row of its own table.

Each set skill writes its dimension into the working buffers the app already
renders. This skill runs one CLI of its own, `save-theme`, which composes those
buffers into a **theme**, the document at `themes/<slug>.json`, and opens it.
Never hand-author theme JSON and never edit the data tree directly.

## Workflow

1. Read the request once and generate the design direction based on the prompt: the mood, and the color, typography, and geometry that mood implies. It describes the three intents for each set skill, and it names a default where the request leaves a dimension open. Keep it brief and clear. Every step below keys off it.
2. Read `references/design-directions.md` and name the **anchor** the request matches: a feeling, idiom, or occasion the reference lists, each one fixing color, type, and geometry. An idiom sets constraints and a feeling moves dials inside them, so a request matching both reads the idiom first. A request matching none takes the design direction alone.
3. Generate the three intents the design direction and the anchor imply, one line each: the color intent, the type intent, and the geometry intent. Each names an outcome. Pass the anchor and the matching intent to each set skill, because every set skill holds its own anchors for its own dimension under the same names. Never specify an OKLCH value, a font family, or a token on a set skill's behalf.
4. Invoke **live-tokens-set-colors** with the anchor and the color intent. Skip only when the user asked to leave the color alone.
5. Invoke **live-tokens-set-type** with the anchor and the type intent. Skip only when the user asked to leave the type alone.
6. Invoke **live-tokens-set-geometry** with the anchor and the geometry intent. Skip when the geometry intent is to leave the geometry alone.
7. Take the theme name from the design direction and run `npx live-tokens save-theme "<name>"`. It composes the buffers into `themes/<slug>.json` and loads it. `--dry-run` prints the file path and the layers instead. A blank name and the name `default` exit 1. A name whose slug exists overwrites that theme in place. Adopt, in the editor, ships the theme to the site.
8. Assemble the three set skill responses into the assembled report: the design direction, what each set skill changed, any dimension left alone, and anything one of them flagged. Review the result in the running app. Offer refinements (see Refining a theme).

A set of themes runs steps 4 to 7 once per theme, with `--no-activate` on every
save but the last. That writes the theme and leaves the buffers alone, so each
theme starts from the same state.

## Set skill responsibilities

Invoke set skills with the anchor and the matching intent.

| Dimension | Set skill | It decides |
|---|---|---|
| color | live-tokens-set-colors | ten base colors, the scheme, harmony, the Canvas base color and its gradient, the contrast pass |
| type | live-tokens-set-type | the families for up to five slots, the form models behind them, the weights |
| geometry | live-tokens-set-geometry | radius, padding, gap, and border-width |

A dimension the request left open still gets an intent, taken from the anchor.
A dimension the request excludes gets no invocation at all, and the assembled report says which.

Component aliases and swatch gradients carry forward from the buffers by value
into the theme `save-theme` writes. At a set-colors run, gradients tuned in the
editor survive and stock ones rebuild from the new families.

## Refining a theme

A refinement operates on an existing theme, and one adjective usually names one
dimension. Route it to the matching set skill:

| The user says | Goes to |
|---|---|
| warmer, cooler, calmer, louder, lighter, darker, moodier, more contrast | live-tokens-set-colors |
| more editorial, friendlier, more technical, a serif for headings | live-tokens-set-type |
| rounder, sharper, pill buttons, tighter, airier, thicker borders | live-tokens-set-geometry |

When no refinement is requested, the theme is complete.

Keep this skill for a refinement that spans dimensions ("make it feel more
serious"), or one that names no dimension at all. State a new design direction
and route all three again.

## Verify

- Each invoked set skill reports its result. When invoked, `set-colors` exits 0 with every check passing (auto-corrected is fine).
- `save-theme` exits 0 and names the theme it wrote and opened.
- The app (dev server running) shows the whole theme, and the editor's Theme panel names that theme with no pending changes.
- The assembled report names one design direction, and the three intents come from it.
- To return to the previous theme, load it from the Theme panel; loading clears the buffers too.
