<script lang="ts">
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import UIRadiusSelector from '../../ui/UIRadiusSelector.svelte';
  import UIBorderWeightSelector from '../../ui/UIBorderWeightSelector.svelte';
  import UIFontFamilySelector from '../../ui/UIFontFamilySelector.svelte';
  import UIFontWeightSelector from '../../ui/UIFontWeightSelector.svelte';
  import UIFontSizeSelector from '../../ui/UIFontSizeSelector.svelte';
  import UILineHeightSelector from '../../ui/UILineHeightSelector.svelte';
  import UIDividerHeightSelector from '../../ui/UIDividerHeightSelector.svelte';
  import UIDotSizeSelector from '../../ui/UIDotSizeSelector.svelte';
  import UIPaddingSelector from '../../ui/UIPaddingSelector.svelte';
  import { editorState, getComponentPropertySiblings } from '../../lib/editorStore';

  type Token = { label: string; variable: string; canBeShared?: boolean; groupKey?: string; disabled?: boolean; hidden?: boolean };

  type Kind =
    | 'surface'
    | 'border'
    | 'border-width'
    | 'radius'
    | 'divider-width'
    | 'divider-height'
    | 'dot-size'
    | 'font-family'
    | 'font-weight'
    | 'font-size'
    | 'line-height'
    | 'padding'
    | 'gap'
    | 'extras';

  type Entry = { kind: Kind; token: Token };

  export let title: string = '';
  export let tokens: Token[];
  /** Forwarded to each selector; when set, writes persist through the editor store. */
  export let component: string | undefined = undefined;
  /** Optional context labels per variable (shown below the selector). */
  export let contexts: Record<string, string[]> = {};
  /** Per-variable rank that overrides kind rank when sorting; lets shared tokens align with the top shared row. */
  export let sharedOrder: Map<string, number> | undefined = undefined;
  /** Set true on the shared-block instance so dimmed variant rows can scroll/flash to the matching anchor. */
  export let isSharedBlock: boolean = false;

  function isFontFamily(v: string): boolean {
    return v.endsWith('-font-family');
  }

  function isFontWeight(v: string): boolean {
    return v.endsWith('-font-weight');
  }

  function isFontSize(v: string): boolean {
    return v.endsWith('-font-size');
  }

  function isLineHeight(v: string): boolean {
    return v.endsWith('-line-height');
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

  function isDotSize(v: string): boolean {
    return v.endsWith('-dot-size');
  }

  function isPadding(v: string): boolean {
    return v.endsWith('-padding');
  }

  function isGap(v: string): boolean {
    return v.endsWith('-gap');
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

  /** Fixed internal order for tokens within a layout. */
  const baseKindOrder: Kind[] = [
    'font-family',
    'font-weight',
    'font-size',
    'line-height',
    'border-width',
    'divider-width',
    'divider-height',
    'dot-size',
    'radius',
    'padding',
    'gap',
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
    if (isFontSize(v)) return 'font-size';
    if (isLineHeight(v)) return 'line-height';
    if (isTextColor(v)) return 'extras';
    if (isRadius(v)) return 'radius';
    if (isDividerWidth(v)) return 'divider-width';
    if (isDividerHeight(v)) return 'divider-height';
    if (isDotSize(v)) return 'dot-size';
    if (isPadding(v)) return 'padding';
    if (isGap(v)) return 'gap';
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

  function isPaddingSplit(varName: string, comp: string | undefined, state: typeof $editorState): boolean {
    const sides = ['top', 'right', 'bottom', 'left'];
    if (comp) {
      const slice = state.components[comp];
      if (!slice) return false;
      return sides.some((s) => `${varName}-${s}` in slice.aliases);
    }
    return sides.some((s) => !!document.documentElement.style.getPropertyValue(`${varName}-${s}`).trim());
  }

  $: linkedKinds = computeLinkedKinds(component, $editorState);
  $: entries = buildEntries(tokens.filter((t) => !t.hidden), sharedOrder, linkedKinds);
  /** Index of the first independent (non-linked) entry; -1 when there are no linked entries or no boundary. */
  $: firstIndependentIdx = (() => {
    const idx = entries.findIndex((e) => !linkedKinds.has(e.kind));
    if (idx <= 0) return -1;
    return idx;
  })();

</script>

<div class="token-group">
  {#if title}
    <span class="token-group-title">{title}</span>
  {/if}
  <div class="token-grid">
    {#each entries as entry, i}
      {@const token = entry.token}
      {@const dis = token.disabled ?? false}
      {@const ctxs = contexts[token.variable]}
      {@const lockedSelections = dis}
      {@const padSplit = entry.kind === 'padding' && isPaddingSplit(token.variable, component, $editorState)}
      {#if i === firstIndependentIdx}
        <div class="zone-divider" aria-hidden="true"></div>
      {/if}
      {#if padSplit}
        <UIPaddingSelector
          mode="sides"
          rowLabel={token.label}
          variable={token.variable}
          {component}
          canBeShared={token.canBeShared ?? false}
          selectionsLocked={lockedSelections}
          on:change
        />
      {:else}
        <div
          class="token-row"
          class:has-contexts={!!ctxs?.length}
        >
          <span class="token-label">{token.label}</span>
          {#if entry.kind === 'radius'}
            <UIRadiusSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'border-width' || entry.kind === 'divider-width'}
            <UIBorderWeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'divider-height'}
            <UIDividerHeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'dot-size'}
            <UIDotSizeSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'padding'}
            <UIPaddingSelector mode="single" variable={token.variable} {component} canBeShared={token.canBeShared ?? false} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'gap'}
            <UIPaddingSelector mode="single" splittable={false} variable={token.variable} {component} canBeShared={token.canBeShared ?? false} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'font-family'}
            <UIFontFamilySelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'font-weight'}
            <UIFontWeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'font-size'}
            <UIFontSizeSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'line-height'}
            <UILineHeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} selectionsLocked={lockedSelections} on:change />
          {:else}
            <UIPaletteSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} selectionsLocked={lockedSelections} on:change />
          {/if}
          {#if ctxs?.length}
            <div class="token-contexts">
              {#each ctxs as ctx}
                <span class="token-context">{ctx}</span>
              {/each}
            </div>
          {/if}
        </div>
      {/if}
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
    --token-selector-w: 8rem;
    display: grid;
    grid-template-columns: max-content var(--token-selector-w) 1fr;
    column-gap: var(--ui-space-10);
    row-gap: var(--ui-space-6);
    align-items: center;
    padding: var(--ui-space-4) var(--ui-space-12);
    min-width: 0;
  }

  @container (max-width: 480px) {
    .token-grid { --token-selector-w: 6rem; }
  }

  @container (max-width: 380px) {
    .token-grid {
      grid-template-columns: max-content 1fr;
      column-gap: var(--ui-space-6);
    }
    .token-grid :global(.ui-token-selector) { grid-column: 2; }
  }

  .zone-divider {
    grid-column: 1 / -1;
    height: 1.75rem;
  }

  .token-row {
    display: grid;
    grid-template-columns: subgrid;
    grid-column: 1 / -1;
    align-items: center;
    row-gap: var(--ui-space-2);
    border-radius: var(--ui-radius-sm);
    transition: background var(--ui-transition-fast);
    min-width: 0;
  }

  .token-label {
    grid-column: 1;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
    text-align: left;
    line-height: 1;
  }

  .token-contexts {
    grid-column: 2 / -1;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .token-context {
    font-size: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    white-space: nowrap;
  }
</style>
