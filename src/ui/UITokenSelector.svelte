<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { setCssVar, removeCssVar, CSS_VAR_CHANGE_EVENT } from '../lib/cssVarSync';
  import {
    editorState,
    setComponentAlias,
    clearComponentAlias,
    setComponentAliasLinked,
    clearComponentAliasLinked,
    isComponentPropertyLinked,
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
  export let canBeLinked: boolean = false;
  /** Minimum width of the dropdown panel. */
  export let dropdownMinWidth: string = '14rem';
  /** Max width of the dropdown panel (useful for grids). */
  export let dropdownMaxWidth: string = '';
  /** When true, the default dropdown header (variable name + reset) is omitted. */
  export let hideDefaultHeader: boolean = false;
  /** When true, the trigger becomes non-interactive and visually dimmed. */
  export let disabled: boolean = false;
  /** When true, the trigger opens normally but the dropdown's selection area is
   *  dimmed and non-interactive. The lock toggle in the header stays active so
   *  the user can re-engage editing by re-linking. Used by the linked block to
   *  make the row openable even when currently unshared. */
  export let selectionsLocked: boolean = false;

  let open = false;
  let container: HTMLElement;
  let relinkOpen = false;
  let relinkCandidates: { variable: string; alias: string }[] = [];

  $: isLinkedFromData = canBeLinked && component && $editorState
    ? isComponentPropertyLinked(component, variable)
    : false;
  $: isLinkedDisplay = canBeLinked && !!component && isLinkedFromData;
  $: hasSiblings = canBeLinked && component && $editorState
    ? getComponentPropertySiblings(component, variable).length >= 2
    : false;
  $: showLinkToggle = canBeLinked && !!component && hasSiblings;

  /** Persist a semantic CSS-var reference (or clear it when null). */
  export function writeOverride(semanticName: string | null): void {
    if (component) {
      const useLinked = isLinkedDisplay;
      if (semanticName) {
        const ref = { kind: 'token' as const, name: semanticName };
        if (useLinked) setComponentAliasLinked(component, variable, ref);
        else setComponentAlias(component, variable, ref);
      } else {
        if (useLinked) clearComponentAliasLinked(component, variable);
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

  function toggleLinked() {
    if (!canBeLinked || !component) return;
    if (isLinkedDisplay) {
      unlinkComponentProperty(component, variable);
      dispatch('change');
      return;
    }
    const slice = $editorState.components[component];
    if (!slice) return;
    const siblings = getComponentPropertySiblings(component, variable);
    if (siblings.length < 2) return;

    // Re-linking this property: figure out the value to adopt by inspecting the
    // siblings *currently linked* (those not in `unlinked`, excluding the target).
    // The target itself is rejoining, so its own value isn't a candidate unless
    // every other sibling has also detached.
    const linkedSiblings = siblings.filter(
      (v) => v !== variable && !slice.unlinked?.includes(v),
    );

    if (linkedSiblings.length === 0) {
      // No remaining linked siblings — promote this property's current value.
      const currentValue = slice.aliases[variable];
      if (currentValue) {
        setComponentAliasLinked(component, variable, currentValue);
        dispatch('change');
      }
      return;
    }

    const candidates = linkedSiblings.map((v) => {
      const ref = slice.aliases[v];
      const alias = ref?.kind === 'token' ? ref.name : '';
      return { variable: v, alias };
    });
    const distinctValues = new Set(candidates.map((c) => c.alias).filter(Boolean));

    if (distinctValues.size <= 1) {
      const adoptRef = slice.aliases[linkedSiblings[0]];
      if (adoptRef) {
        setComponentAliasLinked(component, variable, adoptRef);
        dispatch('change');
      }
      return;
    }

    relinkCandidates = candidates;
    relinkOpen = true;
  }

  function handleRelinkConfirm(e: CustomEvent<{ alias: string }>) {
    if (!component) return;
    setComponentAliasLinked(component, variable, { kind: 'token', name: e.detail.alias });
    dispatch('change');
    relinkOpen = false;
  }

  function handleRelinkCancel() {
    relinkOpen = false;
  }

  function handleReset() {
    // Order matters: notify children of reset first so they can clear local
    // state, THEN clear the override. writeOverride fires CSS_VAR_CHANGE_EVENT
    // synchronously, which triggers `var-change` on children — that's where
    // each selector should re-derive its display state from the new default.
    dispatch('reset');
    writeOverride(null);
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
    <button
      class="ui-ts-trigger"
      class:linked={isLinkedDisplay}
      class:unlinked={showLinkToggle && !isLinkedDisplay}
      on:click={toggle}
      {disabled}
    >
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
              {#if showLinkToggle}
                <UILinkToggle linked={isLinkedDisplay} on:toggle={toggleLinked} />
              {/if}
              <button
                type="button"
                class="ui-ts-reset"
                on:click={handleReset}
                disabled={selectionsLocked}
                title={selectionsLocked ? 'Unlock to reset' : 'Reset to default'}
              >
                <i class="fas fa-undo" aria-hidden="true"></i>
                <span>Reset</span>
              </button>
            </div>
          </slot>
        {/if}
        <div class="ui-ts-selections" class:locked={selectionsLocked}>
          <slot name="subheader" />
          <slot {close} {handleReset} />
        </div>
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
    justify-self: stretch;
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
    width: 100%;
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
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .ui-ts-trigger:hover {
    border-color: var(--ui-border-strong);
    background: var(--ui-surface-high);
  }

  /* Link-state pop-bar. The wrap already has `position: relative` (so the
     dropdown can anchor). The bar is a `::before` anchored at the wrap's
     left edge — same column position regardless of state, so a stack of
     mixed linked/unlinked rows shares one continuous link-state column.
     Linked rows: bar is teal, full size, sitting flush against the trigger.
     Unlinked rows: bar shrinks to a smaller amber tick and the trigger is
     indented (`padding-left` on the wrap) so the bar sits clear of it. */
  .ui-ts-trigger-wrap {
    transition: padding-left 320ms cubic-bezier(0.5, 1.6, 0.5, 1);
  }
  .ui-ts-trigger-wrap:has(> .ui-ts-trigger.linked, > .ui-ts-trigger.unlinked)::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 0;
    width: 3px;
    height: 1.25rem;
    border-radius: 2px;
    background: var(--ui-link-active);
    transform: translateY(-50%);
    pointer-events: none;
    transition:
      width 220ms cubic-bezier(0.4, 0, 0.2, 1),
      height 220ms cubic-bezier(0.4, 0, 0.2, 1),
      background-color 220ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .ui-ts-trigger-wrap:has(> .ui-ts-trigger.unlinked) {
    padding-left: 0.5rem;
  }
  .ui-ts-trigger-wrap:has(> .ui-ts-trigger.unlinked)::before {
    background: var(--ui-link-broken);
    width: 2px;
    height: 0.875rem;
  }
  /* Keep the dropdown's left edge aligned with the (indented) trigger rather
     than the column anchor, so an open dropdown doesn't bleed left of its
     associated control. */
  .ui-ts-trigger-wrap:has(> .ui-ts-trigger.unlinked) > .ui-ts-dropdown {
    left: 0.5rem;
  }
  @media (prefers-reduced-motion: reduce) {
    .ui-ts-trigger-wrap,
    .ui-ts-trigger-wrap::before { transition: none; }
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
  }

  .ui-ts-header {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--ui-space-6);
    padding: var(--ui-space-6) var(--ui-space-8);
    border-bottom: 1px solid var(--ui-border-faint);
  }

  .ui-ts-reset {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    height: 1.5rem;
    padding: var(--ui-space-2) var(--ui-space-8);
    background: none;
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-family: inherit;
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    flex-shrink: 0;
    transition: all var(--ui-transition-fast);
  }

  .ui-ts-reset i {
    font-size: 0.625rem;
  }

  .ui-ts-reset:hover:not(:disabled) {
    background: var(--ui-hover);
    border-color: var(--ui-border-strong);
    color: var(--ui-text-primary);
  }

  .ui-ts-reset:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .ui-ts-selections.locked {
    opacity: 0.4;
    pointer-events: none;
  }
</style>
