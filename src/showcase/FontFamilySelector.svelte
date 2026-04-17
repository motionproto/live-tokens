<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { setCssVar, removeCssVar, CSS_VAR_CHANGE_EVENT } from '../lib/cssVarSync';

  const dispatch = createEventDispatcher();

  export let variable: string;
  export let label: string;

  const options = [
    { key: 'display', label: 'Display' },
    { key: 'sans', label: 'Sans' },
    { key: 'serif', label: 'Serif' },
    { key: 'mono', label: 'Mono' },
  ];

  let open = false;
  let container: HTMLElement;
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
    const target = `--font-${key}`;
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

  $: activeLabel = options.find((o) => o.key === chosenKey)?.label ?? '';
  $: displayFamily = firstFamilyName(currentStack);
</script>

<div class="font-family-selector" bind:this={container}>
  <button class="selector-trigger" on:click={toggle}>
    <div class="trigger-preview" style="font-family: {currentStack || 'inherit'};">Aa</div>
    <div class="trigger-text">
      {#if activeLabel}
        <span class="trigger-category">{activeLabel}</span>
      {/if}
      <span class="trigger-subtype">{displayFamily || '—'}</span>
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
            class:active={chosenKey === opt.key}
            on:click={() => selectOption(opt.key)}
          >
            <span class="option-preview" style="font-family: var(--font-{opt.key});">Aa</span>
            <span class="option-label">{opt.label}</span>
            <code class="option-size">var(--font-{opt.key})</code>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .font-family-selector {
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
    font-size: var(--ui-font-md);
    color: var(--ui-text-primary);
    line-height: 1;
  }

  .trigger-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 1;
    text-align: left;
    min-width: 0;
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
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

  .option-preview {
    flex-shrink: 0;
    font-size: var(--ui-font-md);
    color: var(--ui-text-primary);
    line-height: 1;
    width: 1.5rem;
    text-align: center;
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
