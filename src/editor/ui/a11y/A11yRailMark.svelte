<script lang="ts">
  interface Props {
    /** `corner` overlaps the icon of a condensed rail, where the label and its inline mark are hidden. */
    placement?: 'inline' | 'corner';
    /** Draws the eye of a component whose only results are to check by eye. */
    review?: boolean;
  }

  let { placement = 'inline', review = false }: Props = $props();
  let label = $derived(review ? 'Results to check by eye' : 'Accessibility issues');
  let glyph = $derived(review ? 'fa-eye' : 'fa-triangle-exclamation');
</script>

{#if placement === 'inline'}
  <i class="fa-solid {glyph} a11y-rail-mark" class:review role="img" aria-label={label} title={label}></i>
{:else}
  <i class="fa-solid {glyph} a11y-rail-mark corner" class:review aria-hidden="true"></i>
{/if}

<style>
  .a11y-rail-mark {
    margin-right: var(--ui-space-6);
    color: var(--ui-highlight);
    font-size: var(--ui-font-size-sm);
  }

  .review {
    color: var(--ui-text-tertiary);
  }

  /* Bottom-right of the icon, clear of the unsaved dot at its top-right. */
  .corner {
    position: absolute;
    top: 50%;
    left: 30px;
    margin: 0;
    font-size: var(--ui-font-size-xs);
    text-shadow: 0 0 2px black;
    pointer-events: none;
  }
</style>
