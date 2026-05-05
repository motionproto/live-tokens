<script lang="ts">
  import UIVariantSelector from './UIVariantSelector.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  export let variable: string;
  export let component: string | undefined = undefined;
  export let canBeLinked: boolean = false;
  export let disabled: boolean = false;
  export let selectionsLocked: boolean = false;

  const options = [
    { key: '0', label: 'None', value: '0px' },
    { key: '8', label: 'XS', value: '0.5rem' },
    { key: '10', label: 'Small', value: '0.625rem' },
    { key: '12', label: 'Medium', value: '0.75rem' },
    { key: '16', label: 'Large', value: '1rem' },
    { key: '20', label: 'XL', value: '1.25rem' },
    { key: '24', label: '2XL', value: '1.5rem' },
    { key: 'full', label: 'Full', value: '100%' },
  ] as const;
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  varPrefix="--space-"
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
