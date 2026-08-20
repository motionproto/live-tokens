# Themes

Save your work, switch between looks, and ship one to production.

## The Theme panel

The **Theme** panel at the foot of the editor sidebar holds the whole look:
colors, type, and a setting for every component, in one file. It carries the
name the look ships under, whether production is running it, and **Adopt**.
Two parts sit under it, each a read-out rather than a file to manage.

- **Colors & Type** holds the design tokens. Components read those tokens to
  define their appearance. It names the two faces the page is showing.
- **Components** counts how many components have an unsaved edit that has not
  been saved into the theme, and opens the component editors.

A theme holds its own copy of every part, so one theme can never break another.

## How themes work

A theme is a document, and the editor works the way any editor does.

- **A theme** is a named JSON file in `src/live-tokens/data/themes/`. It carries
  the whole look: the colors and type plus a setting for every component.
- **The open theme** is the one the editor is working on, named in
  `themes/_active.json`. One at a time.
- **Your unsaved edits** are what the page shows right now. The editor keeps
  them in your browser as you work and writes them to a buffer, `_working.json`,
  one slot per part of the look. **Save** captures that buffer into the open
  theme.
- **The production theme** is the one your site ships, named in
  `themes/_production.json`. **Adopt** changes it; saving a preset in the Theme
  Picker performs that Adopt for you.

Absence is the answer for anything untouched: a buffer exists only where the
live look diverges from the active theme, so a newly opened theme has none.

## Saving

In the Theme panel:

- **Save** captures the look on screen into the open theme. Your colors and type
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
theme shows it on the page as a preview with nothing written to disk, so you can
try each look and compare. **Save** in that window opens and adopts the previewed
theme in one step: the active pointer changes, the buffers clear, the editor
works on it, and production ships it. **Cancel** returns you to where you were.
Previewing alone never changes what your site ships.

**Colors and type only. Keep my shapes.** narrows the load to the palette and
the fonts: your component settings stay as they are and the theme you have open
stays open. Saved colors and type files are listed there too, marked *colors &
type*, and picking one is always that narrower load.

## Shipping

**Adopt**, in the Theme panel, is the "ship it" step, and it ships the whole
look. It saves the open theme, then bakes that theme into
`src/live-tokens/data/tokens.generated.css`, which your build bundles alongside
`tokens.css`: the colors and type plus every component the theme carries. Fonts
regenerate to match. The line under the theme name says whether production is
running this theme.

Production is one saved theme, so nothing else publishes. Trying a look, moving
a token, saving a theme: all of it leaves the generated CSS alone until you
Adopt. A component editor's Adopt runs the same whole-look step, because a
component never ships alone. Adopting while Motion Proto is open saves your look
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
