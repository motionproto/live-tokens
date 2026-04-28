<script lang="ts">
  export let src: string;
  export let alt: string;
  export let variant: 'default' | 'banner' | 'medium' | 'compact' = 'default';
  export let height: string | undefined = undefined;

  const variantHeights: Record<string, string | undefined> = {
    default: undefined,
    banner: '360px',
    medium: '240px',
    compact: '180px',
  };

  $: resolvedHeight = height ?? variantHeights[variant];
</script>

<div class="image" style:height={resolvedHeight}>
  <img {src} {alt} />
</div>

<style>
  :global(:root) {
    --image-default-radius: var(--radius-xl);
    --image-default-border: var(--border-neutral-default);
    --image-default-shadow: var(--shadow-md);
  }

  .image {
    border-radius: var(--image-default-radius);
    overflow: hidden;
    border: var(--border-width-thin) solid var(--image-default-border);
    box-shadow: var(--image-default-shadow);
  }

  img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
    object-position: center;
  }
</style>
