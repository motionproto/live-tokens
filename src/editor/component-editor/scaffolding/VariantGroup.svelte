<script lang="ts">
  import { writable } from 'svelte/store';
  import type { Snippet } from 'svelte';
  import TokenLayout from './TokenLayout.svelte';
  import StateBlock from './StateBlock.svelte';
  import CopyFromMenu from './CopyFromMenu.svelte';
  import ShadowBackdrop from './ShadowBackdrop.svelte';
  import ShadowBackdropControls from './ShadowBackdropControls.svelte';
  import { mutate } from '../../core/store/editorStore';
  import { getDeclaredValue } from '../../core/palettes/tokenRegistry';
  import type { CssVarRef } from '../../core/store/editorTypes';
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
    /** Extra sections appended below the Background controls inside the canvas
        toolbar. Use `.canvas-toolbar-eyebrow` for section headings to match
        Background. Lets per-instance display knobs (anchor, alignment, etc.)
        live with the canvas rather than in a separate config block above. */
    canvasToolbarExtras?: Snippet;
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
    canvasToolbarExtras,
    unboxedPreview = false,
    backdropPadding,
    backdropModes,
  }: Props = $props();

  let bgMode: 'default' | 'image' | 'color' = $state('default');
  let bgVar = $derived(`--backdrop-${component ?? name}-surface`);

  const editorCtx = getEditorContext();
  const linkedOrderStore = editorCtx?.linkedOrder ?? writable<Map<string, number> | null>(null);
  const focusedVariantStore = editorCtx?.focusedVariant ?? writable<string | null>(null);
  const focusedStateStore = editorCtx?.focusedState ?? writable<string | null>(null);
  const variantsStore = editorCtx?.variants ?? writable<{ value: string; label: string }[]>([]);
  const preserveColorFamilyStore = editorCtx?.preserveColorFamily ?? writable(false);
  let linkedOrder = $derived($linkedOrderStore ?? undefined);

  let activeTab: string = $state('');

  const TYPE_PROPS = ['colorVariable', 'familyVariable', 'sizeVariable', 'weightVariable', 'lineHeightVariable', 'outlineWidthVariable', 'outlineColorVariable'] as const;
  // Carry per-side derived vars so split padding fully transfers; no-op when absent.
  const PADDING_SIDES = ['top', 'right', 'bottom', 'left'] as const;

  /** A token whose label contains "color" describes a color property. The
      copy-from "Preserve color families" toggle skips these so the destination
      keeps its existing palette family (e.g. button-primary stays on `brand`)
      while still picking up shape/typography from the source variant. */
  function isColorToken(t: Token): boolean {
    return t.label.toLowerCase().includes('color');
  }

  /** Parse the right-hand side of a CSS declaration (e.g. `var(--surface-accent-lowest)`
      or `#ff0000`) into a CssVarRef. Returns null for empty/unparseable input.
      Used by copy-from when the source has no explicit override — we resolve
      its declared default so the destination visually matches the source
      instead of falling back to its own family's default. */
  function declaredToRef(declared: string | null): CssVarRef | null {
    if (!declared) return null;
    const m = declared.match(/^\s*var\((--[a-z0-9-]+)\)\s*$/i);
    if (m) return { kind: 'token', name: m[1] };
    return { kind: 'literal', value: declared };
  }

  /** Extract a transparency percentage from a `color-mix(in srgb, var(--X) N%, transparent)`
      wrapper, optionally itself wrapped in `var(...)`. Returns null if no
      such wrapper is present. */
  const ALPHA_RE = /color-mix\s*\(\s*in\s+srgb\s*,\s*var\(--[a-z0-9-]+\)\s+([\d.]+%)\s*,\s*transparent\s*\)/i;
  function extractAlpha(value: string): string | null {
    const m = value.match(ALPHA_RE);
    return m ? m[1] : null;
  }

  /** Extract the inner var() base reference, whether the value is a bare
      `var(--X)`, or wrapped by a transparency color-mix, or both. */
  function extractBaseToken(value: string): string | null {
    const mix = value.match(/color-mix\s*\(\s*in\s+srgb\s*,\s*var\((--[a-z0-9-]+)\)/i);
    if (mix) return mix[1];
    const bare = value.match(/var\((--[a-z0-9-]+)\)/i);
    return bare ? bare[1] : null;
  }

  /** TypeGroup props whose values are color tokens; preserve-color-families
      skips these in the typeGroups copy loop. */
  const COLOR_TYPE_PROPS = new Set(['colorVariable', 'outlineColorVariable']);

  function pickCopySource(toState: string, fromVariant: string, fromState: string) {
    const preserveColorFamily = $preserveColorFamilyStore;
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
      /** Resolve a variable's effective value as a CSS string: the override if
          set, otherwise its declared default. Returns null if neither exists. */
      const effectiveValue = (varName: string): string | null => {
        const ref = slice.aliases[varName];
        if (ref) return ref.kind === 'token' ? `var(${ref.name})` : ref.value;
        return getDeclaredValue(varName);
      };

      const apply = (srcVar: string, dstVar: string) => {
        if (srcVar === dstVar) return;
        if (srcVar in slice.aliases) {
          slice.aliases[dstVar] = slice.aliases[srcVar];
        } else {
          // Src is at its declared default. Materialize that default as dst's
          // override so dst visually picks up src's value — otherwise dst
          // falls back to its OWN family default and the copy is a visual no-op.
          const ref = declaredToRef(getDeclaredValue(srcVar));
          if (ref) slice.aliases[dstVar] = ref;
          else delete slice.aliases[dstVar];
        }
        dstVarsTouched.push(dstVar);
      };

      /** Preserve-color-families variant of apply: copy src's transparency
          wrapper (if any) over dst's existing base color so dst keeps its
          palette family but picks up src's alpha. Source with no alpha = no-op
          (leaves dst's color untouched). */
      const applyColorPreserve = (srcVar: string, dstVar: string) => {
        const srcVal = effectiveValue(srcVar);
        if (!srcVal) return;
        const alpha = extractAlpha(srcVal);
        if (!alpha) return;
        const dstVal = effectiveValue(dstVar);
        const dstBase = dstVal ? extractBaseToken(dstVal) : null;
        if (!dstBase) return;
        slice.aliases[dstVar] = {
          kind: 'literal',
          value: `color-mix(in srgb, var(${dstBase}) ${alpha}, transparent)`,
        };
        dstVarsTouched.push(dstVar);
      };
      const minLen = Math.min(srcTokens.length, dstTokens.length);
      for (let i = 0; i < minLen; i++) {
        const srcVar = srcTokens[i].variable;
        const dstVar = dstTokens[i].variable;
        if (preserveColorFamily && isColorToken(srcTokens[i])) {
          applyColorPreserve(srcVar, dstVar);
          continue;
        }
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
          if (!srcVar || !dstVar) continue;
          if (preserveColorFamily && COLOR_TYPE_PROPS.has(prop)) {
            applyColorPreserve(srcVar, dstVar);
            continue;
          }
          apply(srcVar, dstVar);
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
        <ShadowBackdrop mode={bgMode} colorVariable={bgVar} padding={backdropPadding}>
          {#snippet controls()}
            <div class="canvas-toolbar">
              <span class="canvas-toolbar-eyebrow">Background</span>
              <ShadowBackdropControls bind:mode={bgMode} colorVariable={bgVar} modes={backdropModes ?? ['default', 'image', 'color']} />
              {@render canvasToolbarExtras?.()}
            </div>
          {/snippet}
          {@render children?.({ activeState: activeTab })}
        </ShadowBackdrop>
      {/if}
    </div>

    {#if tabsStripVisible}
      <div class="tabs-states-block">
        <span class="editor-subsection-title">{selectorLabel}</span>
        <div class="tabs-selectors">
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
          {#if activeTab}
            {@render stateActions?.(activeTab)}
          {/if}
        </div>
      </div>
    {/if}

    {#if activeTab && states[activeTab]}
      {@const stateName = activeTab}
      {@render compositeControls?.(stateName)}
      <div class="properties-header">
        <span class="editor-subsection-title properties-title">Properties</span>
        {#if !tabsStripVisible && stateActions}
          {@render stateActions(activeTab)}
        {/if}
        {#if copySources.length > 0}
          <CopyFromMenu
            toState={activeTab}
            variantName={name}
            {copySources}
            onselect={(d) => pickCopySource(activeTab, d.fromVariant, d.fromState)}
          />
        {/if}
      </div>
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

  /* Sits in the backdrop's right-rail column (ShadowBackdrop owns the two-column
     split). Own border + raised surface so it reads as a distinct panel inside
     the backdrop, regardless of which backdrop mode is active. */
  .canvas-toolbar {
    width: 11rem;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-12);
    padding: var(--ui-space-10) var(--ui-space-12);
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    box-sizing: border-box;
  }

  .canvas-toolbar :global(.canvas-toolbar-eyebrow) {
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-medium);
    color: var(--ui-text-tertiary);
  }

  /* Divider lives *between* sections, not under each eyebrow. First eyebrow
     has no preceding sibling and stays flush. */
  .canvas-toolbar > :global(* + .canvas-toolbar-eyebrow) {
    padding-top: var(--ui-space-12);
    border-top: 1px solid var(--ui-border-low);
  }

  /* Explicit separator for label-less sections in canvasToolbarExtras. */
  .canvas-toolbar :global(.canvas-toolbar-divider) {
    margin: 0;
    border: 0;
    border-top: 1px solid var(--ui-border-low);
  }

  /* Native <select> styled to match the property-row trigger chrome
     (UITokenSelector) so toolbar selects don't read as a separate visual
     vocabulary from the rest of the editor. */
  .canvas-toolbar :global(.canvas-toolbar-select) {
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    padding: 0 var(--ui-space-24) 0 var(--ui-space-8);
    min-height: 1.75rem;
    background-color: var(--ui-surface-low);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 12 12'%3E%3Cpath fill='none' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' d='M3 5l3 3 3-3'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right var(--ui-space-8) center;
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-sans);
    font-size: var(--ui-font-size-sm);
    cursor: pointer;
    transition: background-color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }
  .canvas-toolbar :global(.canvas-toolbar-select:hover) {
    background-color: var(--ui-surface-high);
    border-color: var(--ui-border-higher);
  }
  .canvas-toolbar :global(.canvas-toolbar-select:focus-visible) {
    outline: 2px solid var(--ui-highlight);
    outline-offset: 2px;
  }

  /* Native <input> styled to match the toolbar's select chrome. */
  .canvas-toolbar :global(.canvas-toolbar-input) {
    width: 100%;
    padding: 0 var(--ui-space-8);
    min-height: 1.75rem;
    background: var(--ui-surface-low);
    border: 1px solid var(--ui-border);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-primary);
    font-family: var(--ui-font-sans);
    font-size: var(--ui-font-size-sm);
    transition: background-color var(--ui-transition-fast), border-color var(--ui-transition-fast);
  }
  .canvas-toolbar :global(.canvas-toolbar-input:hover) {
    border-color: var(--ui-border-higher);
  }
  .canvas-toolbar :global(.canvas-toolbar-input:focus-visible) {
    outline: 2px solid var(--ui-highlight);
    outline-offset: 2px;
  }

  /* Pill each option row so Default/Image match the swatch trigger's weight.
     One step below the toolbar's --ui-surface-low so option chrome stays visible
     against the panel. */
  .canvas-toolbar :global(.backdrop-option) {
    padding: 0 var(--ui-space-8);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-low);
    border-radius: var(--ui-radius-md);
    color: var(--ui-text-secondary);
  }
  .canvas-toolbar :global(.backdrop-option.checked) {
    background: var(--ui-surface-high);
    border-color: var(--ui-border);
    color: var(--ui-text-primary);
  }

  /* Drop the swatch trigger's frame to avoid a double-border inside the option pill. */
  .canvas-toolbar :global(.backdrop-option .ui-ts-trigger) {
    background: transparent;
    border-color: transparent;
    padding-left: 0;
    padding-right: 0;
  }
  .canvas-toolbar :global(.backdrop-option .ui-ts-trigger:hover) {
    background: var(--ui-hover);
    border-color: transparent;
  }

  .canvas-toolbar :global(.ui-ts-meta-text) {
    color: var(--ui-text-tertiary);
  }

  /* Anchor dropdown to the trigger's right edge; the toolbar sits flush against
     the editor's right gutter, so a left-anchored dropdown would clip. */
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
  .properties-header {
    display: flex;
    align-items: center;
    gap: var(--ui-space-16);
    margin-top: var(--ui-space-8);
    margin-bottom: var(--ui-space-8);
  }

  /* Tighten the title's line-height so its line-box matches its visual glyph
     height — otherwise the inherited body line-height makes the heading sit
     visually above the smaller CopyFromMenu trigger even with align-items:center. */
  .properties-header .properties-title {
    line-height: 1;
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
