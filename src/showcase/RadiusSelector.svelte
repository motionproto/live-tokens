<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { setCssVar, removeCssVar, CSS_VAR_CHANGE_EVENT } from '../lib/cssVarSync';

  const dispatch = createEventDispatcher();

  export let variable: string;
  export let label: string;

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

  let open = false;
  let container: HTMLElement;
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

  function toggle() {
    open = !open;
  }

  function resetVariable() {
    removeCssVar(variable);
    chosenKey = null;
    readResolved();
    open = false;
    dispatch('change');
  }

  function selectOption(key: string) {
    const target = `--radius-${key}`;
    if (target === variable) {
      removeCssVar(variable);
      chosenKey = null;
    } else {
      setCssVar(variable, `var(${target})`);
      chosenKey = key;
    }
    readResolved();
    open = false;
    dispatch('change');
  }

  function handleClickOutside(e: MouseEvent) {
    if (container && !container.contains(e.target as Node)) open = false;
  }

  function handleVarChange(e: Event) {
    const detail = (e as CustomEvent<{ name: string }>).detail;
    if (detail?.name === variable) {
      readResolved();
      const raw = document.documentElement.style.getPropertyValue(variable).trim();
      chosenKey = raw ? parseRef(raw) : null;
    }
  }

  onMount(() => {
    initFromCurrent();
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside, true);
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });

  $: displayValue = chosenKey ? `radius-${chosenKey}` : '';
  $: activeKey = chosenKey ?? (options.find((o) => o.size === currentSize)?.key ?? null);
  $: activeLabel = options.find((o) => o.key === activeKey)?.label ?? '';
</script>

<div class="radius-selector" bind:this={container}>
  <button class="selector-trigger" on:click={toggle}>
    <div class="trigger-preview">
      <svg class="corner-svg" viewBox="0 0 {VIEW} {VIEW}" aria-hidden="true">
        <path d={cornerPath(remToPx(currentSize))} />
      </svg>
    </div>
    <div class="trigger-text">
      {#if activeLabel}
        <span class="trigger-category">{activeLabel}</span>
      {/if}
      <span class="trigger-subtype">{currentSize || '—'}</span>
    </div>
    <i class="fas fa-chevron-down trigger-chevron" class:open></i>
  </button>

  {#if open}
    <div class="selector-dropdown">
      <div class="dropdown-header">
        <code class="variable-name">{variable}</code>
        <button class="reset-btn" on:click={resetVariable} title="Reset to default">
          <i class="fas fa-undo"></i>
        </button>
      </div>
      <div class="option-list">
        {#each options as opt}
          <button
            class="option-item"
            class:active={activeKey === opt.key}
            on:click={() => selectOption(opt.key)}
          >
            <svg class="corner-svg option-preview" viewBox="0 0 {VIEW} {VIEW}" aria-hidden="true">
              <path d={cornerPath(remToPx(opt.size))} />
            </svg>
            <span class="option-label">{opt.label}</span>
            <code class="option-size">{opt.size}</code>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .radius-selector {
    position: relative;
  }

  .selector-trigger {
    display: flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-md);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    min-width: 10rem;
  }

  .selector-trigger:hover {
    border-color: var(--ui-border-strong);
    background: var(--ui-surface-high);
  }

  .trigger-preview {
    width: 1.5rem;
    height: 1.5rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .corner-svg {
    width: 1.25rem;
    height: 1.25rem;
    fill: none;
    stroke: var(--ui-text-primary);
    stroke-width: 2.5;
    stroke-linecap: square;
    stroke-linejoin: miter;
  }

  .trigger-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    text-align: left;
  }

  .trigger-category {
    font-size: var(--ui-font-sm);
    color: var(--ui-text-primary);
    font-weight: var(--ui-font-weight-medium);
  }

  .trigger-subtype {
    font-size: var(--ui-font-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
  }

  .trigger-chevron {
    font-size: 0.5rem;
    color: var(--ui-text-muted);
    transition: transform var(--ui-transition-fast);
  }

  .trigger-chevron.open {
    transform: rotate(180deg);
  }

  .selector-dropdown {
    position: absolute;
    top: calc(100% + var(--ui-space-4));
    left: 0;
    min-width: 14rem;
    background: var(--ui-surface-higher);
    border: 1px solid var(--ui-border-medium);
    border-radius: var(--ui-radius-md);
    box-shadow: var(--ui-shadow-lg);
    z-index: 10;
    overflow: hidden;
  }

  .dropdown-header {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-6) var(--ui-space-8);
    border-bottom: 1px solid var(--ui-border-faint);
  }

  .variable-name {
    flex: 1;
    font-size: var(--ui-font-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .reset-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0;
    background: none;
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: 0.625rem;
    cursor: pointer;
    flex-shrink: 0;
    transition: all var(--ui-transition-fast);
  }

  .reset-btn:hover {
    background: var(--ui-hover);
    border-color: var(--ui-border-strong);
    color: var(--ui-text-primary);
  }

  .option-list {
    display: flex;
    flex-direction: column;
    padding: var(--ui-space-4);
  }

  .option-item {
    display: flex;
    align-items: baseline;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-8);
    background: none;
    border: 1px solid transparent;
    border-radius: var(--ui-radius-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .option-item:hover {
    background: var(--ui-hover);
  }

  .option-item.active {
    background: var(--ui-hover-high);
    border-color: var(--ui-text-accent);
    box-shadow: inset 3px 0 0 var(--ui-text-accent);
  }

  .option-item.active .option-label {
    color: var(--ui-text-accent);
    font-weight: var(--ui-font-weight-semibold);
  }

  .option-item.active .option-size {
    color: var(--ui-text-primary);
  }

  .option-preview {
    flex-shrink: 0;
  }

  .option-item.active .corner-svg {
    stroke: var(--ui-text-accent);
  }

  .option-label {
    flex: 1;
    font-size: var(--ui-font-sm);
    color: var(--ui-text-primary);
    text-align: left;
  }

  .option-size {
    font-size: var(--ui-font-xs);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }
</style>
