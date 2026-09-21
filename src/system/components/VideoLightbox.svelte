<script module lang="ts">
  import type { CatalogueEntry } from '../../editor/component-editor/scaffolding/types';

  export const catalogue = {
    description:
      'A small still that fades the page away and plays its clip in the middle of the screen when clicked.',
    whenToUse:
      'a short clip on a plain ground, such as a product shot, that the reader opens from a thumbnail beside the copy.',
    whenNotToUse: [
      { when: 'a picture whose detail is the point.', use: 'imagelightbox' },
      { when: 'footage that plays in the layout at full size, with no thumbnail to open.', use: 'videoframe' }
    ],
    props: {
      inline: 'true renders the open lightbox in flow, without the thumbnail. The editor preview uses it.',
      loop: 'true repeats the clip.',
      hoverPlay:
        'true plays the thumbnail muted under the pointer, and rewinds it on the way out. A reader who asked for less motion keeps the still.',
      stretch:
        'true spreads the trigger over the nearest positioned ancestor, so a whole card opens the clip. The consumer positions that ancestor.',
      thumbAspect:
        'the ratio the thumbnail box holds, when it should not be the clip\'s own. The clip still opens at its full frame.',
      thumbFit:
        '`cover` fills a thumbnail box the clip does not share the shape of, and crops what will not fit. `contain` keeps the whole frame and letterboxes it.',
      previewStart:
        'seconds into the clip the hover preview starts, for footage that opens on a title card. The clip itself still opens at the beginning.'
    }
  } satisfies CatalogueEntry;
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import { portal } from '../internal/portal';

  interface Props {
    src: string;
    /** The thumbnail, and the frame shown before the clip starts. */
    poster: string;
    alt?: string;
    /** Natural size of the clip. Sets the thumbnail's box and the open size. */
    width?: number;
    height?: number;
    loop?: boolean;
    /** Renders the open lightbox in flow, without the thumbnail. Used by the editor preview. */
    inline?: boolean;
    /** Plays the thumbnail muted under the pointer. Still for reduced motion. */
    hoverPlay?: boolean;
    /** Spreads the hit area over the nearest positioned ancestor. */
    stretch?: boolean;
    /** The thumbnail box's ratio, when it differs from the clip's own. */
    thumbAspect?: number;
    /** How the still meets a box it does not share the shape of. */
    thumbFit?: 'contain' | 'cover';
    /** Seconds in that the hover preview starts. The open clip still plays from 0. */
    previewStart?: number;
    /** Editor preview hook: `force-hover` on an `inline` lightbox paints the close button's hover. */
    class?: string;
  }

  let {
    src,
    poster,
    alt = '',
    width = undefined,
    height = undefined,
    loop = false,
    inline = false,
    hoverPlay = false,
    stretch = false,
    thumbAspect = undefined,
    thumbFit = 'contain',
    previewStart = 0,
    class: className = ''
  }: Props = $props();

  let thumbEl: HTMLVideoElement | undefined = $state();

  function previewIn() {
    if (!thumbEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (thumbEl.currentTime < previewStart) thumbEl.currentTime = previewStart;
    thumbEl.play().catch(() => {});
  }

  function previewOut() {
    if (!thumbEl) return;
    thumbEl.pause();
    thumbEl.currentTime = previewStart;
  }

  let triggerEl: HTMLButtonElement | undefined = $state();
  let modalEl: HTMLDivElement | undefined = $state();
  let videoEl: HTMLVideoElement | undefined = $state();
  let closeBtnEl: HTMLButtonElement | undefined = $state();
  // `mounted` keeps the lightbox in the DOM through the fade out, `shown`
  // drives the fade, and `open` is what the trigger reports.
  let mounted = $state(false);
  let shown = $state(false);
  let open = $state(false);

  const ratio = $derived(width && height ? width / height : undefined);
  // The box the still sits in; the clip itself always opens at `ratio`.
  const tileRatio = $derived(thumbAspect ?? ratio);

  async function openLightbox() {
    if (open) return;
    open = true;
    mounted = true;
    await tick();
    if (!modalEl) return;
    // Commit the transparent start so the class change below fades in.
    modalEl.getBoundingClientRect();
    shown = true;
    modalEl.focus();
    videoEl?.play();
  }

  async function closeLightbox() {
    if (!open || !modalEl) return;
    open = false;
    shown = false;
    videoEl?.pause();
    await tick();
    await Promise.all(modalEl.getAnimations().map((a) => a.finished)).catch(() => {});
    if (open) return;
    mounted = false;
    triggerEl?.focus();
  }

  // A page may act on keys it hears at the window, such as a deck turning
  // slides, so the lightbox keeps every key to itself while it is open.
  function onModalKey(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === ' ' && e.target === modalEl) {
      e.preventDefault();
      if (videoEl?.paused) videoEl.play();
      else videoEl?.pause();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      (document.activeElement === closeBtnEl ? modalEl : closeBtnEl)?.focus();
    }
  }
</script>

{#if inline}
  <div class="videolightbox-modal inline shown {className}" style:--videolightbox-ratio={ratio}>
    <!-- svelte-ignore a11y_media_has_caption -->
    <video class="videolightbox-video" {src} {poster} preload="metadata" playsinline></video>
    <button
      type="button"
      class="videolightbox-close"
      aria-label="Close" tabindex="-1"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 6L6 18" />
        <path d="M6 6l12 12" />
      </svg>
    </button>
  </div>
{:else}
  <div
    class="videolightbox {className}"
    style:aspect-ratio={tileRatio}
    style:--videolightbox-thumb-fit={thumbFit}
  >
    <button
      bind:this={triggerEl}
      type="button"
      class="videolightbox-trigger"
      class:stretch
      aria-label={alt ? `Play video: ${alt}` : 'Play video'}
      aria-haspopup="dialog"
      aria-expanded={open}
      onclick={openLightbox}
      onpointerenter={hoverPlay ? previewIn : undefined}
      onpointerleave={hoverPlay ? previewOut : undefined}
      onfocus={hoverPlay ? previewIn : undefined}
      onblur={hoverPlay ? previewOut : undefined}
    >
      {#if hoverPlay}
        <!-- Muted and silent by design; the sound belongs to the open clip. -->
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          bind:this={thumbEl}
          class="videolightbox-thumb"
          {src}
          {poster}
          {width}
          {height}
          muted
          loop
          playsinline
          preload="metadata"
        ></video>
      {:else}
        <img src={poster} alt="" {width} {height} draggable="false" />
      {/if}
    </button>
  </div>

  {#if mounted}
    <!-- Clicking anywhere closes it, the clip included; the close button and
         Escape do the same. -->
    <div
      bind:this={modalEl}
      class="videolightbox-modal"
      class:shown
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      tabindex="-1"
      style:--videolightbox-ratio={ratio}
      style:--videolightbox-natural-width={width ? `${width}px` : undefined}
      use:portal
      onclick={closeLightbox}
      onkeydown={onModalKey}
    >
      <!-- No caption track ships with the source footage. -->
      <!-- svelte-ignore a11y_media_has_caption -->
      <video bind:this={videoEl} class="videolightbox-video" {src} {poster} {loop} playsinline></video>
      <button
          bind:this={closeBtnEl}
        type="button"
        class="videolightbox-close"
        aria-label="Close"
          onclick={closeLightbox}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
    </div>
  {/if}
{/if}

<style>
  :global(:root) {
    --videolightbox-tile-surface: var(--color-transparent);
    --videolightbox-tile-border: var(--color-transparent);
    --videolightbox-tile-border-width: var(--border-width-0);
    --videolightbox-tile-radius: var(--radius-2xl);
    --videolightbox-tile-shadow: var(--shadow-md);

    --videolightbox-scrim-surface: var(--scrim-high);
    --videolightbox-overlay-padding: var(--space-64);
    --videolightbox-overlay-duration: var(--duration-500);
    --videolightbox-overlay-easing: var(--ease-out-quad);

    --videolightbox-chrome-surface: var(--surface-neutral-low);
    --videolightbox-chrome-border: var(--border-brand);
    --videolightbox-chrome-border-width: var(--border-width-1);
    --videolightbox-chrome-radius: var(--radius-full);
    --videolightbox-chrome-icon: var(--text-primary);
    --videolightbox-chrome-hover-surface: var(--surface-brand-high);
  }

  .videolightbox {
    width: 100%;
    background: var(--videolightbox-tile-surface);
    border: var(--videolightbox-tile-border-width) solid var(--videolightbox-tile-border);
    border-radius: var(--videolightbox-tile-radius);
    box-shadow: var(--videolightbox-tile-shadow);
  }

  /* The clip lives one level in: the sketch layer forces the drawn part's
     overflow visible, which would let the picture's square corners escape. */
  .videolightbox-trigger {
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    border: none;
    background: none;
    overflow: hidden;
    border-radius: var(--sketch-radius, var(--videolightbox-tile-radius));
    cursor: pointer;
  }

  /* The pad is laid over the ancestor the consumer positioned, so the one
     button keeps the label and the whole card answers the pointer. It rides
     above the consumer's own content, or copy beside the still would swallow
     the pointer before the trigger heard it.
     A transform on anything between here and that ancestor would make itself
     the containing block and shrink the pad back to the still. */
  .videolightbox-trigger.stretch::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
  }

  .videolightbox-trigger:focus-visible {
    outline: none;
    box-shadow: var(--ring-focus-md);
  }

  .videolightbox-trigger img,
  .videolightbox-trigger .videolightbox-thumb {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: var(--videolightbox-thumb-fit, contain);
    user-select: none;
  }

  .videolightbox-modal {
    position: fixed;
    inset: 0;
    z-index: var(--z-modal);
    box-sizing: border-box;
    display: grid;
    place-items: center;
    padding: var(--videolightbox-overlay-padding);
    background: var(--videolightbox-scrim-surface);
    container-type: size;
    opacity: 0;
    transition: opacity var(--videolightbox-overlay-duration) var(--videolightbox-overlay-easing);
    cursor: pointer;
  }

  .videolightbox-modal.shown {
    opacity: 1;
  }

  .videolightbox-modal:focus {
    outline: none;
  }

  .videolightbox-modal.inline {
    position: relative;
    inset: auto;
    z-index: auto;
    width: 100%;
    aspect-ratio: 16 / 9;
    cursor: default;
  }

  .videolightbox-close {
    position: absolute;
    top: var(--space-24);
    right: var(--space-24);
    /* 2.75rem = 44px, the min touch-target floor. */
    width: 2.75rem;
    height: 2.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: var(--videolightbox-chrome-surface);
    border: var(--videolightbox-chrome-border-width) solid var(--videolightbox-chrome-border);
    border-radius: var(--videolightbox-chrome-radius);
    color: var(--videolightbox-chrome-icon);
    backdrop-filter: blur(var(--blur-md));
    cursor: pointer;
    transition: background var(--duration-200) ease;
  }

  .videolightbox-close:hover,
  .videolightbox-modal:global(.force-hover) .videolightbox-close {
    background: var(--videolightbox-chrome-hover-surface);
  }

  .videolightbox-close:focus-visible {
    outline: none;
    box-shadow: var(--ring-focus-md);
  }

  @media (prefers-reduced-motion: reduce) {
    .videolightbox-modal {
      transition: none;
    }
  }

  /* The clip plays at its own pixel size and shrinks only to fit the screen. */
  .videolightbox-video {
    display: block;
    width: min(var(--videolightbox-natural-width, 100cqw), 100cqw, 100cqh * var(--videolightbox-ratio, 16 / 9));
    aspect-ratio: var(--videolightbox-ratio, 16 / 9);
  }
</style>
