<script lang="ts">
  import TokenLayout from './TokenLayout.svelte';
  import LinkageChart from './LinkageChart.svelte';
  import { editorState } from '../../lib/editorStore';
  import { getEditorContext } from './editorContext';
  import type { CssVarRef } from '../../lib/editorTypes';
  import type { SharedBlockResult, SharedGroup, SharedToken } from './sharedBlock';

  export let component: string;
  export let shared: SharedBlockResult;

  const editorCtx = getEditorContext();

  /** Forward a chart row click to whichever tab strip the label belongs to. The chart
      doesn't know if its rows are variants (top-level tab strip) or states (per-VariantGroup
      state tabs), so we set both stores; each consumer adopts the value only if it names
      one of its own tabs. */
  function handleChartSelect(e: CustomEvent<string>) {
    editorCtx?.focusedVariant.set(e.detail);
    editorCtx?.focusedState.set(e.detail);
  }

  type Bucket = { contexts: string[]; brokenContexts: string[]; groups: SharedGroup[] };
  type TypeColumn = { kind: 'type'; legend: string; tokens: (SharedToken & { disabled?: boolean })[] };
  type GeneralColumn = { kind: 'general'; tokens: (SharedToken & { disabled?: boolean })[] };
  type Column = TypeColumn | GeneralColumn;

  function extractTypeGroup(v: string): string | null {
    const m = v.match(/-([a-z][a-z0-9-]*?)-(?:font-(?:family|size|weight)|line-height)$/);
    return m ? m[1] : null;
  }

  function aliasKey(ref: CssVarRef | undefined): string {
    if (!ref) return '';
    return ref.kind === 'token' ? ref.name : `lit:${ref.value}`;
  }

  /** Collapse same-label same-value tokens into a single row whose `mergeVariables` lists the
      other groupKey leads. Disabled (unlinked) rows are kept as-is so divergence stays visible. */
  function collapseGeneral(
    list: (SharedToken & { disabled?: boolean })[],
    aliases: Record<string, CssVarRef>,
  ): (SharedToken & { disabled?: boolean })[] {
    const out: (SharedToken & { disabled?: boolean })[] = [];
    const leadIdx = new Map<string, number>();
    for (const tok of list) {
      if (tok.disabled) {
        out.push(tok);
        continue;
      }
      const alias = aliasKey(aliases[tok.variable]);
      const key = `${tok.label}|${alias}`;
      const idx = leadIdx.get(key);
      if (idx === undefined) {
        leadIdx.set(key, out.length);
        out.push(tok);
      } else {
        const lead = out[idx];
        out[idx] = {
          ...lead,
          mergeVariables: [
            ...(lead.mergeVariables ?? []),
            tok.variable,
            ...(tok.mergeVariables ?? []),
          ],
        };
      }
    }
    return out;
  }

  function partitionBucket(groups: SharedGroup[], aliases: Record<string, CssVarRef>): Column[] {
    const typeGroups = new Map<string, (SharedToken & { disabled?: boolean })[]>();
    const general: (SharedToken & { disabled?: boolean })[] = [];
    for (const g of groups) {
      const tok = { ...g.token, disabled: !g.shared };
      const tg = extractTypeGroup(tok.variable);
      if (tg) {
        const arr = typeGroups.get(tg) ?? [];
        arr.push(tok);
        typeGroups.set(tg, arr);
      } else {
        general.push(tok);
      }
    }
    const collapsed = collapseGeneral(general, aliases);
    const cols: Column[] = [];
    for (const [legend, tokens] of typeGroups) cols.push({ kind: 'type', legend, tokens });
    if (collapsed.length > 0) cols.push({ kind: 'general', tokens: collapsed });
    return cols;
  }

  $: buckets = (() => {
    const map = new Map<string, Bucket>();
    for (const g of shared.groups) {
      const key = [
        [...g.contexts].sort().join(','),
        '||',
        [...g.brokenContexts].sort().join(','),
      ].join('');
      const bucket = map.get(key);
      if (bucket) bucket.groups.push(g);
      else map.set(key, { contexts: g.contexts, brokenContexts: g.brokenContexts, groups: [g] });
    }
    return [...map.values()].sort(
      (a, b) => b.contexts.length + b.brokenContexts.length - (a.contexts.length + a.brokenContexts.length),
    );
  })();

  $: aliases = $editorState.components[component]?.aliases ?? {};
  $: bucketCols = buckets.map((b) => {
    const columns = partitionBucket(b.groups, aliases);
    return {
      contexts: b.contexts,
      brokenContexts: b.brokenContexts,
      columns,
      hasLegend: columns.some((c) => c.kind === 'type'),
    };
  });
</script>

{#if buckets.length > 0}
  <section class="shared-block">
    <header class="shared-block-header">
      <h3 class="shared-block-title">Shared properties</h3>
      <p class="shared-block-description">Token values linked across multiple variants or states. Changing one updates all of them.</p>
    </header>
    <div class="shared-grid">
      {#each bucketCols as bucket (bucket.contexts.join('|') + '||' + bucket.brokenContexts.join('|'))}
        <article class="shared-subgroup">
          <div class="shared-controls">
            <div class="shared-columns">
            {#each bucket.columns as col}
              <div class="shared-column">
                {#if bucket.hasLegend}
                  <span class="shared-column-legend" aria-hidden={col.kind !== 'type'}>
                    {col.kind === 'type' ? col.legend : ' '}
                  </span>
                {/if}
                <TokenLayout
                  tokens={col.tokens}
                  {component}
                  sharedOrder={shared.sharedOrder}
                  isSharedBlock
                  on:change
                />
              </div>
            {/each}
            </div>
          </div>
          <LinkageChart contexts={bucket.contexts} broken={bucket.brokenContexts} on:select={handleChartSelect} />
        </article>
      {/each}
    </div>
  </section>
{/if}

<style>
  .shared-block {
    margin-top: var(--ui-space-16);
    padding-top: var(--ui-space-12);
    border-top: 1px dashed var(--ui-border-faint);
  }

  .shared-block-header {
    margin-bottom: var(--ui-space-12);
  }

  .shared-block-title {
    margin: 0;
    font-size: var(--ui-font-size-md);
    font-weight: 500;
    color: var(--ui-text-primary);
  }

  .shared-block-description {
    margin: var(--ui-space-2) 0 0;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }

  /* Plain flex layout, no width constraints. Cards lay out left-to-right and wrap to
     a new row when they don't fit; each card is sized to its own content (controls +
     chart natural widths). */
  .shared-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--ui-space-12);
  }

  .shared-subgroup {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--ui-space-10);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-lg);
    padding: var(--ui-space-12) var(--ui-space-16);
  }

  /* Compact the linkage chart inside the bucket: tighten cell padding and
     narrow the lone status column so the chart sits as a quiet footer below
     the controls. The card communicates "shared properties" on its own — the
     "Linked Properties" header is suppressed here to keep focus on the
     editable controls. Selectors include `.chart` as a parent hop to beat
     LinkageChart's own `.grid` / `.chart-label` specificity. */
  .shared-subgroup :global(.chart .chart-grid-wrap .grid > *) {
    padding: var(--ui-space-4) var(--ui-space-8);
  }
  .shared-subgroup :global(.chart .chart-grid-wrap .grid-1d) {
    grid-template-columns: auto 28px;
  }
  .shared-subgroup :global(.chart .chart-label) {
    display: none;
  }

  /* Override TokenLayout's narrow-container collapse and force the row to
     stay tabular: label · selector · value. The third column is `max-content`
     so the value sizes to its text and never gets ellipsized; subgrid still
     aligns rows in the bucket to the widest value. The second rule restores
     the selector's two-column subgrid span so the meta-text doesn't wrap
     beneath the dropdown.
     Adding `.token-group` as a parent hop bumps specificity above
     TokenLayout's own `.token-grid` rule (which would otherwise tie). */
  .shared-subgroup :global(.token-group .token-grid) {
    --token-selector-w: 8rem;
    grid-template-columns: max-content var(--token-selector-w) max-content;
    column-gap: var(--ui-space-8);
  }
  .shared-subgroup :global(.token-group .token-grid .ui-token-selector) {
    grid-column: span 2;
  }

  /* Controls column sits above the linkage chart in the column-flex card.
     `flex: 0 0 auto` keeps the row at content height; the basis is `auto`
     so width follows the widest row's max-content. */
  .shared-controls {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
  }

  .shared-columns {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-16);
    align-items: flex-start;
  }

  .shared-column {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    min-width: 0;
  }

  .shared-column-legend {
    font-size: var(--ui-font-size-xs);
    line-height: 1;
    min-height: var(--ui-font-size-xs);
    color: var(--ui-text-tertiary);
    font-family: var(--ui-font-mono);
    padding: 0 var(--ui-space-12);
    text-transform: lowercase;
    letter-spacing: 0.04em;
  }
</style>
