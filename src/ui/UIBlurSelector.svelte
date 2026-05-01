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
    { key: 'sm', label: 'Small', value: '4px' },
    { key: 'md', label: 'Medium', value: '8px' },
    { key: 'lg', label: 'Large', value: '16px' },
    { key: 'xl', label: 'X-Large', value: '24px' },
    { key: '2xl', label: '2X-Large', value: '32px' },
  ] as const;
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeShared}
  {disabled}
  {selectionsLocked}
  varPrefix="--blur-"
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
