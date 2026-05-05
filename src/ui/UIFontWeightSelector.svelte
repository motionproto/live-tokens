<script lang="ts">
  import UIVariantSelector from './UIVariantSelector.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  export let variable: string;
  export let component: string | undefined = undefined;
  export let canBeLinked: boolean = false;
  export let disabled: boolean = false;
  export let selectionsLocked: boolean = false;

  const options = [
    { key: 'thin', label: 'Thin', value: '100' },
    { key: 'extralight', label: 'Extra Light', value: '200' },
    { key: 'light', label: 'Light', value: '300' },
    { key: 'normal', label: 'Normal', value: '400' },
    { key: 'medium', label: 'Medium', value: '500' },
    { key: 'semibold', label: 'Semibold', value: '600' },
    { key: 'bold', label: 'Bold', value: '700' },
    { key: 'extrabold', label: 'Extra Bold', value: '800' },
    { key: 'black', label: 'Black', value: '900' },
  ] as const;
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  varPrefix="--font-weight-"
  {options}
  on:change
>
  <svelte:fragment slot="option" let:opt let:active let:select>
    <UIOptionItem {active} on:click={select}>
      <span slot="preview" class="weight-sample" style="font-weight: var(--font-weight-{opt.key});">A</span>
      <svelte:fragment slot="label">{opt.label}</svelte:fragment>
      <svelte:fragment slot="meta">{opt.value}</svelte:fragment>
    </UIOptionItem>
  </svelte:fragment>
</UIVariantSelector>

<style>
  .weight-sample {
    display: inline-block;
    width: 1.5rem;
    text-align: center;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
    line-height: 1;
  }
</style>
