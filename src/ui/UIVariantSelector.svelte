<script lang="ts" generics="T extends { key: string; label?: string; value?: string }">
  import { onMount, createEventDispatcher } from 'svelte';
  import { resolveAliasChain } from '../lib/tokenRegistry';
  import UITokenSelector from './UITokenSelector.svelte';
  import UIOptionList from './UIOptionList.svelte';

  const dispatch = createEventDispatcher();

  export let variable: string;
  export let component: string | undefined = undefined;
  export let canBeShared: boolean = false;
  export let disabled: boolean = false;
  export let dropdownMinWidth: string = '12rem';
  export let dropdownMaxWidth: string = '';
  /** CSS var prefix that, joined with an option `key`, forms the target var (e.g. `--font-weight-`). */
  export let varPrefix: string;
  /** Selectable options. Each must have a unique `key`. */
  export let options: ReadonlyArray<T>;

  let selector: UITokenSelector;
  let chosenKey: string | null = null;
  let currentValue: string = '';

  $: validKeys = new Set(options.map((o) => o.key));
  $: refMatcher = (() => {
    const escaped = varPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`var\\((${escaped}[^)\\s]+)\\)`);
  })();

  function parseRef(value: string): string | null {
    const m = value.match(refMatcher);
    if (!m) return null;
    const key = m[1].slice(varPrefix.length);
    return validKeys.has(key) ? key : null;
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
    // Last-ditch fallback: match the resolved value against an option's `value`
    // (lets us highlight a variant even when the default is a literal, not an alias).
    const matchedByValue = options.find((o) => o.value !== undefined && o.value === currentValue);
    chosenKey = matchedByValue ? matchedByValue.key : null;
  }

  function handleReset() {
    chosenKey = null;
    readResolved();
    dispatch('change');
  }

  function selectKey(key: string, close: () => void) {
    const target = `${varPrefix}${key}`;
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

  $: activeOption = (options.find((o) => o.key === chosenKey) ?? null) as T | null;
</script>

<UITokenSelector
  bind:this={selector}
  {variable}
  {component}
  {canBeShared}
  {disabled}
  {dropdownMinWidth}
  {dropdownMaxWidth}
  on:reset={handleReset}
  on:var-change={initFromCurrent}
>
  <svelte:fragment slot="trigger-title">
    <slot name="trigger-title" {activeOption}>{activeOption?.label ?? ''}</slot>
  </svelte:fragment>
  <svelte:fragment slot="trigger-meta">
    <slot name="trigger-meta" {currentValue} {activeOption}>{currentValue || '—'}</slot>
  </svelte:fragment>

  <svelte:fragment let:close>
    <UIOptionList>
      {#each options as opt (opt.key)}
        <slot
          name="option"
          {opt}
          active={chosenKey === opt.key}
          select={() => selectKey(opt.key, close)}
        />
      {/each}
      <slot name="extras" {close} />
    </UIOptionList>
  </svelte:fragment>
</UITokenSelector>
