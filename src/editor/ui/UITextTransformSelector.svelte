<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { CSS_VAR_CHANGE_EVENT } from '../core/cssVarSync';
  import UITokenSelector from './UITokenSelector.svelte';
  import UIOptionList from './UIOptionList.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  interface Props {
    variable: string;
    component?: string | undefined;
    canBeLinked?: boolean;
    disabled?: boolean;
    selectionsLocked?: boolean;
    onchange?: () => void;
  }

  let {
    variable,
    component = undefined,
    canBeLinked = false,
    disabled = false,
    selectionsLocked = false,
    onchange,
  }: Props = $props();

  // text-transform is a literal CSS keyword, not a scale alias — the picker
  // writes the keyword itself through UITokenSelector.writeOverride.
  const options = [
    { key: 'none', label: 'None', sample: 'Overline' },
    { key: 'uppercase', label: 'Uppercase', sample: 'Overline' },
    { key: 'lowercase', label: 'Lowercase', sample: 'Overline' },
    { key: 'capitalize', label: 'Capitalize', sample: 'overline label' },
  ] as const;

  let selector: UITokenSelector | undefined = $state();
  let current = $state('');

  function readResolved() {
    current = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  }

  function handleVarChange(e: Event) {
    const detail = (e as CustomEvent<{ name: string }>).detail;
    if (detail?.name === variable) readResolved();
  }

  function select(keyword: string, close: () => void) {
    selector?.writeOverride(keyword);
    readResolved();
    close();
    onchange?.();
  }

  function handleReset() {
    readResolved();
    onchange?.();
  }

  onMount(() => {
    readResolved();
    document.addEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });
  onDestroy(() => {
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });

  let activeKey = $derived(options.find((o) => o.key === current)?.key ?? null);
  let activeLabel = $derived(options.find((o) => o.key === activeKey)?.label ?? current);
</script>

<UITokenSelector
  bind:this={selector}
  {variable}
  {component}
  {canBeLinked}
  {disabled}
  {selectionsLocked}
  dropdownMinWidth="12rem"
  onreset={handleReset}
  onvarChange={readResolved}
>
  {#snippet triggerTitle()}{activeLabel}{/snippet}
  {#snippet triggerMeta()}{current || '—'}{/snippet}

  {#snippet children({ close })}
    <UIOptionList>
      {#each options as opt (opt.key)}
        <UIOptionItem active={activeKey === opt.key} onclick={() => select(opt.key, close)}>
          {#snippet preview()}
            <span class="tt-sample" style="text-transform: {opt.key};">{opt.sample}</span>
          {/snippet}
          {#snippet label()}{opt.label}{/snippet}
        </UIOptionItem>
      {/each}
    </UIOptionList>
  {/snippet}
</UITokenSelector>

<style>
  .tt-sample {
    display: inline-block;
    min-width: 4.5rem;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-primary);
  }
</style>
