<script lang="ts">
  import PaletteSelector from './PaletteSelector.svelte';
  import FontFamilySelector from './FontFamilySelector.svelte';
  import FontWeightSelector from './FontWeightSelector.svelte';

  export let colorVariable: string;
  export let colorLabel: string;
  export let familyVariable: string | undefined = undefined;
  export let familyLabel: string | undefined = undefined;
  export let weightVariable: string | undefined = undefined;
  export let weightLabel: string | undefined = undefined;
  /** When set, writes persist through the editor store under this component. */
  export let component: string | undefined = undefined;
</script>

<div class="type-editor">
  <div class="type-editor-controls">
    <div class="type-editor-entry">
      <PaletteSelector variable={colorVariable} label={colorLabel} {component} on:change />
      <span class="type-editor-label">{colorLabel}</span>
    </div>
    {#if familyVariable}
      <div class="type-editor-entry">
        <FontFamilySelector variable={familyVariable} label={familyLabel ?? ''} {component} on:change />
        <span class="type-editor-label">{familyLabel ?? ''}</span>
      </div>
    {/if}
    {#if weightVariable}
      <div class="type-editor-entry">
        <FontWeightSelector variable={weightVariable} label={weightLabel ?? ''} {component} on:change />
        <span class="type-editor-label">{weightLabel ?? ''}</span>
      </div>
    {/if}
  </div>
</div>

<style>
  .type-editor {
    flex-basis: 100%;
    display: flex;
    align-items: flex-start;
  }

  .type-editor-controls {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-8);
    flex: 1;
  }

  .type-editor-entry {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .type-editor-label {
    font-size: var(--ui-font-sm);
    color: var(--ui-text-secondary);
    padding-left: var(--ui-space-2);
  }
</style>
