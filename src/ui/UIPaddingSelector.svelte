<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import UITokenSelector from './UITokenSelector.svelte';
  import UIOptionList from './UIOptionList.svelte';
  import UIOptionItem from './UIOptionItem.svelte';
  import { setCssVar, removeCssVar, CSS_VAR_CHANGE_EVENT } from '../lib/cssVarSync';
  import {
    editorState,
    setComponentAlias,
    clearComponentAlias,
  } from '../lib/editorStore';

  const dispatch = createEventDispatcher();

  export let variable: string;
  export let component: string | undefined = undefined;
  export let canBeShared: boolean = false;
  export let disabled: boolean = false;

  // canBeShared/canBeShared accept the prop for symmetry with other selectors;
  // padding is split-side, not variant-shared, so we don't render the link toggle.
  void canBeShared;

  type Side = 'top' | 'right' | 'bottom' | 'left';
  const SIDES: readonly Side[] = ['top', 'right', 'bottom', 'left'];

  function sideVar(s: Side): string {
    return `${variable}-${s}`;
  }

  const options = [
    { key: '0', label: 'None', size: '0' },
    { key: '2', label: '2XS', size: '0.125rem' },
    { key: '4', label: 'XS', size: '0.25rem' },
    { key: '6', label: 'Small', size: '0.375rem' },
    { key: '8', label: 'Medium', size: '0.5rem' },
    { key: '10', label: 'Large', size: '0.625rem' },
    { key: '12', label: 'XL', size: '0.75rem' },
    { key: '16', label: '2XL', size: '1rem' },
    { key: '20', label: '3XL', size: '1.25rem' },
    { key: '24', label: '4XL', size: '1.5rem' },
    { key: '32', label: '5XL', size: '2rem' },
    { key: '48', label: '6XL', size: '3rem' },
  ];

  function tokenForKey(key: string): string {
    return `--space-${key}`;
  }

  function readAlias(v: string): string {
    if (component) {
      return $editorState.components[component]?.aliases?.[v] ?? '';
    }
    const inline = document.documentElement.style.getPropertyValue(v).trim();
    const m = inline.match(/var\((--space-[a-z0-9]+)\)/);
    return m ? m[1] : '';
  }

  function parseKey(value: string): string | null {
    if (!value) return null;
    const m = value.match(/^--space-([a-z0-9]+)$/);
    if (!m) return null;
    return options.find((o) => o.key === m[1]) ? m[1] : null;
  }

  function readResolved(v: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  }

  function writeAlias(v: string, semantic: string | null) {
    if (component) {
      if (semantic) setComponentAlias(component, v, semantic);
      else clearComponentAlias(component, v);
      return;
    }
    if (semantic) setCssVar(v, `var(${semantic})`);
    else removeCssVar(v);
  }

  let mode: 'single' | 'sides' = 'single';
  let chosenKey: string | null = null;
  let resolvedSize = '';
  let sideKeys: Record<Side, string | null> = { top: null, right: null, bottom: null, left: null };
  let sideResolved: Record<Side, string> = { top: '', right: '', bottom: '', left: '' };

  function refreshFromState() {
    chosenKey = parseKey(readAlias(variable));
    resolvedSize = readResolved(variable);
    let anySide = false;
    const nextKeys: Record<Side, string | null> = { top: null, right: null, bottom: null, left: null };
    const nextResolved: Record<Side, string> = { top: '', right: '', bottom: '', left: '' };
    for (const s of SIDES) {
      const a = readAlias(sideVar(s));
      nextKeys[s] = parseKey(a);
      nextResolved[s] = readResolved(sideVar(s));
      if (a) anySide = true;
    }
    sideKeys = nextKeys;
    sideResolved = nextResolved;
    mode = anySide ? 'sides' : 'single';
  }

  function selectSingle(key: string, close: () => void) {
    writeAlias(variable, tokenForKey(key));
    close();
    dispatch('change');
  }

  function selectSide(s: Side, key: string, close: () => void) {
    writeAlias(sideVar(s), tokenForKey(key));
    close();
    dispatch('change');
  }

  function handleResetAll() {
    for (const s of SIDES) writeAlias(sideVar(s), null);
    writeAlias(variable, null);
    dispatch('change');
  }

  function handleResetSide(s: Side) {
    writeAlias(sideVar(s), null);
    dispatch('change');
  }

  function splitToSides() {
    if (disabled) return;
    const seed = readAlias(variable) || tokenForKey('4');
    for (const s of SIDES) writeAlias(sideVar(s), seed);
    dispatch('change');
  }

  function mergeToSingle() {
    if (disabled) return;
    const seed = readAlias(sideVar('top')) || readAlias(variable);
    if (seed && !readAlias(variable)) writeAlias(variable, seed);
    for (const s of SIDES) writeAlias(sideVar(s), null);
    dispatch('change');
  }

  function handleVarChange() {
    refreshFromState();
  }

  onMount(() => {
    refreshFromState();
    document.addEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });

  onDestroy(() => {
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });

  $: if ($editorState) refreshFromState();

  $: activeLabel = options.find((o) => o.key === chosenKey)?.label ?? '';
  $: sideLabels = {
    top: options.find((o) => o.key === sideKeys.top)?.label ?? '',
    right: options.find((o) => o.key === sideKeys.right)?.label ?? '',
    bottom: options.find((o) => o.key === sideKeys.bottom)?.label ?? '',
    left: options.find((o) => o.key === sideKeys.left)?.label ?? '',
  } as Record<Side, string>;
</script>

<div class="ui-padding-selector" class:disabled>
  {#if mode === 'single'}
    <div class="row">
      <div class="trigger-cell">
        <UITokenSelector
          {variable}
          {component}
          canBeShared={false}
          {disabled}
          on:reset={handleResetAll}
          on:var-change={handleVarChange}
        >
          <span slot="trigger-preview" class="pad-preview" aria-hidden="true">
            <span class="pad-preview-inner"></span>
          </span>
          <svelte:fragment slot="trigger-title">{activeLabel || '—'}</svelte:fragment>
          <svelte:fragment slot="trigger-meta">{resolvedSize || '—'}</svelte:fragment>

          <svelte:fragment let:close>
            <UIOptionList>
              {#each options as opt}
                <UIOptionItem
                  active={chosenKey === opt.key}
                  on:click={() => selectSingle(opt.key, close)}
                >
                  <svelte:fragment slot="label">{opt.label}</svelte:fragment>
                  <svelte:fragment slot="meta">{opt.size}</svelte:fragment>
                </UIOptionItem>
              {/each}
            </UIOptionList>
          </svelte:fragment>
        </UITokenSelector>
      </div>
      <button
        type="button"
        class="mode-btn"
        on:click={splitToSides}
        title="Set each side independently"
        {disabled}
      >
        <i class="fas fa-border-all" aria-hidden="true"></i>
      </button>
    </div>
  {:else}
    <div class="sides-stack">
      <div class="sides-header">
        <button
          type="button"
          class="mode-btn merge"
          on:click={mergeToSingle}
          title="Use the same value for all sides"
          {disabled}
        >
          <i class="fas fa-square" aria-hidden="true"></i>
          <span>All sides</span>
        </button>
      </div>
      {#each SIDES as s}
        <div class="side-row">
          <span class="side-label">{s}</span>
          <UITokenSelector
            variable={sideVar(s)}
            {component}
            canBeShared={false}
            {disabled}
            dropdownMinWidth="12rem"
            on:reset={() => handleResetSide(s)}
            on:var-change={handleVarChange}
          >
            <span slot="trigger-preview" class="pad-preview side-preview side-preview-{s}" aria-hidden="true">
              <span class="pad-preview-inner"></span>
            </span>
            <svelte:fragment slot="trigger-title">{sideLabels[s] || '—'}</svelte:fragment>
            <svelte:fragment slot="trigger-meta">{sideResolved[s] || '—'}</svelte:fragment>

            <svelte:fragment let:close>
              <UIOptionList>
                {#each options as opt}
                  <UIOptionItem
                    active={sideKeys[s] === opt.key}
                    on:click={() => selectSide(s, opt.key, close)}
                  >
                    <svelte:fragment slot="label">{opt.label}</svelte:fragment>
                    <svelte:fragment slot="meta">{opt.size}</svelte:fragment>
                  </UIOptionItem>
                {/each}
              </UIOptionList>
            </svelte:fragment>
          </UITokenSelector>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .ui-padding-selector {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .ui-padding-selector.disabled {
    opacity: 0.4;
  }

  .row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-4);
  }

  .trigger-cell {
    flex: 1;
    min-width: 0;
  }

  .mode-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-6) var(--ui-space-8);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-xs);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    flex-shrink: 0;
  }

  .mode-btn:hover:not(:disabled) {
    border-color: var(--ui-border-strong);
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
  }

  .mode-btn:disabled {
    cursor: not-allowed;
  }

  .sides-stack {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    padding: var(--ui-space-6);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-md);
  }

  .sides-header {
    display: flex;
    justify-content: flex-end;
  }

  .side-row {
    display: grid;
    grid-template-columns: 3.25rem 1fr;
    align-items: center;
    gap: var(--ui-space-6);
  }

  .side-label {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .pad-preview {
    width: 1.25rem;
    height: 1.25rem;
    border: 1px solid var(--ui-text-secondary);
    border-radius: 2px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
  }

  .pad-preview-inner {
    width: 0.5rem;
    height: 0.5rem;
    background: var(--ui-text-secondary);
    border-radius: 1px;
  }

  .side-preview-top {
    align-items: flex-end;
  }
  .side-preview-right {
    justify-content: flex-start;
  }
  .side-preview-bottom {
    align-items: flex-start;
  }
  .side-preview-left {
    justify-content: flex-end;
  }
</style>
