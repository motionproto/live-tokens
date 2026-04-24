<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import UIRadiusSelector from '../../ui/UIRadiusSelector.svelte';
  import UIBorderWeightSelector from '../../ui/UIBorderWeightSelector.svelte';
  import UIFontFamilySelector from '../../ui/UIFontFamilySelector.svelte';
  import UIFontWeightSelector from '../../ui/UIFontWeightSelector.svelte';
  import UIDividerHeightSelector from '../../ui/UIDividerHeightSelector.svelte';
  import { editorState, getComponentPropertySiblings } from '../../lib/editorStore';

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
    return v.endsWith('-divider-width') || v.endsWith('-divider-thickness');
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

  /** Fixed internal order within the linked and independent groups. */
  const baseKindOrder: Kind[] = [
    'font-family',
    'font-weight',
    'border-width',
    'divider-width',
    'divider-height',
    'radius',
    'extras',
    'surface',
    'border',
  ];
  const orderRank: Record<Kind, number> = Object.fromEntries(
    baseKindOrder.map((k, i) => [k, i]),
  ) as Record<Kind, number>;

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

  function buildEntries(list: Token[], order: Map<string, number> | undefined, linked: Set<Kind>): Entry[] {
    const indexed = list.map((token, i) => ({ e: { kind: categorize(token.variable), token }, i }));
    indexed.sort((a, b) => {
      const aLinked = linked.has(a.e.kind) ? 0 : 1;
      const bLinked = linked.has(b.e.kind) ? 0 : 1;
      if (aLinked !== bLinked) return aLinked - bLinked;
      const rankDiff = orderRank[a.e.kind] - orderRank[b.e.kind];
      if (rankDiff !== 0) return rankDiff;
      const aKey = order?.get(a.e.token.variable);
      const bKey = order?.get(b.e.token.variable);
      if (aKey !== undefined && bKey !== undefined) return aKey - bKey;
      if (aKey !== undefined) return -1;
      if (bKey !== undefined) return 1;
      return a.i - b.i;
    });
    return indexed.map((x) => x.e);
  }

  /** Kinds that currently have at least one variable with ≥2 siblings in the component. */
  function computeLinkedKinds(comp: string | undefined, state: typeof $editorState): Set<Kind> {
    const set = new Set<Kind>();
    if (!comp) return set;
    const slice = state.components[comp];
    if (!slice) return set;
    for (const varName of Object.keys(slice.aliases)) {
      if (getComponentPropertySiblings(comp, varName).length >= 2) {
        set.add(categorize(varName));
      }
    }
    return set;
  }

  /** Column layout: linked kinds first (leftmost), then independent kinds.
   *  Computed per-component so all fieldsets in the same component share the same tracks. */
  function buildColumnLayout(linked: Set<Kind>): { map: Partial<Record<Kind, number>>; extrasBaseCol: number; total: number } {
    const ordered: Kind[] = [
      ...baseKindOrder.filter((k) => linked.has(k)),
      ...baseKindOrder.filter((k) => !linked.has(k)),
    ];
    const map: Partial<Record<Kind, number>> = {};
    let col = 1;
    let extrasBaseCol = 1;
    for (const k of ordered) {
      if (k === 'extras') {
        extrasBaseCol = col;
        col += 2;
      } else {
        map[k] = col;
        col += 1;
      }
    }
    return { map, extrasBaseCol, total: col - 1 };
  }

  $: linkedKinds = computeLinkedKinds(component, $editorState);
  $: columnLayout = buildColumnLayout(linkedKinds);

  function placeEntries(list: Entry[], layout: ReturnType<typeof buildColumnLayout>): { entry: Entry; col: number }[] {
    let extras = 0;
    return list.map((entry) => {
      if (entry.kind === 'extras') {
        const col = layout.extrasBaseCol + Math.min(extras, 1);
        extras++;
        return { entry, col };
      }
      return { entry, col: layout.map[entry.kind] ?? 1 };
    });
  }

  $: entries = buildEntries(tokens, sharedOrder, linkedKinds);
  $: placed = placeEntries(entries, columnLayout);
</script>

<div class="token-group">
  {#if title}
    <span class="token-group-title">{title}</span>
  {/if}
  <div class="token-grid" style="--token-columns: {columnLayout.total};">
    {#each placed as { entry, col }}
      {@const token = entry.token}
      {@const dis = token.disabled ?? false}
      {@const ctxs = contexts[token.variable]}
      <div
        class="token-entry"
        class:highlighted={highlightedVars.has(token.variable)}
        style="grid-column: {col};"
        on:mouseenter={() => { if (ctxs || token.canBeShared) dispatch('tokenhover', { variable: token.variable }); }}
        on:mouseleave={() => { if (ctxs || token.canBeShared) dispatch('tokenhover', { variable: null }); }}
      >
        <span class="token-label">{token.label}</span>
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
    font-size: var(--ui-font-size-xs);
    font-weight: var(--ui-font-weight-semibold);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
  }

  .token-grid {
    display: grid;
    grid-template-columns: repeat(var(--token-columns, 10), max-content);
    column-gap: var(--ui-space-8);
    row-gap: var(--ui-space-8);
    align-items: flex-start;
  }

  .token-entry {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-2);
    border-radius: var(--ui-radius-sm);
    padding: var(--ui-space-2);
    transition: background var(--ui-transition-fast);
    min-width: 0;
  }

  .token-entry.highlighted {
    background: var(--ui-surface-high);
    outline: 1px dashed var(--ui-text-accent);
  }

  .token-entry.highlighted .token-label {
    color: var(--ui-text-accent);
  }

  .token-label {
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    padding-left: var(--ui-space-2);
  }

  .token-contexts {
    display: flex;
    flex-direction: column;
    gap: 1px;
    padding-left: var(--ui-space-2);
  }

  .token-context {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    white-space: nowrap;
  }
</style>
