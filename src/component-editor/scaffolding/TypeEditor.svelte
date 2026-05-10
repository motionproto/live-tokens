<script lang="ts">
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import UIVariantSelector from '../../ui/UIVariantSelector.svelte';
  import UIFontFamilySelector from '../../ui/UIFontFamilySelector.svelte';
  import UIFontSizeSelector from '../../ui/UIFontSizeSelector.svelte';
  import UIFontWeightSelector from '../../ui/UIFontWeightSelector.svelte';
  import UILineHeightSelector from '../../ui/UILineHeightSelector.svelte';
  import FieldsetWrapper from './FieldsetWrapper.svelte';
  import { BORDER_WIDTH } from '../../ui/variantScales';

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
  /** Optional outline rows rendered under the typography rows so a text-with-
      stroke group keeps stroke controls visually nested with the type they
      drive (e.g. SectionDivider title outline). */
  export let outlineWidthVariable: string | undefined = undefined;
  export let outlineWidthLabel: string = 'outline thickness';
  export let outlineColorVariable: string | undefined = undefined;
  export let outlineColorLabel: string = 'outline color';
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
      <UIFontFamilySelector variable={familyVariable} {component} canBeLinked on:change />
    {/if}
    {#if weightVariable}
      <span class="row-label">{weightLabel}</span>
      <UIFontWeightSelector variable={weightVariable} {component} canBeLinked on:change />
    {/if}
    {#if sizeVariable}
      <span class="row-label">{sizeLabel}</span>
      <UIFontSizeSelector variable={sizeVariable} {component} canBeLinked on:change />
    {/if}
    {#if lineHeightVariable}
      <span class="row-label">{lineHeightLabel}</span>
      <UILineHeightSelector variable={lineHeightVariable} {component} canBeLinked on:change />
    {/if}
    {#if outlineWidthVariable}
      <span class="row-label">{outlineWidthLabel}</span>
      <UIVariantSelector variable={outlineWidthVariable} {component} canBeLinked {...BORDER_WIDTH} on:change />
    {/if}
    {#if outlineColorVariable}
      <span class="row-label">{outlineColorLabel}</span>
      <UIPaletteSelector variable={outlineColorVariable} {component} canBeLinked on:change />
    {/if}
  </div>
</FieldsetWrapper>

<style>
  .type-grid {
    display: grid;
    grid-template-columns: max-content 8rem 1fr;
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
