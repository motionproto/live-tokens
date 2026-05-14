<script lang="ts">
  import UIVariantSelector from './UIVariantSelector.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  interface Props {
    variable: string;
    component?: string | undefined;
    canBeLinked?: boolean;
    disabled?: boolean;
    selectionsLocked?: boolean;
  }

  let {
    variable,
    component = undefined,
    canBeLinked = false,
    disabled = false,
    selectionsLocked = false
  }: Props = $props();

  const options = [
    { key: 'tight', label: 'Tight', value: '1' },
    { key: 'snug', label: 'Snug', value: '1.2' },
    { key: 'normal', label: 'Normal', value: '1.4' },
    { key: 'relaxed', label: 'Relaxed', value: '1.5' },
    { key: 'loose', label: 'Loose', value: '2' },
  ] as const;
</script>

<UIVariantSelector
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  varPrefix="--line-height-"
  {options}
  on:change
>
  {#snippet option({ opt, active, select })}
  
      <UIOptionItem {active} onclick={select}>
        {#snippet preview()}
            <span  class="lh-sample" style="line-height: var(--line-height-{opt.key});">≡</span>
          {/snippet}
        {#snippet label()}
            {opt.label}
          {/snippet}
        {#snippet meta()}
            {opt.value}
          {/snippet}
      </UIOptionItem>
    
  {/snippet}
</UIVariantSelector>

<style>
  .lh-sample {
    display: inline-block;
    width: 1.5rem;
    text-align: center;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
  }
</style>
