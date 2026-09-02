# Joining the sketch layer

Sketch mode blanks each part's real background and border and repaints them onto
`::before`/`::after` through a shared noise field. It draws a fixed set of
selectors: the shipped components, plus four classes reserved for everyone else.
Your component is skipped until it opts in, so it stays crisp while the page
around it goes hand-drawn.

The whole contract is CSS. There is nothing to import and no function to call:
the layer exports no runtime API, and a component joins it by carrying a class
and naming five custom properties.

## What the layer takes over

An opted-in element is no longer painting itself. On every drawn part the layer
forces:

| It forces                                    | So you must                                              |
|----------------------------------------------|----------------------------------------------------------|
| `background: transparent !important`          | Name the fill again as `--sketch-fill`                    |
| `border-color: transparent !important`        | Name the outline again as `--sketch-stroke`               |
| `box-shadow: none !important`                 | Name the shadow again as `--sketch-shadow`                |
| `overflow: visible !important`                | Never put the class on a box whose clip carries meaning   |
| `position: relative`                          | Never put the class on an absolutely-positioned root      |
| `z-index: 0`                                  | Expect a new stacking context on that element             |
| `::before` (the fill), `::after` (the stroke) | Never own either pseudo-element on that element           |

`::after` survives on `sketch-rule` alone, which draws no outline. `::before` is
claimed on all four.

## Opting in

Put one class on the runtime component's root, chosen by **size, not by kind**.
A card and a modal are both containers; a badge and a pill are both chips.

| Class               | For                                                         |
|---------------------|-------------------------------------------------------------|
| `sketch-surface`    | A box. The default treatment.                                |
| `sketch-container`  | A large box. Tilts less, so the type inside stays readable.   |
| `sketch-chip`       | A small box. Finer fill mask, more rotation, less travel.     |
| `sketch-rule`       | A line rather than a box. No rotation, no rounded ends.       |

The class opts you in and nothing more. It names no colour, so the layer emits
no rule for it and whatever your component declares survives.

```svelte
<div class="mywidget sketch-container {variant}">…</div>

<style>
  .mywidget {
    background: var(--mywidget-surface);
    border: var(--mywidget-border-width) solid var(--mywidget-border);
    border-radius: var(--mywidget-radius);
    box-shadow: var(--mywidget-shadow);

    /* The layer hides all four above. These are what it draws instead. */
    --sketch-fill: var(--mywidget-surface);
    --sketch-stroke: var(--mywidget-border);
    --sketch-hatch-color: var(--mywidget-border);
    --sketch-radius: var(--mywidget-radius);
    --sketch-shadow: var(--mywidget-shadow);
  }
</style>
```

State all five. `--sketch-radius` is registered as an inheriting `<length>`, and
the other four inherit as ordinary custom properties, so a part that states
nothing is drawn with its **ancestor's** value: a badge inside a hatched card
stripes itself in the card's ink, and a square header inside a rounded card
picks up the card's corners.

## Variants, states and inner parts

Nothing competes with you for these values, so every case is one more
declaration at the specificity you already use.

```css
.mywidget.danger      { --sketch-fill: var(--mywidget-danger-surface); }
.mywidget:hover,
.mywidget.force-hover { --sketch-stroke: var(--mywidget-hover-border); }
```

Pair every `:hover` with `.force-hover`, as elsewhere: that is the editor's
preview of the hover state, and a hover the sketch layer cannot paint reads as
no hover at all once the real background is transparent.

An inner part that carries its own surface (a header strip, a footer) takes its
own class and its own five values. The class is easy to forget, because the part
already has its own values and looks finished without it — a part carrying only
the values is left crisp, and reads as a hard-edged rectangle dropped inside a
drawn box. No checker sees it. Where such a part draws no outline, bind the
hatch ink to the ink its **parent** is outlined in, so the component reads as one
drawing rather than a shaded panel dropped into a box:

```svelte
<span class="mywidget-header sketch-chip">{label}</span>
```

```css
.mywidget-header {
  --sketch-fill: var(--mywidget-header-surface);
  --sketch-stroke: transparent;
  --sketch-hatch-color: var(--mywidget-border);
  --sketch-radius: 0px;
}
```

A part with a visible stroke needs no `--sketch-hatch-color`; it falls back to
the stroke and follows it into hover. A part with no fill wants none, because
there is no surface there to shade.

A gradient is a valid fill. The `background` shorthand's last layer takes a
colour or an image, so `--sketch-fill` accepts either.

## Where the class does not go

- **A positioned root.** The layer forces `position: relative` on parts that sit
  in flow, which drops an absolutely or fixed-positioned element back to its
  flow position. Put the class on an inner box instead.
- **A box that clips something real.** `overflow` is forced visible so the ink
  can travel past the border box, and there is no consumer opt-out. A scroller,
  a fill bar held to its track, or a picture held to its frame keeps its clip by
  keeping the class off that element and carrying it on a wrapper.
- **An element that owns `::before` or `::after`.** The layer claims both. A
  shimmer, a caret or a decorative arrow on the opted-in element is gone.
- **A shipped part's selector** (`.card`, `.panel`). Borrowing one to get drawn
  works, but it hands your component that part's colours and its damping, and it
  is package-internal. The reserved classes are the contract.

## Rules, which are not boxes

A `border` cannot be displaced: the effect moves boxes, and a border is not one.
Make the rule an element, give it `sketch-rule`, and name its ink as the fill.

```svelte
<span class="mywidget-rule sketch-rule" aria-hidden="true"></span>
```
```css
.mywidget-rule {
  height: var(--border-width-2);
  background: var(--mywidget-divider);
  --sketch-fill: var(--mywidget-divider);
}
```

## Media inside your component

A drawn part's `overflow` is visible so the fill and outline can travel past the
box. A background that bleeds is the effect working. An image that bleeds is
not, since it keeps square corners while the part around it turns. Media running
to your component's edge has to carry the corners itself:

```css
.mywidget-cover {
  overflow: hidden;
  border-top-left-radius: var(--sketch-radius, var(--mywidget-radius));
  border-top-right-radius: var(--sketch-radius, var(--mywidget-radius));
}
```

`--sketch-radius` is the radius the layer drew and it inherits, so the fallback
covers the effect being off. Corner spread is per-corner and per-instance, so at
high spread the crop is the mean rather than an exact trace of the drawn edge.

## Icons and SVG

Icons and inline SVG take the wobble directly, since a glyph has no box to
redraw. Body type is left alone deliberately: an icon is a shape and survives a
wobble, a paragraph is not. You opt into none of this; it applies to every
`[class*="fa-"]` and every `svg` under the scope.

`--sketch-icon-off` names what a subtree's glyphs are drawn with instead. It
inherits, so one declaration covers everything under it:

```css
/* Crisp. Chrome, a logo, anything that has to stay exact. */
.mywidget-toolbar { --sketch-icon-off: none; }

/* Drawn back rather than off, at a third of the travel. Small artwork, and
   type set as an SVG, which the layer reads as one large glyph. */
.mywidget-mark { --sketch-icon-off: var(--sketch-icon-soft); }
```

Travel is stated in px against a glyph whose size the layer cannot know, so the
dial that suits a card's worth of artwork tears a 16px icon apart. Reach for the
soft bank before reaching for `none`.

## First-party components

A component authored inside the package does not use the reserved classes. Add a
`PartSpec` row to `PART_SPECS` in `src/editor/core/sketch/sketchLayer.ts`
instead, which is keyed to the component's own token stem and gets the shipped
damping. `sketchPartTokens.test.ts` then holds you to it: every colour the layer
paints must be one the component itself assigns to that same element, checked
against the compiled `<style>` block.

## Verify

Switch Sketch mode on from the editor's **Sketchstyle** view, then check the
component in place:

- [ ] Drawn, not crisp, in every variant.
- [ ] Wearing its own colours, not its parent's, including inner parts.
- [ ] Hover repaints. The wobble holds still while it does.
- [ ] Hatched fill uses ink that belongs to the component.
- [ ] Media at the component's edge turns with the drawn corners.
- [ ] Nothing that has to stay exact is torn: icons, clipped content, overlays.
- [ ] Switch it off. Every trace is gone and the component is unchanged.
