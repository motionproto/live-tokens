<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import UIRadiusSelector from '../../ui/UIRadiusSelector.svelte';
  import UIBorderWeightSelector from '../../ui/UIBorderWeightSelector.svelte';
  import UIFontFamilySelector from '../../ui/UIFontFamilySelector.svelte';
  import UIFontWeightSelector from '../../ui/UIFontWeightSelector.svelte';
  import UIFontSizeSelector from '../../ui/UIFontSizeSelector.svelte';
  import UILineHeightSelector from '../../ui/UILineHeightSelector.svelte';
  import UIDividerHeightSelector from '../../ui/UIDividerHeightSelector.svelte';
  import UIPaddingSelector from '../../ui/UIPaddingSelector.svelte';
  import { editorState, getComponentPropertySiblings } from '../../lib/editorStore';

  const dispatch = createEventDispatcher();

  type Token = { label: string; variable: string; canBeShared?: boolean; groupKey?: string; disabled?: boolean; hidden?: boolean };

  type Kind =
    | 'surface'
    | 'border'
    | 'border-width'
    | 'radius'
    | 'divider-width'
    | 'divider-height'
    | 'font-family'
    | 'font-weight'
    | 'font-size'
    | 'line-height'
    | 'padding'
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

  function isPadding(v: string): boolean {
    return v.endsWith('-padding');
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
    'radius',
    'padding',
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
    if (isPadding(v)) return 'padding';
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

  function dimmedTooltip(variable: string): string {
    if (!component) return '';
    const siblings = getComponentPropertySiblings(component, variable);
    if (siblings.length < 2) return '';
    return `Linked across ${siblings.length} variants — edit in shared block`;
  }

  let flashTimeout: ReturnType<typeof setTimeout> | null = null;

  function handleMirrorClick(variable: string) {
    const idx = sharedOrder?.get(variable);
    if (idx === undefined) return;
    const target = document.querySelector<HTMLElement>(
      `[data-shared-anchor][data-shared-index="${idx}"]`,
    );
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    target.classList.remove('flash-highlight');
    void target.offsetWidth;
    target.classList.add('flash-highlight');
    if (flashTimeout) clearTimeout(flashTimeout);
    flashTimeout = setTimeout(() => target.classList.remove('flash-highlight'), 800);
  }
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
      {@const idx = sharedOrder?.get(token.variable)}
      {@const isMirror = dis && !isSharedBlock}
      {@const lockedSelections = dis && isSharedBlock}
      {@const triggerDisabled = dis && !isSharedBlock}
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
          disabled={triggerDisabled}
          selectionsLocked={lockedSelections}
          on:change
        />
      {:else}
        <div
          class="token-row"
          class:highlighted={highlightedVars.has(token.variable)}
          class:linked-mirror={isMirror}
          class:has-contexts={!!ctxs?.length}
          data-shared-anchor={isSharedBlock ? '' : undefined}
          data-shared-index={idx !== undefined ? String(idx) : undefined}
          title={isMirror ? dimmedTooltip(token.variable) : null}
          on:click={isMirror ? () => handleMirrorClick(token.variable) : undefined}
          on:keydown={isMirror ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMirrorClick(token.variable); } } : undefined}
          role={isMirror ? 'button' : undefined}
          tabindex={isMirror ? 0 : undefined}
          on:mouseenter={() => { if (ctxs || token.canBeShared) dispatch('tokenhover', { variable: token.variable }); }}
          on:mouseleave={() => { if (ctxs || token.canBeShared) dispatch('tokenhover', { variable: null }); }}
        >
          <span class="token-label">{token.label}</span>
          {#if entry.kind === 'radius'}
            <UIRadiusSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={triggerDisabled} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'border-width' || entry.kind === 'divider-width'}
            <UIBorderWeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={triggerDisabled} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'divider-height'}
            <UIDividerHeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={triggerDisabled} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'padding'}
            <UIPaddingSelector mode="single" variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={triggerDisabled} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'font-family'}
            <UIFontFamilySelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={triggerDisabled} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'font-weight'}
            <UIFontWeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={triggerDisabled} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'font-size'}
            <UIFontSizeSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={triggerDisabled} selectionsLocked={lockedSelections} on:change />
          {:else if entry.kind === 'line-height'}
            <UILineHeightSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={triggerDisabled} selectionsLocked={lockedSelections} on:change />
          {:else}
            <UIPaletteSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={triggerDisabled} selectionsLocked={lockedSelections} on:change />
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
    height: 0;
    border-top: 1px dashed var(--ui-border-faint);
    margin: var(--ui-space-2) 0;
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

  .token-row.highlighted {
    background: var(--ui-surface-high);
    outline: 1px dashed var(--ui-text-accent);
  }

  .token-row.highlighted .token-label {
    color: var(--ui-text-accent);
  }

  .token-row.linked-mirror {
    cursor: pointer;
  }

  .token-row.linked-mirror :global(.ui-token-selector) {
    pointer-events: none;
  }

  .token-row.linked-mirror:focus-visible {
    outline: 2px solid var(--ui-text-accent);
    outline-offset: 2px;
  }

  :global(.token-row.flash-highlight) {
    animation: tokenRowFlash 800ms ease-out;
  }

  @keyframes tokenRowFlash {
    0%   { background: var(--ui-text-accent); outline: 1px solid var(--ui-text-accent); }
    40%  { background: var(--ui-surface-high); }
    100% { background: transparent; outline: 1px solid transparent; }
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
