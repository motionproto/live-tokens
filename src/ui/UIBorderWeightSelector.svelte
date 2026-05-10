<script lang="ts">
  import UIVariantSelector from './UIVariantSelector.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  export let variable: string;
  export let component: string | undefined = undefined;
  export let canBeLinked: boolean = false;
  export let disabled: boolean = false;
  export let selectionsLocked: boolean = false;

  const options = [
    { key: '0', label: '0', value: '0' },
    { key: '1', label: '1', value: '1px' },
    { key: '2', label: '2', value: '2px' },
    { key: '3', label: '3', value: '3px' },
    { key: '4', label: '4', value: '4px' },
    { key: '5', label: '5', value: '5px' },
    { key: '6', label: '6', value: '6px' },
    { key: '8', label: '8', value: '8px' },
    { key: '10', label: '10', value: '10px' },
    { key: '12', label: '12', value: '12px' },
    { key: '16', label: '16', value: '16px' },
    { key: '20', label: '20', value: '20px' },
    { key: '24', label: '24', value: '24px' },
  ] as const;
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  varPrefix="--border-width-"
  {options}
  on:change
>
  <svelte:fragment slot="option" let:opt let:active let:select>
    <UIOptionItem {active} on:click={select}>
      <svelte:fragment slot="label">{opt.label}</svelte:fragment>
      <svelte:fragment slot="meta">{opt.value}</svelte:fragment>
    </UIOptionItem>
  </svelte:fragment>
</UIVariantSelector>
