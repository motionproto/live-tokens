<script lang="ts">
  import { writable } from 'svelte/store';
  import type { Snippet } from 'svelte';
  import TokenLayout from './TokenLayout.svelte';
  import StateBlock from './StateBlock.svelte';
  import CopyFromMenu from './CopyFromMenu.svelte';
  import { mutate } from '../../core/store/editorStore';
  import { getEditorContext } from './editorContext';
  import type { Token, TypeGroupConfig } from './types';
  import type { Sibling } from './siblings';

  interface Props {
    name: string;
    title: string;
    tokens?: Token[];
    states?: Record<string, Token[]> | null;
    /** Per-state type groups; rendered as TypeEditor blocks alongside the state's TokenLayout. */
    typeGroups?: Record<string, TypeGroupConfig[]>;
    /** When set, overrides are read from and cleared through the editor store. */
    component?: string | undefined;
    /** Sibling variants of this component (excludes self). When non-empty,
        a "Copy from" menu is rendered that lets the user pull token values from
        a sibling's same-state into the current state. */
    siblings?: Sibling[];
    /** Forwarded to StateBlock → TokenLayout. >1 lays out the property grid
        across multiple visual columns (column-major flow). Useful for
        single-text components like Button whose 8-10 properties stretch the
        panel vertically when stacked single-column. */
    columns?: number;
    /** Label rendered above the state-tab selector strip. Defaults to "Element"
        because most strips mix structural parts (e.g. bar, frame) with
        component states; "States" would mislabel the parts. Editors can override
        when every tab on the strip really is a state. */
    selectorLabel?: string;
    /** Forwarded to StateBlock — fires when a token is mutated. */
    onchange?: () => void;
    /** Default snippet: receives the active state name; renders the live preview. */
    children?: Snippet<[{ activeState: string }]>;
    /** Right-aligned controls in the state-tabs strip (e.g. per-state toggles). */
    stateActions?: Snippet<[string]>;
    /** Rendered above the property grid when a state is active. */
    compositeControls?: Snippet<[string]>;
  }

  let {
    name,
    title,
    tokens = [],
    states = null,
    typeGroups = {},
    component = undefined,
    siblings = [],
    columns = 1,
    selectorLabel = 'Element',
    onchange,
    children,
    stateActions,
    compositeControls,
  }: Props = $props();

  const editorCtx = getEditorContext();
  const linkedOrderStore = editorCtx?.linkedOrder ?? writable<Map<string, number> | null>(null);
  const focusedVariantStore = editorCtx?.focusedVariant ?? writable<string | null>(null);
  const focusedStateStore = editorCtx?.focusedState ?? writable<string | null>(null);
  let linkedOrder = $derived($linkedOrderStore ?? undefined);

  let activeTab: string = $state('');

  const TYPE_PROPS = ['colorVariable', 'familyVariable', 'sizeVariable', 'weightVariable', 'lineHeightVariable', 'outlineWidthVariable', 'outlineColorVariable'] as const;
  // UIPaddingSelector in split mode writes per-side derived vars
  // (`<var>-{top,right,bottom,left}`) alongside the parent. Copy carries them
  // so a state that split its padding fully transfers. When the data model
  // migrates to per-side-only storage this loop becomes redundant — but
  // copying entries that don't exist is a no-op, so it stays safe either way.
  const PADDING_SIDES = ['top', 'right', 'bottom', 'left'] as const;

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
      const dstVarsTouched: string[] = [];
      const apply = (srcVar: string, dstVar: string) => {
        if (srcVar === dstVar) return;
        if (srcVar in slice.aliases) slice.aliases[dstVar] = slice.aliases[srcVar];
        else delete slice.aliases[dstVar];
        dstVarsTouched.push(dstVar);
      };
      const minLen = Math.min(srcTokens.length, dstTokens.length);
      for (let i = 0; i < minLen; i++) {
        const srcVar = srcTokens[i].variable;
        const dstVar = dstTokens[i].variable;
        apply(srcVar, dstVar);
        if (srcTokens[i].splittable !== false) {
          for (const side of PADDING_SIDES) apply(`${srcVar}-${side}`, `${dstVar}-${side}`);
        }
      }
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
      // Destination vars rejoin their sibling groups — the user's intent was
      // "make this state match", which conflicts with a stale opt-out marker
      // that would otherwise render the LinkedBlock as broken despite agreeing
      // values.
      if (slice.unlinked && slice.unlinked.length > 0) {
        const touched = new Set(dstVarsTouched);
        const remaining = slice.unlinked.filter((v) => !touched.has(v));
        if (remaining.length === 0) delete slice.unlinked;
        else slice.unlinked = remaining;
      }
    });
  }

  let copySources = $derived.by(() => {
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
  });

  let stateNames = $derived(states ? Object.keys(states) : []);
  let tabsStripVisible = $derived(stateNames.length >= 2);
  $effect(() => {
    if (stateNames.length > 0 && !stateNames.includes(activeTab)) {
      activeTab = stateNames[0];
    }
  });
  // Cross-group hint from chart row clicks: adopt it if it names one of our states.
  $effect(() => {
    if ($focusedStateStore && stateNames.includes($focusedStateStore) && activeTab !== $focusedStateStore) {
      activeTab = $focusedStateStore;
    }
  });

  let inFocusMode = $derived(siblings.length > 0);
  let amIFocused = $derived($focusedVariantStore === name);
  let shouldRender = $derived(!inFocusMode || amIFocused);
  // Mirror this group's active state back to the shared store when this is the
  // focused variant, so the linked-block row + chart selection track the user's
  // state-tab clicks (not just chart-row clicks).
  $effect(() => {
    if (amIFocused && activeTab && stateNames.includes(activeTab) && $focusedStateStore !== activeTab) {
      focusedStateStore.set(activeTab);
    }
  });

</script>

{#if shouldRender}
<div class="demo-section variant-group">
  {#if !inFocusMode}
  <div class="variant-header">
    <h3 class="demo-subtitle">{title}</h3>
  </div>
  {/if}

  {#if states}
    <!-- Preview at top, then state tabs + Copy from, then properties for active tab. -->
    <div class="tabs-preview">
      <span class="section-label">Preview</span>
      {@render children?.({ activeState: activeTab })}
    </div>

    {#if tabsStripVisible || (copySources.length > 0 && activeTab)}
      <div class="tabs-states-block">
        {#if tabsStripVisible}
          <span class="section-label">{selectorLabel}</span>
        {/if}
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
                  onclick={() => { activeTab = s; focusedStateStore.set(s); }}
                >{s}</button>
              {/each}
            </div>
          {/if}
          {#if activeTab}
            {@render stateActions?.(activeTab)}
          {/if}
          {#if copySources.length > 0 && activeTab}
            <CopyFromMenu
              toState={activeTab}
              variantName={name}
              {copySources}
              onselect={(d) => pickCopySource(activeTab, d.fromVariant, d.fromState)}
            />
          {/if}
        </div>
      </div>
    {/if}

    {#if activeTab && states[activeTab]}
      {@const stateName = activeTab}
      {@render compositeControls?.(stateName)}
      <span class="section-label">Properties</span>
      <StateBlock
        tokens={states[stateName]}
        typeGroups={typeGroups[stateName] ?? []}
        {component}
        {linkedOrder}
        {columns}
        {onchange}
      />
    {/if}
  {:else}
    {@render children?.({ activeState: '' })}
    <TokenLayout
      title={name}
      tokens={tokens}
      {component}
      {linkedOrder}
      {onchange}
    />
  {/if}

</div>
{/if}

<style>
  .variant-group {
    padding: var(--ui-space-16);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-lower);
    border-radius: var(--ui-radius-md);
    gap: var(--ui-space-12);
  }

  .variant-header {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: var(--ui-space-12);
  }

  .variant-header .demo-subtitle {
    margin: 0;
    font-size: var(--ui-font-size-2xl);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-primary);
  }

  .tabs-preview {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-8);
  }

  .tabs-states-block {
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
    border: 1px solid var(--ui-border-lower);
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
    box-shadow: 0 0 0 1px var(--ui-border);
  }

  .section-label {
    display: block;
    margin: 0;
    font-size: var(--ui-font-size-md);
    font-weight: 500;
    color: var(--ui-text-primary);
  }

  /* The Properties label is a direct child of .variant-group (which doesn't
     apply a flex gap), so space it from the tabs strip above. */
  .variant-group > .section-label {
    margin-top: var(--ui-space-8);
  }

</style>
