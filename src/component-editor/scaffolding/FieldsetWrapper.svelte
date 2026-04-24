<script lang="ts">
  export let legend: string = '';
</script>

<fieldset class="fieldset-wrapper">
  {#if legend}
    <legend class="fieldset-legend">{legend}</legend>
  {/if}
  <div class="fieldset-controls">
    <slot />
  </div>
</fieldset>

<style>
  .fieldset-wrapper {
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-lg);
    padding: 0 var(--ui-space-8) var(--ui-space-8);
    margin: 0;
    width: fit-content;
    min-inline-size: 0;
  }

  .fieldset-legend {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    padding: 0 var(--ui-space-4);
  }

  .fieldset-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-8);
  }
</style>
