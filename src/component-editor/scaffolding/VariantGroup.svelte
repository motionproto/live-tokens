<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import TokenLayout from './TokenLayout.svelte';
  import TypeEditor from './TypeEditor.svelte';
  import { mutate } from '../../lib/editorStore';

  type Token = { label: string; variable: string };
  type TypeGroupConfig = {
    legend?: string;
    colorVariable: string;
    colorLabel?: string;
    familyVariable?: string;
    familyLabel?: string;
    sizeVariable?: string;
    sizeLabel?: string;
    weightVariable?: string;
    weightLabel?: string;
    lineHeightVariable?: string;
    lineHeightLabel?: string;
  };

  export let name: string;
  export let title: string;
  export let tokens: Token[] = [];
  export let states: Record<string, Token[]> | null = null;
  /** Per-state type groups; rendered as TypeEditor blocks alongside the state's TokenLayout. */
  export let typeGroups: Record<string, TypeGroupConfig[]> = {};
  /** When set, overrides are read from and cleared through the editor store. */
  export let component: string | undefined = undefined;
  /** Variables to flash when a sibling-shared token is hovered elsewhere. */
  export let highlightedVars: Set<string> | undefined = undefined;
  /** Per-variable rank used by TokenLayout to align shared tokens with the shared block above. */
  export let sharedOrder: Map<string, number> | undefined = undefined;
  /** Sibling variants of this component (excludes self). When non-empty,
      a "Copy from" menu is rendered in each state header that lets the user
      pull token values from a sibling's same-state into the current state. */
  export let siblings: Array<{
    name: string;
    label: string;
    states: Record<string, Token[]>;
    typeGroups?: Record<string, TypeGroupConfig[]>;
  }> = [];

  let variantExpanded = true;
  let stateExpanded: Record<string, boolean> = {};

  function toggleState(stateName: string) {
    stateExpanded = { ...stateExpanded, [stateName]: stateExpanded[stateName] === false };
  }

  /** Which state's "Copy from" menu is open, plus the optional drilled-into variant. */
  let copyMenuState: string | null = null;
  let copyMenuVariant: string | null = null;
  let copyMenuRoots: Record<string, HTMLElement | null> = {};

  function openCopyMenu(stateName: string) {
    copyMenuState = copyMenuState === stateName ? null : stateName;
    copyMenuVariant = null;
  }

  const TYPE_PROPS = ['colorVariable', 'familyVariable', 'sizeVariable', 'weightVariable', 'lineHeightVariable'] as const;

  function pickCopySource(toState: string, fromVariant: string, fromState: string) {
    copyMenuState = null;
    copyMenuVariant = null;
    if (!component || !states) return;
    const isSelfVariant = fromVariant === name;
    const sibling = isSelfVariant ? null : siblings.find((s) => s.name === fromVariant);
    if (!isSelfVariant && !sibling) return;
    const srcTokens = (isSelfVariant ? states[fromState] : sibling!.states[fromState]) ?? [];
    const dstTokens = states[toState] ?? [];
    const srcTypeGroups = (isSelfVariant ? typeGroups[fromState] : sibling!.typeGroups?.[fromState]) ?? [];
    const dstTypeGroups = typeGroups[toState] ?? [];

    mutate(`copy ${fromVariant}/${fromState} → ${name}/${toState}`, (s) => {
      const slice = s.components[component!] ?? (s.components[component!] = { activeFile: 'default', aliases: {} });
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

  function handleCopyDocClick(e: MouseEvent) {
    if (copyMenuState === null) return;
    const root = copyMenuRoots[copyMenuState];
    if (root && !root.contains(e.target as Node)) {
      copyMenuState = null;
      copyMenuVariant = null;
    }
  }

  function handleCopyKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && copyMenuState !== null) {
      copyMenuState = null;
      copyMenuVariant = null;
    }
  }

  onMount(() => {
    document.addEventListener('click', handleCopyDocClick, true);
    window.addEventListener('keydown', handleCopyKeydown);
  });

  onDestroy(() => {
    document.removeEventListener('click', handleCopyDocClick, true);
    window.removeEventListener('keydown', handleCopyKeydown);
  });

  $: stateNames = states ? Object.keys(states) : [];
</script>

<div class="demo-section variant-group" class:collapsed={!variantExpanded}>
  <div class="variant-header">
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
  </div>

  {#if variantExpanded}
    {#if states}
      {#each stateNames as stateName}
        {@const hasTypeGroups = !!typeGroups[stateName]?.length}
        {@const expanded = stateExpanded[stateName] !== false}
        {@const copyMenuOpen = copyMenuState === stateName}
        {@const copyDrillVariant = copyMenuOpen ? copyMenuVariant : null}
        {@const copyDrillSource = copyDrillVariant ? copySources.find((c) => c.name === copyDrillVariant) : null}
        <div class="state-section" class:collapsed={!expanded}>
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
            {#if copySources.length > 0}
              <div class="copy-from" bind:this={copyMenuRoots[stateName]}>
                <button
                  type="button"
                  class="copy-from-btn"
                  class:active={copyMenuOpen}
                  on:click={() => openCopyMenu(stateName)}
                  title="Copy values from another variant/state"
                >
                  <i class="fas fa-clone"></i>
                  <span>Copy from</span>
                </button>
                {#if copyMenuOpen}
                  <div class="copy-menu" role="menu">
                    {#if !copyDrillSource}
                      {#each copySources as src}
                        {@const single = src.states.length === 1}
                        <button
                          type="button"
                          class="copy-menu-item"
                          on:click={() => single ? pickCopySource(stateName, src.name, src.states[0]) : (copyMenuVariant = src.name)}
                          role="menuitem"
                        >
                          <span>{src.label}</span>
                          {#if !single}
                            <i class="fas fa-chevron-right"></i>
                          {/if}
                        </button>
                      {/each}
                    {:else}
                      <button
                        type="button"
                        class="copy-menu-back"
                        on:click={() => (copyMenuVariant = null)}
                      >
                        <i class="fas fa-chevron-left"></i>
                        <span>{copyDrillSource.label}</span>
                      </button>
                      {#each copyDrillSource.states as fromState}
                        {@const isSelf = copyDrillSource.name === name && fromState === stateName}
                        <button
                          type="button"
                          class="copy-menu-item"
                          disabled={isSelf}
                          on:click={() => pickCopySource(stateName, copyDrillSource.name, fromState)}
                          role="menuitem"
                        >
                          <span>{fromState}</span>
                          {#if isSelf}<span class="copy-menu-meta">current</span>{/if}
                        </button>
                      {/each}
                    {/if}
                  </div>
                {/if}
              </div>
            {/if}
          </div>
          {#if expanded}
            <div class="state-preview">
              <slot activeState={stateName} />
            </div>
            <div class="state-controls" class:two-col={hasTypeGroups}>
              {#if hasTypeGroups}
                <div class="state-type-groups">
                  {#each typeGroups[stateName] as tg}
                    <TypeEditor
                      legend={tg.legend ?? 'type'}
                      colorVariable={tg.colorVariable}
                      colorLabel={tg.colorLabel ?? 'text color'}
                      familyVariable={tg.familyVariable}
                      familyLabel={tg.familyLabel ?? 'font family'}
                      sizeVariable={tg.sizeVariable}
                      sizeLabel={tg.sizeLabel ?? 'font size'}
                      weightVariable={tg.weightVariable}
                      weightLabel={tg.weightLabel ?? 'font weight'}
                      lineHeightVariable={tg.lineHeightVariable}
                      lineHeightLabel={tg.lineHeightLabel ?? 'line height'}
                      {component}
                      on:change
                    />
                  {/each}
                </div>
              {/if}
              <TokenLayout
                title=""
                tokens={states[stateName]}
                {component}
                highlightedVars={highlightedVars ?? new Set()}
                {sharedOrder}
                on:tokenhover
                on:change
              />
            </div>
          {/if}
        </div>
      {/each}
    {:else}
      <slot activeState="" />
      <TokenLayout
        title={name}
        tokens={tokens}
        {component}
        highlightedVars={highlightedVars ?? new Set()}
        {sharedOrder}
        on:tokenhover
        on:change
      />
    {/if}
  {/if}

</div>

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

  .copy-from {
    position: relative;
  }

  .copy-from-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-4) var(--ui-space-6);
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-tertiary);
    font-size: var(--ui-font-size-xs);
    cursor: pointer;
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
    white-space: nowrap;
  }

  .copy-from-btn:hover {
    color: var(--ui-text-primary);
    background: var(--ui-hover);
  }

  .copy-from-btn.active {
    color: var(--ui-text-primary);
    background: var(--ui-hover);
  }

  .copy-from-btn i {
    font-size: 0.85em;
  }

  .copy-menu {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    min-width: 12rem;
    max-height: 18rem;
    overflow-y: auto;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-default);
    border-radius: var(--ui-radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    padding: var(--ui-space-4);
    display: flex;
    flex-direction: column;
    gap: 2px;
    z-index: 20;
  }

  .copy-menu-back {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: none;
    border: none;
    border-bottom: 1px solid var(--ui-border-faint);
    margin-bottom: var(--ui-space-2);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    text-align: left;
  }

  .copy-menu-back:hover {
    color: var(--ui-text-primary);
  }

  .copy-menu-back i {
    font-size: 0.65em;
  }

  .copy-menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--ui-space-8);
    padding: var(--ui-space-6) var(--ui-space-10);
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    text-align: left;
    white-space: nowrap;
    transition: background var(--ui-transition-fast), color var(--ui-transition-fast);
  }

  .copy-menu-item:hover:not(:disabled) {
    background: var(--ui-hover);
    color: var(--ui-text-primary);
  }

  .copy-menu-item:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .copy-menu-item i {
    font-size: 0.65em;
    color: var(--ui-text-muted);
  }

  .copy-menu-meta {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-muted);
    font-style: italic;
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

  .state-controls {
    display: grid;
    grid-template-columns: 1fr;
    gap: var(--ui-space-12);
    align-items: start;
    margin-top: var(--ui-space-16);
  }

  .state-controls.two-col {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-16) var(--ui-space-16);
    align-items: flex-start;
    justify-content: flex-start;
  }

  .state-type-groups {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: var(--ui-space-16);
    align-items: flex-start;
  }

  /* Inside a state's two-col layout the fieldset frame is redundant with the
     surrounding state card. Flatten the border/padding but keep the legend so
     each block ("title", "body text", …) is identifiable. */
  .state-controls.two-col .state-type-groups :global(.fieldset-wrapper) {
    border: none;
    padding: 0;
  }

  .state-controls.two-col .state-type-groups :global(.fieldset-wrapper.active) {
    outline: none;
  }

  .state-controls.two-col .state-type-groups :global(.fieldset-legend) {
    padding: 0 var(--ui-space-4) var(--ui-space-4);
  }

  /* The general-properties column has no legend of its own; pad it down by
     one legend-line so its first row aligns with the first row of the
     adjacent type-group. */
  .state-controls.two-col > :global(.token-group) {
    padding-top: calc(var(--ui-font-size-xs) + var(--ui-space-4));
  }

</style>
