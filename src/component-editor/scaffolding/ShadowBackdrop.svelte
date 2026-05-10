<script lang="ts">
  import newspaperBg from '../../assets/newspaper.webp';

  export let mode: 'image' | 'color' = 'image';
  /** CSS var name (set by ShadowBackdropControls) the backdrop reads when in color mode. */
  export let colorVariable: string;
  /** Padding around the slotted preview. Set to '0' when the slotted component should cover the full backdrop area (e.g. dialog overlay). */
  export let padding: string = '128px';

  $: backgroundStyle =
    mode === 'image'
      ? `padding: ${padding}; background-image: url(${newspaperBg}); background-size: cover; background-position: center; background-repeat: no-repeat;`
      : `padding: ${padding}; background: var(${colorVariable}, #1a1a1a);`;
</script>

<div class="shadow-backdrop" style={backgroundStyle}>
  <slot />
</div>

<style>
  .shadow-backdrop {
    border-radius: var(--ui-radius-md);
    overflow: hidden;
  }
</style>
