<script lang="ts">
  import { writable } from 'svelte/store';
  import TokenLayout from './TokenLayout.svelte';
  import StateBlock from './StateBlock.svelte';
  import CopyFromMenu from './CopyFromMenu.svelte';
  import { mutate } from '../../lib/editorStore';
  import { getEditorContext } from './editorContext';
  import type { Token, TypeGroupConfig } from './types';
  import type { Sibling } from './siblings';

  export let name: string;
  export let title: string;
  export let tokens: Token[] = [];
  export let states: Record<string, Token[]> | null = null;
  /** Per-state type groups; rendered as TypeEditor blocks alongside the state's TokenLayout. */
  export let typeGroups: Record<string, TypeGroupConfig[]> = {};
  /** When set, overrides are read from and cleared through the editor store. */
  export let component: string | undefined = undefined;
  /** Sibling variants of this component (excludes self). When non-empty,
      a "Copy from" menu is rendered that lets the user pull token values from
      a sibling's same-state into the current state. */
  export let siblings: Sibling[] = [];

  const editorCtx = getEditorContext();
  const linkedOrderStore = editorCtx?.linkedOrder ?? writable<Map<string, number> | null>(null);
  const tabbableStore = editorCtx?.tabbable ?? writable(false);
  const viewModeStore = editorCtx?.viewMode ?? writable<'list' | 'tabs'>('list');
  const focusedVariantStore = editorCtx?.focusedVariant ?? writable<string | null>(null);
  const focusedStateStore = editorCtx?.focusedState ?? writable<string | null>(null);
  $: linkedOrder = $linkedOrderStore ?? undefined;

  let variantExpanded = true;
  let stateExpanded: Record<string, boolean> = {};
  let activeTab: string = '';

  function toggleState(stateName: string) {
    stateExpanded = { ...stateExpanded, [stateName]: stateExpanded[stateName] === false };
  }

  const TYPE_PROPS = ['colorVariable', 'familyVariable', 'sizeVariable', 'weightVariable', 'lineHeightVariable'] as const;

  function pickCopySource(toState: string, fromVariant: string, fromState: string) {
    if (!component || !states) return;
    const isSelfVariant = fromVariant === name;
    const sibling = isSelfVariant ? null : siblings.find((s) => s.name === fromVariant);
    if (!isSelfVariant && !sibling) return;
    const srcTokens = (isSelfVariant ? states[fromState] : sibling!.states[fromState]) ?? [];
    const dstTokens = states[toState] ?? [];
    const srcTypeGroups = (isSelfVariant ? typeGroups[fromState] : sibling!.typeGroups?.[fromState]) ?? [];
    const dstTypeGroups = typeGroups[toState] ?? [];

    mutate(`copy ${fromVariant}/${fromState} → ${name}/${toState}`, (s) => {
      const slice = s.components[component!] ?? (s.components[component!] = { activeFile: 'default', aliases: {}, config: {} });
      const apply = (srcVar: string, dstVar: string) => {
        if (srcVar === dstVar) return;
        if (srcVar in slice.aliases) slice.aliases[dstVar] = slice.aliases[srcVar];
        else delete slice.aliases[dstVar];
      };
      const minLen = Math.min(srcTokens.length, dstTokens.length);
      for (let i = 0; i < minLen; i++) apply(srcTokens[i].variable, dstTokens[i].variable);
      const minTypeGroups = Math.min(srcTypeGroups.length, dstTypeGroups.length);
      for (let g = 0; g < minTypeGroups; g++) {
        const srcType = srcTypeGroups[g];
        const dstType = dstTypeGroups[g];
        for (const prop of TYPE_PROPS) {
          const srcVar = srcType[prop];
          const dstVar = dstType[prop];
          if (srcVar && dstVar) apply(srcVar, dstVar);
        }
      }
    });
  }

  $: copySources = (() => {
    const fromSiblings = siblings.map((s) => ({
      name: s.name,
      label: s.label,
      states: Object.keys(s.states),
    }));
    const ownStates = states ? Object.keys(states) : [];
    if (ownStates.length >= 2) {
      return [{ name, label: title, states: ownStates }, ...fromSiblings];
    }
    return fromSiblings;
  })();

  $: stateNames = states ? Object.keys(states) : [];
  $: inTabsMode = $tabbableStore && $viewModeStore === 'tabs';
  $: tabsStripVisible = inTabsMode && stateNames.length >= 2;
  $: if (inTabsMode && stateNames.length > 0 && !stateNames.includes(activeTab)) {
    activeTab = stateNames[0];
  }
  // Cross-group hint from chart row clicks: adopt it if it names one of our states.
  $: if ($focusedStateStore && stateNames.includes($focusedStateStore) && activeTab !== $focusedStateStore) {
    activeTab = $focusedStateStore;
  }

  $: inFocusMode = inTabsMode && siblings.length > 0;
  $: amIFocused = $focusedVariantStore === name;
  $: shouldRender = !inFocusMode || amIFocused;

</script>

{#if shouldRender}
<div class="demo-section variant-group" class:collapsed={!variantExpanded && !inTabsMode}>
  {#if inTabsMode ? !inFocusMode : true}
  <div class="variant-header" class:tabs-mode={inTabsMode}>
    {#if inTabsMode}
      <h3 class="demo-subtitle">{title}</h3>
    {:else}
      <div
        class="variant-toggle"
        role="button"
        tabindex="0"
        aria-expanded={variantExpanded}
        title={variantExpanded ? 'Collapse' : 'Expand'}
        on:click={() => (variantExpanded = !variantExpanded)}
        on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); variantExpanded = !variantExpanded; } }}
      >
        <h3 class="demo-subtitle">{title}</h3>
        <i class="fas fa-chevron-down chevron" class:collapsed={!variantExpanded}></i>
      </div>
      {#if stateNames.length === 1 && copySources.length > 0 && variantExpanded}
        {@const soloState = stateNames[0]}
        <CopyFromMenu
          toState={soloState}
          variantName={name}
          {copySources}
          placement="end"
          on:select={(e) => pickCopySource(soloState, e.detail.fromVariant, e.detail.fromState)}
        />
      {/if}
    {/if}
  </div>
  {/if}

  {#if variantExpanded || inTabsMode}
    {#if states}
      {#if inTabsMode}
        <!-- Tabs view: preview at top, then state tabs + Copy from, then properties for active tab. -->
        <div class="tabs-preview">
          <span class="section-label">Preview</span>
          <slot activeState={activeTab} />
        </div>

        {#if tabsStripVisible || (copySources.length > 0 && activeTab)}
          <div class="tabs-selectors">
            {#if tabsStripVisible}
              <div class="state-tabs" role="tablist">
                {#each stateNames as s}
                  <button
                    type="button"
                    class="state-tab-btn"
                    class:active={activeTab === s}
                    role="tab"
                    aria-selected={activeTab === s}
                    on:click={() => (activeTab = s)}
                  >{s}</button>
                {/each}
              </div>
            {/if}
            {#if copySources.length > 0 && activeTab}
              <CopyFromMenu
                toState={activeTab}
                variantName={name}
                {copySources}
                on:select={(e) => pickCopySource(activeTab, e.detail.fromVariant, e.detail.fromState)}
              />
            {/if}
          </div>
        {/if}

        {#if activeTab && states[activeTab]}
          {@const stateName = activeTab}
          <span class="section-label">Properties</span>
          <StateBlock
            tokens={states[stateName]}
            typeGroups={typeGroups[stateName] ?? []}
            {component}
            {linkedOrder}
            on:change
          />
        {/if}
      {:else}
        <!-- List view: per-state stacked sections, each with its own preview and properties. -->
        {#each stateNames as stateName}
          {@const isSoloState = stateNames.length === 1}
          {@const expanded = isSoloState || stateExpanded[stateName] !== false}
          <div class="state-section" class:collapsed={!expanded}>
            {#if !isSoloState}
              <div class="state-header">
                <div
                  class="state-toggle"
                  role="button"
                  tabindex="0"
                  aria-expanded={expanded}
                  title={expanded ? 'Collapse' : 'Expand'}
                  on:click={() => toggleState(stateName)}
                  on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleState(stateName); } }}
                >
                  <span class="state-label">{stateName}</span>
                  <i class="fas fa-chevron-down chevron" class:collapsed={!expanded}></i>
                </div>
                <slot name="state-actions" {stateName} />
                {#if copySources.length > 0}
                  <CopyFromMenu
                    toState={stateName}
                    variantName={name}
                    {copySources}
                    on:select={(e) => pickCopySource(stateName, e.detail.fromVariant, e.detail.fromState)}
                  />
                {/if}
              </div>
            {/if}
            {#if expanded}
              <div class="state-preview">
                <span class="section-label">Preview</span>
                <slot activeState={stateName} />
              </div>
              <span class="section-label">Properties</span>
              <StateBlock
                tokens={states[stateName]}
                typeGroups={typeGroups[stateName] ?? []}
                {component}
                {linkedOrder}
                on:change
              />
            {/if}
          </div>
        {/each}
      {/if}
    {:else}
      <slot activeState="" />
      <TokenLayout
        title={name}
        tokens={tokens}
        {component}
        {linkedOrder}
        on:change
      />
    {/if}
  {/if}

</div>
{/if}

<style>
  .variant-group {
    padding: var(--ui-space-16);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
    gap: var(--ui-space-12);
  }

  .variant-group.collapsed {
    gap: 0;
  }

  .variant-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-12);
  }

  .variant-header.tabs-mode {
    justify-content: flex-start;
  }

  .variant-header .demo-subtitle {
    margin: 0;
    font-size: var(--ui-font-size-2xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .variant-toggle,
  .state-toggle {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
    padding: 0;
    background: none;
    border: none;
    color: inherit;
    cursor: pointer;
    text-align: left;
  }

  .state-header {
    display: flex;
    flex-direction: row;
    align-items: baseline;
    justify-content: flex-start;
    gap: var(--ui-space-12);
  }

  .tabs-preview {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .tabs-selectors {
    display: flex;
    align-items: center;
    gap: var(--ui-space-12);
  }

  .state-tabs {
    display: inline-flex;
    flex-wrap: wrap;
    gap: var(--ui-space-4);
    padding: var(--ui-space-4);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
  }

  .state-tab-btn {
    padding: var(--ui-space-6) var(--ui-space-12);
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    font-weight: var(--ui-font-weight-medium);
    text-transform: capitalize;
    cursor: pointer;
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
  }

  .state-tab-btn:hover:not(.active) {
    color: var(--ui-text-primary);
    background: var(--ui-hover);
  }

  .state-tab-btn.active {
    color: var(--ui-text-primary);
    background: var(--ui-surface-high);
    box-shadow: 0 0 0 1px var(--ui-border-default);
  }

  .chevron {
    font-size: 0.75em;
    color: var(--ui-text-tertiary);
    transition: transform var(--ui-transition-fast);
  }

  .chevron.collapsed {
    transform: rotate(-90deg);
  }

  .variant-toggle:hover .chevron,
  .state-toggle:hover .chevron {
    color: var(--ui-text-primary);
  }

  .state-section {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
    padding: var(--ui-space-12);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-sm);
    container-type: inline-size;
    min-width: 0;
  }

  .state-label {
    font-size: var(--ui-font-size-xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-secondary);
    text-transform: capitalize;
    margin-bottom: var(--ui-space-8);
  }

  .state-preview {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .section-label {
    display: block;
    margin: 0;
    font-size: var(--ui-font-size-md);
    font-weight: 500;
    color: var(--ui-text-primary);
  }

  /* In tabs mode the Properties label is a direct child of .variant-group
     (which doesn't apply a flex gap), so space it from the tabs strip above. */
  .variant-group > .section-label {
    margin-top: var(--ui-space-8);
  }

</style>
