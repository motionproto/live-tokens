<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import UIRadiusSelector from '../../ui/UIRadiusSelector.svelte';
  import UIBorderWeightSelector from '../../ui/UIBorderWeightSelector.svelte';
  import UIFontFamilySelector from '../../ui/UIFontFamilySelector.svelte';
  import UIFontWeightSelector from '../../ui/UIFontWeightSelector.svelte';
  import UIDividerHeightSelector from '../../ui/UIDividerHeightSelector.svelte';

  const dispatch = createEventDispatcher();

  type Token = { label: string; variable: string; canBeShared?: boolean; disabled?: boolean };

  type Kind =
    | 'surface'
    | 'border'
    | 'border-width'
    | 'radius'
    | 'divider-width'
    | 'divider-height'
    | 'font-family'
    | 'font-weight'
    | 'extras';

  type Entry = { kind: Kind; token: Token };

  export let title: string = '';
  export let tokens: Token[];
  /** Forwarded to each selector; when set, writes persist through the editor store. */
  export let component: string | undefined = undefined;
  /** Optional context labels per variable (shown below the selector). */
  export let contexts: Record<string, string[]> = {};
  /** Variables to visually highlight as connected to a hovered shared property. */
  export let highlightedVars: Set<string> = new Set();
  /** Per-variable rank that overrides kind rank when sorting; lets shared tokens align with the top shared row. */
  export let sharedOrder: Map<string, number> | undefined = undefined;

  function isFontFamily(v: string): boolean {
    return v.endsWith('-font-family');
  }

  function isFontWeight(v: string): boolean {
    return v.endsWith('-font-weight');
  }

  function isRadius(v: string): boolean {
    return v.endsWith('-radius') || v.startsWith('--radius-');
  }

  function isBorderWidth(v: string): boolean {
    return v.endsWith('-border-width') || v.startsWith('--border-width-');
  }

  function isDividerWidth(v: string): boolean {
    return v.endsWith('-divider-width');
  }

  function isDividerHeight(v: string): boolean {
    return v.endsWith('-divider-height');
  }

  function isBorder(v: string): boolean {
    return v.endsWith('-border') || v.startsWith('--border-');
  }

  function isSurface(v: string): boolean {
    return v.endsWith('-surface') || v.startsWith('--surface-');
  }

  function isTextColor(v: string): boolean {
    return v.endsWith('-text') || v.startsWith('--text-');
  }

  const orderRank: Record<Kind, number> = {
    surface: 0,
    border: 1,
    'border-width': 2,
    radius: 3,
    'divider-width': 4,
    'divider-height': 5,
    extras: 6,
    'font-family': 7,
    'font-weight': 7,
  };

  function categorize(v: string): Kind {
    if (isFontFamily(v)) return 'font-family';
    if (isFontWeight(v)) return 'font-weight';
    if (isTextColor(v)) return 'extras';
    if (isRadius(v)) return 'radius';
    if (isDividerWidth(v)) return 'divider-width';
    if (isDividerHeight(v)) return 'divider-height';
    if (isBorderWidth(v)) return 'border-width';
    if (isBorder(v)) return 'border';
    if (isSurface(v)) return 'surface';
    return 'extras';
  }

  function buildEntries(list: Token[], order: Map<string, number> | undefined): Entry[] {
    const indexed = list.map((token, i) => ({ e: { kind: categorize(token.variable), token }, i }));
    indexed.sort((a, b) => {
      const aShared = a.e.token.disabled ? 0 : 1;
      const bShared = b.e.token.disabled ? 0 : 1;
      if (aShared !== bShared) return aShared - bShared;
      const aKey = order?.get(a.e.token.variable);
      const bKey = order?.get(b.e.token.variable);
      if (aKey !== undefined && bKey !== undefined) return aKey - bKey;
      if (aKey !== undefined) return -1;
      if (bKey !== undefined) return 1;
      return orderRank[a.e.kind] - orderRank[b.e.kind] || a.i - b.i;
    });
    return indexed.map((x) => x.e);
  }

  $: entries = buildEntries(tokens, sharedOrder);
</script>

<div class="token-group">
  {#if title}
    <span class="token-group-title">{title}</span>
  {/if}
  <div class="token-grid">
    {#each entries as entry}
      {@const token = entry.token}
      {@const dis = token.disabled ?? false}
      {@const ctxs = contexts[token.variable]}
      <div
        class="token-entry"
        class:highlighted={!dis && highlightedVars.has(token.variable)}
        on:mouseenter={() => { if (ctxs) dispatch('tokenhover', { variable: token.variable }); }}
        on:mouseleave={() => { if (ctxs) dispatch('tokenhover', { variable: null }); }}
      >
        <span class="token-label">{token.label}</span>
        <div class="token-selector-row">
          {#if entry.kind === 'radius'}
            <UIRadiusSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={dis} on:change />
          {:else if entry.kind === 'border-width' || entry.kind === 'divider-width'}
            <UIBorderWeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={dis} on:change />
          {:else if entry.kind === 'divider-height'}
            <UIDividerHeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={dis} on:change />
          {:else if entry.kind === 'font-family'}
            <UIFontFamilySelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={dis} on:change />
          {:else if entry.kind === 'font-weight'}
            <UIFontWeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={dis} on:change />
          {:else}
            <UIPaletteSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={dis} on:change />
          {/if}
          {#if ctxs?.length}
            <div class="token-contexts">
              {#each ctxs as ctx}
                <span class="token-context">{ctx}</span>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .token-group {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-6);
  }

  .token-group-title {
    font-size: var(--ui-font-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .token-grid {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-8);
    align-items: flex-start;
  }

  .token-entry {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-2);
    transition: background var(--ui-transition-fast);
  }

  .token-entry.highlighted {
    background: var(--ui-surface-high);
    border: 1px dashed var(--ui-text-accent);
  }

  .token-entry.highlighted .token-label {
    color: var(--ui-text-accent);
  }

  .token-label {
    font-size: var(--ui-font-sm);
    color: var(--ui-text-secondary);
    padding-left: var(--ui-space-2);
  }

  .token-selector-row {
    display: flex;
    align-items: center;
    gap: var(--ui-space-6);
  }

  .token-contexts {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .token-context {
    font-size: var(--ui-font-xs);
    color: var(--ui-text-tertiary);
    white-space: nowrap;
  }
</style>
