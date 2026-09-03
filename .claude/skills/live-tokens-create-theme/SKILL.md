---
name: live-tokens-create-theme
description: Create a complete live-tokens theme from a natural-language request by stating one design direction and routing a color intent, a type intent, and a geometry intent to live-tokens-set-colors, live-tokens-set-type, and live-tokens-set-geometry. Use whenever the user asks for a theme, look, vibe, or brand feel by mood, style, era, season, holiday, or hue; when they name only a color and want a theme around it; or when they refine a look across more than one dimension. Not for a single token (use the editor), and not for one dimension alone: color is live-tokens-set-colors, type is live-tokens-set-type, geometry is live-tokens-set-geometry.
---

# Creating a theme from a request

A look is three decisions: color, type, and geometry. This skill reads the
**request**, the user's own words, and states one **design direction**, a line
or two that fixes all three. From it come three **intents**, one per dimension,
each naming an outcome and never a value. Each goes to the contributing skill
that owns that dimension, and their three reports come back as one **assembled
report**, so the whole look comes from one reading.

Every contributing skill writes its dimension into the unsaved buffers the app
already renders, and those three buffers are the **look**. This skill runs one
CLI of its own, `save-theme`, which turns the look into the **theme**, the
document at `themes/<slug>.json`, and opens it. Never hand-author theme JSON and
never edit the data tree directly.

## Workflow

1. Read the request once and state the design direction to the user: the mood, the hue family, the scheme, and the type and geometry that mood implies. It fixes enough to derive the three intents in step 3, and it names the default where the request leaves a dimension open. Keep it to a line or two. Every step below keys off it.
2. Read `references/design-directions.md` and name the **anchor** the request matches: a feeling, an idiom, or an occasion that reference lists, each one fixing color, type, and geometry together. An idiom sets constraints and a feeling moves dials inside them, so a request matching both reads the idiom first. A request matching none takes the design direction alone.
3. State the three intents the design direction and the anchor imply, one line each: the color intent, the type intent, and the geometry intent. Each names an outcome. Pass the anchor's name with each one, because every contributing skill holds its own anchors for its own dimension under the same names. Never reach for an OKLCH triple, a font family, or a token on a contributing skill's behalf.
4. Invoke **live-tokens-set-colors** with the color intent. This step never skips: a theme request names a color identity, so color is the one dimension every look fixes.
5. Invoke **live-tokens-set-type** with the type intent. Skip only when the user asked to leave the type alone.
6. Invoke **live-tokens-set-geometry** with the geometry intent. Skip when the geometry intent is to leave the geometry alone.
7. Take the theme name from the design direction and run `npx live-tokens save-theme "<name>"`. It composes the three buffers into `themes/<slug>.json` and opens it, so nothing is left unsaved. `--dry-run` prints what it would write.
8. Assemble the three reports into the assembled report: the design direction, what each contributing skill changed, the theme `save-theme` wrote, and anything one of them flagged. Tell the user to look at the running app. Offer refinements (see Refining a look).

A set of themes runs steps 4 to 7 once per theme, with `--no-activate` on every
save but the last, so each theme starts from the same live look.

## What each contributing skill owns

Hand an outcome and the anchor's name. The mechanics stay where they are.

| Dimension | Contributing skill | It decides |
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

Color, type, and geometry each write an unsaved buffer, which the page already
runs. `save-theme` composes the three into `themes/<slug>.json` and opens it,
which clears the buffers; Adopt then ships the theme. Opening a theme never
changes what the site ships. Only Adopt, in the editor, does that. Component
aliases and gradients carry forward from the live look into the theme
`save-theme` writes; user-tuned gradients survive, stock ones rebuild from the
new families.

## Verify

- Each contributing skill reports back, and `set-colors` exits 0 with every check passing (auto-corrected is fine).
- `save-theme` exits 0 and names the theme it wrote and opened.
- The app (dev server running) shows the whole look after a reload, and the editor's Theme panel names that theme with no unsaved marker.
- The assembled report names one design direction, and the three intents trace to it.
- To return to the previous look, load the earlier theme from the Theme panel.
