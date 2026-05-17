<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount, tick } from 'svelte';

  interface Props {
    title: string;
    description?: string | undefined;
    variant?: 'canvas' | 'neutral' | 'alternate' | 'primary' | 'accent' | 'special';
  }

  let { title, description = undefined, variant = 'canvas' }: Props = $props();

  let svgEl: SVGSVGElement | undefined = $state();
  let svgTextEl: SVGTextElement | undefined = $state();
  let svgW = $state(0);
  let svgH = $state(0);
  let svgX = $state(0);
  let svgY = $state(0);

  // feMorphology radius and feFlood flood-color are non-presentation attributes:
  // they can't read CSS vars. We read the resolved values off the SVG element
  // and push them onto the filter primitives, refreshing whenever the editor
  // mutates inline CSS vars on documentElement. Reading the variant-scoped
  // internal `--_divider-title-*` vars (set by the .variant-{v} class) keeps
  // this independent of the variant prop.
  let outlineRadius = $state('0');
  let outlineColor = $state('#000');
  // Stable per-instance id so multiple SectionDividers on the same page each
  // bind their <text> to their own filter.
  const filterId = `sd-outline-${Math.random().toString(36).slice(2, 10)}`;

  function syncFilter(): void {
    if (!svgEl) return;
    const cs = getComputedStyle(svgEl);
    const wPx = parseFloat(cs.getPropertyValue('--_divider-title-border-width'));
    // SVG stroke extends `width/2` on each side; feMorphology radius dilates
    // by `radius` outward — so radius = width/2 gives the same visible outline.
    outlineRadius = String(Number.isFinite(wPx) ? wPx / 2 : 0);
    const c = cs.getPropertyValue('--_divider-title-stroke-color').trim();
    outlineColor = c || '#000';
  }

  function measure(): void {
    if (!svgTextEl) return;
    const bb = svgTextEl.getBBox();
    // Size the SVG to the glyph bbox exactly and map that bbox onto the
    // canvas via viewBox. Otherwise svgH = bb.y + bb.height carries any
    // empty band between y=0 and the glyph top (and any extra at the
    // bottom of the bbox), leaving the title vertically unbalanced inside
    // the container's symmetric top/bottom padding.
    svgX = bb.x;
    svgY = bb.y;
    svgW = Math.ceil(bb.width);
    svgH = Math.ceil(bb.height);
  }

  run(() => {
    if (title) {
      tick().then(() => { measure(); syncFilter(); });
    }
  });

  onMount(() => {
    measure();
    syncFilter();
    // CSS-var edits (font-size/family/weight) change the rendered bbox but
    // never change the `title` prop — so re-measure on every style mutation
    // alongside the filter sync.
    const obs = new MutationObserver(() => { measure(); syncFilter(); });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => obs.disconnect();
  });
</script>

<div class="section-divider variant-{variant}">
  <svg
    bind:this={svgEl}
    class="divider-label"
    width={svgW || undefined}
    height={svgH || undefined}
    viewBox={svgW && svgH ? `${svgX} ${svgY} ${svgW} ${svgH}` : undefined}
    aria-label={title}
    role="img"
  >
    <defs>
      <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
        <feMorphology in="SourceAlpha" operator="dilate" radius={outlineRadius} result="dilated" />
        <feFlood flood-color={outlineColor} result="color" />
        <feComposite in="color" in2="dilated" operator="in" result="outline" />
        <feComposite in="SourceGraphic" in2="outline" operator="over" />
      </filter>
    </defs>
    <text
      bind:this={svgTextEl}
      x="0"
      y="0"
      dominant-baseline="hanging"
      filter="url(#{filterId})"
    >{title}</text>
  </svg>
  {#if description}
    <p class="divider-description">{description}</p>
  {/if}
</div>

<style>
  /* Per-variant slots. Properties the editor links across variants
     (typography, padding, outline, radius) ship with identical defaults so
     they read as one linked group out of the box; gradient angle, stop
     colors, and stop positions are authored per variant and are not linked. */
  :global(:root) {
    /* Canvas */
    --sectiondivider-canvas-padding: var(--space-16);
    --sectiondivider-canvas-title: var(--text-primary);
    --sectiondivider-canvas-title-font-family: var(--font-display);
    --sectiondivider-canvas-title-font-size: var(--font-size-5xl);
    --sectiondivider-canvas-title-font-weight: var(--font-weight-normal);
    --sectiondivider-canvas-title-line-height: var(--line-height-xs);
    --sectiondivider-canvas-title-border-width: var(--border-width-4);
    --sectiondivider-canvas-title-stroke-color: var(--surface-canvas-lowest);
    /* Title stroke defaults intentionally diverge per variant — the property
       is linkable but ships unlinked, with each variant matching its own
       surface-lowest so stroke + gradient read as one family. */
    --sectiondivider-canvas-description: var(--text-secondary);
    --sectiondivider-canvas-description-font-family: var(--font-sans);
    --sectiondivider-canvas-description-font-size: var(--font-size-md);
    --sectiondivider-canvas-description-font-weight: var(--font-weight-normal);
    --sectiondivider-canvas-description-line-height: var(--line-height-md);
    --sectiondivider-canvas-gradient-angle: var(--gradient-angle-diagonal);
    --sectiondivider-canvas-gradient-stop-1-color: var(--surface-canvas-highest);
    --sectiondivider-canvas-gradient-stop-1-position: var(--gradient-stop-start);
    --sectiondivider-canvas-gradient-stop-2-color: var(--surface-canvas-higher);
    --sectiondivider-canvas-gradient-stop-2-position: var(--gradient-stop-mid);
    --sectiondivider-canvas-gradient-stop-3-color: var(--surface-canvas);
    --sectiondivider-canvas-gradient-stop-3-position: var(--gradient-stop-end);
    --sectiondivider-canvas-radius: var(--radius-lg);
    --sectiondivider-canvas-border: var(--color-transparent);
    --sectiondivider-canvas-border-width: var(--border-width-0);
    --sectiondivider-canvas-shadow: var(--shadow-none);

    /* Neutral */
    --sectiondivider-neutral-padding: var(--space-16);
    --sectiondivider-neutral-title: var(--text-primary);
    --sectiondivider-neutral-title-font-family: var(--font-display);
    --sectiondivider-neutral-title-font-size: var(--font-size-5xl);
    --sectiondivider-neutral-title-font-weight: var(--font-weight-normal);
    --sectiondivider-neutral-title-line-height: var(--line-height-xs);
    --sectiondivider-neutral-title-border-width: var(--border-width-4);
    --sectiondivider-neutral-title-stroke-color: var(--surface-neutral-lowest);
    --sectiondivider-neutral-description: var(--text-secondary);
    --sectiondivider-neutral-description-font-family: var(--font-sans);
    --sectiondivider-neutral-description-font-size: var(--font-size-md);
    --sectiondivider-neutral-description-font-weight: var(--font-weight-normal);
    --sectiondivider-neutral-description-line-height: var(--line-height-md);
    --sectiondivider-neutral-gradient-angle: var(--gradient-angle-diagonal);
    --sectiondivider-neutral-gradient-stop-1-color: var(--surface-neutral-highest);
    --sectiondivider-neutral-gradient-stop-1-position: var(--gradient-stop-start);
    --sectiondivider-neutral-gradient-stop-2-color: var(--surface-neutral-higher);
    --sectiondivider-neutral-gradient-stop-2-position: var(--gradient-stop-mid);
    --sectiondivider-neutral-gradient-stop-3-color: var(--surface-neutral);
    --sectiondivider-neutral-gradient-stop-3-position: var(--gradient-stop-end);
    --sectiondivider-neutral-radius: var(--radius-lg);
    --sectiondivider-neutral-border: var(--color-transparent);
    --sectiondivider-neutral-border-width: var(--border-width-0);
    --sectiondivider-neutral-shadow: var(--shadow-none);

    /* Alternate */
    --sectiondivider-alternate-padding: var(--space-16);
    --sectiondivider-alternate-title: var(--text-primary);
    --sectiondivider-alternate-title-font-family: var(--font-display);
    --sectiondivider-alternate-title-font-size: var(--font-size-5xl);
    --sectiondivider-alternate-title-font-weight: var(--font-weight-normal);
    --sectiondivider-alternate-title-line-height: var(--line-height-xs);
    --sectiondivider-alternate-title-border-width: var(--border-width-4);
    --sectiondivider-alternate-title-stroke-color: var(--surface-alternate-lowest);
    --sectiondivider-alternate-description: var(--text-secondary);
    --sectiondivider-alternate-description-font-family: var(--font-sans);
    --sectiondivider-alternate-description-font-size: var(--font-size-md);
    --sectiondivider-alternate-description-font-weight: var(--font-weight-normal);
    --sectiondivider-alternate-description-line-height: var(--line-height-md);
    --sectiondivider-alternate-gradient-angle: var(--gradient-angle-diagonal);
    --sectiondivider-alternate-gradient-stop-1-color: var(--surface-alternate-highest);
    --sectiondivider-alternate-gradient-stop-1-position: var(--gradient-stop-start);
    --sectiondivider-alternate-gradient-stop-2-color: var(--surface-alternate-higher);
    --sectiondivider-alternate-gradient-stop-2-position: var(--gradient-stop-mid);
    --sectiondivider-alternate-gradient-stop-3-color: var(--surface-alternate);
    --sectiondivider-alternate-gradient-stop-3-position: var(--gradient-stop-end);
    --sectiondivider-alternate-radius: var(--radius-lg);
    --sectiondivider-alternate-border: var(--color-transparent);
    --sectiondivider-alternate-border-width: var(--border-width-0);
    --sectiondivider-alternate-shadow: var(--shadow-none);

    /* Primary */
    --sectiondivider-primary-padding: var(--space-16);
    --sectiondivider-primary-title: var(--text-primary);
    --sectiondivider-primary-title-font-family: var(--font-display);
    --sectiondivider-primary-title-font-size: var(--font-size-5xl);
    --sectiondivider-primary-title-font-weight: var(--font-weight-normal);
    --sectiondivider-primary-title-line-height: var(--line-height-xs);
    --sectiondivider-primary-title-border-width: var(--border-width-4);
    --sectiondivider-primary-title-stroke-color: var(--surface-brand-lowest);
    --sectiondivider-primary-description: var(--text-secondary);
    --sectiondivider-primary-description-font-family: var(--font-sans);
    --sectiondivider-primary-description-font-size: var(--font-size-md);
    --sectiondivider-primary-description-font-weight: var(--font-weight-normal);
    --sectiondivider-primary-description-line-height: var(--line-height-md);
    --sectiondivider-primary-gradient-angle: var(--gradient-angle-diagonal);
    --sectiondivider-primary-gradient-stop-1-color: var(--surface-brand-highest);
    --sectiondivider-primary-gradient-stop-1-position: var(--gradient-stop-start);
    --sectiondivider-primary-gradient-stop-2-color: var(--surface-brand-higher);
    --sectiondivider-primary-gradient-stop-2-position: var(--gradient-stop-mid);
    --sectiondivider-primary-gradient-stop-3-color: var(--surface-brand);
    --sectiondivider-primary-gradient-stop-3-position: var(--gradient-stop-end);
    --sectiondivider-primary-radius: var(--radius-lg);
    --sectiondivider-primary-border: var(--color-transparent);
    --sectiondivider-primary-border-width: var(--border-width-0);
    --sectiondivider-primary-shadow: var(--shadow-none);

    /* Accent */
    --sectiondivider-accent-padding: var(--space-16);
    --sectiondivider-accent-title: var(--text-primary);
    --sectiondivider-accent-title-font-family: var(--font-display);
    --sectiondivider-accent-title-font-size: var(--font-size-5xl);
    --sectiondivider-accent-title-font-weight: var(--font-weight-normal);
    --sectiondivider-accent-title-line-height: var(--line-height-xs);
    --sectiondivider-accent-title-border-width: var(--border-width-4);
    --sectiondivider-accent-title-stroke-color: var(--surface-accent-lowest);
    --sectiondivider-accent-description: var(--text-secondary);
    --sectiondivider-accent-description-font-family: var(--font-sans);
    --sectiondivider-accent-description-font-size: var(--font-size-md);
    --sectiondivider-accent-description-font-weight: var(--font-weight-normal);
    --sectiondivider-accent-description-line-height: var(--line-height-md);
    --sectiondivider-accent-gradient-angle: var(--gradient-angle-diagonal);
    --sectiondivider-accent-gradient-stop-1-color: var(--surface-accent-highest);
    --sectiondivider-accent-gradient-stop-1-position: var(--gradient-stop-start);
    --sectiondivider-accent-gradient-stop-2-color: var(--surface-accent-higher);
    --sectiondivider-accent-gradient-stop-2-position: var(--gradient-stop-mid);
    --sectiondivider-accent-gradient-stop-3-color: var(--surface-accent);
    --sectiondivider-accent-gradient-stop-3-position: var(--gradient-stop-end);
    --sectiondivider-accent-radius: var(--radius-lg);
    --sectiondivider-accent-border: var(--color-transparent);
    --sectiondivider-accent-border-width: var(--border-width-0);
    --sectiondivider-accent-shadow: var(--shadow-none);

    /* Special */
    --sectiondivider-special-padding: var(--space-16);
    --sectiondivider-special-title: var(--text-primary);
    --sectiondivider-special-title-font-family: var(--font-display);
    --sectiondivider-special-title-font-size: var(--font-size-5xl);
    --sectiondivider-special-title-font-weight: var(--font-weight-normal);
    --sectiondivider-special-title-line-height: var(--line-height-xs);
    --sectiondivider-special-title-border-width: var(--border-width-4);
    --sectiondivider-special-title-stroke-color: var(--surface-special-lowest);
    --sectiondivider-special-description: var(--text-secondary);
    --sectiondivider-special-description-font-family: var(--font-sans);
    --sectiondivider-special-description-font-size: var(--font-size-md);
    --sectiondivider-special-description-font-weight: var(--font-weight-normal);
    --sectiondivider-special-description-line-height: var(--line-height-md);
    --sectiondivider-special-gradient-angle: var(--gradient-angle-diagonal);
    --sectiondivider-special-gradient-stop-1-color: var(--surface-special-highest);
    --sectiondivider-special-gradient-stop-1-position: var(--gradient-stop-start);
    --sectiondivider-special-gradient-stop-2-color: var(--surface-special-higher);
    --sectiondivider-special-gradient-stop-2-position: var(--gradient-stop-mid);
    --sectiondivider-special-gradient-stop-3-color: var(--surface-special);
    --sectiondivider-special-gradient-stop-3-position: var(--gradient-stop-end);
    --sectiondivider-special-radius: var(--radius-lg);
    --sectiondivider-special-border: var(--color-transparent);
    --sectiondivider-special-border-width: var(--border-width-0);
    --sectiondivider-special-shadow: var(--shadow-none);
  }

  .section-divider {
    margin: var(--space-24) 0;
    padding: var(--_divider-padding) calc(var(--_divider-padding) * 1.5);
    border-radius: var(--_divider-radius);
    border: var(--_divider-border-width) solid var(--_divider-border);
    box-shadow: var(--_divider-shadow);
    background: linear-gradient(
      var(--_divider-gradient-angle),
      var(--_divider-stop-1-color) var(--_divider-stop-1-position),
      var(--_divider-stop-2-color) var(--_divider-stop-2-position),
      var(--_divider-stop-3-color) var(--_divider-stop-3-position)
    );
  }

  /* Each variant class collapses its per-variant slots onto one set of
     internal `--_divider-*` vars; the rest of the styles only consume those,
     so adding a variant means adding a class and a :root block. */
  .variant-canvas {
    --_divider-padding: var(--sectiondivider-canvas-padding);
    --_divider-radius: var(--sectiondivider-canvas-radius);
    --_divider-border: var(--sectiondivider-canvas-border);
    --_divider-border-width: var(--sectiondivider-canvas-border-width);
    --_divider-shadow: var(--sectiondivider-canvas-shadow);
    --_divider-gradient-angle: var(--sectiondivider-canvas-gradient-angle);
    --_divider-stop-1-color: var(--sectiondivider-canvas-gradient-stop-1-color);
    --_divider-stop-1-position: var(--sectiondivider-canvas-gradient-stop-1-position);
    --_divider-stop-2-color: var(--sectiondivider-canvas-gradient-stop-2-color);
    --_divider-stop-2-position: var(--sectiondivider-canvas-gradient-stop-2-position);
    --_divider-stop-3-color: var(--sectiondivider-canvas-gradient-stop-3-color);
    --_divider-stop-3-position: var(--sectiondivider-canvas-gradient-stop-3-position);
    --_divider-title: var(--sectiondivider-canvas-title);
    --_divider-title-font-family: var(--sectiondivider-canvas-title-font-family);
    --_divider-title-font-size: var(--sectiondivider-canvas-title-font-size);
    --_divider-title-font-weight: var(--sectiondivider-canvas-title-font-weight);
    --_divider-title-line-height: var(--sectiondivider-canvas-title-line-height);
    --_divider-title-border-width: var(--sectiondivider-canvas-title-border-width);
    --_divider-title-stroke-color: var(--sectiondivider-canvas-title-stroke-color);
    --_divider-description: var(--sectiondivider-canvas-description);
    --_divider-description-font-family: var(--sectiondivider-canvas-description-font-family);
    --_divider-description-font-size: var(--sectiondivider-canvas-description-font-size);
    --_divider-description-font-weight: var(--sectiondivider-canvas-description-font-weight);
    --_divider-description-line-height: var(--sectiondivider-canvas-description-line-height);
  }

  .variant-neutral {
    --_divider-padding: var(--sectiondivider-neutral-padding);
    --_divider-radius: var(--sectiondivider-neutral-radius);
    --_divider-border: var(--sectiondivider-neutral-border);
    --_divider-border-width: var(--sectiondivider-neutral-border-width);
    --_divider-shadow: var(--sectiondivider-neutral-shadow);
    --_divider-gradient-angle: var(--sectiondivider-neutral-gradient-angle);
    --_divider-stop-1-color: var(--sectiondivider-neutral-gradient-stop-1-color);
    --_divider-stop-1-position: var(--sectiondivider-neutral-gradient-stop-1-position);
    --_divider-stop-2-color: var(--sectiondivider-neutral-gradient-stop-2-color);
    --_divider-stop-2-position: var(--sectiondivider-neutral-gradient-stop-2-position);
    --_divider-stop-3-color: var(--sectiondivider-neutral-gradient-stop-3-color);
    --_divider-stop-3-position: var(--sectiondivider-neutral-gradient-stop-3-position);
    --_divider-title: var(--sectiondivider-neutral-title);
    --_divider-title-font-family: var(--sectiondivider-neutral-title-font-family);
    --_divider-title-font-size: var(--sectiondivider-neutral-title-font-size);
    --_divider-title-font-weight: var(--sectiondivider-neutral-title-font-weight);
    --_divider-title-line-height: var(--sectiondivider-neutral-title-line-height);
    --_divider-title-border-width: var(--sectiondivider-neutral-title-border-width);
    --_divider-title-stroke-color: var(--sectiondivider-neutral-title-stroke-color);
    --_divider-description: var(--sectiondivider-neutral-description);
    --_divider-description-font-family: var(--sectiondivider-neutral-description-font-family);
    --_divider-description-font-size: var(--sectiondivider-neutral-description-font-size);
    --_divider-description-font-weight: var(--sectiondivider-neutral-description-font-weight);
    --_divider-description-line-height: var(--sectiondivider-neutral-description-line-height);
  }

  .variant-alternate {
    --_divider-padding: var(--sectiondivider-alternate-padding);
    --_divider-radius: var(--sectiondivider-alternate-radius);
    --_divider-border: var(--sectiondivider-alternate-border);
    --_divider-border-width: var(--sectiondivider-alternate-border-width);
    --_divider-shadow: var(--sectiondivider-alternate-shadow);
    --_divider-gradient-angle: var(--sectiondivider-alternate-gradient-angle);
    --_divider-stop-1-color: var(--sectiondivider-alternate-gradient-stop-1-color);
    --_divider-stop-1-position: var(--sectiondivider-alternate-gradient-stop-1-position);
    --_divider-stop-2-color: var(--sectiondivider-alternate-gradient-stop-2-color);
    --_divider-stop-2-position: var(--sectiondivider-alternate-gradient-stop-2-position);
    --_divider-stop-3-color: var(--sectiondivider-alternate-gradient-stop-3-color);
    --_divider-stop-3-position: var(--sectiondivider-alternate-gradient-stop-3-position);
    --_divider-title: var(--sectiondivider-alternate-title);
    --_divider-title-font-family: var(--sectiondivider-alternate-title-font-family);
    --_divider-title-font-size: var(--sectiondivider-alternate-title-font-size);
    --_divider-title-font-weight: var(--sectiondivider-alternate-title-font-weight);
    --_divider-title-line-height: var(--sectiondivider-alternate-title-line-height);
    --_divider-title-border-width: var(--sectiondivider-alternate-title-border-width);
    --_divider-title-stroke-color: var(--sectiondivider-alternate-title-stroke-color);
    --_divider-description: var(--sectiondivider-alternate-description);
    --_divider-description-font-family: var(--sectiondivider-alternate-description-font-family);
    --_divider-description-font-size: var(--sectiondivider-alternate-description-font-size);
    --_divider-description-font-weight: var(--sectiondivider-alternate-description-font-weight);
    --_divider-description-line-height: var(--sectiondivider-alternate-description-line-height);
  }

  .variant-primary {
    --_divider-padding: var(--sectiondivider-primary-padding);
    --_divider-radius: var(--sectiondivider-primary-radius);
    --_divider-border: var(--sectiondivider-primary-border);
    --_divider-border-width: var(--sectiondivider-primary-border-width);
    --_divider-shadow: var(--sectiondivider-primary-shadow);
    --_divider-gradient-angle: var(--sectiondivider-primary-gradient-angle);
    --_divider-stop-1-color: var(--sectiondivider-primary-gradient-stop-1-color);
    --_divider-stop-1-position: var(--sectiondivider-primary-gradient-stop-1-position);
    --_divider-stop-2-color: var(--sectiondivider-primary-gradient-stop-2-color);
    --_divider-stop-2-position: var(--sectiondivider-primary-gradient-stop-2-position);
    --_divider-stop-3-color: var(--sectiondivider-primary-gradient-stop-3-color);
    --_divider-stop-3-position: var(--sectiondivider-primary-gradient-stop-3-position);
    --_divider-title: var(--sectiondivider-primary-title);
    --_divider-title-font-family: var(--sectiondivider-primary-title-font-family);
    --_divider-title-font-size: var(--sectiondivider-primary-title-font-size);
    --_divider-title-font-weight: var(--sectiondivider-primary-title-font-weight);
    --_divider-title-line-height: var(--sectiondivider-primary-title-line-height);
    --_divider-title-border-width: var(--sectiondivider-primary-title-border-width);
    --_divider-title-stroke-color: var(--sectiondivider-primary-title-stroke-color);
    --_divider-description: var(--sectiondivider-primary-description);
    --_divider-description-font-family: var(--sectiondivider-primary-description-font-family);
    --_divider-description-font-size: var(--sectiondivider-primary-description-font-size);
    --_divider-description-font-weight: var(--sectiondivider-primary-description-font-weight);
    --_divider-description-line-height: var(--sectiondivider-primary-description-line-height);
  }

  .variant-accent {
    --_divider-padding: var(--sectiondivider-accent-padding);
    --_divider-radius: var(--sectiondivider-accent-radius);
    --_divider-border: var(--sectiondivider-accent-border);
    --_divider-border-width: var(--sectiondivider-accent-border-width);
    --_divider-shadow: var(--sectiondivider-accent-shadow);
    --_divider-gradient-angle: var(--sectiondivider-accent-gradient-angle);
    --_divider-stop-1-color: var(--sectiondivider-accent-gradient-stop-1-color);
    --_divider-stop-1-position: var(--sectiondivider-accent-gradient-stop-1-position);
    --_divider-stop-2-color: var(--sectiondivider-accent-gradient-stop-2-color);
    --_divider-stop-2-position: var(--sectiondivider-accent-gradient-stop-2-position);
    --_divider-stop-3-color: var(--sectiondivider-accent-gradient-stop-3-color);
    --_divider-stop-3-position: var(--sectiondivider-accent-gradient-stop-3-position);
    --_divider-title: var(--sectiondivider-accent-title);
    --_divider-title-font-family: var(--sectiondivider-accent-title-font-family);
    --_divider-title-font-size: var(--sectiondivider-accent-title-font-size);
    --_divider-title-font-weight: var(--sectiondivider-accent-title-font-weight);
    --_divider-title-line-height: var(--sectiondivider-accent-title-line-height);
    --_divider-title-border-width: var(--sectiondivider-accent-title-border-width);
    --_divider-title-stroke-color: var(--sectiondivider-accent-title-stroke-color);
    --_divider-description: var(--sectiondivider-accent-description);
    --_divider-description-font-family: var(--sectiondivider-accent-description-font-family);
    --_divider-description-font-size: var(--sectiondivider-accent-description-font-size);
    --_divider-description-font-weight: var(--sectiondivider-accent-description-font-weight);
    --_divider-description-line-height: var(--sectiondivider-accent-description-line-height);
  }

  .variant-special {
    --_divider-padding: var(--sectiondivider-special-padding);
    --_divider-radius: var(--sectiondivider-special-radius);
    --_divider-border: var(--sectiondivider-special-border);
    --_divider-border-width: var(--sectiondivider-special-border-width);
    --_divider-shadow: var(--sectiondivider-special-shadow);
    --_divider-gradient-angle: var(--sectiondivider-special-gradient-angle);
    --_divider-stop-1-color: var(--sectiondivider-special-gradient-stop-1-color);
    --_divider-stop-1-position: var(--sectiondivider-special-gradient-stop-1-position);
    --_divider-stop-2-color: var(--sectiondivider-special-gradient-stop-2-color);
    --_divider-stop-2-position: var(--sectiondivider-special-gradient-stop-2-position);
    --_divider-stop-3-color: var(--sectiondivider-special-gradient-stop-3-color);
    --_divider-stop-3-position: var(--sectiondivider-special-gradient-stop-3-position);
    --_divider-title: var(--sectiondivider-special-title);
    --_divider-title-font-family: var(--sectiondivider-special-title-font-family);
    --_divider-title-font-size: var(--sectiondivider-special-title-font-size);
    --_divider-title-font-weight: var(--sectiondivider-special-title-font-weight);
    --_divider-title-line-height: var(--sectiondivider-special-title-line-height);
    --_divider-title-border-width: var(--sectiondivider-special-title-border-width);
    --_divider-title-stroke-color: var(--sectiondivider-special-title-stroke-color);
    --_divider-description: var(--sectiondivider-special-description);
    --_divider-description-font-family: var(--sectiondivider-special-description-font-family);
    --_divider-description-font-size: var(--sectiondivider-special-description-font-size);
    --_divider-description-font-weight: var(--sectiondivider-special-description-font-weight);
    --_divider-description-line-height: var(--sectiondivider-special-description-line-height);
  }

  /* Title rendered as a single <text> through a feMorphology dilate + flood +
     composite filter. Dilating the alpha treats all glyphs as one combined
     shape, so neighbor-glyph overlaps (CQ, AC etc.) merge into a single
     outline instead of double-stacking. Filter values are pushed onto
     <feMorphology>/<feFlood> from JS — those attrs can't read CSS vars. */
  svg.divider-label {
    display: block;
    overflow: visible;
    color: var(--_divider-title);
  }
  svg.divider-label text {
    font-family: var(--_divider-title-font-family);
    font-size: var(--_divider-title-font-size);
    font-weight: var(--_divider-title-font-weight);
    fill: currentColor;
  }

  .divider-description {
    margin: var(--space-4) 0 0;
    font-family: var(--_divider-description-font-family);
    font-size: var(--_divider-description-font-size);
    font-weight: var(--_divider-description-font-weight);
    line-height: var(--_divider-description-line-height);
    color: var(--_divider-description);
  }

  @media (max-width: 600px) {
    .section-divider {
      padding: var(--space-12) var(--space-16);
    }
  }
</style>
