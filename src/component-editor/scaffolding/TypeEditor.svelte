<script lang="ts">
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import UIFontFamilySelector from '../../ui/UIFontFamilySelector.svelte';
  import UIFontWeightSelector from '../../ui/UIFontWeightSelector.svelte';
  import FieldsetWrapper from './FieldsetWrapper.svelte';

  export let colorVariable: string;
  export let colorLabel: string;
  export let familyVariable: string | undefined = undefined;
  export let familyLabel: string | undefined = undefined;
  export let weightVariable: string | undefined = undefined;
  export let weightLabel: string | undefined = undefined;
  /** When set, writes persist through the editor store under this component. */
  export let component: string | undefined = undefined;
</script>

<FieldsetWrapper legend="type">
  <div class="entry">
    <UIPaletteSelector variable={colorVariable} {component} on:change />
    <span class="label">{colorLabel}</span>
  </div>
  {#if familyVariable}
    <div class="entry">
      <UIFontFamilySelector variable={familyVariable} {component} on:change />
      <span class="label">{familyLabel ?? ''}</span>
    </div>
  {/if}
  {#if weightVariable}
    <div class="entry">
      <UIFontWeightSelector variable={weightVariable} {component} on:change />
      <span class="label">{weightLabel ?? ''}</span>
    </div>
  {/if}
</FieldsetWrapper>

<style>
  .entry {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
  }

  .label {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    padding-left: var(--ui-space-2);
  }
</style>
