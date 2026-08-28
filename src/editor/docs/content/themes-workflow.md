# Themes

Save your work, switch between themes, and ship one to production.

## The Theme panel

The **Theme** panel at the foot of the editor sidebar holds the whole theme:
colors, type, a setting for every component, and the sketch layer, in one
file. It carries the name the theme ships under, whether production is running
it, and **Adopt**. Three parts sit under it, each a read-out rather than a
file to manage.

- **Colors & Type** holds the design tokens. Components read those tokens to
  define their appearance. It names the two faces the page is showing.
- **Components** counts how many components have an unsaved edit that has not
  been saved into the theme, and opens the component editors.
- **Sketchstyle** names the sketchstyle the theme's sketch layer carries: its label, or
  off the theme when what's on screen no longer matches what was saved, or
  none when the theme carries no sketch layer. It travels with the theme
  like colors and type do, but never reaches a production build.

A theme holds its own copy of every part, so one theme can never break another.

## How themes work

A theme is a document, and the editor works the way any editor does.

- **A theme** is a named JSON file in `src/live-tokens/data/themes/`. It carries
  the whole theme: the colors and type, a setting for every component, and the
  sketch layer.
- **The open theme** is the one the editor is working on, named in
  `themes/_active.json`. One at a time.
- **Your unsaved edits** are what the page shows right now. The editor keeps
  them in your browser as you work, writing most parts to a buffer,
  `_working.json`, one slot each; the sketch layer has no buffer and stays
  live in the browser until you save. **Save** captures all of it into the
  open theme.
- **The production theme** is the one your site ships, named in
  `themes/_production.json`. **Adopt** changes it; saving a preset in the Theme
  Picker performs that Adopt for you.

Absence is the answer for anything untouched: a buffer exists only where the
live theme diverges from the active theme, so a newly opened theme has none.

## Fonts

Type is part of the theme, so it saves, loads and ships with the theme rather
than on its own. Four named stacks carry it:

| Stack | Used by |
|---|---|
| `--font-display` | headings |
| `--font-sans` | body text and most UI |
| `--font-serif` | anywhere you ask for it |
| `--font-mono` | code |

Each stack is a family followed by its fallbacks, so a page still reads while a
web font loads, and still reads if it never does. **Project fonts**, in the
Colors and type editor, is where families come from: type a Google Fonts family
name and the editor checks it, or paste a fonts URL, an embed tag, or your own
`@font-face` rules. Removing a family puts the stack back on its fallbacks.

You can also set both faces at once from the command line:

```bash
npx live-tokens set-fonts fonts.json
```

with a brief naming the families:

```json
{ "display": "Fraunces", "body": "Nunito Sans" }
```

It checks each family against Google Fonts, works out the weights that family
actually has, and binds it to its stack. Like every other edit, the result lands
in the buffer, so **Save** keeps it. In Claude Code, asking for a font pairing in
plain English runs the same command.

A font is only requested by the browser once something on the page uses it, so
carrying a family you no longer reference costs nothing at load. Adopting is
what writes the font imports your site ships, into `fonts.css`.

## Saving

In the Theme panel:

- **Save** captures the theme on screen into the open theme. Your colors and type
  go in as part of it, so there is nothing to save first.
- **Save As** names a new theme. Use it for your first save and for forking.

Component editors keep their own unsaved state. If one or more components are
waiting when you use **Save**, **Save As**, or **Adopt**, the Theme panel offers
to save all of them before continuing. You can accept once instead of visiting
each component, or cancel to review them individually. A component editor's
**Save As** creates a reusable component preset.

Names are tidied to lowercase with hyphens, so "My Brand!" becomes `my-brand`,
and a leading underscore is dropped: those names are reserved for the buffer.
**Motion Proto** is the built-in theme and is read-only. You can always return
to it, and the editor never overwrites it, so start your own with **Save As**.

## Switching

**Load**—or clicking the active theme's name—opens the Theme Picker. Picking a
theme shows it on the page as a preview with nothing written to disk, sketch
layer included, so you can try each theme and compare. **Save** in that window
opens and adopts the previewed theme in one step: the active pointer changes,
the buffers clear, the editor works on it, and production ships it. **Cancel**
returns you to where you were, unsaved sketch dials included. Previewing alone
never changes what your site ships.

**Colors and type only. Keep my shapes.** narrows the load to the palette and
the fonts: your component settings and your sketch layer stay as they are, and
the theme you have open stays open. Saved colors and type files are listed
there too, marked *colors & type*, and picking one is always that narrower
load.

## Shipping

**Adopt**, in the Theme panel, is the "ship it" step. It saves the open theme,
then bakes the colors and type plus every component the theme carries into
`src/live-tokens/data/tokens.generated.css`, which your build bundles alongside
`tokens.css`. The sketch layer is the one part of the theme Adopt never bakes:
it stays a preview. Fonts regenerate to match. The line under the theme name
says whether production is running this theme.

Production is one saved theme, so nothing else publishes. Trying a theme, moving
a token, saving a theme: all of it leaves the generated CSS alone until you
Adopt. A component editor's Adopt runs the same save-then-bake step, because a
component never ships alone. Adopting while Motion Proto is open saves your theme
as a theme of your own first, since the built-in one is read-only.

Production builds (`npm run build`) ship only that plain CSS and your
components. No editor, no JSON loading, no runtime indirection.

## Keeping your work safe

Everything under `src/live-tokens/data/` is plain JSON, so commit it. Themes show
up as readable diffs you can review per branch, and the buffer shows up as the
work you have not saved into a theme yet. Nothing is backed up anywhere else:
git is your safety net. To experiment freely, **Save As** a new name first, then
edit.

## Where to go next

- **[Where themes live](where-themes-live.md)**: the files behind all of this,
  and what writes each one.
- **[Creating components](creating-components.md)**: make your own components
  editable in the same editor.
