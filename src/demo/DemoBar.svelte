<script lang="ts">
  import '../editor/styles/ui-editor.css';
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

<!-- Editor chrome, like the overlay: the bar paints from --ui-*, so every
     theme leaves it legible, and data-live-tokens-chrome keeps sketch mode off
     it. .editor-page scopes the --ui-* tokens and hosts the selects' menus. -->
<div class="demo-bar editor-page" data-live-tokens-chrome>
  <div class="bar">
    <div class="pickers">
      <ThemeSelect chrome onpick={onThemePick} />
      <SketchSelect chrome onpick={onSketchPick} />
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
    --sketch-icon-off: none;
    background: var(--ui-surface-lower);
    border-bottom: 1px solid var(--ui-border-low);
  }

  /* The bar repeats the demo's .kit grid, so its content lines up with the
     sections beneath it. The right side stays empty for the editor's collapsed
     toggle, which pins top-right. */
  .bar {
    max-width: var(--columns-max-width);
    margin-inline: auto;
    padding: var(--space-12) var(--space-32);
    display: grid;
    grid-template-columns: repeat(var(--columns-count), minmax(0, 1fr));
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

  @media (max-width: 1200px) {
    .pickers {
      grid-column: 1 / -1;
    }
  }

  @media (max-width: 767px) {
    .bar {
      padding-inline: var(--columns-margin);
    }
  }

  /* No room beside the editor's toggle on a phone, so the pickers sit in the
     page below it and scroll away, clearing the toggle only when it rests in
     the top band. */
  @media (max-width: 600px) {
    .demo-bar {
      position: static;
    }
    .bar {
      padding-block: max(var(--space-16), calc(var(--lt-pill-clearance, 0px) + var(--space-8))) var(--space-16);
    }
    /* Side by side, each label over a trigger that fills its half. */
    .pickers {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--space-12);
    }
    .pickers :global(.chrome-select) {
      flex-direction: column;
      align-items: stretch;
      gap: var(--ui-space-4);
    }
    .pickers :global(.chrome-select-trigger) {
      width: 100%;
      min-width: 0;
    }
  }
</style>
