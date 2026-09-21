<script module lang="ts">
  import type { CatalogueEntry } from '../../editor/component-editor/scaffolding/types';

  export const catalogue = {
    description: 'A deck of slides the reader flips through in place, one at a time.',
    whenToUse:
      'a talk or a set of exported pages read in order, where the reader moves forward and back without leaving the page.',
    whenNotToUse: [
      { when: 'the pictures have no order and the reader opens one at a time.', use: 'imagelightbox' },
      { when: 'the reader takes one picture in at a glance.', use: 'image' },
      { when: 'the content is a clip rather than a set of stills.', use: 'videoframe' }
    ],
    constraints: [
      'Every slide carries alt text naming what it says, since the words on a slide reach a screen reader no other way.'
    ],
    props: {
      index: 'the slide the pager opens on, counted from zero.',
      aspect: 'the ratio the frame holds. Exported slides are 16 / 9.',
      zoom: 'false drops the full-screen read, leaving the frame unclickable. The full-screen read pages through every slide, with its own close button.',
      inline:
        'true renders the open zoom in flow, without the frame. The editor preview uses it.'
    }
  } satisfies CatalogueEntry;

  export type SlidePage = {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  };
</script>

<script lang="ts">
  import { tick, untrack } from 'svelte';
  import { portal } from '../internal/portal';

  interface Props {
    slides: SlidePage[];
    /** The slide the pager opens on, counted from zero. */
    index?: number;
    /** The ratio the frame holds. Exported slides are 16 / 9. */
    aspect?: number;
    /** Drops the full-screen read, leaving the frame unclickable. */
    zoom?: boolean;
    /** Renders the open zoom in flow, without the frame. Used by the editor preview. */
    inline?: boolean;
    /** Fires with the slide the reader moved to. */
    onchange?: (index: number) => void;
    class?: string;
  }

  let {
    slides,
    index = 0,
    aspect = 16 / 9,
    zoom = true,
    inline = false,
    onchange = undefined,
    class: className = ''
  }: Props = $props();

  // `index` seeds the pager and then lets go: once the reader is flipping, a
  // parent re-render must not drag them back to the slide it named.
  let current = $state(untrack(() => index));

  const count = $derived(slides.length);
  const slide = $derived(slides[Math.min(current, Math.max(count - 1, 0))]);
  const atStart = $derived(current <= 0);
  const atEnd = $derived(current >= count - 1);
  // Held in the DOM so a flip paints the next slide from cache rather than
  // blanking the frame while the browser fetches it.
  const neighbours = $derived(
    [slides[current - 1], slides[current + 1]].filter(Boolean) as SlidePage[]
  );

  function go(next: number) {
    const clamped = Math.max(0, Math.min(next, count - 1));
    if (clamped === current) return;
    current = clamped;
    onchange?.(clamped);
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(current - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(current + 1);
    }
  }

  let frameEl: HTMLButtonElement | undefined = $state();
  let modalEl: HTMLDivElement | undefined = $state();
  // `mounted` keeps the zoom in the DOM through the fade out, `shown` drives
  // the fade, and `open` is what the frame reports.
  let mounted = $state(false);
  let shown = $state(false);
  let open = $state(false);

  async function openZoom() {
    if (open || !zoom) return;
    open = true;
    mounted = true;
    await tick();
    if (!modalEl) return;
    // Commit the transparent start so the class change below fades in.
    modalEl.getBoundingClientRect();
    shown = true;
    modalEl.focus();
  }

  async function closeZoom() {
    if (!open || !modalEl) return;
    open = false;
    shown = false;
    await tick();
    await Promise.all(modalEl.getAnimations().map((a) => a.finished)).catch(() => {});
    if (open) return;
    mounted = false;
    frameEl?.focus();
  }

  // Tab stays inside the zoom, stepping through its enabled buttons.
  function cycleFocus(dir: 1 | -1) {
    if (!modalEl) return;
    const stops = [...modalEl.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')];
    if (!stops.length) return;
    const at = stops.indexOf(document.activeElement as HTMLButtonElement);
    const next = at < 0 ? (dir > 0 ? 0 : stops.length - 1) : (at + dir + stops.length) % stops.length;
    stops[next].focus();
  }

  // A page may turn its own slides on keys it hears at the window, so the zoom
  // keeps every key it uses to itself.
  function onModalKey(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === 'Escape') {
      closeZoom();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      cycleFocus(e.shiftKey ? -1 : 1);
    } else {
      onKey(e);
    }
  }
</script>

{#snippet bar()}
  <div class="slidepager-bar">
    <button
      type="button"
      class="slidepager-control sketch-chip"
      data-nav="prev"
      aria-label="Previous slide"
      disabled={atStart}
      onclick={(e) => {
        e.stopPropagation();
        go(current - 1);
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>

    <p class="slidepager-counter" aria-live="polite">{current + 1} / {count}</p>

    <button
      type="button"
      class="slidepager-control sketch-chip"
      data-nav="next"
      aria-label="Next slide"
      disabled={atEnd}
      onclick={(e) => {
        e.stopPropagation();
        go(current + 1);
      }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  </div>
{/snippet}

{#snippet close(onclose?: () => void)}
  <button
    type="button"
    class="slidepager-control slidepager-close sketch-chip"
    aria-label="Close"
    tabindex={onclose ? undefined : -1}
    onclick={(e) => {
      e.stopPropagation();
      onclose?.();
    }}
  >
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  </button>
{/snippet}

{#if inline}
  <div class="slidepager-modal inline shown {className}" style:--slidepager-ratio={aspect}>
    <img class="slidepager-full" src={slide?.src} alt={slide?.alt ?? ''} draggable="false" />

    <div class="slidepager-modal-bar">
      {@render bar()}
    </div>
    {@render close()}
  </div>
{:else}
  <!-- The keys land here so they reach the pager only while one of its own
       controls holds focus, leaving the rest of the page its own bindings. -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    class="slidepager {className}"
    role="group"
    aria-roledescription="carousel"
    aria-label="Slide deck"
    onkeydown={onKey}
  >
    <div class="slidepager-frame sketch-surface" style:aspect-ratio={aspect}>
      {#if zoom}
        <button
          bind:this={frameEl}
          type="button"
          class="slidepager-stage"
          aria-label={`Open slide ${current + 1} full screen`}
          aria-haspopup="dialog"
          aria-expanded={open}
          onclick={openZoom}
        >
          <img src={slide?.src} alt={slide?.alt ?? ''} draggable="false" />
        </button>
      {:else}
        <div class="slidepager-stage">
          <img src={slide?.src} alt={slide?.alt ?? ''} draggable="false" />
        </div>
      {/if}
    </div>

    {@render bar()}

    <div class="slidepager-preload" aria-hidden="true">
      {#each neighbours as near (near.src)}
        <img src={near.src} alt="" draggable="false" />
      {/each}
    </div>
  </div>

  {#if mounted}
    <!-- Clicking anywhere but a control closes it, as do the close button and
         Escape. The bar and the arrow keys keep paging at full size. -->
    <div
      bind:this={modalEl}
      class="slidepager-modal"
      class:shown
      role="dialog"
      aria-modal="true"
      aria-label={slide?.alt}
      tabindex="-1"
      style:--slidepager-ratio={aspect}
      use:portal
      onclick={closeZoom}
      onkeydown={onModalKey}
    >
      <img class="slidepager-full" src={slide?.src} alt={slide?.alt ?? ''} draggable="false" />

      <div class="slidepager-modal-bar">
        {@render bar()}
      </div>
      {@render close(closeZoom)}
    </div>
  {/if}
{/if}

<style>
  :global(:root) {
    --slidepager-frame-surface: var(--surface-neutral-lower);
    --slidepager-frame-border: var(--border-neutral-subtle);
    --slidepager-frame-border-width: var(--border-width-1);
    --slidepager-frame-radius: var(--radius-2xl);
    --slidepager-frame-shadow: var(--shadow-md);

    --slidepager-bar-gap: var(--space-16);
    --slidepager-bar-padding: var(--space-12);

    --slidepager-control-surface: var(--surface-neutral-low);
    --slidepager-control-border: var(--border-neutral);
    --slidepager-control-border-width: var(--border-width-1);
    --slidepager-control-radius: var(--radius-full);
    --slidepager-control-size: var(--space-40);
    --slidepager-control-icon: var(--text-primary);
    --slidepager-control-icon-size: var(--icon-size-md);

    --slidepager-control-hover-surface: var(--surface-brand-high);
    --slidepager-control-hover-border: var(--border-brand);
    --slidepager-control-hover-icon: var(--text-inverted);

    --slidepager-control-disabled-surface: var(--surface-neutral-lower);
    --slidepager-control-disabled-border: var(--border-neutral-subtle);
    --slidepager-control-disabled-icon: var(--text-disabled);

    --slidepager-counter-text: var(--text-secondary);
    --slidepager-counter-font-family: var(--font-sans);
    --slidepager-counter-font-size: var(--font-size-lg);
    --slidepager-counter-font-weight: var(--font-weight-medium);
    --slidepager-counter-line-height: var(--line-height-normal);
    --slidepager-counter-letter-spacing: var(--letter-spacing-normal);

    --slidepager-scrim-surface: var(--scrim-high);
    --slidepager-overlay-padding: var(--space-64);
    --slidepager-close-margin: var(--space-24);
    --slidepager-overlay-duration: var(--duration-300);
    --slidepager-overlay-easing: var(--ease-out-quad);
  }

  .slidepager {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .slidepager-frame {
    width: 100%;
    background: var(--slidepager-frame-surface);
    border: var(--slidepager-frame-border-width) solid var(--slidepager-frame-border);
    border-radius: var(--slidepager-frame-radius);
    box-shadow: var(--slidepager-frame-shadow);

    --sketch-fill: var(--slidepager-frame-surface);
    --sketch-stroke: var(--slidepager-frame-border);
    --sketch-hatch-color: var(--slidepager-frame-border);
    --sketch-radius: var(--slidepager-frame-radius);
    --sketch-shadow: var(--slidepager-frame-shadow);
  }

  /* The slide lives one level in: the sketch layer forces the drawn part's
     overflow visible, which would let the picture's square corners escape. */
  .slidepager-stage {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: none;
    overflow: hidden;
    border-radius: var(--sketch-radius, var(--slidepager-frame-radius));
  }

  button.slidepager-stage {
    cursor: zoom-in;
  }

  .slidepager-stage:focus-visible {
    outline: none;
    box-shadow: var(--ring-focus-md);
  }

  .slidepager-stage img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    user-select: none;
  }

  .slidepager-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--slidepager-bar-gap);
    padding: var(--slidepager-bar-padding);

    /* Travel is stated in px against a glyph the layer cannot measure, so a
       chevron this size tears at the full dial. */
    --sketch-icon-off: var(--sketch-icon-soft);
  }

  .slidepager-control {
    display: grid;
    place-items: center;
    flex: none;
    width: var(--slidepager-control-size);
    height: var(--slidepager-control-size);
    padding: 0;
    background: var(--slidepager-control-surface);
    border: var(--slidepager-control-border-width) solid var(--slidepager-control-border);
    border-radius: var(--slidepager-control-radius);
    color: var(--slidepager-control-icon);
    cursor: pointer;

    --sketch-fill: var(--slidepager-control-surface);
    --sketch-stroke: var(--slidepager-control-border);
    --sketch-hatch-color: var(--slidepager-control-border);
    --sketch-radius: var(--slidepager-control-radius);
    --sketch-shadow: var(--shadow-none);
  }

  .slidepager-control:hover:not(:disabled),
  .slidepager.force-hover .slidepager-control:not(:disabled),
  .slidepager-modal.force-hover .slidepager-control:not(:disabled) {
    background: var(--slidepager-control-hover-surface);
    border-color: var(--slidepager-control-hover-border);
    color: var(--slidepager-control-hover-icon);

    --sketch-fill: var(--slidepager-control-hover-surface);
    --sketch-stroke: var(--slidepager-control-hover-border);
    --sketch-hatch-color: var(--slidepager-control-hover-border);
  }

  .slidepager-control:disabled,
  .slidepager.force-disabled .slidepager-control,
  .slidepager-modal.force-disabled .slidepager-control:not(.slidepager-close) {
    background: var(--slidepager-control-disabled-surface);
    border-color: var(--slidepager-control-disabled-border);
    color: var(--slidepager-control-disabled-icon);
    cursor: default;

    --sketch-fill: var(--slidepager-control-disabled-surface);
    --sketch-stroke: var(--slidepager-control-disabled-border);
    --sketch-hatch-color: var(--slidepager-control-disabled-border);
  }

  .slidepager-control svg {
    width: var(--slidepager-control-icon-size);
    height: var(--slidepager-control-icon-size);
  }

  .slidepager-close {
    position: absolute;
    top: var(--slidepager-close-margin);
    right: var(--slidepager-close-margin);
  }

  .slidepager-control:focus-visible {
    outline: none;
    box-shadow: var(--ring-focus-md);
  }

  .slidepager-counter {
    margin: 0;
    color: var(--slidepager-counter-text);
    font-family: var(--slidepager-counter-font-family);
    font-size: var(--slidepager-counter-font-size);
    font-weight: var(--slidepager-counter-font-weight);
    line-height: var(--slidepager-counter-line-height);
    letter-spacing: var(--slidepager-counter-letter-spacing);
    font-variant-numeric: tabular-nums;
  }

  .slidepager-preload {
    display: none;
  }

  /* The ground closes the zoom, so only the controls themselves take a click. */
  .slidepager-modal-bar {
    position: absolute;
    left: 50%;
    bottom: var(--slidepager-bar-padding);
    transform: translateX(-50%);
    pointer-events: none;
  }

  .slidepager-modal-bar .slidepager-control {
    pointer-events: auto;
  }

  .slidepager-modal {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    box-sizing: border-box;
    display: grid;
    place-items: center;
    padding: var(--slidepager-overlay-padding);
    background: var(--slidepager-scrim-surface);
    container-type: size;
    opacity: 0;
    transition: opacity var(--slidepager-overlay-duration) var(--slidepager-overlay-easing);
    cursor: zoom-out;
  }

  .slidepager-modal.shown {
    opacity: 1;
  }

  .slidepager-modal:focus {
    outline: none;
  }

  .slidepager-modal.inline {
    position: relative;
    inset: auto;
    z-index: auto;
    width: 100%;
    aspect-ratio: var(--slidepager-ratio, 16 / 9);
    cursor: default;
  }

  @media (prefers-reduced-motion: reduce) {
    .slidepager-modal {
      transition: none;
    }
  }

  .slidepager-full {
    display: block;
    width: min(100cqw, 100cqh * var(--slidepager-ratio, 16 / 9));
    aspect-ratio: var(--slidepager-ratio, 16 / 9);
    object-fit: contain;
  }
</style>
