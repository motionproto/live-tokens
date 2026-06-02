<script lang="ts">
  interface Props {
    src: string;
    alt: string;
    variant?: 'default' | 'banner' | 'medium' | 'compact';
    height?: string | undefined;
    /** Zoom the contents on hover (frame stays fixed). `undefined` inherits the editor's
        global "Use zoom" default; `true`/`false` force this instance on/off. */
    zoom?: boolean | undefined;
  }

  let {
    src,
    alt,
    variant = 'default',
    height = undefined,
    zoom = undefined
  }: Props = $props();

  const variantHeights: Record<string, string | undefined> = {
    default: undefined,
    banner: '360px',
    medium: '240px',
    compact: '180px',
  };

  let resolvedHeight = $derived(height ?? variantHeights[variant]);

  // Per-instance override of the global zoom intrinsic; undefined leaves :root in charge.
  let zoomOverride = $derived(
    zoom === undefined ? undefined : zoom ? 'scale(var(--image-zoom-scale))' : 'none',
  );
</script>

<div class="image" style:height={resolvedHeight} style:--image-zoom-hover={zoomOverride}>
  <img {src} {alt} />
</div>

<style>
  :global(:root) {
    --image-default-radius: var(--radius-2xl);
    --image-default-border: var(--border-neutral);
    --image-default-border-width: var(--border-width-1);
    --image-default-shadow: var(--shadow-md);
    --image-zoom-scale: var(--scale-sm);
    /* Global "Use zoom" intrinsic: `none` (off) or `scale(var(--image-zoom-scale))` (on). */
    --image-zoom-hover: none;
  }

  .image {
    border-radius: var(--image-default-radius);
    overflow: hidden;
    border: var(--image-default-border-width) solid var(--image-default-border);
    box-shadow: var(--image-default-shadow);
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

  .image:hover img {
    transform: var(--image-zoom-hover);
  }
</style>
