<script lang="ts">
  import ThemeSelect from './ThemeSelect.svelte';
  import SketchSelect from './SketchSelect.svelte';

  let {
    onThemePick,
    onSketchPick,
  }: {
    onThemePick?: (fileName: string) => void;
    onSketchPick?: (id: string | null) => void;
  } = $props();
</script>

<div class="demo-bar">
  <div class="bar">
    <div class="pickers">
      <ThemeSelect inline size="small" onpick={onThemePick} />
      <SketchSelect inline size="small" onpick={onSketchPick} />
    </div>
  </div>
</div>

<style>
  .demo-bar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: var(--z-sticky);
    background: var(--scrim-high);
    backdrop-filter: blur(var(--blur-md));
    border-bottom: var(--border-width-1) solid var(--tint-high);
  }

  /* The bar repeats the demo's .kit grid, so its content lines up with the
     sections beneath it. The right side stays empty for the editor's collapsed
     toggle, which pins top-right. */
  .bar {
    max-width: var(--columns-max-width);
    margin-inline: auto;
    padding: var(--space-12) var(--space-32);
    display: grid;
    grid-template-columns: repeat(var(--columns-count), 1fr);
    column-gap: var(--columns-gutter);
  }

  .pickers {
    grid-column: 2 / -2;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    column-gap: var(--space-24);
    row-gap: var(--space-8);
  }

  @media (max-width: 960px) {
    .pickers {
      grid-column: 1 / -1;
    }
  }

  /* No room beside the editor's toggle on a phone, so the pickers sit in the
     page below it and scroll away. */
  @media (max-width: 600px) {
    .demo-bar {
      position: static;
      background: none;
      backdrop-filter: none;
      border-bottom: none;
    }
    .bar {
      padding: var(--space-64) var(--space-16) 0;
    }
  }
</style>
