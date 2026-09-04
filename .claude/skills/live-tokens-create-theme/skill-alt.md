---
name: live-tokens-create-theme
description: Create or modify a complete live-tokens theme from a natural-language request by deriving one design direction and routing a color intent, a type intent, and a geometry intent to live-tokens-set-colors, live-tokens-set-type, and live-tokens-set-geometry. Use whenever the user asks for a theme, look, vibe, or brand feel by mood, style, era, season, holiday, or hue; when they name only a color and want a theme around it; or when they refine a look across more than one dimension. Not for one dimension alone: color, type, or geometry named by itself goes straight to that set skill.
---

# Creating a theme from a request

A theme is built of three dimensions: color, type, and geometry. This skill reads the user's prompt, the 
**request**, and derives the **design direction**, a short
summary covering three **intents**, one per
dimension, each naming an outcome rather than a value. Each set skill receives the design direction and the related intent for that dimensions as a goal.
Each set skill contributes its report back, which is combined to an **assembled report** for the entire theme. 

One **anchor** carries the direction across all three dimensions. It is a row
label, a feeling, an idiom, or an occasion, that `references/design-directions.md`
and each set skill list under the same names. Naming it once points every set
skill at the same row of its own table.

This skill runs one CLI of its own, `save-theme`, which turns the design direction into a
**theme**, the document at `themes/<slug>.json`, and opens it. Never
hand-author theme JSON and never edit the data tree directly.

## Workflow

1. Read the request once and generate the design direction based on the prompt: the mood, color,typography, and geometry that mood implies. It describes the three intents for each set-skill, and it names a default where the request leaves a dimension open. Keep brief and clear. Every step below keys off it.
2. Read `references/design-directions.md` and name the **anchor** the request matches: a feeling, idiom, or occasion the reference lists, each one fixing color, type, and geometry. An idiom sets constraints and a feeling moves dials inside them, so a request matching both reads the idiom first. A request matching none takes the design direction alone.
3. Generate the three intents the design direction and the anchor imply, one line each: the color intent, the type intent, and the geometry intent. Each names an outcome. Pass the anchor and the matching intent to each set skill, because every set skill holds its own anchors for its own dimension under the same names. Never specify an OKLCH value, font family, or a token on a set skill's behalf.
4. Invoke **live-tokens-set-colors** with the anchor and color intent. Skip only when the user asked to leave the color alone.
5. Invoke **live-tokens-set-type** with the anchor and type intent. Skip only when the user asked to leave the type alone.
6. Invoke **live-tokens-set-geometry** with the anchor and geometry intent. Skip when the geometry intent is to leave the geometry alone.
7. Take the theme name from the design direction and run
   `npx live-tokens save-theme "<name>"`. It composes the three buffers into
   `themes/<slug>.json` and opens it, so nothing is left unsaved.  Adopt, in the
   editor, publishes it to the site.
   `--dry-run` prints what it would write.
8. Assemble the three set skill responses into the final report: the design direction, what each set skill changed, any dimension left alone, and anything one of them flagged. Tell the user to review at the running app. Offer refinements (see Refining a theme).

## What each set skill owns

Invoke set skills with the anchor and the matching intent.

| Dimension | Set skill | It decides |
|---|---|---|
| color | live-tokens-set-colors | ten base colors, the scheme, harmony, the canvas commitment, the contrast pass |
| type | live-tokens-set-type | the two families, the form models behind them, the weights |
| geometry | live-tokens-set-geometry | radius, padding, gap, and border-width |

A dimension the request left open still gets an intent, taken from the anchor.
A dimension the request excludes gets no invocation at all, and the assembled report says which.

## Refining a theme

A refinement operates on an existing theme, and one adjective usually names one dimension. Route it to the matching set skill

| The user says | Goes to |
|---|---|
| warmer, cooler, calmer, louder, lighter, darker, moodier, more contrast | live-tokens-set-colors |
| more editorial, friendlier, more technical, a serif for headings | live-tokens-set-type |
| rounder, sharper, pill buttons, tighter, airier, thicker borders | live-tokens-set-geometry |

Keep this skill for a refinement that spans dimensions ("make it feel more
serious"), or one that names no dimension at all. State a new design direction
and route all three again.

## Verify

- Each set skill reports back, and `set-colors` exits 0 with every check passing (auto-corrected is fine).
- The app (dev server running) shows the whole theme after a reload, and the editor's Theme panel names the theme.
- The assembled report names one design direction, and the three intents come from it.
- To return to the previous theme, load the theme `set-colors` named from the Theme panel; that discards the buffers too.