---
name: live-tokens-create-theme
description: Create a complete live-tokens theme from a natural-language request by stating one design direction and routing a color, a type, and a geometry intent to live-tokens-set-colors, live-tokens-set-type, and live-tokens-set-geometry. Use whenever the user asks for a theme, look, vibe, brand feel, or whole design by mood, style, era, season, holiday, or hue; when they name only a color and want a theme around it; or when they refine a look across more than one dimension. Not for a single token (use the editor), and not for one dimension alone: color is live-tokens-set-colors, type is live-tokens-set-type, geometry is live-tokens-set-geometry.
---

# Creating a theme from a request

A theme is three decisions: color, type, and geometry. This skill reads the
request once, states a **design direction** that fixes all three, and routes one
intent to each contributing skill, so the whole look comes from one reading.
It runs no CLI of its own. Never hand-author theme JSON and never edit the data
tree directly.

## Workflow

1. Read the request once and state the design direction to the user: the mood, the hue family, the scheme, and the type and geometry that mood implies. It fixes enough to derive the three intents in step 3, and it names the default where the request leaves a dimension open. Keep it to a line or two. Every step below keys off it.
2. Read `references/design-directions.md` and name the anchor the request matches: a feeling, an idiom, or an occasion. An idiom sets constraints and a feeling moves dials inside them, so a request matching both reads the idiom first. A request matching none takes the direction alone.
3. State the three intents the design direction and the anchor imply, one line each: the color intent, the type intent, and the geometry intent. Each names an outcome. Name the anchor alongside the intent so the sibling can read its own column, and never reach for an OKLCH triple, a font family, or a token on a sibling's behalf.
4. Invoke **live-tokens-set-colors** with the color intent. This step never skips: its CLI writes the theme file that the other two adjust.
5. Invoke **live-tokens-set-type** with the type intent. Skip only when the user asked to leave the type alone.
6. Invoke **live-tokens-set-geometry** with the geometry intent. Skip when that intent is to leave the geometry alone.
7. Assemble the three reports into one summary: the design direction, what each sibling changed, and anything one of them flagged. Tell the user to look at the running app, and that type and geometry sit in the unsaved buffer until they save the open theme. Offer refinements (see Refining a look).

Order matters only for safety, and the order above is safe: the color generator
carries the live buffers forward into the new theme file, so a color re-run
after type and geometry keeps both.

Generating a set of themes needs `--carry-from`, which set-colors documents:
the first run becomes the live look, so a second run without it carries the
first theme's type and geometry into the second.

## What each sibling owns

Hand an outcome and the anchor name. The mechanics stay with the executor.

| Intent | Sibling | It decides |
|---|---|---|
| color | live-tokens-set-colors | ten base colors, the scheme, harmony, the canvas commitment, the contrast pass |
| type | live-tokens-set-type | the two families, the form models behind them, the weights |
| geometry | live-tokens-set-geometry | radius, padding, gap, and border-width moves, global or per component |

A dimension the request leaves open still gets an intent, taken from the
anchor. A dimension the request rules out gets no invocation at all, and the
summary says which.

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

Color writes `themes/<slug>.json` and opens it. Type and geometry write the
unsaved buffers, which the page already runs. One Save in the editor keeps all
three; Adopt ships them. Opening a theme never changes what the site ships.
Only Adopt, in the editor, does that. Component aliases and gradients carry
forward from the live look into a generated theme; user-tuned gradients
survive, stock ones rebuild from the new families.

## Verify

- Each sibling reports back, and the color CLI exits 0 with every check passing (auto-corrected is fine).
- The app (dev server running) shows the whole look after a reload, and the editor's Theme panel names the theme.
- The summary names one design direction, and the three intents trace to it.
- To return to the previous look, load the theme the color CLI named from the Theme panel; that discards the buffers too.
