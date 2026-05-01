<script lang="ts">
  import newspaperBg from '../../assets/newspaper.webp';

  export let mode: 'image' | 'color' = 'image';
  /** CSS var name (set by ShadowBackdropControls) the backdrop reads when in color mode. */
  export let colorVariable: string;

  $: backgroundStyle =
    mode === 'image'
      ? `background-image: url(${newspaperBg}); background-size: cover; background-position: center; background-repeat: no-repeat;`
      : `background: var(${colorVariable}, #1a1a1a);`;
</script>

<div class="shadow-backdrop" style={backgroundStyle}>
  <slot />
</div>

<style>
  .shadow-backdrop {
    padding: 128px;
    border-radius: var(--ui-radius-md);
    overflow: hidden;
  }
</style>
