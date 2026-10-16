# Editing tokens

A tour of the editor. The page behind it repaints on every change; saving
writes a theme file you can reload later.

The editor has four views:

- **Tokens**: the design-system primitives (colour, type, spacing, and so on).
  They apply everywhere your site uses them.
- **Color Wheel**: the harmony wheel, the palette curves, and the story your colours
  tell across a page.
- **Components**: per-component editors. Re-Assign what tokens a component uses
  without changing the underlying system.
- **Sketchstyle**: an effect layer that redraws the page by hand. See
  [Sketch mode](sketch-mode.md).

This page covers **Tokens**. For components, see
[Creating components](creating-components.md).

## Palettes

Most colour work happens here. Each palette (Brand, Accent, Neutral, Canvas,
Success, Warning, Info, Danger, and a few more) has:

- **Base colour.** Pick a hex; the palette derives an 11-step ramp (100 to 950)
  from it.
- **Curves.** Three curves shape the ramp, in stack order: Hue, Saturation,
  Lightness. Drag the handles to bias it warmer or cooler, more or less
  saturated, darker or lighter. Hue drifts the ramp's temperature without
  moving contrast, because OKLCH hue rotation is close to lightness-preserving.
  It holds ±45 degrees; a bigger shift belongs on the base colour or the
  harmony axis.
- **Overrides.** Lock a single step to a hand-picked hex when the curve doesn't
  land where you want.

Editing a palette base ripples through every colour that depends on it, in real
time. Colours use OKLCH, so the ramp stays perceptually even across hues
without muddy mid-tones.

## Custom colours

A custom colour is one colour of your own, for a slot no palette step fits.
The open theme holds it as a token named by number: `--color-custom-1`,
`--color-custom-2`, and so on.

- **Adding.** Every colour picker has a **Custom** row after Danger. Open it
  and click the plus swatch. The new colour starts from the slot's current colour and
  opens in the OKLCH editor, and the slot previews it as you drag. The check
  assigns it to the slot; the cross discards it and restores the slot.
- **Reusing.** Pick a custom colour from the same row as you pick a palette
  step, opacity included. Every slot that names it follows its value.
- **Editing.** Hover a custom swatch in the picker and click its pencil, or
  click **Edit** in the **Custom Colours** section of the Tokens view. The edit
  repaints every slot that names the colour.
- **Removing.** **Remove colour** in the picker's edit panel, or **Remove** in
  the Tokens view, deletes a colour nothing names. When a component property,
  gradient stop, or wash names it, the editor first asks for a replacement and
  preselects the nearest colour. **Replace and remove** points each of those
  at the replacement, keeps each one's opacity, and deletes the custom colour.

Each add, edit, and remove is one undo step. A custom colour holds one value in
light and dark mode. Saving writes the theme's custom colours into its file,
and loading another theme brings in that theme's set. Reach a custom colour
through a component property: `live-tokens check-page` reports `unknown-token`
for page CSS that writes `var(--color-custom-1)`, since the name exists only in
the theme.

## Type

- **Fonts.** Add sources from Google Fonts, Adobe (Typekit), a CSS URL, or an
  inline `@font-face`. The font loads in the page as soon as you add it.
- **Stacks.** Named font cascades you reference by token, such as a display
  stack and a body stack.
- **Sizes and weights.** A t-shirt scale (xs, sm, md, lg, xl, 2xl…) for size and
  a numeric scale (100 to 900) for weight.

## Spacing, radius, shadow

Numeric scales with a slider per step.

- **Spacing**: the padding, gap, and margin scale.
- **Radius**: none through full.
- **Shadow**: colour, offset, blur, spread, and opacity per step, with stacked
  shadows supported.

Change a step and every element using it repaints.

## Washes and gradients

- **Scrims** are translucent layers that dim what sits behind them, like the
  one a dialog draws over the page. Set a colour and opacity per stop.
- **Tints** are the opposite operation: they shade the surface they sit on
  rather than dimming what is behind it, which is what a hover needs.
- **Gradients** are reusable gradient tokens with a stop list and direction, for
  hero panels and accent backgrounds.

## Columns

Pages lay out on the column grid. The column count and the max width hold at
every width. Desktop, Tablet, and Phone each set a gutter and an outer margin,
and the grid takes the tablet values at 767px and narrower and the phone values
at 480px and narrower. The columns button in the editor bar draws the grid over
the page, and a page on the grid reflows as you edit.

## Saving

The editor saves to your browser continuously, so work survives a reload
mid-edit. Writing a file is a separate step: the **Theme** panel at the foot of
the sidebar has **Save**, **Save As**, and **Load**, and each theme is one JSON
file under `src/live-tokens/data/themes/`.

The header gives you undo/redo (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`). You can keep
many themes side by side; one is open at a time, and only **Adopt** publishes
one. See [Themes](themes-workflow.md) for the full lifecycle.
