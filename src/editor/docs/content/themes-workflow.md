# Themes

Save your work, switch between looks, and ship one to production.

## The Theme panel

The **Theme** panel at the foot of the editor sidebar holds the whole look:
colors, type, and a setting for every component you changed, in one file. Two
parts sit under it.

- **Colors & Type** holds the design tokens. Components read those tokens to
  define their appearance. It shows what the theme's colors and type are and
  whether production is running them, and it holds **Adopt**.
- **Components** counts how many components run something the theme does not
  carry, and opens the component editors.

A theme keeps its own copy of every part, so deleting a working file never
breaks a saved theme. Adopting a part updates the active theme in place, which
keeps the whole true to what you see.

On disk a theme is a *manifest*, under `src/live-tokens/data/manifests/`. That
is the only place the older word survives.

## How themes work

- **Your live edits** are what the page shows right now. They save to your
  browser automatically and survive a reload, but they are not yet a file.
- **A saved theme** is a named JSON file in
  `src/live-tokens/data/manifests/`. You create one with **Save As**.
- **The active theme** is the one the editor reads and production runs. Exactly
  one at a time.

Underneath, colors and type are stored as their own files in
`src/live-tokens/data/themes/`, and Adopt writes one. The theme keeps a copy of
whatever it captured, so those files are working files, not something to
manage.

## Saving

In the Theme panel:

- **Save** re-stamps the active theme with everything you have saved.
- **Save As** names a new theme. Use it for your first save and for forking.

Names are tidied to lowercase with underscores, so "My Brand!" becomes
`my_brand`. There is a built-in `default` you can always return to; the editor
never overwrites it.

## Switching

**Load** lists your saved themes and the nine example looks. Picking one shows
it on the page as a preview with nothing written to disk, so you can try each
look and compare. **Save** keeps the previewed theme, **Cancel** returns you to
where you were.

**Colors and type only. Keep my shapes.** in that window narrows the load to the
palette and the fonts: your component settings stay exactly as they are. Older
colors and type files are listed there too, marked *colors & type*, and picking
one is always that narrower load.

## Shipping

**Adopt**, in the Colors & Type part, is the "ship it" step. It bakes the tokens
into `src/live-tokens/data/tokens.generated.css`, which your build bundles
alongside `tokens.css`. Fonts regenerate to match, and the active theme is
updated to match what you shipped. The part says "not in production" whenever
the two have drifted apart.

Production builds (`npm run build`) ship only that plain CSS and your
components. No editor, no JSON loading, no runtime indirection. If you save
while the production file is active, the generated CSS updates immediately,
with no separate step.

## Keeping your work safe

Everything under `src/live-tokens/data/` is plain JSON, so commit it. Themes
show up as readable diffs you can review per branch. There are no automatic
backups: git is your safety net. To experiment freely, **Save As** a new name
first, then edit.

## Where to go next

- **[Creating components](creating-components.md)**: make your own components
  editable in the same editor.
