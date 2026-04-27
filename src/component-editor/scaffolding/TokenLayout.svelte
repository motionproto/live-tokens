<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import UIPaletteSelector from '../../ui/UIPaletteSelector.svelte';
  import UIRadiusSelector from '../../ui/UIRadiusSelector.svelte';
  import UIBorderWeightSelector from '../../ui/UIBorderWeightSelector.svelte';
  import UIFontFamilySelector from '../../ui/UIFontFamilySelector.svelte';
  import UIFontWeightSelector from '../../ui/UIFontWeightSelector.svelte';
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

  /** Fixed internal order within the linked and independent groups. */
  const baseKindOrder: Kind[] = [
    'font-family',
    'font-weight',
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

  /** Column layout: linked kinds first (leftmost), then independent kinds.
   *  Computed per-component so all fieldsets in the same component share the same tracks.
   *  When both zones have content, a 0-width divider column sits at the boundary. */
  function buildColumnLayout(linked: Set<Kind>): {
    map: Partial<Record<Kind, number>>;
    extrasBaseCol: number;
    total: number;
    dividerCol: number | null;
  } {
    const linkedOrdered = baseKindOrder.filter((k) => linked.has(k));
    const independentOrdered = baseKindOrder.filter((k) => !linked.has(k));
    const hasDivider = linkedOrdered.length > 0 && independentOrdered.length > 0;
    const map: Partial<Record<Kind, number>> = {};
    let col = 1;
    let extrasBaseCol = 1;
    let dividerCol: number | null = null;

    function placeKind(k: Kind) {
      if (k === 'extras') {
        extrasBaseCol = col;
        col += 2;
      } else {
        map[k] = col;
        col += 1;
      }
    }

    for (const k of linkedOrdered) placeKind(k);
    if (hasDivider) {
      dividerCol = col;
      col += 1;
    }
    for (const k of independentOrdered) placeKind(k);

    return { map, extrasBaseCol, total: col - 1, dividerCol };
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

  $: entries = buildEntries(tokens.filter((t) => !t.hidden), sharedOrder, linkedKinds);
  $: placed = placeEntries(entries, columnLayout);

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
  <div class="token-grid" style="--token-columns: {columnLayout.total};">
    {#if columnLayout.dividerCol !== null}
      <div
        class="zone-divider"
        style="grid-column: {columnLayout.dividerCol}; grid-row: 1 / span {Math.max(1, tokens.length)};"
        aria-hidden="true"
      ></div>
    {/if}
    {#each placed as { entry, col }}
      {@const token = entry.token}
      {@const dis = token.disabled ?? false}
      {@const ctxs = contexts[token.variable]}
      {@const idx = sharedOrder?.get(token.variable)}
      {@const isMirror = dis && !isSharedBlock}
      <div
        class="token-entry"
        class:highlighted={highlightedVars.has(token.variable)}
        class:linked-mirror={isMirror}
        data-shared-anchor={isSharedBlock ? '' : undefined}
        data-shared-index={idx !== undefined ? String(idx) : undefined}
        title={isMirror ? dimmedTooltip(token.variable) : null}
        style="grid-column: {col};"
        on:click={isMirror ? () => handleMirrorClick(token.variable) : undefined}
        on:keydown={isMirror ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleMirrorClick(token.variable); } } : undefined}
        role={isMirror ? 'button' : undefined}
        tabindex={isMirror ? 0 : undefined}
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
        {:else if entry.kind === 'padding'}
          <UIPaddingSelector variable={token.variable} {component} canBeShared={token.canBeShared ?? false} disabled={dis} on:change />
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

  .zone-divider {
    width: 0;
    align-self: stretch;
    border-left: 1px dashed var(--ui-border-faint);
    pointer-events: none;
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

  .token-entry.linked-mirror {
    cursor: pointer;
  }

  .token-entry.linked-mirror :global(.ui-token-selector) {
    pointer-events: none;
  }

  .token-entry.linked-mirror:focus-visible {
    outline: 2px solid var(--ui-text-accent);
    outline-offset: 2px;
  }

  :global(.token-entry.flash-highlight) {
    animation: tokenEntryFlash 800ms ease-out;
  }

  @keyframes tokenEntryFlash {
    0%   { background: var(--ui-text-accent); outline: 1px solid var(--ui-text-accent); }
    40%  { background: var(--ui-surface-high); }
    100% { background: transparent; outline: 1px solid transparent; }
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
