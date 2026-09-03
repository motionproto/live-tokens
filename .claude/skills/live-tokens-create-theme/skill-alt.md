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

This skill runs no CLI. Its set skills do: one writes the **theme**,
the document at `themes/<slug>.json`, and the other two write unsaved buffers on
top of it. The theme plus those buffers is the **look**, which is what the app
renders now and what one Save turns back into a theme. Never hand-author theme
JSON and never edit the data tree directly.

## Workflow

1. Read the request once and state the design direction to the user: the mood, the hue family, the scheme, and the type and geometry that mood implies. It fixes enough to derive the three intents in step 3, and it names the default where the request leaves a dimension open. Keep it to a line or two. Every step below keys off it.
2. Read `references/design-directions.md` and name the **anchor** the request matches: a feeling, an idiom, or an occasion that reference lists, each one fixing color, type, and geometry together. An idiom sets constraints and a feeling moves dials inside them, so a request matching both reads the idiom first. A request matching none takes the design direction alone.
3. State the three intents the design direction and the anchor imply, one line each: the color intent, the type intent, and the geometry intent. Each names an outcome. Pass the anchor's name with each one, because every set skill holds its own anchors for its own dimension under the same names. Never reach for an OKLCH triple, a font family, or a token on a set skill's behalf.
4. Invoke **live-tokens-set-colors** with the color intent. This step never skips: `set-colors` writes and opens the theme the other two then adjust through unsaved buffers.
5. Invoke **live-tokens-set-type** with the type intent. Skip only when the user asked to leave the type alone.
6. Invoke **live-tokens-set-geometry** with the geometry intent. Skip when the geometry intent is to leave the geometry alone.
7. Assemble the three reports into the assembled report: the design direction, what each set skill changed, and anything one of them flagged. Tell the user to look at the running app, and that type and geometry sit in unsaved buffers until they save the open theme. Offer refinements (see Refining a look).

Order matters only for safety, and the order above is safe: `set-colors` carries
the unsaved buffers forward into the theme it writes, so a color re-run after
type and geometry keeps both.

Creating a set of themes needs `--carry-from`, which live-tokens-set-colors
documents: the first run becomes the live look, so a second run without it
carries the first theme's type and geometry into the second.

## What each set skill owns

Hand an outcome and the anchor's name. The mechanics stay where they are.

| Dimension | Set skill | It decides |
|---|---|---|
| color | live-tokens-set-colors | ten base colors, the scheme, harmony, the canvas commitment, the contrast pass |
| type | live-tokens-set-type | the two families, the form models behind them, the weights |
| geometry | live-tokens-set-geometry | radius, padding, gap, and border-width moves, global or per component |

A dimension the request leaves open still gets an intent, taken from the anchor.
A dimension the request rules out gets no invocation at all, and the assembled
report says which.

## Refining a look

A refinement arrives against a theme that is already open, and one adjective
usually names one dimension. Route it rather than re-reading the whole look:

| The user says | Goes to |
|---|---|
| warmer, cooler, calmer, louder, lighter, darker, moodier, more contrast | live-tokens-set-colors |
| more editorial, friendlier, more technical, a serif for headings | live-tokens-set-type |
| rounder, sharper, pill buttons, tighter, airier, thicker borders | live-tokens-set-geometry |

Keep this skill for a refinement that spans dimensions ("make it feel more
serious"), or one that names no dimension at all. State a new design direction
and route all three again.

## Files each step writes

Color writes `themes/<slug>.json` and opens it. Type and geometry write unsaved
buffers, which the page already runs. One Save in the editor keeps all three;
Adopt ships them. Opening a theme never changes what the site ships. Only Adopt,
in the editor, does that. Component aliases and gradients carry forward from the
live look into the theme `set-colors` writes; user-tuned gradients survive,
stock ones rebuild from the new families.

## Verify

- Each set skill reports back, and `set-colors` exits 0 with every check passing (auto-corrected is fine).
- The app (dev server running) shows the whole look after a reload, and the editor's Theme panel names the theme.
- The assembled report names one design direction, and the three intents come from it.
- To return to the previous look, load the theme `set-colors` named from the Theme panel; that discards the buffers too.
Leave the atlases for now. 