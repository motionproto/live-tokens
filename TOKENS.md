# Where your token values live

Your design tokens live in two places, and they do two different jobs. Knowing
which is which tells you what an upgrade can and cannot change.

## Layer A: the look

This is everything you pick to make the site feel like *your* brand: colors,
surface shades, text colors, borders, shadows, gradients, and the per-component
styling.

You own Layer A through the editor. Your choices are saved as JSON (your theme,
your manifest, and each component's settings). When the site runs, those values
are applied live on top of everything else, so they always win.

`tokens.css` also carries a starting copy of these colors, but you never see it,
because your saved theme overrides it the moment the page loads.

## Layer B: the building blocks

This is the fixed set of measurements the look is built from: spacing steps,
text sizes, corner radii, border widths, blur amounts, motion curves (easing),
and hover-zoom scales.

Layer B lives only in `tokens.css`. Nothing in your theme redefines it. You
rarely touch these. They come from the package and give every project the same
consistent ruler.

## A way to picture it

Think of decorating a room.

- **Layer A is the paint and fabric.** You choose the colors and swap them
  whenever you like. That is your job, and you do it in the editor.
- **Layer B is the tape measure and the set of standard shelf sizes.** It is the
  toolkit the room is built from. It barely changes, and it comes in the box.

Repainting (Layer A) never resizes the shelves (Layer B), and getting a newer
tape measure never repaints your walls.

## What this means when you upgrade the package

- **Your look is safe.** Upgrading the package never changes the colors, type
  colors, surfaces, or component styling you picked. Those come from your saved
  theme and settings, not from the package.
- **The building blocks may need a refresh.** A new version of the package
  sometimes adds a new building block (for example, hover-zoom scales) or
  removes an unused one. To bring your `tokens.css` up to date, run:

  ```bash
  npx live-tokens migrate
  ```

- **The refresh only adds, renames, or removes unused blocks.** It never
  overwrites a value you have changed. If you hand-tuned a spacing step, it
  stays exactly as you set it.
- **Installing never edits your files on its own.** `npm install` updates the
  package code only. Changing your `tokens.css` is a separate, deliberate step
  you run with `migrate` when you are ready, then you review the change in git
  like any other edit.

## In short

You own the look. The package owns the building blocks. Upgrading can refresh
the building blocks, but it leaves your look untouched, and it never changes a
value you set.
