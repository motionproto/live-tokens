<script lang="ts">
  export let legend: string = '';
  /** When true, the fieldset is rendered with a strong outline to mark it as the one currently driving the rendered preview. */
  export let active: boolean = false;
</script>

<fieldset class="fieldset-wrapper" class:active>
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

  .fieldset-wrapper.active {
    outline: 2px solid var(--ui-text-primary);
  }

  .fieldset-legend {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    padding: 0 var(--ui-space-4);
  }

  .fieldset-wrapper.active .fieldset-legend {
    color: var(--ui-text-primary);
    font-weight: var(--ui-font-weight-semibold);
  }

  .fieldset-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-8);
  }
</style>
