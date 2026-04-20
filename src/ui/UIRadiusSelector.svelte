<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import UITokenSelector from './UITokenSelector.svelte';
  import UIOptionList from './UIOptionList.svelte';
  import UIOptionItem from './UIOptionItem.svelte';

  const dispatch = createEventDispatcher();

  export let variable: string;
  export let component: string | undefined = undefined;
  export let canBeShared: boolean = false;
  export let disabled: boolean = false;

  const options = [
    { key: 'none', label: 'None', size: '0' },
    { key: 'sm', label: 'Small', size: '0.125rem' },
    { key: 'md', label: 'Medium', size: '0.25rem' },
    { key: 'lg', label: 'Large', size: '0.375rem' },
    { key: 'xl', label: 'X-Large', size: '0.5rem' },
    { key: '2xl', label: '2X-Large', size: '0.625rem' },
    { key: '3xl', label: '3X-Large', size: '0.75rem' },
    { key: '4xl', label: '4X-Large', size: '1.25rem' },
    { key: 'full', label: 'Full', size: '9999px' },
  ];

  const VIEW = 24;

  function remToPx(value: string): number {
    if (!value) return 0;
    const remMatch = value.match(/([\d.]+)rem/);
    if (remMatch) return Math.min(parseFloat(remMatch[1]) * 16, VIEW);
    const pxMatch = value.match(/([\d.]+)px/);
    if (pxMatch) return Math.min(parseFloat(pxMatch[1]), VIEW);
    const num = parseFloat(value);
    if (!isNaN(num)) return Math.min(num, VIEW);
    return 0;
  }

  function cornerPath(radiusPx: number): string {
    const r = Math.max(0, Math.min(radiusPx, VIEW));
    return `M 0 ${VIEW} L 0 ${r} A ${r} ${r} 0 0 1 ${r} 0 L ${VIEW} 0`;
  }

  let selector: UITokenSelector;
  let chosenKey: string | null = null;
  let currentSize: string = '';

  function parseRef(value: string): string | null {
    const m = value.match(/var\((--radius-[a-z0-9]+)\)/);
    if (!m) return null;
    const key = m[1].replace(/^--radius-/, '');
    return options.find((o) => o.key === key) ? key : null;
  }

  function readResolved() {
    currentSize = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  }

  function initFromCurrent() {
    readResolved();
    const raw = document.documentElement.style.getPropertyValue(variable).trim();
    if (!raw) return;
    const key = parseRef(raw);
    if (key) chosenKey = key;
  }

  function handleReset() {
    chosenKey = null;
    readResolved();
    dispatch('change');
  }

  function selectOption(key: string, close: () => void) {
    const target = `--radius-${key}`;
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

  function handleVarChange() {
    readResolved();
    const raw = document.documentElement.style.getPropertyValue(variable).trim();
    chosenKey = raw ? parseRef(raw) : null;
  }

  onMount(initFromCurrent);

  $: activeKey = chosenKey ?? (options.find((o) => o.size === currentSize)?.key ?? null);
  $: activeLabel = options.find((o) => o.key === activeKey)?.label ?? '';
</script>

<UITokenSelector
  bind:this={selector}
  {variable}
  {component}
  {canBeShared}
  {disabled}
  on:reset={handleReset}
  on:var-change={handleVarChange}
>
  <svg slot="trigger-preview" class="radius-svg" viewBox="0 0 {VIEW} {VIEW}" aria-hidden="true">
    <path d={cornerPath(remToPx(currentSize))} />
  </svg>
  <svelte:fragment slot="trigger-title">{activeLabel}</svelte:fragment>
  <svelte:fragment slot="trigger-meta">{currentSize || '—'}</svelte:fragment>

  <svelte:fragment let:close>
    <UIOptionList>
      {#each options as opt}
        <UIOptionItem
          active={activeKey === opt.key}
          on:click={() => selectOption(opt.key, close)}
        >
          <svg
            slot="preview"
            class="radius-svg"
            class:active={activeKey === opt.key}
            viewBox="0 0 {VIEW} {VIEW}"
            aria-hidden="true"
          >
            <path d={cornerPath(remToPx(opt.size))} />
          </svg>
          <svelte:fragment slot="label">{opt.label}</svelte:fragment>
          <svelte:fragment slot="meta">{opt.size}</svelte:fragment>
        </UIOptionItem>
      {/each}
    </UIOptionList>
  </svelte:fragment>
</UITokenSelector>

<style>
  .radius-svg {
    width: 1.25rem;
    height: 1.25rem;
    fill: none;
    stroke: var(--ui-text-primary);
    stroke-width: 2.5;
    stroke-linecap: square;
    stroke-linejoin: miter;
  }

  .radius-svg.active {
    stroke: var(--ui-text-accent);
  }
</style>
