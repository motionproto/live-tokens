<script lang="ts">
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import UIFontFamilySelector from '../../ui/UIFontFamilySelector.svelte';
  import UIFontSizeSelector from '../../ui/UIFontSizeSelector.svelte';
  import UIFontWeightSelector from '../../ui/UIFontWeightSelector.svelte';
  import UILineHeightSelector from '../../ui/UILineHeightSelector.svelte';
  import FieldsetWrapper from './FieldsetWrapper.svelte';

  export let colorVariable: string;
  export let colorLabel: string = 'color';
  export let familyVariable: string | undefined = undefined;
  export let familyLabel: string = 'family';
  export let sizeVariable: string | undefined = undefined;
  export let sizeLabel: string = 'size';
  export let weightVariable: string | undefined = undefined;
  export let weightLabel: string = 'weight';
  export let lineHeightVariable: string | undefined = undefined;
  export let lineHeightLabel: string = 'line-h';
  /** When set, writes persist through the editor store under this component. */
  export let component: string | undefined = undefined;
  /** Legend text for the fieldset. */
  export let legend: string = 'type';
</script>

<FieldsetWrapper {legend}>
  <div class="type-grid">
    <span class="row-label">{colorLabel}</span>
    <UIPaletteSelector variable={colorVariable} {component} on:change />

    {#if familyVariable}
      <span class="row-label">{familyLabel}</span>
      <UIFontFamilySelector variable={familyVariable} {component} canBeShared on:change />
    {/if}
    {#if weightVariable}
      <span class="row-label">{weightLabel}</span>
      <UIFontWeightSelector variable={weightVariable} {component} canBeShared on:change />
    {/if}
    {#if sizeVariable}
      <span class="row-label">{sizeLabel}</span>
      <UIFontSizeSelector variable={sizeVariable} {component} canBeShared on:change />
    {/if}
    {#if lineHeightVariable}
      <span class="row-label">{lineHeightLabel}</span>
      <UILineHeightSelector variable={lineHeightVariable} {component} canBeShared on:change />
    {/if}
  </div>
</FieldsetWrapper>

<style>
  .type-grid {
    display: grid;
    grid-template-columns: max-content max-content 1fr;
    column-gap: var(--ui-space-10);
    row-gap: var(--ui-space-6);
    align-items: center;
    padding: var(--ui-space-4) var(--ui-space-12);
  }

  .row-label {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    text-align: left;
    line-height: 1;
  }
</style>
