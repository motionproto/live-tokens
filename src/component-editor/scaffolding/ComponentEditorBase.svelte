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

  const ctx = createEditorContext();

  $: ctx._sharedOrder.set(shared?.sharedOrder ?? null);
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
  <slot />
  {#if shared}
    <SharedBlock {component} {shared} on:change />
  {/if}
</div>
