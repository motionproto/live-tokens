<script lang="ts">
  import UIVariantSelector from './UIVariantSelector.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  export let variable: string;
  export let component: string | undefined = undefined;
  export let canBeShared: boolean = false;
  export let disabled: boolean = false;

  const options = [
    { key: 'none', label: 'None', value: '0' },
    { key: 'thin', label: 'Thin', value: '1px' },
    { key: 'default', label: 'Default', value: '2px' },
    { key: 'thick', label: 'Thick', value: '3px' },
    { key: 'thicker', label: 'Thicker', value: '4px' },
  ] as const;
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeShared}
  {disabled}
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
