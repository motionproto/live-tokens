<script lang="ts">
  import newspaperBg from '../../../system/assets/newspaper.webp';

  
  
  interface Props {
    mode?: 'image' | 'color';
    /** CSS var name (set by ShadowBackdropControls) the backdrop reads when in color mode. */
    colorVariable: string;
    /** Padding around the slotted preview. Set to '0' when the slotted component should cover the full backdrop area (e.g. dialog overlay). */
    padding?: string;
    children?: import('svelte').Snippet;
  }

  let {
    mode = 'image',
    colorVariable,
    padding = '128px',
    children
  }: Props = $props();

  let backgroundStyle =
    $derived(mode === 'image'
      ? `padding: ${padding}; background-image: url(${newspaperBg}); background-size: cover; background-position: center; background-repeat: no-repeat;`
      : `padding: ${padding}; background: var(${colorVariable}, #1a1a1a);`);
</script>

<div class="shadow-backdrop" style={backgroundStyle}>
  {@render children?.()}
</div>

<style>
  .shadow-backdrop {
    border-radius: var(--ui-radius-md);
    overflow: hidden;
  }
</style>
