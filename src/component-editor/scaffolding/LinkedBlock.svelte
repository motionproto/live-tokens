<script lang="ts">
  import TokenLayout from './TokenLayout.svelte';
  import LinkageChart from './LinkageChart.svelte';
  import { editorState } from '../../lib/editorStore';
  import { getEditorContext } from './editorContext';
  import type { CssVarRef } from '../../lib/editorTypes';
  import type { LinkedBlockResult, LinkedGroup, LinkedToken } from './linkedBlock';

  export let component: string;
  export let linked: LinkedBlockResult;

  const editorCtx = getEditorContext();

  /** Forward a chart row click to whichever tab strip the label belongs to. The chart
      doesn't know if its rows are variants (top-level tab strip) or states (per-VariantGroup
      state tabs), so we set both stores; each consumer adopts the value only if it names
      one of its own tabs. */
  function handleChartSelect(e: CustomEvent<string>) {
    editorCtx?.focusedVariant.set(e.detail);
    editorCtx?.focusedState.set(e.detail);
  }

  type Bucket = { contexts: string[]; brokenContexts: string[]; groups: LinkedGroup[] };
  type TypeColumn = { kind: 'type'; legend: string; tokens: (LinkedToken & { disabled?: boolean })[] };
  type GeneralColumn = { kind: 'general'; tokens: (LinkedToken & { disabled?: boolean })[] };
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
    list: (LinkedToken & { disabled?: boolean })[],
    aliases: Record<string, CssVarRef>,
  ): (LinkedToken & { disabled?: boolean })[] {
    const out: (LinkedToken & { disabled?: boolean })[] = [];
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

  function partitionBucket(groups: LinkedGroup[], aliases: Record<string, CssVarRef>): Column[] {
    const typeGroups = new Map<string, (LinkedToken & { disabled?: boolean })[]>();
    const general: (LinkedToken & { disabled?: boolean })[] = [];
    for (const g of groups) {
      const tok = { ...g.token, disabled: !g.linked };
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
    for (const g of linked.groups) {
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
  <section class="linked-block">
    <header class="linked-block-header">
      <h3 class="linked-block-title">Linked properties</h3>
      <p class="linked-block-description">Token values linked across multiple variants or states. Changing one updates all of them.</p>
    </header>
    <div class="linked-grid">
      {#each bucketCols as bucket (bucket.contexts.join('|') + '||' + bucket.brokenContexts.join('|'))}
        <article class="linked-subgroup">
          <div class="linked-controls">
            <div class="linked-columns">
            {#each bucket.columns as col}
              <div class="linked-column">
                {#if bucket.hasLegend}
                  <span class="linked-column-legend" aria-hidden={col.kind !== 'type'}>
                    {col.kind === 'type' ? col.legend : ' '}
                  </span>
                {/if}
                <TokenLayout
                  tokens={col.tokens}
                  {component}
                  linkedOrder={linked.linkedOrder}
                  isLinkedBlock
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
  .linked-block {
    margin-top: var(--ui-space-16);
    padding-top: var(--ui-space-12);
    border-top: 1px dashed var(--ui-border-faint);
  }

  .linked-block-header {
    margin-bottom: var(--ui-space-12);
  }

  .linked-block-title {
    margin: 0;
    font-size: var(--ui-font-size-md);
    font-weight: 500;
    color: var(--ui-text-primary);
  }

  .linked-block-description {
    margin: var(--ui-space-2) 0 0;
    font-size: var(--ui-font-size-sm);
    color: var(--ui-text-secondary);
  }

  /* Plain flex layout, no width constraints. Cards lay out left-to-right and wrap to
     a new row when they don't fit; each card is sized to its own content (controls +
     chart natural widths). */
  .linked-grid {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: var(--ui-space-12);
  }

  .linked-subgroup {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--ui-space-20);
    border: 1px solid var(--ui-border-faint);
    border-radius: var(--ui-radius-lg);
    padding: var(--ui-space-12) var(--ui-space-16);
  }

  /* Compact the linkage chart inside the bucket: tighten cell padding and
     narrow the lone status column so the chart sits as a quiet footer below
     the controls. The card communicates "linked properties" on its own — the
     "Linked Properties" header is suppressed here to keep focus on the
     editable controls. Selectors include `.chart` as a parent hop to beat
     LinkageChart's own `.grid` / `.chart-label` specificity. */
  .linked-subgroup :global(.chart .chart-grid-wrap .grid > *) {
    padding: var(--ui-space-4) var(--ui-space-8);
  }
  .linked-subgroup :global(.chart .chart-grid-wrap .grid-1d) {
    grid-template-columns: auto 28px;
  }
  .linked-subgroup :global(.chart .chart-label) {
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
  .linked-subgroup :global(.token-group .token-grid) {
    --token-selector-w: 8rem;
    grid-template-columns: max-content var(--token-selector-w) max-content;
    column-gap: var(--ui-space-8);
  }
  .linked-subgroup :global(.token-group .token-grid .ui-token-selector) {
    grid-column: span 2;
  }

  /* Controls column sits above the linkage chart in the column-flex card.
     `flex: 0 0 auto` keeps the row at content height; the basis is `auto`
     so width follows the widest row's max-content. */
  .linked-controls {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
  }

  .linked-columns {
    display: flex;
    flex-wrap: wrap;
    gap: var(--ui-space-16);
    align-items: flex-start;
  }

  .linked-column {
    display: flex;
    flex-direction: column;
    gap: var(--ui-space-4);
    min-width: 0;
  }

  .linked-column-legend {
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
