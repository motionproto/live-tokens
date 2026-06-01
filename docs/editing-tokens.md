# Editing tokens

A tour of the editor. The page behind it repaints on every change; saving
writes a theme file you can reload later.

The editor has two views:

- **Tokens**: the design-system primitives (colour, type, spacing, and so on).
  They apply everywhere your site uses them.
- **Components**: per-component editors. Re-point what one component uses
  without changing the underlying system.

This page covers **Tokens**. For components, see
[Creating components](creating-components.md).

## Palettes

Most colour work happens here. Each palette (Brand, Accent, Neutral, Canvas,
Success, Warning, Info, Danger, and a few more) has:

- **Base colour.** Pick a hex; the palette derives an 11-step ramp (100 to 950)
  from it.
- **Curves.** Two curves shape how lightness and saturation fall off across the
  ramp. Drag the handles to bias it darker, lighter, or more saturated.
- **Overrides.** Lock a single step to a hand-picked hex when the curve doesn't
  land where you want.

Editing a palette base ripples through every colour that depends on it, in real
time. Colours use OKLCH, so the ramp stays perceptually even across hues
without muddy mid-tones.

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

## Overlays and gradients

- **Overlays** are translucent tints layered over surfaces, like the subtle
  tint a card gets on hover. Set a colour and opacity per state.
- **Gradients** are reusable gradient tokens with a stop list and direction, for
  hero panels and accent backgrounds.

## Columns

The page-grid overlay. Set column count, gutter, and outer margin, and toggle
the visual guide with `Cmd/Ctrl+G`. Pages built on the column system reflow
live.

## Saving

The editor saves to your browser continuously, so work survives a reload
mid-edit. **Save** is a separate step: it writes a named theme file under
`src/live-tokens/data/themes/`.

The header gives you undo/redo (`Cmd/Ctrl+Z`, `Cmd/Ctrl+Shift+Z`) and a file
menu for New, Save, Save as, Switch, and Delete. You can keep many themes side
by side; one is active at a time. See [Themes](themes-workflow.md) for the full
lifecycle.
