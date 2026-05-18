<script lang="ts">
  import { writable } from 'svelte/store';
  import type { Snippet } from 'svelte';
  import TokenLayout from './TokenLayout.svelte';
  import StateBlock from './StateBlock.svelte';
  import CopyFromMenu from './CopyFromMenu.svelte';
  import ShadowBackdrop from './ShadowBackdrop.svelte';
  import ShadowBackdropControls from './ShadowBackdropControls.svelte';
  import { mutate } from '../../core/store/editorStore';
  import { getEditorContext } from './editorContext';
  import type { Token, TypeGroupConfig } from './types';
  import type { Sibling } from './siblings';

  interface Props {
    name: string;
    title: string;
    tokens?: Token[];
    states?: Record<string, Token[]> | null;
    typeGroups?: Record<string, TypeGroupConfig[]>;
    /** When set, overrides are read from and cleared through the editor store. */
    component?: string | undefined;
    siblings?: Sibling[];
    columns?: number;
    /** Defaults to "Element" because most strips mix structural parts with states. */
    selectorLabel?: string;
    onchange?: () => void;
    children?: Snippet<[{ activeState: string }]>;
    stateActions?: Snippet<[string]>;
    previewActions?: Snippet;
    compositeControls?: Snippet<[string]>;
    /** Each child should be a `.property-row` to match the token grid above. */
    extraPropertyRows?: Snippet<[string]>;
    /** Skip the default centered, padded stage when the editor brings its own backdrop. */
    unboxedPreview?: boolean;
    backdropPadding?: string;
    backdropModes?: ReadonlyArray<'default' | 'image' | 'color'>;
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
    previewActions,
    compositeControls,
    extraPropertyRows,
    unboxedPreview = false,
    backdropPadding,
    backdropModes,
  }: Props = $props();

  let bgMode: 'default' | 'image' | 'color' = $state('default');
  let bgVar = $derived(`--backdrop-${component ?? name}-surface`);
  let showBackdropControls = $derived(!unboxedPreview);

  const editorCtx = getEditorContext();
  const linkedOrderStore = editorCtx?.linkedOrder ?? writable<Map<string, number> | null>(null);
  const focusedVariantStore = editorCtx?.focusedVariant ?? writable<string | null>(null);
  const focusedStateStore = editorCtx?.focusedState ?? writable<string | null>(null);
  const variantsStore = editorCtx?.variants ?? writable<{ value: string; label: string }[]>([]);
  let linkedOrder = $derived($linkedOrderStore ?? undefined);

  let activeTab: string = $state('');

  const TYPE_PROPS = ['colorVariable', 'familyVariable', 'sizeVariable', 'weightVariable', 'lineHeightVariable', 'outlineWidthVariable', 'outlineColorVariable'] as const;
  // Carry per-side derived vars so split padding fully transfers; no-op when absent.
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
      // Copy intent "make this state match" clears stale unlinked markers on touched vars.
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
  // Adopt cross-group state hint from chart row clicks.
  $effect(() => {
    if ($focusedStateStore && stateNames.includes($focusedStateStore) && activeTab !== $focusedStateStore) {
      activeTab = $focusedStateStore;
    }
  });

  let inFocusMode = $derived(siblings.length > 0);
  let amIFocused = $derived($focusedVariantStore === name);
  let shouldRender = $derived(!inFocusMode || amIFocused);
  let showVariantTabs = $derived(inFocusMode && $variantsStore.length >= 2);
  // Mirror state-tab clicks to the shared store so linked-block + chart track them.
  $effect(() => {
    if (amIFocused && activeTab && stateNames.includes(activeTab) && $focusedStateStore !== activeTab) {
      focusedStateStore.set(activeTab);
    }
  });

</script>

{#if shouldRender}
<div class="editor-section-card demo-section variant-group">
  {#if states}
    <div class="tabs-preview">
      <div class="preview-header">
        <span class="editor-section-title">Preview</span>
        {#if showVariantTabs}
          <div class="variant-tabs" role="tablist">
            {#each $variantsStore as opt (opt.value)}
              <button
                type="button"
                class="variant-tab-btn"
                class:active={opt.value === $focusedVariantStore}
                role="tab"
                aria-selected={opt.value === $focusedVariantStore}
                onclick={() => focusedVariantStore.set(opt.value)}
              >{opt.label}</button>
            {/each}
          </div>
        {/if}
        {#if previewActions}
          <div class="preview-actions">
            {@render previewActions?.()}
          </div>
        {/if}
      </div>
      {#if unboxedPreview}
        {@render children?.({ activeState: activeTab })}
      {:else}
        <div class="canvas-with-controls">
          {#if showBackdropControls}
            <div class="canvas-toolbar">
              <span class="canvas-toolbar-eyebrow">Background</span>
              <ShadowBackdropControls bind:mode={bgMode} colorVariable={bgVar} modes={backdropModes ?? ['default', 'image', 'color']} />
            </div>
          {/if}
          <ShadowBackdrop mode={bgMode} colorVariable={bgVar} padding={backdropPadding}>
            {@render children?.({ activeState: activeTab })}
          </ShadowBackdrop>
        </div>
      {/if}
    </div>

    {#if tabsStripVisible || (copySources.length > 0 && activeTab)}
      <div class="tabs-states-block">
        {#if tabsStripVisible}
          <span class="editor-subsection-title">{selectorLabel}</span>
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
      <span class="editor-subsection-title properties-title">Properties</span>
      <StateBlock
        tokens={states[stateName]}
        typeGroups={typeGroups[stateName] ?? []}
        {component}
        {linkedOrder}
        {columns}
        {onchange}
      />
      {#if extraPropertyRows}
        <div class="extra-property-rows">
          {@render extraPropertyRows(stateName)}
        </div>
      {/if}
    {/if}
  {:else}
    {#if unboxedPreview}
      {@render children?.({ activeState: '' })}
    {:else}
      <ShadowBackdrop mode={bgMode} colorVariable={bgVar} padding={backdropPadding}>
        {@render children?.({ activeState: '' })}
      </ShadowBackdrop>
    {/if}
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
  /* Card chrome lives on .editor-section-card in ui-editor.css. */
  .variant-group {
    gap: var(--ui-space-12);
  }

  .tabs-preview {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-20);
  }

  .preview-header {
    display: flex;
    align-items: center;
    gap: var(--ui-space-24);
    flex-wrap: wrap;
  }

  .preview-actions {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: var(--ui-space-8);
  }

  /* Positioned hull so the toolbar isn't clipped by the backdrop's overflow:hidden. */
  .canvas-with-controls {
    position: relative;
  }

  /* Floor backdrop height so the absolutely-positioned toolbar always fits with matched inset. */
  .canvas-with-controls :global(.shadow-backdrop) {
    min-height: 12rem;
  }

  .canvas-toolbar {
    position: absolute;
    top: var(--ui-space-8);
    right: var(--ui-space-8);
    z-index: 2;
    width: 11rem;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-10);
    /* Extra bottom padding houses the picker's absolute-positioned caption. */
    padding: var(--ui-space-10) var(--ui-space-12) var(--ui-space-24);
    background: rgba(22, 22, 26, 0.94);
    backdrop-filter: blur(12px) saturate(140%);
    -webkit-backdrop-filter: blur(12px) saturate(140%);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: var(--ui-radius-md);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    color: var(--ui-text-primary);
  }

  .canvas-toolbar-eyebrow {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-medium);
    color: rgba(255, 255, 255, 0.6);
    padding-bottom: var(--ui-space-6);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  /* Pill each option row so Default/Image match the swatch trigger's weight. */
  .canvas-toolbar :global(.backdrop-option) {
    padding: 0 var(--ui-space-8);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.14);
    border-radius: var(--ui-radius-md);
    color: rgba(255, 255, 255, 0.78);
  }
  .canvas-toolbar :global(.backdrop-option.checked) {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
    color: #fff;
  }

  /* Drop the swatch trigger's frame to avoid a double-border inside the option pill. */
  .canvas-toolbar :global(.backdrop-option .ui-ts-trigger) {
    background: transparent;
    border-color: transparent;
    padding-left: 0;
    padding-right: 0;
  }
  .canvas-toolbar :global(.backdrop-option .ui-ts-trigger:hover) {
    background: rgba(255, 255, 255, 0.06);
    border-color: transparent;
  }

  .canvas-toolbar :global(.ui-ts-meta-text) {
    color: rgba(255, 255, 255, 0.55);
  }

  /* Anchor dropdown to trigger's right so it expands leftward, not off-canvas. */
  .canvas-toolbar :global(.ui-ts-dropdown) {
    left: auto;
    right: 0;
  }

  .variant-tabs {
    display: inline-flex;
    flex-wrap: wrap;
    gap: var(--ui-space-4);
    padding: var(--ui-space-4);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
  }

  .variant-tab-btn {
    padding: var(--ui-space-6) var(--ui-space-12);
    background: none;
    border: none;
    border-radius: var(--ui-radius-sm);
    color: var(--ui-text-secondary);
    font-size: var(--ui-font-size-md);
    font-weight: var(--ui-font-weight-semibold);
    text-transform: capitalize;
    cursor: pointer;
    transition: color var(--ui-transition-fast), background var(--ui-transition-fast);
  }

  .variant-tab-btn:hover:not(.active) {
    color: var(--ui-text-primary);
    background: var(--ui-hover);
  }

  .variant-tab-btn.active {
    color: var(--ui-text-primary);
    background: var(--ui-surface-high);
    box-shadow: 0 0 0 1px var(--ui-border);
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
    border: 1px solid var(--ui-border-low);
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

  /* Direct child of .variant-group; needs its own margin since flex gap doesn't apply across siblings. */
  .properties-title {
    margin-top: var(--ui-space-8);
    margin-bottom: var(--ui-space-8);
  }

  .extra-property-rows {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .extra-property-rows :global(.property-row) {
    display: grid;
    grid-template-columns: minmax(8rem, max-content) 1fr;
    column-gap: var(--ui-space-16);
    align-items: center;
    min-height: 1.75rem;
  }

  .extra-property-rows :global(.property-row > .property-label) {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }

</style>
