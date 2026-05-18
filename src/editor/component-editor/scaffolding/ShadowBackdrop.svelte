<script lang="ts">
  import newspaperBg from '../../../system/assets/newspaper.webp';



  interface Props {
    mode?: 'default' | 'image' | 'color';
    /** CSS var name (set by ShadowBackdropControls) the backdrop reads when in color mode. */
    colorVariable?: string;
    /** Padding around the slotted preview. Set to '0' when the slotted component should cover the full backdrop area (e.g. dialog overlay). */
    padding?: string;
    children?: import('svelte').Snippet;
  }

  let {
    mode = 'default',
    colorVariable,
    padding = '4rem',
    children
  }: Props = $props();

  let backgroundStyle = $derived.by(() => {
    const p = `padding: ${padding};`;
    if (mode === 'image') {
      return `${p} background-image: url(${newspaperBg}); background-size: cover; background-position: center; background-repeat: no-repeat;`;
    }
    if (mode === 'color' && colorVariable) {
      return `${p} background: var(${colorVariable}, #1a1a1a);`;
    }
    return `${p} background: var(--ui-surface-lowest); border: 1px solid var(--ui-border-low);`;
  });
</script>

<div class="shadow-backdrop" style={backgroundStyle}>
  {@render children?.()}
</div>

<style>
  .shadow-backdrop {
    display: grid;
    place-items: center;
    width: 100%;
    min-width: 0;
    border-radius: var(--ui-radius-md);
    box-sizing: border-box;
    overflow: hidden;
  }
</style>
