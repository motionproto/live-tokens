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
    { key: '0', label: 'None', height: '0px' },
    { key: '8', label: 'XS', height: '0.5rem' },
    { key: '10', label: 'Small', height: '0.625rem' },
    { key: '12', label: 'Medium', height: '0.75rem' },
    { key: '16', label: 'Large', height: '1rem' },
    { key: '20', label: 'XL', height: '1.25rem' },
    { key: '24', label: '2XL', height: '1.5rem' },
    { key: 'full', label: 'Full', height: '100%' },
  ];

  const VIEW = 24;

  let selector: UITokenSelector;
  let chosenKey: string | null = null;
  let currentSize: string = '';

  function parseRef(value: string): string | null {
    const m = value.match(/var\((--space-[a-z0-9]+)\)/);
    if (!m) return null;
    const key = m[1].replace(/^--space-/, '');
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
    const target = `--space-${key}`;
    selector.writeOverride(target);
    chosenKey = key;
    readResolved();
    close();
    dispatch('change');
  }

  function handleVarChange() {
    readResolved();
    const raw = document.documentElement.style.getPropertyValue(variable).trim();
    chosenKey = raw ? parseRef(raw) : null;
  }

  function lineHeightPx(value: string): number {
    if (/%$/.test(value)) return VIEW - 4;
    const remMatch = value.match(/([\d.]+)rem/);
    if (remMatch) return parseFloat(remMatch[1]) * 16;
    const pxMatch = value.match(/([\d.]+)px/);
    if (pxMatch) return parseFloat(pxMatch[1]);
    return 0;
  }

  onMount(initFromCurrent);

  $: activeKey = chosenKey ?? (options.find((o) => o.height === currentSize)?.key ?? null);
  $: activeLabel = options.find((o) => o.key === activeKey)?.label ?? '';
  $: triggerHeight = Math.min(lineHeightPx(currentSize), VIEW - 4);
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
  <svg slot="trigger-preview" class="line-svg" viewBox="0 0 {VIEW} {VIEW}" aria-hidden="true">
    <line x1={VIEW / 2} y1={(VIEW - triggerHeight) / 2} x2={VIEW / 2} y2={(VIEW + triggerHeight) / 2} />
  </svg>
  <svelte:fragment slot="trigger-title">{activeLabel}</svelte:fragment>
  <svelte:fragment slot="trigger-meta">{currentSize || '—'}</svelte:fragment>

  <svelte:fragment let:close>
    <UIOptionList>
      {#each options as opt}
        {@const h = Math.min(lineHeightPx(opt.height), VIEW - 4)}
        <UIOptionItem
          active={activeKey === opt.key}
          on:click={() => selectOption(opt.key, close)}
        >
          <svg
            slot="preview"
            class="line-svg"
            class:active={activeKey === opt.key}
            viewBox="0 0 {VIEW} {VIEW}"
            aria-hidden="true"
          >
            <line x1={VIEW / 2} y1={(VIEW - h) / 2} x2={VIEW / 2} y2={(VIEW + h) / 2} />
          </svg>
          <svelte:fragment slot="label">{opt.label}</svelte:fragment>
          <svelte:fragment slot="meta">{opt.height}</svelte:fragment>
        </UIOptionItem>
      {/each}
    </UIOptionList>
  </svelte:fragment>
</UITokenSelector>

<style>
  .line-svg {
    width: 1.25rem;
    height: 1.25rem;
    stroke: var(--ui-text-primary);
    stroke-width: 2;
    stroke-linecap: round;
  }

  .line-svg.active {
    stroke: var(--ui-text-accent);
  }
</style>
