<script lang="ts">
  import UIVariantSelector from './UIVariantSelector.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  export let variable: string;
  export let component: string | undefined = undefined;
  export let canBeShared: boolean = false;
  export let disabled: boolean = false;
  export let selectionsLocked: boolean = false;

  const options = [
    { key: 'none', label: 'None', value: '0' },
    { key: 'sm', label: 'Small', value: '0.125rem' },
    { key: 'md', label: 'Medium', value: '0.25rem' },
    { key: 'lg', label: 'Large', value: '0.375rem' },
    { key: 'xl', label: 'X-Large', value: '0.5rem' },
    { key: '2xl', label: '2X-Large', value: '0.625rem' },
    { key: '3xl', label: '3X-Large', value: '0.75rem' },
    { key: '4xl', label: '4X-Large', value: '1.25rem' },
    { key: 'full', label: 'Full', value: '9999px' },
  ] as const;
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeShared}
  {disabled}
  {selectionsLocked}
  varPrefix="--radius-"
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
