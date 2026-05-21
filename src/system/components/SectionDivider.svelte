<script lang="ts">
  import { run } from 'svelte/legacy';

  import { onMount, tick } from 'svelte';

  /** Size variant. Each variant owns everything that defines its look:
   *  typography, geometry, AND colors / background. No separate color axis. */
  type Variant = 'lg' | 'md' | 'sm';
  type Align = 'start' | 'center';
  type HairlinePosition =
    | 'above-label'
    | 'through-label'
    | 'below-label'
    | 'above-description'
    | 'through-description'
    | 'below-description';

  interface HairlineConfig {
    position: HairlinePosition;
    /** CSS length (e.g. `2px`). Overrides the size variant's hairline thickness. */
    thickness?: string;
    /** Optional CSS gradient. Overrides the variant's hairline color. */
    gradient?: string;
  }

  interface Props {
    title: string;
    description?: string | undefined;
    eyebrow?: string | undefined;
    variant?: Variant;
    align?: Align;
    hairline?: HairlineConfig | undefined;
  }

  let {
    title,
    description = undefined,
    eyebrow = undefined,
    variant = 'md',
    align = 'center',
    hairline = undefined,
  }: Props = $props();

  let svgEl: SVGSVGElement | undefined = $state();
  let svgTextEl: SVGTextElement | undefined = $state();
  let svgW = $state(0);
  let svgH = $state(0);
  let svgX = $state(0);
  let svgY = $state(0);

  // feMorphology radius and feFlood flood-color are non-presentation attributes
  // and can't read CSS vars. Read resolved values off the SVG element and push
  // them onto the filter primitives, refreshing on doc-level inline-var changes.
  let outlineRadius = $state('0');
  let outlineColor = $state('#000');
  const filterId = `sd-outline-${Math.random().toString(36).slice(2, 10)}`;

  function syncFilter(): void {
    if (!svgEl) return;
    const cs = getComputedStyle(svgEl);
    const wPx = parseFloat(cs.getPropertyValue('--_divider-title-outline-width'));
    outlineRadius = String(Number.isFinite(wPx) ? wPx / 2 : 0);
    const c = cs.getPropertyValue('--_divider-title-outline-color').trim();
    outlineColor = c || '#000';
  }

  function measure(): void {
    if (!svgTextEl) return;
    const bb = svgTextEl.getBBox();
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
    const obs = new MutationObserver(() => { measure(); syncFilter(); });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
    return () => obs.disconnect();
  });

  let activeHairlinePos = $derived.by((): HairlinePosition | null => {
    if (!hairline) return null;
    if (description === undefined && hairline.position.endsWith('-description')) return null;
    return hairline.position;
  });

  let aboveLabel = $derived(activeHairlinePos === 'above-label');
  let throughLabel = $derived(activeHairlinePos === 'through-label');
  let belowLabel = $derived(activeHairlinePos === 'below-label');
  let aboveDesc = $derived(activeHairlinePos === 'above-description');
  let throughDesc = $derived(activeHairlinePos === 'through-description');
  let belowDesc = $derived(activeHairlinePos === 'below-description');

  function hairlineStyle(h: HairlineConfig | undefined): string {
    if (!h) return '';
    const parts: string[] = [];
    if (h.thickness) parts.push(`--_sd-hairline-thickness: ${h.thickness}`);
    if (h.gradient) parts.push(`--_sd-hairline-background: ${h.gradient}`);
    return parts.join('; ');
  }
</script>

<div
  class="section-divider variant-{variant} align-{align}"
  class:has-eyebrow={!!eyebrow}
  class:has-description={description !== undefined}
  class:has-hairline={!!activeHairlinePos}
  style={hairlineStyle(hairline)}
>
  {#if eyebrow}
    <span class="divider-eyebrow">{eyebrow}</span>
  {/if}
  {#if aboveLabel}
    <span class="sd-hairline sd-hairline--row" aria-hidden="true"></span>
  {/if}
  <div class="title-row" class:has-line={throughLabel}>
    {#if throughLabel}
      <span class="sd-hairline sd-hairline--through" aria-hidden="true"></span>
    {/if}
    <span class="title-inline">
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
    </span>
  </div>
  {#if belowLabel}
    <span class="sd-hairline sd-hairline--row" aria-hidden="true"></span>
  {/if}
  {#if description !== undefined}
    {#if aboveDesc}
      <span class="sd-hairline sd-hairline--row" aria-hidden="true"></span>
    {/if}
    <div class="description-row" class:has-line={throughDesc}>
      {#if throughDesc}
        <span class="sd-hairline sd-hairline--through" aria-hidden="true"></span>
      {/if}
      <span class="description-inline">
        <p class="divider-description">{description}</p>
      </span>
    </div>
    {#if belowDesc}
      <span class="sd-hairline sd-hairline--row" aria-hidden="true"></span>
    {/if}
  {/if}
</div>

<style>
  /* Each size variant owns its full token set: typography, geometry, AND
     colors (background + text + border + hairline + title-outline). There is
     no separate color axis — variants are full presets the designer composes
     in the editor. The instance picks one variant; that's it. */
  :global(:root) {
    /* Large */
    --sectiondivider-lg-title-font-family: var(--font-display);
    --sectiondivider-lg-title-font-weight: var(--font-weight-normal);
    --sectiondivider-lg-title-font-size: var(--font-size-5xl);
    --sectiondivider-lg-title-line-height: var(--line-height-xs);
    --sectiondivider-lg-title-letter-spacing: var(--letter-spacing-normal);
    --sectiondivider-lg-title-outline-width: var(--border-width-4);
    --sectiondivider-lg-description-font-family: var(--font-sans);
    --sectiondivider-lg-description-font-weight: var(--font-weight-normal);
    --sectiondivider-lg-description-font-size: var(--font-size-lg);
    --sectiondivider-lg-description-line-height: var(--line-height-md);
    --sectiondivider-lg-eyebrow-font-family: var(--font-sans);
    --sectiondivider-lg-eyebrow-font-weight: var(--font-weight-medium);
    --sectiondivider-lg-eyebrow-font-size: var(--font-size-md);
    --sectiondivider-lg-eyebrow-letter-spacing: var(--letter-spacing-wide);
    --sectiondivider-lg-spacing: var(--space-16);
    --sectiondivider-lg-radius: var(--radius-lg);
    --sectiondivider-lg-border-width: var(--border-width-0);
    --sectiondivider-lg-shadow: var(--shadow-none);
    --sectiondivider-lg-hairline-thickness: var(--border-width-1);
    --sectiondivider-lg-background: linear-gradient(135deg, var(--surface-canvas-highest) 0%, var(--surface-canvas-higher) 50%, var(--surface-canvas) 100%);
    --sectiondivider-lg-title: var(--text-primary);
    --sectiondivider-lg-description: var(--text-secondary);
    --sectiondivider-lg-eyebrow: var(--text-tertiary);
    --sectiondivider-lg-border: var(--color-transparent);
    --sectiondivider-lg-title-outline-color: var(--surface-canvas-lowest);
    --sectiondivider-lg-hairline-color: var(--border-canvas-medium);

    /* Medium */
    --sectiondivider-md-title-font-family: var(--font-display);
    --sectiondivider-md-title-font-weight: var(--font-weight-normal);
    --sectiondivider-md-title-font-size: var(--font-size-4xl);
    --sectiondivider-md-title-line-height: var(--line-height-xs);
    --sectiondivider-md-title-letter-spacing: var(--letter-spacing-normal);
    --sectiondivider-md-title-outline-width: var(--border-width-3);
    --sectiondivider-md-description-font-family: var(--font-sans);
    --sectiondivider-md-description-font-weight: var(--font-weight-normal);
    --sectiondivider-md-description-font-size: var(--font-size-md);
    --sectiondivider-md-description-line-height: var(--line-height-md);
    --sectiondivider-md-eyebrow-font-family: var(--font-sans);
    --sectiondivider-md-eyebrow-font-weight: var(--font-weight-medium);
    --sectiondivider-md-eyebrow-font-size: var(--font-size-sm);
    --sectiondivider-md-eyebrow-letter-spacing: var(--letter-spacing-wide);
    --sectiondivider-md-spacing: var(--space-12);
    --sectiondivider-md-radius: var(--radius-md);
    --sectiondivider-md-border-width: var(--border-width-0);
    --sectiondivider-md-shadow: var(--shadow-none);
    --sectiondivider-md-hairline-thickness: var(--border-width-1);
    --sectiondivider-md-background: linear-gradient(135deg, var(--surface-canvas-highest) 0%, var(--surface-canvas-higher) 50%, var(--surface-canvas) 100%);
    --sectiondivider-md-title: var(--text-primary);
    --sectiondivider-md-description: var(--text-secondary);
    --sectiondivider-md-eyebrow: var(--text-tertiary);
    --sectiondivider-md-border: var(--color-transparent);
    --sectiondivider-md-title-outline-color: var(--surface-canvas-lowest);
    --sectiondivider-md-hairline-color: var(--border-canvas-medium);

    /* Small */
    --sectiondivider-sm-title-font-family: var(--font-display);
    --sectiondivider-sm-title-font-weight: var(--font-weight-normal);
    --sectiondivider-sm-title-font-size: var(--font-size-3xl);
    --sectiondivider-sm-title-line-height: var(--line-height-xs);
    --sectiondivider-sm-title-letter-spacing: var(--letter-spacing-normal);
    --sectiondivider-sm-title-outline-width: var(--border-width-2);
    --sectiondivider-sm-description-font-family: var(--font-sans);
    --sectiondivider-sm-description-font-weight: var(--font-weight-normal);
    --sectiondivider-sm-description-font-size: var(--font-size-sm);
    --sectiondivider-sm-description-line-height: var(--line-height-md);
    --sectiondivider-sm-eyebrow-font-family: var(--font-sans);
    --sectiondivider-sm-eyebrow-font-weight: var(--font-weight-medium);
    --sectiondivider-sm-eyebrow-font-size: var(--font-size-xs);
    --sectiondivider-sm-eyebrow-letter-spacing: var(--letter-spacing-wide);
    --sectiondivider-sm-spacing: var(--space-8);
    --sectiondivider-sm-radius: var(--radius-sm);
    --sectiondivider-sm-border-width: var(--border-width-0);
    --sectiondivider-sm-shadow: var(--shadow-none);
    --sectiondivider-sm-hairline-thickness: var(--border-width-1);
    --sectiondivider-sm-background: linear-gradient(135deg, var(--surface-canvas-highest) 0%, var(--surface-canvas-higher) 50%, var(--surface-canvas) 100%);
    --sectiondivider-sm-title: var(--text-primary);
    --sectiondivider-sm-description: var(--text-secondary);
    --sectiondivider-sm-eyebrow: var(--text-tertiary);
    --sectiondivider-sm-border: var(--color-transparent);
    --sectiondivider-sm-title-outline-color: var(--surface-canvas-lowest);
    --sectiondivider-sm-hairline-color: var(--border-canvas-medium);
  }

  .section-divider {
    position: relative;
    margin: var(--space-24) 0;
    padding: var(--_divider-spacing) calc(var(--_divider-spacing) * 1.5);
    border-radius: var(--_divider-radius);
    border: var(--_divider-border-width) solid var(--_divider-border);
    box-shadow: var(--_divider-shadow);
    background: var(--_divider-bg);
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .section-divider.align-start { align-items: flex-start; text-align: start; --_divider-justify: flex-start; }
  .section-divider.align-center { align-items: center; text-align: center; --_divider-justify: center; }

  /* Variant pipes — one full token set per variant. */
  .variant-lg {
    --_divider-title-font-family: var(--sectiondivider-lg-title-font-family);
    --_divider-title-font-weight: var(--sectiondivider-lg-title-font-weight);
    --_divider-title-font-size: var(--sectiondivider-lg-title-font-size);
    --_divider-title-line-height: var(--sectiondivider-lg-title-line-height);
    --_divider-title-letter-spacing: var(--sectiondivider-lg-title-letter-spacing);
    --_divider-title-outline-width: var(--sectiondivider-lg-title-outline-width);
    --_divider-description-font-family: var(--sectiondivider-lg-description-font-family);
    --_divider-description-font-weight: var(--sectiondivider-lg-description-font-weight);
    --_divider-description-font-size: var(--sectiondivider-lg-description-font-size);
    --_divider-description-line-height: var(--sectiondivider-lg-description-line-height);
    --_divider-eyebrow-font-family: var(--sectiondivider-lg-eyebrow-font-family);
    --_divider-eyebrow-font-weight: var(--sectiondivider-lg-eyebrow-font-weight);
    --_divider-eyebrow-font-size: var(--sectiondivider-lg-eyebrow-font-size);
    --_divider-eyebrow-letter-spacing: var(--sectiondivider-lg-eyebrow-letter-spacing);
    --_divider-spacing: var(--sectiondivider-lg-spacing);
    --_divider-radius: var(--sectiondivider-lg-radius);
    --_divider-border-width: var(--sectiondivider-lg-border-width);
    --_divider-shadow: var(--sectiondivider-lg-shadow);
    --_divider-hairline-thickness: var(--sectiondivider-lg-hairline-thickness);
    --_divider-bg: var(--sectiondivider-lg-background);
    --_divider-title: var(--sectiondivider-lg-title);
    --_divider-description: var(--sectiondivider-lg-description);
    --_divider-eyebrow: var(--sectiondivider-lg-eyebrow);
    --_divider-border: var(--sectiondivider-lg-border);
    --_divider-title-outline-color: var(--sectiondivider-lg-title-outline-color);
    --_divider-hairline-color: var(--sectiondivider-lg-hairline-color);
  }

  .variant-md {
    --_divider-title-font-family: var(--sectiondivider-md-title-font-family);
    --_divider-title-font-weight: var(--sectiondivider-md-title-font-weight);
    --_divider-title-font-size: var(--sectiondivider-md-title-font-size);
    --_divider-title-line-height: var(--sectiondivider-md-title-line-height);
    --_divider-title-letter-spacing: var(--sectiondivider-md-title-letter-spacing);
    --_divider-title-outline-width: var(--sectiondivider-md-title-outline-width);
    --_divider-description-font-family: var(--sectiondivider-md-description-font-family);
    --_divider-description-font-weight: var(--sectiondivider-md-description-font-weight);
    --_divider-description-font-size: var(--sectiondivider-md-description-font-size);
    --_divider-description-line-height: var(--sectiondivider-md-description-line-height);
    --_divider-eyebrow-font-family: var(--sectiondivider-md-eyebrow-font-family);
    --_divider-eyebrow-font-weight: var(--sectiondivider-md-eyebrow-font-weight);
    --_divider-eyebrow-font-size: var(--sectiondivider-md-eyebrow-font-size);
    --_divider-eyebrow-letter-spacing: var(--sectiondivider-md-eyebrow-letter-spacing);
    --_divider-spacing: var(--sectiondivider-md-spacing);
    --_divider-radius: var(--sectiondivider-md-radius);
    --_divider-border-width: var(--sectiondivider-md-border-width);
    --_divider-shadow: var(--sectiondivider-md-shadow);
    --_divider-hairline-thickness: var(--sectiondivider-md-hairline-thickness);
    --_divider-bg: var(--sectiondivider-md-background);
    --_divider-title: var(--sectiondivider-md-title);
    --_divider-description: var(--sectiondivider-md-description);
    --_divider-eyebrow: var(--sectiondivider-md-eyebrow);
    --_divider-border: var(--sectiondivider-md-border);
    --_divider-title-outline-color: var(--sectiondivider-md-title-outline-color);
    --_divider-hairline-color: var(--sectiondivider-md-hairline-color);
  }

  .variant-sm {
    --_divider-title-font-family: var(--sectiondivider-sm-title-font-family);
    --_divider-title-font-weight: var(--sectiondivider-sm-title-font-weight);
    --_divider-title-font-size: var(--sectiondivider-sm-title-font-size);
    --_divider-title-line-height: var(--sectiondivider-sm-title-line-height);
    --_divider-title-letter-spacing: var(--sectiondivider-sm-title-letter-spacing);
    --_divider-title-outline-width: var(--sectiondivider-sm-title-outline-width);
    --_divider-description-font-family: var(--sectiondivider-sm-description-font-family);
    --_divider-description-font-weight: var(--sectiondivider-sm-description-font-weight);
    --_divider-description-font-size: var(--sectiondivider-sm-description-font-size);
    --_divider-description-line-height: var(--sectiondivider-sm-description-line-height);
    --_divider-eyebrow-font-family: var(--sectiondivider-sm-eyebrow-font-family);
    --_divider-eyebrow-font-weight: var(--sectiondivider-sm-eyebrow-font-weight);
    --_divider-eyebrow-font-size: var(--sectiondivider-sm-eyebrow-font-size);
    --_divider-eyebrow-letter-spacing: var(--sectiondivider-sm-eyebrow-letter-spacing);
    --_divider-spacing: var(--sectiondivider-sm-spacing);
    --_divider-radius: var(--sectiondivider-sm-radius);
    --_divider-border-width: var(--sectiondivider-sm-border-width);
    --_divider-shadow: var(--sectiondivider-sm-shadow);
    --_divider-hairline-thickness: var(--sectiondivider-sm-hairline-thickness);
    --_divider-bg: var(--sectiondivider-sm-background);
    --_divider-title: var(--sectiondivider-sm-title);
    --_divider-description: var(--sectiondivider-sm-description);
    --_divider-eyebrow: var(--sectiondivider-sm-eyebrow);
    --_divider-border: var(--sectiondivider-sm-border);
    --_divider-title-outline-color: var(--sectiondivider-sm-title-outline-color);
    --_divider-hairline-color: var(--sectiondivider-sm-hairline-color);
  }

  /* Title rendered as a single <text> through a feMorphology dilate + flood +
     composite filter. Dilating the alpha treats all glyphs as one combined
     shape, so neighbor-glyph overlaps (CQ, AC etc.) merge into a single
     outline instead of double-stacking. */
  svg.divider-label {
    display: block;
    overflow: visible;
    color: var(--_divider-title);
  }
  svg.divider-label text {
    font-family: var(--_divider-title-font-family);
    font-weight: var(--_divider-title-font-weight);
    font-size: var(--_divider-title-font-size);
    letter-spacing: var(--_divider-title-letter-spacing);
    fill: currentColor;
  }

  .title-row {
    display: flex;
    width: 100%;
    position: relative;
    justify-content: var(--_divider-justify);
    align-items: center;
  }
  .title-inline {
    display: inline-flex;
    position: relative;
    z-index: 1;
  }
  /* When a "through-label" hairline is active, give the title a backdrop +
     inline padding so the line visually breaks where the text sits. */
  .title-row.has-line .title-inline {
    background: var(--_divider-bg);
    padding-inline: 0.75em;
  }

  .divider-eyebrow {
    font-family: var(--_divider-eyebrow-font-family);
    font-weight: var(--_divider-eyebrow-font-weight);
    font-size: var(--_divider-eyebrow-font-size);
    letter-spacing: var(--_divider-eyebrow-letter-spacing);
    text-transform: uppercase;
    color: var(--_divider-eyebrow);
  }

  .description-row {
    display: flex;
    width: 100%;
    position: relative;
    justify-content: var(--_divider-justify);
    align-items: center;
  }
  .description-inline {
    display: inline-flex;
    position: relative;
    z-index: 1;
  }
  .description-row.has-line .description-inline {
    background: var(--_divider-bg);
    padding-inline: 0.75em;
  }
  .divider-description {
    margin: 0;
    font-family: var(--_divider-description-font-family);
    font-weight: var(--_divider-description-font-weight);
    font-size: var(--_divider-description-font-size);
    line-height: var(--_divider-description-line-height);
    color: var(--_divider-description);
    font-style: italic;
  }

  .sd-hairline {
    display: block;
    background: var(--_sd-hairline-background, var(--_divider-hairline-color));
    height: var(--_sd-hairline-thickness, var(--_divider-hairline-thickness));
  }
  .sd-hairline--row {
    width: 100%;
  }
  .sd-hairline--through {
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 0;
  }

  @media (max-width: 600px) {
    .section-divider {
      padding: var(--space-12) var(--space-16);
    }
  }
</style>
