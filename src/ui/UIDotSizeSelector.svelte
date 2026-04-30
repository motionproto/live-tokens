<script lang="ts">
  import UIVariantSelector from './UIVariantSelector.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  export let variable: string;
  export let component: string | undefined = undefined;
  export let canBeShared: boolean = false;
  export let disabled: boolean = false;
  export let selectionsLocked: boolean = false;

  const options = [
    { key: '0', label: 'None', value: '0%' },
    { key: '25', label: '25%', value: '25%' },
    { key: '50', label: '50%', value: '50%' },
    { key: '75', label: '75%', value: '75%' },
    { key: '100', label: '100%', value: '100%' },
  ] as const;
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeShared}
  {disabled}
  {selectionsLocked}
  varPrefix="--dot-size-"
  {options}
  on:change
>
  <svelte:fragment slot="option" let:opt let:active let:select>
    <UIOptionItem {active} on:click={select}>
      <svelte:fragment slot="label">{opt.label}</svelte:fragment>
    </UIOptionItem>
  </svelte:fragment>
</UIVariantSelector>
