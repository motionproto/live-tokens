# Sketch mode

Sketch mode redraws your whole page as if it had been drawn by hand. Every
component keeps its own colours, spacing and corners; what changes is the line
they are drawn with.

It is an effect layer, not a set of token values. It never touches a token
itself, so turning it off returns every component to exactly what its tokens
already say.

Open the **Sketchstyle** view in the editor and switch **Sketch mode** on. The effect
applies to the page behind the editor as well as to the preview, so what you see
in context is what it does.

## What it draws

Each component's fill and outline are repainted from the tokens that component
already owns. The real background and border are hidden behind them, then both
are pushed around one shared field of noise. Because every component samples the
same field, the whole page reads as one drawing rather than as a set of
separately wobbled boxes.

## The sketchstyles

Seven looks ship with the package, and each is a complete set of dials rather
than just a name:

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

Pick one, then move whatever you like. **Save as sketchstyle…** keeps your
dials under a name of your own, alongside the shipped seven, as a file under
`src/live-tokens/data/sketch-styles/`. That is a different gesture from
saving a theme; see "Where the settings live" below.

## The dials

- **Border.** How far the outline travels and how long its wave is, then its
  width, ink, pressure and pooling. A second pass either copies the first line a
  few pixels off or runs it through the pen again on its own seed.
- **Fill.** Solid or hatched, how far the fill's edge travels, and how far each
  instance is offset, rotated and scaled from its neighbours. **Ink coverage**
  thins the fill with a field of blotches: set their size and how many levels of
  detail, then work the field as a levels control. The field always runs black
  to white whatever the noise underneath. Steps flattens it into tones, and
  Output squeezes the whole of it into the range the ink covers, from how pale
  it gets at its thinnest to how dense at its fullest. Menus and tooltips are
  drawn solid whatever the coverage dials say: they float over the page, and a
  fill worn through in patches lets the page show through them.
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

## Where the settings live

The sketch layer is part of the theme, the same way colors and type are.
**Save** in the Theme panel folds your dials into the open theme; **Load**
applies whatever a theme carries, and turns the effect off for a theme that
carries none.

Until you save, the dials sit in your browser only. The Theme panel calls
that state off the theme, the same word it uses for an unsaved component
change. The built-in **Motion Proto** theme is read-only, so Save
is disabled there; use **Save As** to fold the dials into a theme of your
own.

**Save as sketchstyle…** in the **Sketchstyle** view is a different gesture. It
writes a named sketchstyle to `src/live-tokens/data/sketch-styles/`, a look you
can pick from any theme. It never touches the open theme, and it never marks
the look off the theme.

## Shipping the layer

The dev server reads the open theme and paints whatever it carries. A built site
has no server to ask, so it hands the field over itself:

```ts
import { seedSketchFromTheme } from '@motion-proto/live-tokens/sketch';
import theme from './live-tokens/data/themes/sketchy.json';

seedSketchFromTheme(theme.sketchStyle);
await bootLiveTokens(App, '#app');
```

Call it before mounting, so the look is up on the first frame. Pass the field
raw. A theme written against older dial names is carried forward on the way in,
the same reconciliation the dev server runs on every theme it reads.

Nothing is baked. `tokens.generated.css` still holds token values only, and the
layer stays JavaScript the page runs, because it builds an SVG filter bank
rather than a set of custom properties.

A visitor who has picked a look of their own keeps it, None included. The theme
seeds a browser that has decided nothing and never overwrites one that has, so
calling this on every boot is safe.

If your site offers a sketch picker, `themeSketchLook` is the theme's own look
as one more row. It is null when the theme carries none, and null when what it
carries is one of the shipped seven, since that row already names it. Give the
row `setSketch(look.id)` like any other, and a visitor who wanders off the
theme's look can come back to it.

## Drawing your own elements

The layer draws a fixed set of parts: the shipped components, and four classes
it reserves for you. Nothing else is touched, so a page element or a
consumer-authored component is left crisp until it carries one of them.

| Class               | For                                                       |
|---------------------|-----------------------------------------------------------|
| `sketch-surface`    | A box. The default treatment.                              |
| `sketch-container`  | A large box. Tilts less, so the type inside stays readable. |
| `sketch-chip`       | A small box. Finer fill mask, more rotation, less travel.   |
| `sketch-rule`       | A line rather than a box. No rotation, no rounded ends.     |

Pick by size, not by kind: a card and a modal both take `sketch-container`, a
badge and a pill both take `sketch-chip`.

The class opts the element in; it names no colours, so the element states its
own. `--sketch-fill`, `--sketch-stroke`, `--sketch-hatch-color`,
`--sketch-radius` and `--sketch-shadow` name the fill, the outline, the hatching
ink, the corners and the shadow for one element and everything inside it. The
layer blanks the real background and border, so an element whose fill matters
under Sketch mode has to name it here as well as paint it.

The layer also paints on the element's `::before` and `::after`, forces its
`overflow` visible, and gives it a stacking context of its own. Keep the class
off anything that owns a pseudo-element, clips its content, or is positioned
absolutely, and put it on a wrapper instead.

```css
.my-callout {
  background: var(--surface-brand-lowest);
  border: var(--border-width-1) solid var(--border-brand);
  border-radius: var(--radius-xl);

  --sketch-fill: var(--surface-brand-lowest);
  --sketch-stroke: var(--border-brand);
  --sketch-radius: var(--radius-xl);
}
```

A gradient is a valid fill: the shorthand's last layer takes a colour or an
image, so `--sketch-fill` accepts either. States work the same way, since
nothing is competing with you for the value:

```css
.my-callout:hover { --sketch-stroke: var(--border-brand-strong); }
```

## Images inside a drawn part

A drawn part's `overflow` is forced visible, because the fill and outline are
painted on pseudo-elements that travel past the box and would otherwise be cut
off at its edge. A background that bleeds is the effect working. An image that
bleeds is not: it keeps its square corners while the card around it turns.

Media that runs to a part's edge therefore has to carry that part's corners
itself. `--sketch-radius` is the radius the layer drew, and it inherits, so a
child can read it and fall back to its own value when Sketch mode is off:

```css
.cover {
  overflow: hidden;
  border-top-left-radius: var(--sketch-radius, var(--card-default-radius));
  border-top-right-radius: var(--sketch-radius, var(--card-default-radius));
}
```

Corner spread is per-corner and per-instance, so at high spread the crop is the
mean rather than an exact trace of the drawn edge.

A rule made from a `border` is not a box and cannot be displaced. Make it an
element, give it `sketch-rule`, and name its ink:

```html
<div class="rule sketch-rule"></div>
```
```css
.rule {
  height: var(--border-width-2);
  background: var(--border-brand);
  --sketch-fill: var(--border-brand);
}
```

Icons and inline SVG take the wobble directly, since a glyph has no box to
redraw. Body type is left alone: an icon is a shape and survives a wobble, a
paragraph is not.

`--sketch-icon-off` names what a subtree's glyphs are drawn with instead. It
inherits, so one declaration covers everything under it, and it takes the ink
mask off as well as the wobble:

```css
/* Crisp. Chrome, a logo, anything that has to stay exact. */
.app-bar { --sketch-icon-off: none; }

/* Drawn back rather than off, at a third of the travel. Small artwork, and
   type set as an SVG, which the layer reads as one large glyph. */
.wordmark { --sketch-icon-off: var(--sketch-icon-soft); }
```

The **Blotch size** dial under Icons and SVG is a share of the glyph rather than
a px size, because no px size is right for both a 16px icon and a page-wide
drawing. At 100% every glyph gets one period of the field across it whatever its
size. Below that the field repeats inside the glyph and the blotches get finer.
Above it a glyph reads part of one blotch, so the mask thins the whole glyph
unevenly instead of breaking it up. The fill's blotches stay in px, since a
component does have a size to state one against.
