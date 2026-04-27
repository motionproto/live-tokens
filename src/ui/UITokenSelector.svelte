<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { setCssVar, removeCssVar, CSS_VAR_CHANGE_EVENT } from '../lib/cssVarSync';
  import {
    editorState,
    setComponentAlias,
    clearComponentAlias,
    setComponentAliasShared,
    clearComponentAliasShared,
    isComponentPropertyShared,
    unlinkComponentProperty,
    getComponentPropertySiblings,
  } from '../lib/editorStore';
  import UILinkToggle from './UILinkToggle.svelte';
  import UIRelinkConfirmPopover from './UIRelinkConfirmPopover.svelte';

  const dispatch = createEventDispatcher();

  export let variable: string;
  /** When set, writes persist through the editor store under this component. */
  export let component: string | undefined = undefined;
  /** When true, render a link toggle that lets the user share this value across all sibling variants. */
  export let canBeShared: boolean = false;
  /** Minimum width of the dropdown panel. */
  export let dropdownMinWidth: string = '14rem';
  /** Max width of the dropdown panel (useful for grids). */
  export let dropdownMaxWidth: string = '';
  /** When true, the default dropdown header (variable name + reset) is omitted. */
  export let hideDefaultHeader: boolean = false;
  /** When true, the trigger becomes non-interactive and visually dimmed. */
  export let disabled: boolean = false;

  let open = false;
  let container: HTMLElement;
  let relinkOpen = false;
  let relinkCandidates: { variable: string; alias: string }[] = [];

  $: isSharedFromData = canBeShared && component && $editorState
    ? isComponentPropertyShared(component, variable)
    : false;
  $: isSharedDisplay = canBeShared && !!component && isSharedFromData;
  $: hasSiblings = canBeShared && component && $editorState
    ? getComponentPropertySiblings(component, variable).length >= 2
    : false;
  $: showLinkToggle = canBeShared && !!component && hasSiblings;

  /** Persist a semantic CSS-var reference (or clear it when null). */
  export function writeOverride(semanticName: string | null): void {
    if (component) {
      const useShared = isSharedDisplay;
      if (semanticName) {
        if (useShared) setComponentAliasShared(component, variable, semanticName);
        else setComponentAlias(component, variable, semanticName);
      } else {
        if (useShared) clearComponentAliasShared(component, variable);
        else clearComponentAlias(component, variable);
      }
      return;
    }
    if (semanticName) {
      setCssVar(variable, semanticName.startsWith('--') ? `var(${semanticName})` : semanticName);
    } else {
      removeCssVar(variable);
    }
  }

  export function close() {
    if (!open) return;
    open = false;
    dispatch('close');
  }

  function toggle() {
    if (disabled) return;
    open = !open;
    dispatch(open ? 'open' : 'close');
  }

  $: if (disabled && open) close();

  function toggleShared() {
    if (!canBeShared || !component) return;
    if (isSharedDisplay) {
      unlinkComponentProperty(component, variable);
      dispatch('change');
      return;
    }
    const slice = $editorState.components[component];
    if (!slice) return;
    const siblings = getComponentPropertySiblings(component, variable);
    if (siblings.length < 2) return;

    const candidates = siblings.map((v) => ({ variable: v, alias: slice.aliases[v] ?? '' }));
    const distinctValues = new Set(candidates.map((c) => c.alias).filter(Boolean));

    if (distinctValues.size <= 1) {
      const currentValue = slice.aliases[variable];
      if (currentValue) {
        setComponentAliasShared(component, variable, currentValue);
        dispatch('change');
      }
      return;
    }

    relinkCandidates = candidates;
    relinkOpen = true;
  }

  function handleRelinkConfirm(e: CustomEvent<{ alias: string }>) {
    if (!component) return;
    setComponentAliasShared(component, variable, e.detail.alias);
    dispatch('change');
    relinkOpen = false;
  }

  function handleRelinkCancel() {
    relinkOpen = false;
  }

  function handleReset() {
    writeOverride(null);
    dispatch('reset');
    close();
    dispatch('change');
  }

  function handleClickOutside(e: MouseEvent) {
    if (container && !container.contains(e.target as Node)) {
      close();
      relinkOpen = false;
    }
  }

  function handleVarChange(e: Event) {
    const detail = (e as CustomEvent<{ name: string }>).detail;
    if (detail?.name === variable) dispatch('var-change');
  }

  onMount(() => {
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleClickOutside, true);
    document.removeEventListener(CSS_VAR_CHANGE_EVENT, handleVarChange);
  });
</script>

<div class="ui-token-selector" class:disabled bind:this={container}>
  <div class="ui-ts-trigger-wrap">
    <button class="ui-ts-trigger" class:shared={isSharedDisplay} on:click={toggle} {disabled}>
      <div class="ui-ts-content">
        {#if $$slots['trigger-preview']}
          <div class="ui-ts-preview">
            <slot name="trigger-preview" />
          </div>
        {/if}
        <div class="ui-ts-text">
          <slot name="trigger-text">
            {#if $$slots['trigger-title']}
              <span class="ui-ts-category"><slot name="trigger-title" /></span>
            {/if}
          </slot>
        </div>
      </div>
      <i class="fas fa-chevron-down ui-ts-chevron" class:open></i>
    </button>

    {#if relinkOpen && component}
      <UIRelinkConfirmPopover
        candidates={relinkCandidates}
        initialVariable={variable}
        prefixToStrip={`--${component}-`}
        on:confirm={handleRelinkConfirm}
        on:cancel={handleRelinkCancel}
      />
    {/if}

    {#if open}
      <div
        class="ui-ts-dropdown"
        style="min-width: {dropdownMinWidth};{dropdownMaxWidth ? ` max-width: ${dropdownMaxWidth};` : ''}"
      >
        {#if !hideDefaultHeader}
          <slot name="header">
            <div class="ui-ts-header">
              <code class="ui-ts-var">{variable}</code>
              {#if showLinkToggle}
                <UILinkToggle linked={isSharedDisplay} on:toggle={toggleShared} />
              {/if}
              <button class="ui-ts-reset" on:click={handleReset} title="Reset to default">
                <i class="fas fa-undo"></i>
              </button>
            </div>
          </slot>
        {/if}
        <slot name="subheader" />
        <slot {close} {handleReset} />
      </div>
    {/if}
  </div>

  {#if $$slots['trigger-meta']}
    <span class="ui-ts-meta-text"><slot name="trigger-meta" /></span>
  {/if}
</div>

<style>
  /* Subgrid spanning the parent's trigger + meta columns. */
  .ui-token-selector {
    display: grid;
    grid-template-columns: subgrid;
    grid-column: span 2;
    align-items: stretch;
    column-gap: var(--ui-space-8);
  }

  .ui-ts-trigger-wrap {
    position: relative;
    min-width: 0;
    justify-self: start;
  }

  .ui-token-selector.disabled {
    opacity: 0.4;
  }

  .ui-token-selector.disabled .ui-ts-trigger {
    cursor: not-allowed;
  }

  .ui-token-selector.disabled .ui-ts-trigger:hover {
    border-color: var(--ui-border-default);
    background: var(--ui-surface-low);
  }

  .ui-ts-trigger {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-2) var(--ui-space-8);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-md);
    cursor: pointer;
    transition: all var(--ui-transition-fast);
    min-height: 1.75rem;
  }

  .ui-ts-content {
    display: flex;
    flex: 1;
    min-width: 0;
    align-items: center;
    justify-content: flex-start;
    gap: var(--ui-space-6);
    overflow: hidden;
    align-self: stretch;
  }

  .ui-ts-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    flex: 0 1 auto;
    text-align: left;
    align-items: flex-start;
    min-width: 0;
  }

  .ui-ts-text:has(.ui-ts-category:empty) {
    display: none;
  }

  .ui-ts-category {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-primary);
    font-weight: var(--ui-font-weight-medium);
    text-align: left;
  }

  .ui-ts-trigger.shared {
    border-left: 2px solid var(--ui-text-accent);
    background: var(--ui-surface-high);
  }

  .ui-ts-trigger.shared:hover {
    background: var(--ui-surface-higher);
  }

  .ui-ts-trigger:hover {
    border-color: var(--ui-border-strong);
    background: var(--ui-surface-high);
  }

  .ui-ts-preview {
    flex: 1;
    align-self: stretch;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ui-ts-preview:empty {
    display: none;
  }

  .ui-ts-meta-text {
    align-self: center;
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    font-size: var(--ui-font-size-sm);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .ui-ts-chevron {
    font-size: 0.625rem;
    color: var(--ui-text-secondary);
    transition: transform var(--ui-transition-fast);
  }

  .ui-ts-chevron.open {
    transform: rotate(180deg);
  }

  .ui-ts-dropdown {
    position: absolute;
    top: calc(100% + var(--ui-space-4));
    left: 0;
    background: var(--ui-surface-higher);
    border: 1px solid var(--ui-border-medium);
    border-radius: var(--ui-radius-md);
    box-shadow: var(--ui-shadow-lg);
    z-index: 10;
    overflow: hidden;
  }

  .ui-ts-header {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-6) var(--ui-space-8);
    border-bottom: 1px solid var(--ui-border-faint);
  }

  .ui-ts-var {
    flex: 1;
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-secondary);
    font-family: var(--ui-font-mono);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ui-ts-reset {
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

  .ui-ts-reset:hover {
    background: var(--ui-hover);
    border-color: var(--ui-border-strong);
    color: var(--ui-text-primary);
  }
</style>
