# Themes

Save your work, switch between themes, and ship one to production.

## How themes work

- **Your live edits** are what the page shows right now. They save to your
  browser automatically and survive a reload, but they are not yet a file.
- **A saved theme** is a named JSON file in `src/live-tokens/data/themes/`. You
  create one with **Save as**.
- **The active theme** is the saved theme the page loads at startup. Exactly one
  at a time.
- **The production theme** is the one that ships. Promoting sets it.

## Saving

In the editor header:

- **Save** updates the current theme.
- **Save as** names a new theme. Use it for your first save and for forking.

Names are tidied to lowercase with underscores, so "My Brand!" becomes
`my_brand`. There is a built-in `default` theme you can always return to; the
editor never overwrites it.

## Switching

The file menu lists every saved theme. Pick one to make it active; the page
reloads with it applied. Your current edits are saved to the previous theme
first, so you don't lose work.

## Shipping

**Promote to production** is the "ship it" step. It bakes the theme's variables
into `src/live-tokens/data/tokens.generated.css`, which your build bundles
alongside `tokens.css`. Fonts regenerate to match.

Production builds (`npm run build`) ship only that plain CSS and your
components. No editor, no JSON loading, no runtime indirection. If you save
while the production theme is active, the generated CSS updates immediately,
with no separate promote step.

## Manifests

A **manifest** bundles one theme plus a config for each component into a single
named set. Useful when you run several brands and want each to apply its theme
and component tweaks in one move. There is a protected default and an active
manifest; applying one swaps everything at once.

## Keeping your work safe

Everything under `src/live-tokens/data/` is plain JSON, so commit it. Themes
show up as readable diffs you can review per branch. There are no automatic
backups: git is your safety net. To experiment freely, **Save as** a new name
first, then edit.

## Where to go next

- **[Creating components](creating-components.md)**: make your own components
  editable in the same editor.
