<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { resolveAliasChain } from '../lib/tokenRegistry';
  import UITokenSelector from './UITokenSelector.svelte';
  import UIOptionList from './UIOptionList.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  const dispatch = createEventDispatcher();

  export let variable: string;
  export let component: string | undefined = undefined;
  export let canBeShared: boolean = false;
  export let disabled: boolean = false;

  const options = [
    { key: 'tight', label: 'Tight', value: '1' },
    { key: 'snug', label: 'Snug', value: '1.2' },
    { key: 'normal', label: 'Normal', value: '1.4' },
    { key: 'relaxed', label: 'Relaxed', value: '1.5' },
    { key: 'loose', label: 'Loose', value: '2' },
  ];

  let selector: UITokenSelector;
  let chosenKey: string | null = null;
  let currentValue: string = '';

  function parseRef(value: string): string | null {
    const m = value.match(/var\((--line-height-[a-z]+)\)/);
    if (!m) return null;
    const key = m[1].replace(/^--line-height-/, '');
    return options.find((o) => o.key === key) ? key : null;
  }

  function readResolved() {
    currentValue = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  }

  function initFromCurrent() {
    readResolved();
    const raw = document.documentElement.style.getPropertyValue(variable).trim();
    if (raw) {
      const key = parseRef(raw);
      if (key) {
        chosenKey = key;
        return;
      }
    }
    for (const alias of resolveAliasChain(variable)) {
      const key = parseRef(`var(${alias})`);
      if (key) {
        chosenKey = key;
        return;
      }
    }
    chosenKey = null;
  }

  function handleReset() {
    chosenKey = null;
    readResolved();
    dispatch('change');
  }

  function selectOption(key: string, close: () => void) {
    const target = `--line-height-${key}`;
    if (target === variable) {
      selector.writeOverride(null);
      chosenKey = null;
    } else {
      selector.writeOverride(target);
      chosenKey = key;
    }
    readResolved();
    close();
    dispatch('change');
  }

  onMount(initFromCurrent);

  $: activeLabel = options.find((o) => o.key === chosenKey)?.label ?? '';
</script>

<UITokenSelector
  bind:this={selector}
  {variable}
  {component}
  {canBeShared}
  {disabled}
  dropdownMinWidth="12rem"
  on:reset={handleReset}
  on:var-change={initFromCurrent}
>
  <svelte:fragment slot="trigger-title">{activeLabel}</svelte:fragment>
  <svelte:fragment slot="trigger-meta">{currentValue || '—'}</svelte:fragment>

  <svelte:fragment let:close>
    <UIOptionList>
      {#each options as opt}
        <UIOptionItem
          active={chosenKey === opt.key}
          on:click={() => selectOption(opt.key, close)}
        >
          <span slot="preview" class="lh-sample" style="line-height: var(--line-height-{opt.key});">≡</span>
          <svelte:fragment slot="label">{opt.label}</svelte:fragment>
          <svelte:fragment slot="meta">{opt.value}</svelte:fragment>
        </UIOptionItem>
      {/each}
    </UIOptionList>
  </svelte:fragment>
</UITokenSelector>

<style>
  .lh-sample {
    display: inline-block;
    width: 1.5rem;
    text-align: center;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
  }
</style>
