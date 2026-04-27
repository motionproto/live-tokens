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
    { key: 'xs', label: 'XS' },
    { key: 'sm', label: 'SM' },
    { key: 'md', label: 'MD' },
    { key: 'lg', label: 'LG' },
    { key: 'xl', label: 'XL' },
    { key: '2xl', label: '2XL' },
    { key: '3xl', label: '3XL' },
    { key: '4xl', label: '4XL' },
    { key: '5xl', label: '5XL' },
    { key: '6xl', label: '6XL' },
  ];

  let selector: UITokenSelector;
  let chosenKey: string | null = null;
  let currentSize: string = '';

  function parseRef(value: string): string | null {
    const m = value.match(/var\((--font-size-[a-z0-9]+)\)/);
    if (!m) return null;
    const key = m[1].replace(/^--font-size-/, '');
    return options.find((o) => o.key === key) ? key : null;
  }

  function readResolved() {
    currentSize = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
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
    const target = `--font-size-${key}`;
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
  <svelte:fragment slot="trigger-meta">{currentSize || '—'}</svelte:fragment>

  <svelte:fragment let:close>
    <UIOptionList>
      {#each options as opt}
        <UIOptionItem
          active={chosenKey === opt.key}
          on:click={() => selectOption(opt.key, close)}
        >
          <span slot="preview" class="size-sample-option" style="font-size: var(--font-size-{opt.key});">A</span>
          <svelte:fragment slot="label">{opt.label}</svelte:fragment>
          <svelte:fragment slot="meta">var(--font-size-{opt.key})</svelte:fragment>
        </UIOptionItem>
      {/each}
    </UIOptionList>
  </svelte:fragment>
</UITokenSelector>

<style>
  .size-sample-option {
    display: inline-block;
    width: 1.5rem;
    max-height: 1.5rem;
    overflow: hidden;
    text-align: center;
    color: var(--ui-text-primary);
    line-height: 1;
  }
</style>
