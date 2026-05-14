<script lang="ts">
  import { run } from 'svelte/legacy';

  import DemoHeader from './DemoHeader.svelte';
  import NonStylableConfig from './NonStylableConfig.svelte';
  import LinkedBlock from './LinkedBlock.svelte';
  import { createEditorContext } from './editorContext';
  import type { Token } from './types';
  import type { LinkedBlockResult } from './linkedBlock';

  
  
  
  interface Props {
    component: string;
    title: string;
    description?: string;
    /** Token list used to drive the reset action in the header. The editor itself
      is responsible for calling `registerComponentSchema` synchronously. */
    tokens?: Token[];
    /** Optional linked-block result. When provided, the LinkedBlock is rendered
      and hover highlights propagate to VariantGroup children via context. */
    linked?: LinkedBlockResult | null;
    /** Canonical {value,label} list of variants in display order. When provided
      with 2+ entries, a single variant tab strip is rendered that drives which
      VariantGroup is focused. */
    variants?: { value: string; label: string }[];
    config?: import('svelte').Snippet;
    children?: import('svelte').Snippet<[any]>;
  }

  let {
    component,
    title,
    description = '',
    tokens = [],
    linked = null,
    variants = [],
    config,
    children
  }: Props = $props();

  const ctx = createEditorContext();
  const { focusedVariant } = ctx;

  run(() => {
    ctx._linkedOrder.set(linked?.linkedOrder ?? null);
  });
  let showVariantTabs = $derived(variants.length >= 2);
  run(() => {
    if (showVariantTabs && ($focusedVariant === null || !variants.some((v) => v.value === $focusedVariant))) {
      focusedVariant.set(variants[0].value);
    }
  });
  let resetVariables = $derived(tokens.map((t) => t.variable));
</script>

<div class="demo-block">
  <DemoHeader {component} {title} {description} {resetVariables} />
  {#if config}
    <NonStylableConfig>
      {@render config?.()}
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
          onclick={() => focusedVariant.set(opt.value)}
        >{opt.label}</button>
      {/each}
    </div>
  {/if}
  {@render children?.({ focusedVariant: $focusedVariant, })}
  {#if linked}
    <LinkedBlock {component} {linked} />
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
