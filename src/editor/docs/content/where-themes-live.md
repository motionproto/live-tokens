# Where themes live

Everything the editor writes is plain JSON and CSS inside your project. There
is no database and no hidden state: the files are the storage, and git is the
history.

## The data tree

```
src/live-tokens/data/
  themes/
    _active.json         names the theme the editor has open
    _production.json     names the theme your site ships
    default.json         Motion Proto, the built-in look, rewritten at boot
    my-brand.json        a saved theme: the whole look in one file
  colors-and-type/
    _working.json        unsaved colors and type edits
  component-configs/
    button/
      default.json       Button's shipped settings, derived at boot
      _working.json      unsaved Button edits
      my-button.json     a preset you saved from the Button editor
  sketch-styles/
    my-look.json         a sketchstyle saved from the Sketchstyle view
  tokens.generated.css   the baked CSS your production build ships
src/system/styles/
  tokens.css             your token vocabulary, hand-authored, never written
  fonts.css              font imports, rewritten when you Adopt
```

A saved theme carries the whole look by value: the colors and type, a
setting for every component, and the sketch layer. It depends on no other
file, so deleting anything else never breaks it.

## What writes when

- **Editing** changes the page through CSS variables. The editor keeps your
  edits in the browser as you work and writes them to the `_working.json`
  buffers when you save a component. When the Theme panel finds several dirty
  components, **Save all** writes those buffers together.
- **Save** captures the buffers into the open theme's file, along with the
  sketch layer, which has no buffer of its own and lives only in the browser
  until Save writes it. That file is the durable copy of your look; matching
  buffers are then removed.
- **Load** clears the buffers and points `themes/_active.json` at the theme you
  picked. Live reads fall through to that file. Nothing else changes, so trying
  looks is free and ordinary switching changes only the pointer.
- **Adopt** points `themes/_production.json` at the open theme, bakes it into
  `tokens.generated.css`, and rewrites `fonts.css` to match. It is the only
  action that changes what your site ships.

The `default.json` files are the shipped baseline. The editor derives them at
boot and refreshes them when the package updates; it never saves your work
over them.

Projects upgraded from 0.48 may initially contain working files copied from the
active theme. On the first dev-server boot, exact copies are removed
automatically. Any file that differs is kept as unsaved work, so no migration
command is required.

## What to commit

All of it. The data tree is designed to live in git: themes diff readably, the
two pointers say what is open and what ships, and a `_working.json` in a diff
is exactly the work you have not yet saved into a theme. Nothing is backed up
anywhere else.

## Where to go next

- **[Themes](themes-workflow.md)**: the workflow built on these files: saving,
  loading, and shipping.
