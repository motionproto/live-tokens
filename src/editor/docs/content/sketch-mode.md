# Sketch mode

Sketch mode redraws your whole page as if it had been drawn by hand. Every
component keeps its own colours, spacing and corners; what changes is the line
they are drawn with.

It is an effect layer, not a set of token values. It reads nothing from your
theme and writes nothing back, so it never touches a token, never lands in a
theme file, and never reaches the CSS you ship. Turn it off and every trace of
it goes.

Open the **Sketch** view in the editor and switch **Sketch mode** on. The effect
applies to the page behind the editor as well as to the preview, so what you see
in context is what it does.

## What it draws

Each component's fill and outline are repainted from the tokens that component
already owns. The real background and border are hidden behind them, then both
are pushed around one shared field of noise. Because every component samples the
same field, the whole page reads as one drawing rather than as a set of
separately wobbled boxes.

## The presets

Seven looks ship with the package, and each is a complete set of dials rather
than a style name:

- **Pencil.** Two graphite passes on their own seeds, so the outline disagrees
  with itself the way a hand coming back round does.
- **Marker.** A broad translucent nib gone round twice on the same line, so the
  overlap darkens and the ink pools where it slows.
- **Whiteboard.** The fattest nib on glass, with a mask that streaks the fill
  like a half-wiped board.
- **Hatched.** An etching. The fill is angled shading and the outline a single
  hard-edged scratch.
- **Dashed.** A drafting outline: one slow drift along the ruler, broken into
  strokes. The clean pole.
- **Napkin.** Ballpoint in a hurry. Everything loose at once.
- **Dry marker.** Ink that ran out. One scratchy pass over a mostly eaten fill.

Pick one, then move whatever you like. **Save** keeps your dials under a name of
your own, alongside the shipped seven, as a file under
`src/live-tokens/data/sketch-presets/`.

## The dials

- **Border.** How far the outline travels and how long its wave is, then its
  width, ink, pressure and pooling. A second pass either copies the first line a
  few pixels off or runs it through the pen again on its own seed.
- **Fill.** Solid or hatched, how far the fill's edge travels, and how far each
  instance is offset, rotated and scaled from its neighbours. **Ink coverage**
  thins the fill with a field of blotches: set their size, how many levels of
  detail, how pale and how dense they go, and how soft their edges are.
- **Shape.** **Corner spread** rounds each corner by its own share of the dial,
  so no two match. **Corner travel** leans the drawn box into a quadrilateral
  with no two sides parallel. This is the dial that stops a component reading as
  a rectangle.
- **Icons and SVG.** Glyph travel and wavelength on their own scale. A glyph is
  all curves already, so it needs more travel than a card's long straight edge
  before the wobble reads at all.
- **Noise.** The shared field itself: its wavelength, how many layers of detail
  sit on it, and the shape of its wave. A square wave sends nearly every edge to
  full travel, which is what makes the effect stronger rather than bigger.

## Drawing your own elements

The effect displaces boxes, so anything drawn some other way is left alone. A
rule made from a `border` is not a box; make it an element and tell the layer
what to draw it with:

```css
.rule {
  height: var(--border-width-2);
  background: var(--border-brand);
  --sketch-fill: var(--border-brand);
}
```

`--sketch-fill`, `--sketch-stroke`, `--sketch-hatch-color` and `--sketch-radius`
name the fill, the outline, the hatching ink and the corners for one element and
everything inside it. Since the layer blanks the real background, an element
whose fill matters under Sketch mode should name it here as well as paint it.

Icons and inline SVG take the wobble directly, since a glyph has no box to
redraw. Body type is left alone: an icon is a shape and survives a wobble, a
paragraph is not. To keep the icons in a subtree crisp, set
`--sketch-icon-off: none` on its root. It inherits, so one declaration covers
everything under it.
