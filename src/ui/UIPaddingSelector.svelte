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
  /** When 'sides', renders as a self-contained field group spanning all parent grid columns. */
  export let mode: 'single' | 'sides' = 'single';
  /** Legend text for the field group when mode='sides'. */
  export let rowLabel: string = 'padding';

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

  let chosenKey: string | null = null;
  let resolvedSize = '';
  let sideKeys: Record<Side, string | null> = { top: null, right: null, bottom: null, left: null };
  let sideResolved: Record<Side, string> = { top: '', right: '', bottom: '', left: '' };

  function refreshFromState() {
    chosenKey = parseKey(readAlias(variable));
    resolvedSize = readResolved(variable);
    const nextKeys: Record<Side, string | null> = { top: null, right: null, bottom: null, left: null };
    const nextResolved: Record<Side, string> = { top: '', right: '', bottom: '', left: '' };
    for (const s of SIDES) {
      nextKeys[s] = parseKey(readAlias(sideVar(s)));
      nextResolved[s] = readResolved(sideVar(s));
    }
    sideKeys = nextKeys;
    sideResolved = nextResolved;
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

  $: activeKey = chosenKey ?? (options.find((o) => o.size === resolvedSize)?.key ?? null);
  $: activeLabel = options.find((o) => o.key === activeKey)?.label ?? '';
  $: sideActiveKey = {
    top: sideKeys.top ?? (options.find((o) => o.size === sideResolved.top)?.key ?? null),
    right: sideKeys.right ?? (options.find((o) => o.size === sideResolved.right)?.key ?? null),
    bottom: sideKeys.bottom ?? (options.find((o) => o.size === sideResolved.bottom)?.key ?? null),
    left: sideKeys.left ?? (options.find((o) => o.size === sideResolved.left)?.key ?? null),
  } as Record<Side, string | null>;
  $: sideLabels = {
    top: options.find((o) => o.key === sideActiveKey.top)?.label ?? '',
    right: options.find((o) => o.key === sideActiveKey.right)?.label ?? '',
    bottom: options.find((o) => o.key === sideActiveKey.bottom)?.label ?? '',
    left: options.find((o) => o.key === sideActiveKey.left)?.label ?? '',
  } as Record<Side, string>;
</script>

{#if mode === 'sides'}
  <fieldset class="padding-fieldgroup" class:disabled>
    <legend class="padding-legend">{rowLabel}</legend>
    <div class="merge-row">
      <button
        type="button"
        class="merge-btn"
        on:click={mergeToSingle}
        title="Use the same value for all sides"
        {disabled}
      >
        <i class="fas fa-square" aria-hidden="true"></i>
        <span>Merge</span>
      </button>
    </div>
    <div class="padding-sides-grid">
      {#each SIDES as s}
        <span class="side-label">{s}</span>
        <UITokenSelector
          variable={sideVar(s)}
          {component}
          canBeShared={false}
          {disabled}
          on:reset={() => handleResetSide(s)}
          on:var-change={handleVarChange}
        >
          <svelte:fragment slot="trigger-title">{sideLabels[s] || '—'}</svelte:fragment>
          <svelte:fragment slot="trigger-meta">{sideResolved[s] || '—'}</svelte:fragment>

          <svelte:fragment let:close>
            <UIOptionList>
              {#each options as opt}
                <UIOptionItem
                  active={sideActiveKey[s] === opt.key}
                  on:click={() => selectSide(s, opt.key, close)}
                >
                  <svelte:fragment slot="label">{opt.label}</svelte:fragment>
                  <svelte:fragment slot="meta">{opt.size}</svelte:fragment>
                </UIOptionItem>
              {/each}
            </UIOptionList>
          </svelte:fragment>
        </UITokenSelector>
      {/each}
    </div>
  </fieldset>
{:else}
  <div class="padding-single-row" class:disabled>
    <UITokenSelector
      {variable}
      {component}
      canBeShared={false}
      {disabled}
      on:reset={handleResetAll}
      on:var-change={handleVarChange}
    >
      <svelte:fragment slot="trigger-title">{activeLabel || '—'}</svelte:fragment>

      <svelte:fragment let:close>
        <UIOptionList>
          {#each options as opt}
            <UIOptionItem
              active={activeKey === opt.key}
              on:click={() => selectSingle(opt.key, close)}
            >
              <svelte:fragment slot="label">{opt.label}</svelte:fragment>
              <svelte:fragment slot="meta">{opt.size}</svelte:fragment>
            </UIOptionItem>
          {/each}
        </UIOptionList>
      </svelte:fragment>
    </UITokenSelector>
    <button
      type="button"
      class="split-btn"
      on:click={splitToSides}
      title="Set each side independently"
      {disabled}
    >
      <i class="fas fa-border-all" aria-hidden="true"></i>
    </button>
  </div>
{/if}

<style>
  .padding-single-row {
    display: contents;
  }

  .padding-single-row :global(.ui-token-selector) {
    grid-column: 2;
    justify-self: start;
  }

  .padding-single-row .split-btn {
    grid-column: 3;
    justify-self: start;
  }

  .split-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.75rem;
    height: 1.75rem;
    padding: 0;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    flex-shrink: 0;
  }

  .split-btn:hover:not(:disabled) {
    border-color: var(--ui-border-strong);
    background: var(--ui-surface-high);
    color: var(--ui-text-primary);
  }

  .split-btn:disabled {
    cursor: not-allowed;
  }

  .padding-fieldgroup {
    grid-column: 1 / -1;
    justify-self: start;
    width: fit-content;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
    margin: 0;
    padding: 0 var(--ui-space-10) var(--ui-space-8);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
  }

  .padding-fieldgroup.disabled {
    opacity: 0.4;
  }

  .padding-legend {
    padding: 0 var(--ui-space-4);
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
  }

  .merge-row {
    display: flex;
    justify-content: flex-end;
  }

  .merge-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-8);
    background: none;
    border: 1px solid var(--ui-border-subtle);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-muted);
    font-size: var(--ui-font-size-xs);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
  }

  .merge-btn:hover:not(:disabled) {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
    border-color: var(--ui-border-default);
  }

  .merge-btn:disabled {
    cursor: not-allowed;
  }

  .padding-sides-grid {
    display: grid;
    grid-template-columns: max-content max-content max-content;
    column-gap: var(--ui-space-10);
    row-gap: var(--ui-space-6);
    align-items: center;
  }

  .side-label {
    grid-column: 1;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    text-align: left;
    line-height: 1;
  }
</style>
