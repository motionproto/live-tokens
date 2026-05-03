<script lang="ts">
  import DemoHeader from './DemoHeader.svelte';
  import NonStylableConfig from './NonStylableConfig.svelte';
  import SharedBlock from './SharedBlock.svelte';
  import { registerComponentSchema } from '../../lib/editorStore';
  import { createEditorContext } from './editorContext';
  import type { Token } from './types';
  import type { SharedBlockResult } from './sharedBlock';

  export let component: string;
  export let title: string;
  export let description: string = '';
  /** Schema of every token this editor manages. Drives reset + groupKey registration. */
  export let tokens: Token[] = [];
  /** Optional shared-block result. When provided, the SharedBlock is rendered
      and hover highlights propagate to VariantGroup children via context. */
  export let shared: SharedBlockResult | null = null;
  /** When true, exposes a List/Tabs view toggle in the component header strip.
      Every multi-state VariantGroup in this editor honors the chosen mode. */
  export let tabbable: boolean = false;
  /** Canonical {value,label} list of variants in display order. When provided
      and the editor is in tabs mode, a single variant tab strip is rendered
      that drives which VariantGroup is focused. */
  export let variants: { value: string; label: string }[] = [];

  const ctx = createEditorContext();
  const { viewMode, focusedVariant } = ctx;

  $: ctx._sharedOrder.set(shared?.sharedOrder ?? null);
  $: ctx._tabbable.set(tabbable);
  $: if ($viewMode === 'list') ctx.focusedVariant.set(null);
  $: showVariantTabs = tabbable && $viewMode === 'tabs' && variants.length >= 2;
  $: if (showVariantTabs && ($focusedVariant === null || !variants.some((v) => v.value === $focusedVariant))) {
    focusedVariant.set(variants[0].value);
  }
  $: registerComponentSchema(component, tokens);
  $: resetVariables = tokens.map((t) => t.variable);
</script>

<div class="demo-block">
  <DemoHeader {component} {title} {description} {resetVariables} />
  {#if $$slots.config}
    <NonStylableConfig>
      <slot name="config" />
    </NonStylableConfig>
  {/if}
  {#if showVariantTabs}
    <div class="variant-tabs" role="tablist">
      {#each variants as opt}
        <button
          type="button"
          class="variant-tab-btn"
          class:active={opt.value === $focusedVariant}
          role="tab"
          aria-selected={opt.value === $focusedVariant}
          on:click={() => focusedVariant.set(opt.value)}
        >{opt.label}</button>
      {/each}
    </div>
  {/if}
  <slot />
  {#if shared}
    <SharedBlock {component} {shared} on:change />
  {/if}
</div>

<style>
  .variant-tabs {
    display: inline-flex;
    flex-wrap: wrap;
    gap: var(--ui-space-4);
    padding: var(--ui-space-4);
    background: var(--ui-surface-lowest);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-md);
    align-self: flex-start;
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
    box-shadow: 0 0 0 1px var(--ui-border-default);
  }
</style>
