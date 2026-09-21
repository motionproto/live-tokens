<script module lang="ts">
  import type { CatalogueEntry } from '../../editor/component-editor/scaffolding/types';

  export const catalogue = {
    description: 'A poster frame that plays its clip in place when clicked.',
    whenToUse:
      'footage whose motion is the point, standing in a layout where a still would otherwise sit.',
    whenNotToUse: [
      { when: 'a picture whose detail is the point.', use: 'imagelightbox' },
      { when: 'decoration.', use: 'image' },
      { when: 'a clip the reader opens over the page from a thumbnail.', use: 'videolightbox' }
    ],
    constraints: ['A clip the deploy does not serve falls back to its poster.'],
    props: {
      chrome:
        '`badge` shows the play badge and hands playback to the native controls. `none` drops both, and a click toggles play.',
      fit: '`fill` scales the clip to the frame. `natural` holds it at its own size on the frame’s ground, which wants width and height.',
      loop: 'true repeats the clip.'
    }
  } satisfies CatalogueEntry;
</script>

<script lang="ts">
  interface Props {
    /** The clip. Served as a static file, so a missing one is survivable. */
    src: string;
    /** The still shown until play, and the fallback when the clip is absent. */
    poster: string;
    alt?: string;
    /** Natural size of the poster. Sets the box before anything loads. */
    width?: number;
    height?: number;
    maxWidth?: number | string;
    loop?: boolean;
    /** "none" drops the badge and the native controls; a click then toggles play. */
    chrome?: 'badge' | 'none';
    /** "natural" holds the clip at its own pixel size on the frame's ground. Needs width and height. */
    fit?: 'fill' | 'natural';
    class?: string;
  }

  let {
    src,
    poster,
    alt = '',
    width = undefined,
    height = undefined,
    maxWidth = undefined,
    loop = false,
    chrome = 'badge',
    fit = 'fill',
    class: className = ''
  }: Props = $props();

  let videoEl: HTMLVideoElement | undefined = $state();
  let started = $state(false);
  let playing = $state(false);
  // A clip the deploy does not serve falls back to the poster. A HEAD answers
  // that on its own; a load error would not, since it fires the same way for a
  // codec the browser cannot decode. An SPA rewrite answers 200 with
  // index.html for a path it has no file for, so the content type settles it.
  let missing = $state(false);

  $effect(() => {
    let live = true;
    fetch(src, { method: 'HEAD' })
      .then((res) => {
        const type = res.headers.get('content-type') ?? '';
        if (live) missing = !res.ok || !type.startsWith('video/');
      })
      .catch(() => {
        if (live) missing = true;
      });
    return () => {
      live = false;
    };
  });

  const ratio = $derived(width && height ? `${width} / ${height}` : undefined);
  const cap = $derived(typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth);

  function start() {
    started = true;
    videoEl?.play();
  }

  function toggle() {
    if (!videoEl) return;
    started = true;
    if (videoEl.paused) videoEl.play();
    else videoEl.pause();
  }
</script>

<div class="videoframe" style:max-width={cap}>
  <div
    class="videoframe-frame sketch-surface {className}"
    style:aspect-ratio={ratio}
    data-playing={started ? 'true' : null}
  >
    <div class="videoframe-clip" class:is-natural={fit === 'natural'}>
      {#if missing}
        <img src={poster} {alt} {width} {height} />
      {:else}
        <!-- No caption track ships with the source footage. -->
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
          bind:this={videoEl}
          {src}
          {poster}
          {loop}
          preload="metadata"
          playsinline
          controls={started && chrome === 'badge'}
          onplay={() => (playing = true)}
          onpause={() => (playing = false)}
        ></video>
      {/if}
    </div>

    {#if !missing && (chrome === 'none' || !started)}
      <button
        type="button"
        class="videoframe-trigger"
        onclick={chrome === 'none' ? toggle : start}
      >
        <span class="visually-hidden">{playing ? 'Pause' : 'Play'}: {alt}</span>
        {#if chrome === 'badge'}
          <span class="videoframe-badge sketch-chip" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
          </span>
        {/if}
      </button>
    {/if}
  </div>
</div>

<style>
  :global(:root) {
    --videoframe-frame-surface: var(--surface-neutral-lowest);
    /* The ground behind the clip. Only shows where the clip leaves the frame
       unfilled, so it wants the footage's own background colour. */
    --videoframe-clip-surface: var(--color-transparent);
    --videoframe-frame-border: var(--border-neutral);
    --videoframe-frame-border-width: var(--border-width-1);
    --videoframe-frame-radius: var(--radius-2xl);

    --videoframe-badge-default-surface: var(--surface-brand-lower);
    --videoframe-badge-default-border: var(--border-brand-medium);
    --videoframe-badge-default-border-width: var(--border-width-2);
    --videoframe-badge-default-icon: var(--text-primary);
    --videoframe-badge-default-size: var(--space-64);
    --videoframe-badge-default-icon-size: var(--icon-size-4xl);
    --videoframe-badge-duration: var(--duration-200);
    --videoframe-badge-easing: var(--ease-out-quad);

    --videoframe-badge-hover-surface: var(--surface-brand);
    --videoframe-badge-hover-border: var(--border-brand-strong);
    --videoframe-badge-hover-icon: var(--text-primary);
  }

  .videoframe {
    display: block;
    width: 100%;
    margin-inline: auto;
  }

  .videoframe-frame {
    position: relative;
    width: 100%;
    background: var(--videoframe-frame-surface);
    border: var(--videoframe-frame-border-width) solid var(--videoframe-frame-border);
    border-radius: var(--videoframe-frame-radius);

    --sketch-fill: var(--videoframe-frame-surface);
    --sketch-stroke: var(--videoframe-frame-border);
    --sketch-hatch-color: var(--videoframe-frame-border);
    --sketch-radius: var(--videoframe-frame-radius);
    --sketch-shadow: none;
  }

  /* The clip lives one level in: the sketch layer forces the drawn part's
     overflow visible, which would let square media corners escape the frame. */
  .videoframe-clip {
    overflow: hidden;
    background: var(--videoframe-clip-surface);
    border-radius: var(--sketch-radius, var(--videoframe-frame-radius));
  }

  .videoframe-clip img,
  .videoframe-clip video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
  }

  /* Absolute, so the frame's aspect-ratio box stays the pad the clip sits in. */
  .videoframe-clip.is-natural {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
  }

  .videoframe-clip.is-natural img,
  .videoframe-clip.is-natural video {
    width: auto;
    height: auto;
    max-width: 100%;
    max-height: 100%;
  }

  .videoframe-trigger {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
  }

  .videoframe-trigger:focus-visible {
    outline: none;
    box-shadow: var(--ring-focus-md);
    border-radius: var(--sketch-radius, var(--videoframe-frame-radius));
  }

  .videoframe-badge {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--videoframe-badge-default-size);
    height: var(--videoframe-badge-default-size);
    color: var(--videoframe-badge-default-icon);
    background: var(--videoframe-badge-default-surface);
    border: var(--videoframe-badge-default-border-width) solid
      var(--videoframe-badge-default-border);
    border-radius: var(--radius-full);
    transition:
      background var(--videoframe-badge-duration) var(--videoframe-badge-easing),
      border-color var(--videoframe-badge-duration) var(--videoframe-badge-easing),
      color var(--videoframe-badge-duration) var(--videoframe-badge-easing);

    --sketch-fill: var(--videoframe-badge-default-surface);
    --sketch-stroke: var(--videoframe-badge-default-border);
    --sketch-hatch-color: var(--videoframe-badge-default-border);
    --sketch-radius: var(--radius-full);
    --sketch-shadow: none;
    /* Travel is stated in px, and the play triangle is small enough to tear. */
    --sketch-icon-off: var(--sketch-icon-soft);
  }

  .videoframe-badge svg {
    width: var(--videoframe-badge-default-icon-size);
    height: var(--videoframe-badge-default-icon-size);
    /* The triangle's mass sits left of centre; nudge it back onto the axis. */
    margin-inline-start: 6%;
  }

  .videoframe-trigger:hover .videoframe-badge,
  .videoframe-frame.force-hover .videoframe-badge {
    color: var(--videoframe-badge-hover-icon);
    background: var(--videoframe-badge-hover-surface);
    border-color: var(--videoframe-badge-hover-border);

    --sketch-fill: var(--videoframe-badge-hover-surface);
    --sketch-stroke: var(--videoframe-badge-hover-border);
    --sketch-hatch-color: var(--videoframe-badge-hover-border);
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
</style>
