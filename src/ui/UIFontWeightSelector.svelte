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
    { key: 'thin', label: 'Thin', weight: '100' },
    { key: 'extralight', label: 'Extra Light', weight: '200' },
    { key: 'light', label: 'Light', weight: '300' },
    { key: 'normal', label: 'Normal', weight: '400' },
    { key: 'medium', label: 'Medium', weight: '500' },
    { key: 'semibold', label: 'Semibold', weight: '600' },
    { key: 'bold', label: 'Bold', weight: '700' },
    { key: 'extrabold', label: 'Extra Bold', weight: '800' },
    { key: 'black', label: 'Black', weight: '900' },
  ];

  let selector: UITokenSelector;
  let chosenKey: string | null = null;
  let currentWeight: string = '';

  function parseRef(value: string): string | null {
    const m = value.match(/var\((--font-weight-[a-z]+)\)/);
    if (!m) return null;
    const key = m[1].replace(/^--font-weight-/, '');
    return options.find((o) => o.key === key) ? key : null;
  }

  function readResolved() {
    currentWeight = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
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
    const target = `--font-weight-${key}`;
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
  <span slot="trigger-preview" class="weight-sample" style="font-weight: {currentWeight || 'inherit'};">A</span>
  <svelte:fragment slot="trigger-title">{activeLabel}</svelte:fragment>
  <svelte:fragment slot="trigger-meta">{currentWeight || '—'}</svelte:fragment>

  <svelte:fragment let:close>
    <UIOptionList>
      {#each options as opt}
        <UIOptionItem
          active={chosenKey === opt.key}
          on:click={() => selectOption(opt.key, close)}
        >
          <span slot="preview" class="weight-sample" style="font-weight: var(--font-weight-{opt.key});">A</span>
          <svelte:fragment slot="label">{opt.label}</svelte:fragment>
          <svelte:fragment slot="meta">{opt.weight}</svelte:fragment>
        </UIOptionItem>
      {/each}
    </UIOptionList>
  </svelte:fragment>
</UITokenSelector>

<style>
  .weight-sample {
    display: inline-block;
    width: 1.5rem;
    text-align: center;
    font-size: var(--ui-font-size-md);
    color: var(--ui-text-primary);
    line-height: 1;
  }
</style>
