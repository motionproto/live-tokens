<script lang="ts">
  import { createEventDispatcher, type ComponentType } from 'svelte';
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
  import UIBlurSelector from '../../ui/UIBlurSelector.svelte';
  import {
    editorState,
    getComponentPropertySiblings,
    setComponentAliasShared,
    clearComponentAliasShared,
  } from '../../lib/editorStore';
  import type { Token } from './types';

  /** Selector kind. `padding-split` is `padding` whose per-side variables exist;
      it renders the four-sided field group instead of the single-value row. */
  type Kind =
    | 'surface'
    | 'border'
    | 'border-width'
    | 'radius'
    | 'divider-width'
    | 'divider-height'
    | 'dot-size'
    | 'blur'
    | 'font-family'
    | 'font-weight'
    | 'font-size'
    | 'line-height'
    | 'padding'
    | 'padding-split'
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

  /** Suffix/prefix patterns mapped to kinds — single source of truth used by `categorize`.
      Order matters: `text` must run before `border`/`surface` because `--text-*` would
      otherwise match `surface` checks if any pattern overlapped. */
  const KIND_PATTERNS: Array<{ kind: Kind; matches: (v: string) => boolean }> = [
    { kind: 'font-family', matches: (v) => v.endsWith('-font-family') },
    { kind: 'font-weight', matches: (v) => v.endsWith('-font-weight') },
    { kind: 'font-size', matches: (v) => v.endsWith('-font-size') },
    { kind: 'line-height', matches: (v) => v.endsWith('-line-height') },
    { kind: 'extras', matches: (v) => v.endsWith('-text') || v.startsWith('--text-') },
    { kind: 'radius', matches: (v) => v.endsWith('-radius') || v.startsWith('--radius-') },
    { kind: 'divider-width', matches: (v) => v.endsWith('-divider-width') || v.endsWith('-divider-thickness') },
    { kind: 'divider-height', matches: (v) => v.endsWith('-divider-height') },
    { kind: 'dot-size', matches: (v) => v.endsWith('-dot-size') },
    { kind: 'blur', matches: (v) => v.endsWith('-blur') || v.startsWith('--blur-') },
    { kind: 'padding', matches: (v) => v.endsWith('-padding') },
    { kind: 'gap', matches: (v) => v.endsWith('-gap') },
    { kind: 'border-width', matches: (v) => v.endsWith('-border-width') || v.startsWith('--border-width-') },
    { kind: 'border', matches: (v) => v.endsWith('-border') || v.startsWith('--border-') },
    { kind: 'surface', matches: (v) => v.endsWith('-surface') || v.startsWith('--surface-') },
  ];

  /** Fixed internal order for tokens within a layout. `padding-split` co-orders with `padding`. */
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
    'padding-split',
    'gap',
    'blur',
    'extras',
    'surface',
    'border',
  ];
  const orderRank: Record<Kind, number> = Object.fromEntries(
    baseKindOrder.map((k, i) => [k, i]),
  ) as Record<Kind, number>;

  function rawKind(v: string): Kind {
    for (const { kind, matches } of KIND_PATTERNS) {
      if (matches(v)) return kind;
    }
    return 'extras';
  }

  /** A padding token is "split" when its per-side variables exist for this component. */
  function paddingIsSplit(varName: string, comp: string | undefined, state: typeof $editorState): boolean {
    const sides = ['top', 'right', 'bottom', 'left'];
    if (comp) {
      const slice = state.components[comp];
      if (!slice) return false;
      return sides.some((s) => `${varName}-${s}` in slice.aliases);
    }
    return sides.some((s) => !!document.documentElement.style.getPropertyValue(`${varName}-${s}`).trim());
  }

  function categorize(v: string, comp: string | undefined, state: typeof $editorState): Kind {
    const k = rawKind(v);
    if (k === 'padding' && paddingIsSplit(v, comp, state)) return 'padding-split';
    return k;
  }

  /** For sibling/grouping checks we want the canonical kind, not the split-vs-single distinction. */
  function groupingKind(v: string): Kind {
    return rawKind(v);
  }

  /** Selector registry: one entry per kind. `extra` props (e.g. UIPaddingSelector's
      `mode`/`splittable`/`rowLabel`) are forwarded alongside the shared props. */
  type SelectorEntry = {
    component: ComponentType;
    extra?: (token: Token) => Record<string, unknown>;
    /** When true, the row is rendered as a self-contained block (spans all grid columns,
        no .token-row wrapper, no contexts strip). Currently only `padding-split`. */
    standalone?: boolean;
  };

  const SELECTOR_REGISTRY: Record<Kind, SelectorEntry> = {
    'font-family': { component: UIFontFamilySelector },
    'font-weight': { component: UIFontWeightSelector },
    'font-size': { component: UIFontSizeSelector },
    'line-height': { component: UILineHeightSelector },
    'border-width': { component: UIBorderWeightSelector },
    'divider-width': { component: UIBorderWeightSelector },
    'divider-height': { component: UIDividerHeightSelector },
    'dot-size': { component: UIDotSizeSelector },
    'radius': { component: UIRadiusSelector },
    'padding': { component: UIPaddingSelector, extra: () => ({ mode: 'single' }) },
    'padding-split': {
      component: UIPaddingSelector,
      extra: (token) => ({ mode: 'sides', rowLabel: token.label }),
      standalone: true,
    },
    'gap': { component: UIPaddingSelector, extra: () => ({ mode: 'single', splittable: false }) },
    'blur': { component: UIBlurSelector },
    'surface': { component: UIPaletteSelector },
    'border': { component: UIPaletteSelector },
    'extras': { component: UIPaletteSelector },
  };

  function buildEntries(list: Token[], order: Map<string, number> | undefined, linked: Set<Kind>, comp: string | undefined, state: typeof $editorState): Entry[] {
    const indexed = list.map((token, i) => ({ e: { kind: categorize(token.variable, comp, state), token }, i }));
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

  /** Kinds that currently have at least one variable with ≥2 siblings in the component.
      Returns canonical kinds (so a `padding` linked-set covers `padding-split` rows too). */
  function computeLinkedKinds(comp: string | undefined, state: typeof $editorState): Set<Kind> {
    const set = new Set<Kind>();
    if (!comp) return set;
    const slice = state.components[comp];
    if (!slice) return set;
    for (const varName of Object.keys(slice.aliases)) {
      if (getComponentPropertySiblings(comp, varName).length >= 2) {
        const k = groupingKind(varName);
        set.add(k);
        if (k === 'padding') set.add('padding-split');
      }
    }
    return set;
  }

  const dispatch = createEventDispatcher();

  /** When a row collapses several groupKey leads into one display, mirror the lead's
      new alias onto each peer (and its siblings) so the merged display stays in sync. */
  function handleRowChange(token: Token) {
    if (token.mergeVariables?.length && component) {
      const slice = $editorState.components[component];
      const leadAlias = slice?.aliases[token.variable];
      for (const peer of token.mergeVariables) {
        if (leadAlias) setComponentAliasShared(component, peer, leadAlias);
        else clearComponentAliasShared(component, peer);
      }
    }
    dispatch('change');
  }

  $: linkedKinds = computeLinkedKinds(component, $editorState);
  $: entries = buildEntries(tokens.filter((t) => !t.hidden), sharedOrder, linkedKinds, component, $editorState);
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
      {@const sel = SELECTOR_REGISTRY[entry.kind]}
      {@const sharedProps = {
        variable: token.variable,
        component,
        canBeShared: token.canBeShared ?? false,
        selectionsLocked: lockedSelections,
      }}
      {@const extra = sel.extra ? sel.extra(token) : {}}
      {#if i === firstIndependentIdx}
        <div class="zone-divider" aria-hidden="true"></div>
      {/if}
      {#if sel.standalone}
        <svelte:component
          this={sel.component}
          {...sharedProps}
          {...extra}
          on:change={() => handleRowChange(token)}
        />
      {:else}
        <div
          class="token-row"
          class:has-contexts={!!ctxs?.length}
        >
          <span class="token-label">{token.label}</span>
          <svelte:component
            this={sel.component}
            {...sharedProps}
            {...extra}
            on:change={() => handleRowChange(token)}
          />
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
