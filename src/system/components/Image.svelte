<script lang="ts">
  interface Props {
    src: string;
    alt: string;
    variant?: 'default' | 'banner' | 'medium' | 'compact';
    height?: string | undefined;
    /** Zoom the contents on hover (frame stays fixed). `undefined` inherits the editor's
        global "Use zoom" default; `true`/`false` force this instance on/off. */
    zoom?: boolean | undefined;
    /** When zoom is active, decide what the hover scale grows. `true` (default) scales the
        content inside the fixed frame, masked by overflow. `false` scales the whole framed
        image so it grows past its layout box. `undefined` inherits the global default.
        Set on its own (without `zoom`) it forces zoom on in the chosen mode. */
    overflowScaling?: boolean | undefined;
    srcset?: string | undefined;
    sizes?: string | undefined;
    /** Content images default to lazy; pass `'eager'` for above-the-fold heroes. */
    loading?: 'lazy' | 'eager';
    decoding?: 'async' | 'sync' | 'auto';
  }

  let {
    src,
    alt,
    variant = 'default',
    height = undefined,
    zoom = undefined,
    overflowScaling = undefined,
    srcset = undefined,
    sizes = undefined,
    loading = 'lazy',
    decoding = 'async'
  }: Props = $props();

  const variantHeights: Record<string, string | undefined> = {
    default: undefined,
    banner: '360px',
    medium: '240px',
    compact: '180px',
  };

  let resolvedHeight = $derived(height ?? variantHeights[variant]);

  // Per-instance override of the global zoom intrinsics. `undefined` for a variable leaves
  // :root in charge. Exactly one of the two transforms is ever the scale (the other `none`),
  // so contained and grow can't stack into a double zoom.
  const ZOOM = 'scale(var(--image-zoom-scale))';
  let zoomOff = $derived(zoom === false);
  // Setting either prop forces zoom on; otherwise both inherit the global default.
  let zoomForced = $derived(zoom === true || overflowScaling !== undefined);
  let contained = $derived(overflowScaling !== false);

  let contentHover = $derived(
    zoomOff ? 'none' : zoomForced ? (contained ? ZOOM : 'none') : undefined,
  );
  let frameHover = $derived(
    zoomOff ? 'none' : zoomForced ? (contained ? 'none' : ZOOM) : undefined,
  );
</script>

<div
  class="image"
  style:height={resolvedHeight}
  style:--image-zoom-hover={contentHover}
  style:--image-grow-hover={frameHover}
>
  <img {src} {alt} {srcset} {sizes} {loading} {decoding} />
</div>

<style>
  :global(:root) {
    --image-default-radius: var(--radius-2xl);
    --image-default-border: var(--border-neutral);
    --image-default-border-width: var(--border-width-1);
    --image-default-shadow: var(--shadow-md);
    --image-zoom-scale: var(--scale-sm);
    /* Hover-scale targets. Contained mode (`overflowScaling`) scales the content within the
       masked frame; grow mode scales the whole frame so it grows past its box. Each is `none`
       (off) or `scale(var(--image-zoom-scale))` (on); only one is ever on at a time. */
    --image-zoom-hover: none;
    --image-grow-hover: none;
  }

  .image {
    border-radius: var(--image-default-radius);
    overflow: hidden;
    border: var(--image-default-border-width) solid var(--image-default-border);
    box-shadow: var(--image-default-shadow);
    transform-origin: center;
    transition: transform var(--duration-300) var(--ease-out-cubic);
  }

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: center;
    transform-origin: center;
    transition: transform var(--duration-300) var(--ease-out-cubic);
  }

  .image:hover {
    transform: var(--image-grow-hover);
  }

  .image:hover img {
    transform: var(--image-zoom-hover);
  }
</style>
