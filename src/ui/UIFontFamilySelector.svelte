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
    { key: 'display', label: 'Display' },
    { key: 'sans', label: 'Sans' },
    { key: 'serif', label: 'Serif' },
    { key: 'mono', label: 'Mono' },
  ];

  let selector: UITokenSelector;
  let chosenKey: string | null = null;
  let currentStack: string = '';

  function parseRef(value: string): string | null {
    const m = value.match(/var\((--font-[a-z]+)\)/);
    if (!m) return null;
    const key = m[1].replace(/^--font-/, '');
    return options.find((o) => o.key === key) ? key : null;
  }

  function firstFamilyName(stack: string): string {
    if (!stack) return '';
    const first = stack.split(',')[0].trim();
    return first.replace(/^['"]|['"]$/g, '');
  }

  function readResolved() {
    currentStack = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
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
    const target = `--font-${key}`;
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
  $: displayFamily = firstFamilyName(currentStack);
</script>

<UITokenSelector
  bind:this={selector}
  {variable}
  {component}
  {canBeShared}
  {disabled}
  dropdownMinWidth="14rem"
  on:reset={handleReset}
  on:var-change={initFromCurrent}
>
  <span slot="trigger-preview" class="font-sample" style="font-family: {currentStack || 'inherit'};">Aa</span>
  <svelte:fragment slot="trigger-title">{activeLabel}</svelte:fragment>
  <svelte:fragment slot="trigger-meta">{displayFamily || '—'}</svelte:fragment>

  <svelte:fragment let:close>
    <UIOptionList>
      {#each options as opt}
        <UIOptionItem
          active={chosenKey === opt.key}
          on:click={() => selectOption(opt.key, close)}
        >
          <span slot="preview" class="font-sample" style="font-family: var(--font-{opt.key});">Aa</span>
          <svelte:fragment slot="label">{opt.label}</svelte:fragment>
          <svelte:fragment slot="meta">var(--font-{opt.key})</svelte:fragment>
        </UIOptionItem>
      {/each}
    </UIOptionList>
  </svelte:fragment>
</UITokenSelector>

<style>
  .font-sample {
    display: inline-block;
    width: 1.5rem;
    text-align: center;
    font-size: var(--ui-font-md);
    color: var(--ui-text-primary);
    line-height: 1;
  }
</style>
