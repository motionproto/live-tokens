<script lang="ts">
  interface Props {
    /** `corner` overlaps the icon of a condensed rail, where the label and its inline mark are hidden. */
    placement?: 'inline' | 'corner';
  }

  let { placement = 'inline' }: Props = $props();
  const label = 'Accessibility issues';
</script>

{#if placement === 'inline'}
  <i class="fa-solid fa-triangle-exclamation a11y-rail-mark" role="img" aria-label={label} title={label}></i>
{:else}
  <i class="fa-solid fa-triangle-exclamation a11y-rail-mark corner" aria-hidden="true"></i>
{/if}

<style>
  .a11y-rail-mark {
    margin-right: var(--ui-space-6);
    color: var(--ui-highlight);
    font-size: var(--ui-font-size-sm);
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
