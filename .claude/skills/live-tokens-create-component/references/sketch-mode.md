# Joining the sketch layer

Sketch mode blanks each part's real background and border and repaints them onto
`::before`/`::after` through a noise field. It draws a fixed set of selectors —
the shipped components, plus four classes reserved for everyone else — so your
component is skipped until it opts in.

Put one class on the runtime component's root, chosen by **size, not by kind**:

| Class               | For                                                         |
|---------------------|-------------------------------------------------------------|
| `sketch-surface`    | A box. The default treatment.                                |
| `sketch-container`  | A large box. Tilts less, so the type inside stays readable.   |
| `sketch-chip`       | A small box. Finer fill mask, more rotation, less travel.     |
| `sketch-rule`       | A line rather than a box. No rotation, no rounded ends.       |

The class opts you in and nothing more: it names no colour, so the layer emits
no rule for it and whatever your component declares survives. State the same
tokens you already paint with.

```svelte
<div class="mywidget sketch-container {variant}">…</div>

<style>
  .mywidget {
    background: var(--mywidget-surface);
    border: var(--mywidget-border-width) solid var(--mywidget-border);
    border-radius: var(--mywidget-radius);

    /* The layer hides the two above; these are what it draws instead. */
    --sketch-fill: var(--mywidget-surface);
    --sketch-stroke: var(--mywidget-border);
    --sketch-hatch-color: var(--mywidget-border);
    --sketch-radius: var(--mywidget-radius);
    --sketch-shadow: var(--mywidget-shadow);
  }
</style>
```

Rules that bite:

- **Name the colours, don't inherit them.** Custom properties inherit, so a part
  that states nothing is drawn with its *ancestor's* fill — a badge inside a
  hatched card stripes itself in the card's ink.
- **Variants and states each restate what they change.** A variant rebinds
  `--sketch-fill` alongside its own surface; a hover rebinds `--sketch-stroke`
  beside `--sketch-hover-border`. Nothing competes with you for the value, so a
  plain `.mywidget:hover { --sketch-stroke: … }` is the whole mechanism. Pair
  every `:hover` with `.force-hover`, as elsewhere.
- **A gradient is a valid fill.** The shorthand's last layer takes a colour or an
  image, so `--sketch-fill` accepts either.
- **Never reach for a shipped part's selector** (`.card`, `.panel`) to get drawn.
  It works, but it hands your component that part's colours and its damping, and
  it is package-internal — the reserved classes are the contract.

## Media inside your component

A drawn part's `overflow` is forced visible so the fill and outline can travel
past the box. A background that bleeds is the effect working; an image that
bleeds is not, since it keeps square corners while the part around it turns.
Media running to your component's edge has to carry the corners itself:

```css
.mywidget-cover {
  overflow: hidden;
  border-top-left-radius: var(--sketch-radius, var(--mywidget-radius));
  border-top-right-radius: var(--sketch-radius, var(--mywidget-radius));
}
```

`--sketch-radius` is the radius the layer drew and it inherits, so the fallback
covers the effect being off.
