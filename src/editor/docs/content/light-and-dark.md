# Light and dark

Some things on a page cannot be written as a token. A wordmark drawn in white
disappears on a pale theme. Ink that multiplies onto paper vanishes on a dark
one. A photograph behind a headline is dark no matter what the palette says.

Each of those needs the same fact first: which way does the surface behind this
thing lean? One attribute carries it.

## The attribute

`data-backdrop` is either `light` or `dark`, and it does two things at once: it
selects, so a rule can key on it, and it sets `color-scheme`, so every
`light-dark()` under it resolves the half that reads.

```css
.title {
  color: light-dark(var(--color-black), var(--color-white));
}
```

That line is right on both sides of the theme, and it is right inside a dark
band on a pale page, because the nearest `color-scheme` wins.

## Stating it

Put it in the markup when the surface knows its own tone — a hero over a
photograph, a plate that stays pale in every theme:

```svelte
<div class="hero-panel" data-backdrop="dark">
```

A stated tone beats any measurement, and it inherits, so everything inside the
panel resolves against it.

## Measuring it

Where the tone is a property of the theme rather than of the markup, let it be
measured:

```svelte
<script>
  import { backdrop } from '@motion-proto/live-tokens/backdrop';
</script>

<section use:backdrop>
```

The action reads whatever actually paints behind the element — the nearest
ancestor with an opaque fill, averaged across its gradient stops, falling back
to the theme's `--page-bg` — and stamps the answer. It re-reads when the theme
changes, which the editor does by rewriting custom properties with no reload,
so the stamp follows a live edit.

The page itself is stamped for you: the build bakes the production theme's
polarity into `tokens.generated.css`, so the first paint is already right, and
`syncDocumentBackdrop()` keeps `<html>` current as themes switch.

```ts
import { syncDocumentBackdrop } from '@motion-proto/live-tokens/backdrop';

syncDocumentBackdrop();
```

## Reading it from JavaScript

Anything that paints outside CSS — a canvas, a WebGL uniform, an `<img>` that
comes in two versions — asks the same question through the same module:

```ts
import { isLightBackdrop, watchBackdrop, cssColorToHex } from '@motion-proto/live-tokens/backdrop';

const stop = watchBackdrop(logoEl, {
  stamp: false,
  onChange: (polarity) => (src = polarity === 'light' ? darkMark : lightMark),
});
```

`isLightBackdrop(el)` answers once. `watchBackdrop` keeps answering and returns
a stop function. `cssColorToHex` resolves any CSS colour — including the
`oklch()` a token holds — to a hex a non-CSS consumer can take.

## What it does not do

Polarity is a property of a surface, not of a component, so nothing is stamped
for you below `<html>`: a section that needs an answer either states one or asks
for one. And a measurement reads the paint at the moment it runs — an element
that scrolls from a pale band onto a dark one keeps the answer it was given.
State the tone on each band instead.
