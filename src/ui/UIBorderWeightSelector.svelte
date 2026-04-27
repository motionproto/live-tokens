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
    { key: 'none', label: 'None', width: '0' },
    { key: 'thin', label: 'Thin', width: '1px' },
    { key: 'default', label: 'Default', width: '2px' },
    { key: 'thick', label: 'Thick', width: '3px' },
    { key: 'thicker', label: 'Thicker', width: '4px' },
  ];

  const VIEW = 24;
  const MAX_STROKE = 6;

  function pxOf(value: string): number {
    if (!value) return 0;
    const pxMatch = value.match(/([\d.]+)px/);
    if (pxMatch) return parseFloat(pxMatch[1]);
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
    return 0;
  }

  function strokeFor(widthValue: string): number {
    const px = pxOf(widthValue);
    return Math.max(0, Math.min(px, MAX_STROKE));
  }

  let selector: UITokenSelector;
  let chosenKey: string | null = null;
  let currentSize: string = '';

  function parseRef(value: string): string | null {
    const m = value.match(/var\((--border-width-[a-z0-9]+)\)/);
    if (!m) return null;
    const key = m[1].replace(/^--border-width-/, '');
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
    const target = `--border-width-${key}`;
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

  $: activeKey = chosenKey ?? (options.find((o) => o.width === currentSize)?.key ?? null);
  $: activeLabel = options.find((o) => o.key === activeKey)?.label ?? '';
  $: triggerStroke = strokeFor(currentSize);
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
  <svg slot="trigger-preview" class="weight-svg" viewBox="0 0 {VIEW} {VIEW}" aria-hidden="true" style="stroke-width: {triggerStroke};">
    <rect x="2" y="2" width={VIEW - 4} height={VIEW - 4} />
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
          <svelte:fragment slot="label">{opt.label}</svelte:fragment>
          <svelte:fragment slot="meta">{opt.width}</svelte:fragment>
        </UIOptionItem>
      {/each}
    </UIOptionList>
  </svelte:fragment>
</UITokenSelector>

<style>
  .weight-svg {
    width: 1.25rem;
    height: 1.25rem;
    fill: none;
    stroke: var(--ui-text-primary);
    stroke-linecap: square;
    stroke-linejoin: miter;
  }

  .weight-svg.active {
    stroke: var(--ui-text-accent);
  }
</style>
