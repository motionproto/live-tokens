# Editing tokens

A tour of the editor's Tokens tab. The page behind the editor repaints
on every change; saving writes a JSON theme file to disk.

## The editor surface

The overlay has two top-level views:

- **Tokens**: design-system primitives (colour, type, spacing, etc.).
  Apply everywhere your CSS uses them.
- **Components**: per-component slot editors. Re-point what a specific
  component's slots use, without changing the underlying design
  system.

This chapter covers **Tokens**. Components have their own chapter
(see [Adding components](adding-components.md) and the reference
chapter on the component system).

## Palettes

The palette editor is where most colour work happens.

Each palette (Brand, Accent, Neutral, Canvas, Alternate, Special,
Success, Warning, Info, Danger) has:

- **Base colour.** Pick a hex; the palette derives an 11-step ramp
  (100 to 950) from it.
- **Curves.** Two Bezier curves shape lightness and saturation
  fall-off across the ramp. Drag the curve handles to bias the ramp
  toward darker mids, lighter highlights, more saturation at the
  edges, whatever the design needs.
- **Overrides.** Lock a specific step to a hand-chosen hex if the
  curve doesn't quite land where you want it.

The result feeds tokens like `--color-brand-500`, which feeds
`--surface-brand`, which feeds component-level aliases like
`--button-primary-surface`. Editing the palette base ripples through
every dependent token in real time.

The colour model is OKLCH (perceptually uniform), so the ramp's
lightness scale stays even across hues without the muddy mid-tones
you get from raw HSL.

## Type

Three things live here:

- **Font registry.** Add font sources from Google Fonts, Typekit
  (Adobe), an arbitrary CSS URL, or an inline `@font-face` block. The
  editor loads the font in the page as soon as you add it, so
  previews work immediately.
- **Stacks.** A stack is a named font cascade you can reference by
  token. Build a "display" stack as
  `Arvo, serif`, a "sans" stack as `Manrope, system-ui, sans-serif`,
  etc. Stacks feed CSS variables like `--font-display`, `--font-sans`,
  `--font-mono`.
- **Size and weight scales.** Adjustable t-shirt scale (xs, sm, md,
  lg, xl, 2xl...) for font size; numeric scale (100 to 900) for
  weight.

Component editors then bind each component's typography slots to a
specific stack, size, weight, and line-height.

## Spacing, radius, shadow

These are simple numeric scales. The editor exposes sliders for each
step.

- **Spacing**: 0, 2, 4, 6, 8, 10, 12, 16, 20, 24, 32, 48, 64, 80, 96
  (px equivalents in `rem`). Used for padding, gap, margin.
- **Radius**: none, sm, md, lg, xl, 2xl, 3xl, 4xl, full.
- **Shadow**: configurable per step. Edit the colour, X/Y offset,
  blur, spread, and opacity. Multiple stacked shadows per token are
  supported.

When you change a scale step, every consumer in the page repaints. A
`padding: var(--space-16)` declaration follows immediately.

## Overlays and gradients

**Overlays** are translucent tints layered over base surfaces. Think
of the subtle tint a card gets when you hover it: that's an overlay
token. Configure per state (`hover`, `pressed`, etc.) with a tint
colour and opacity.

**Gradients** are fixed-slot gradient tokens you can reference from
component aliases. Useful for hero panels, subtle background gradients
on cards, accent stripes. Each gradient token has a stop list and
direction; the editor renders a preview swatch.

## Columns

The page-grid overlay. Set column count, gutter, and outer margin.
Toggle the visual overlay with `Cmd/Ctrl+G`. Pages that use the
project's column system reflow live.

## Saving and dirty state

The editor writes to localStorage continuously (debounced) so your
work survives a page reload mid-edit. **Saving** is a separate
action: it writes a named JSON file under `src/live-tokens/data/themes/`.

The header shows:

- **A dot or asterisk** next to the file name when you have unsaved
  changes.
- **Undo / Redo buttons** (also `Cmd/Ctrl+Z` and `Cmd/Ctrl+Shift+Z`).
- **A file menu** for *New*, *Save*, *Save as*, *Switch active*,
  *Delete*.

You can have many saved themes side-by-side. Only one is *active* at
a time (the one the page loads at boot). See
[Themes workflow](themes-workflow.md) for the full lifecycle.

## What you don't see

A few things happen automatically and you do not have to manage them:

- **Migrations.** If you open a saved theme written by an older
  version of the editor, the loader migrates the JSON in memory
  before applying it. You never see the upgrade happen.
- **CSS variable fan-out.** The editor lives in an iframe overlaid on
  the page. Writing a CSS variable sets it on both the iframe and the
  host page, so your edits paint in the real page in real time. No
  postMessage glue required.
- **Component defaults.** Each component has a `default.json` config
  that the dev plugin regenerates from the component's source on
  every save. If you add a new slot to a component, it shows up in
  the editor on the next save with no further action.

For the workflow of saving, switching, and shipping themes, continue
to [Themes workflow](themes-workflow.md). To add a new component to
the editor, see [Adding components](adding-components.md).
